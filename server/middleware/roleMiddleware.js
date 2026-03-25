import { logAction } from './logAction.js';

/**
 * Restricts access to users with one of the allowed roles.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.session?.user?.role;

    if (userRole && allowedRoles.includes(userRole)) {
      return next();
    }

    req.session.authFeedback = {
      type: 'danger',
      title: 'Access denied',
      messages: ['You do not have permission to access that page.']
    };

    logAction(req, {
      action: 'role_access_denied',
      outcome: 'blocked',
      statusCode: 302,
      metadata: { allowedRoles }
    });

    return res.redirect('/login');
  };
}
