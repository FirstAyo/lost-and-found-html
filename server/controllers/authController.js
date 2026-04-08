// server/controllers/authController.js

import crypto from "crypto";
import nodemailer from "nodemailer";
import { User } from "../models/User.js";
import { logService } from "../services/logService.js";

function normalizeAuthInput(payload = {}) {
  return {
    firstName: String(payload.firstName || "").trim(),
    lastName: String(payload.lastName || "").trim(),
    email: String(payload.email || "")
      .trim()
      .toLowerCase(),
    password: String(payload.password || ""),
    confirmPassword: String(payload.confirmPassword || ""),
  };
}

function setAuthFeedback(req, feedback) {
  req.session.authFeedback = feedback;
}

function consumeAuthFeedback(session) {
  const feedback = session?.authFeedback || null;
  if (session?.authFeedback) {
    delete session.authFeedback;
  }
  return feedback;
}

/**
 * SMTP / email config
 * --------------------------------------------------
 * Add these to your .env file if you want real emails:
 *
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_SECURE=false
 * SMTP_USER=your_email@gmail.com
 * SMTP_PASS=your_app_password
 * APP_BASE_URL=http://localhost:3000
 *
 * If SMTP is not configured, the reset link will be logged
 * to the terminal instead, which is still useful for testing.
 */
function createMailTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } =
    process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE) === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

export const authController = {
  renderForgotPassword(req, res) {
    return res.render("pages/forgot-password", {
      title: "Forgot Password",
      pageCss: "pages/login.css",
      pageJs: "",
      authFeedback: consumeAuthFeedback(req.session),
    });
  },

  async requestPasswordReset(req, res) {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email || !email.includes("@")) {
      setAuthFeedback(req, {
        type: "danger",
        title: "Request failed",
        messages: ["Please enter a valid email address."],
        values: { email },
      });
      return res.redirect("/auth/forgot-password");
    }

    const user = await User.findOne({ email });

    /**
     * Always show the same success message to avoid revealing
     * whether an email exists in the system.
     */
    const genericSuccessFeedback = {
      type: "success",
      title: "Reset link requested",
      messages: [
        "If an account with that email exists, a password reset link has been sent.",
      ],
      values: { email: "" },
    };

    if (!user) {
      await logService.createLog({
        userRole: "guest",
        action: "forgot_password_request",
        outcome: "success",
        method: req.method,
        route: req.originalUrl,
        statusCode: 302,
        ipAddress: req.ip,
        metadata: { email, userFound: false },
      });

      setAuthFeedback(req, genericSuccessFeedback);
      return res.redirect("/auth/forgot-password");
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpiry;
    await user.save();

    const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";
    const resetUrl = `${appBaseUrl}/auth/reset-password/${resetToken}`;

    const transporter = createMailTransport();

    if (transporter) {
      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: user.email,
        subject: "Reset your Langara Lost & Found password",
        html: `
          <p>Hello ${user.firstName},</p>
          <p>You requested a password reset for your Langara Lost & Found account.</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour.</p>
          <p>If you did not request this, you can ignore this email.</p>
        `,
      });
    } else {
      /**
       * Fallback for local testing when SMTP is not configured.
       * Copy the reset link from your terminal.
       */
      console.log("PASSWORD RESET LINK:", resetUrl);
    }

    await logService.createLog({
      userId: user._id,
      userRole: user.role,
      action: "forgot_password_request",
      outcome: "success",
      method: req.method,
      route: req.originalUrl,
      statusCode: 302,
      ipAddress: req.ip,
      metadata: { email: user.email },
    });

    setAuthFeedback(req, genericSuccessFeedback);
    return res.redirect("/auth/forgot-password");
  },

  async renderResetPassword(req, res) {
    const { token } = req.params;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      setAuthFeedback(req, {
        type: "danger",
        title: "Reset link invalid",
        messages: ["This reset link is invalid or has expired."],
      });
      return res.redirect("/auth/forgot-password");
    }

    return res.render("pages/reset-password", {
      title: "Reset Password",
      pageCss: "pages/login.css",
      pageJs: "",
      token,
      authFeedback: consumeAuthFeedback(req.session),
    });
  },

  async resetPassword(req, res) {
    const { token } = req.params;
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    const errors = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long.");
    }

    if (password !== confirmPassword) {
      errors.push("Password confirmation does not match.");
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      setAuthFeedback(req, {
        type: "danger",
        title: "Reset failed",
        messages: ["This reset link is invalid or has expired."],
      });
      return res.redirect("/auth/forgot-password");
    }

    if (errors.length > 0) {
      setAuthFeedback(req, {
        type: "danger",
        title: "Reset failed",
        messages: errors,
      });
      return res.redirect(`/auth/reset-password/${token}`);
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await logService.createLog({
      userId: user._id,
      userRole: user.role,
      action: "password_reset_success",
      outcome: "success",
      method: req.method,
      route: req.originalUrl,
      statusCode: 302,
      ipAddress: req.ip,
      metadata: { email: user.email },
    });

    setAuthFeedback(req, {
      type: "success",
      title: "Password updated",
      messages: [
        "Your password has been reset successfully. You can now log in.",
      ],
    });

    return res.redirect("/login");
  },

  async register(req, res) {
    const payload = normalizeAuthInput(req.body);
    const errors = [];

    if (payload.firstName.length < 2) {
      errors.push("First name must be at least 2 characters long.");
    }

    if (payload.lastName.length < 2) {
      errors.push("Last name must be at least 2 characters long.");
    }

    if (!payload.email.includes("@")) {
      errors.push("Please enter a valid email address.");
    }

    if (payload.password.length < 8) {
      errors.push("Password must be at least 8 characters long.");
    }

    if (payload.password !== payload.confirmPassword) {
      errors.push("Password confirmation does not match.");
    }

    const existingUser = payload.email
      ? await User.findOne({ email: payload.email }).lean()
      : null;
    if (existingUser) {
      errors.push("An account with this email already exists.");
    }

    if (errors.length > 0) {
      setAuthFeedback(req, {
        type: "danger",
        title: "Registration failed",
        messages: errors,
        values: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
        },
      });

      await logService.createLog({
        userRole: "guest",
        action: "register_attempt",
        outcome: "failure",
        method: req.method,
        route: req.originalUrl,
        statusCode: 302,
        ipAddress: req.ip,
        metadata: { email: payload.email, errors },
      });

      return res.redirect("/register");
    }

    const user = await User.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      role: "member",
    });

    req.session.user = user.toSessionUser();

    await logService.createLog({
      userId: user._id,
      userRole: user.role,
      action: "login_success",
      outcome: "success",
      method: req.method,
      route: req.originalUrl,
      statusCode: 302,
      ipAddress: req.ip,
      metadata: { email: user.email },
    });

    await logService.createLog({
      userId: user._id,
      userRole: user.role,
      action: "register_success",
      outcome: "success",
      method: req.method,
      route: req.originalUrl,
      statusCode: 302,
      ipAddress: req.ip,
      metadata: { email: user.email },
    });

    req.session.authFeedback = {
      type: "success",
      title: "Account created",
      messages: ["Your account has been created successfully."],
    };

    return res.redirect("/dashboard");
  },

  async login(req, res) {
    const payload = normalizeAuthInput(req.body);
    const errors = [];

    if (!payload.email || !payload.password) {
      errors.push("Email and password are required.");
    }

    const user = payload.email
      ? await User.findOne({ email: payload.email })
      : null;
    const passwordMatches = user
      ? await user.comparePassword(payload.password)
      : false;

    if (!user || !passwordMatches) {
      errors.push("Invalid email or password.");
    }

    if (user && user.status !== "active") {
      errors.push("Your account is not active. Please contact support.");
    }

    if (errors.length > 0) {
      setAuthFeedback(req, {
        type: "danger",
        title: "Login failed",
        messages: errors,
        values: {
          email: payload.email,
        },
      });

      await logService.createLog({
        userRole: "guest",
        action: "login_attempt",
        outcome: "failure",
        method: req.method,
        route: req.originalUrl,
        statusCode: 302,
        ipAddress: req.ip,
        metadata: { email: payload.email, errors },
      });

      return res.redirect("/login");
    }

    req.session.user = user.toSessionUser();
    req.session.authFeedback = {
      type: "success",
      title: "Welcome back",
      messages: ["You have logged in successfully."],
    };

    await logService.createLog({
      userId: user._id,
      userRole: user.role,
      action: "login_success",
      outcome: "success",
      method: req.method,
      route: req.originalUrl,
      statusCode: 302,
      ipAddress: req.ip,
      metadata: { email: user.email },
    });

    return res.redirect(
      user.role === "admin" ? "/admin/dashboard" : "/dashboard",
    );
  },

  logout(req, res, next) {
    const currentUser = req.session?.user || null;

    req.session.destroy(async (error) => {
      if (error) {
        return next(error);
      }

      if (currentUser) {
        await logService.createLog({
          userId: currentUser.id,
          userRole: currentUser.role,
          action: "logout",
          outcome: "success",
          method: req.method,
          route: req.originalUrl,
          statusCode: 302,
          ipAddress: req.ip,
          metadata: { email: currentUser.email },
        });
      }

      res.clearCookie("connect.sid");
      return res.redirect("/login");
    });
  },
};
