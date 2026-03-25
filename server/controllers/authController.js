import { User } from '../models/User.js';
import { logService } from '../services/logService.js';

function normalizeAuthInput(payload = {}) {
  return {
    firstName: String(payload.firstName || '').trim(),
    lastName: String(payload.lastName || '').trim(),
    email: String(payload.email || '').trim().toLowerCase(),
    password: String(payload.password || ''),
    confirmPassword: String(payload.confirmPassword || '')
  };
}

function setAuthFeedback(req, feedback) {
  req.session.authFeedback = feedback;
}

export const authController = {
  async register(req, res) {
    const payload = normalizeAuthInput(req.body);
    const errors = [];

    if (payload.firstName.length < 2) {
      errors.push('First name must be at least 2 characters long.');
    }

    if (payload.lastName.length < 2) {
      errors.push('Last name must be at least 2 characters long.');
    }

    if (!payload.email.includes('@')) {
      errors.push('Please enter a valid email address.');
    }

    if (payload.password.length < 8) {
      errors.push('Password must be at least 8 characters long.');
    }

    if (payload.password !== payload.confirmPassword) {
      errors.push('Password confirmation does not match.');
    }

    const existingUser = payload.email ? await User.findOne({ email: payload.email }).lean() : null;
    if (existingUser) {
      errors.push('An account with this email already exists.');
    }

    if (errors.length > 0) {
      setAuthFeedback(req, {
        type: 'danger',
        title: 'Registration failed',
        messages: errors,
        values: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email
        }
      });
      await logService.createLog({
        userRole: 'guest',
        action: 'register_attempt',
        outcome: 'failure',
        method: req.method,
        route: req.originalUrl,
        statusCode: 302,
        ipAddress: req.ip,
        metadata: { email: payload.email, errors }
      });

      return res.redirect('/register');
    }

    const user = await User.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
      role: 'member'
    });

    req.session.user = user.toSessionUser();

    await logService.createLog({
      userId: user._id,
      userRole: user.role,
      action: 'login_success',
      outcome: 'success',
      method: req.method,
      route: req.originalUrl,
      statusCode: 302,
      ipAddress: req.ip,
      metadata: { email: user.email }
    });

    await logService.createLog({
      userId: user._id,
      userRole: user.role,
      action: 'register_success',
      outcome: 'success',
      method: req.method,
      route: req.originalUrl,
      statusCode: 302,
      ipAddress: req.ip,
      metadata: { email: user.email }
    });
    req.session.authFeedback = {
      type: 'success',
      title: 'Account created',
      messages: ['Your account has been created successfully.']
    };

    return res.redirect('/dashboard');
  },

  async login(req, res) {
    const payload = normalizeAuthInput(req.body);
    const errors = [];

    if (!payload.email || !payload.password) {
      errors.push('Email and password are required.');
    }

    const user = payload.email ? await User.findOne({ email: payload.email }) : null;
    const passwordMatches = user ? await user.comparePassword(payload.password) : false;

    if (!user || !passwordMatches) {
      errors.push('Invalid email or password.');
    }

    if (user && user.status !== 'active') {
      errors.push('Your account is not active. Please contact support.');
    }

    if (errors.length > 0) {
      setAuthFeedback(req, {
        type: 'danger',
        title: 'Login failed',
        messages: errors,
        values: {
          email: payload.email
        }
      });
      await logService.createLog({
        userRole: 'guest',
        action: 'login_attempt',
        outcome: 'failure',
        method: req.method,
        route: req.originalUrl,
        statusCode: 302,
        ipAddress: req.ip,
        metadata: { email: payload.email, errors }
      });

      return res.redirect('/login');
    }

    req.session.user = user.toSessionUser();
    req.session.authFeedback = {
      type: 'success',
      title: 'Welcome back',
      messages: ['You have logged in successfully.']
    };

    return res.redirect(user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
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
          action: 'logout',
          outcome: 'success',
          method: req.method,
          route: req.originalUrl,
          statusCode: 302,
          ipAddress: req.ip,
          metadata: { email: currentUser.email }
        });
      }

      res.clearCookie('connect.sid');
      return res.redirect('/login');
    });
  }
};
