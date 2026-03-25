/**
 * Protects member-only routes.
 * Guests are redirected to the login page with a small feedback message.
 */
export function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next();
  }

  req.session.authFeedback = {
    type: 'warning',
    title: 'Login required',
    messages: ['Please login to continue.']
  };

  return res.redirect('/login');
}

export function requireGuest(req, res, next) {
  if (!req.session?.user) {
    return next();
  }

  return res.redirect(req.session.user.role === 'admin' ? '/admin/dashboard' : '/dashboard');
}
