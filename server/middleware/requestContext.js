/**
 * Adds common data to every rendered view.
 * This is useful for layouts, navigation state, and auth-aware UI rendering.
 */
export function requestContext(req, res, next) {
  res.locals.currentUser = req.session?.user || null;
  res.locals.currentPath = req.path;
  res.locals.year = new Date().getFullYear();
  next();
}
