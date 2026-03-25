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

    return res.redirect('/login');
  };
}
