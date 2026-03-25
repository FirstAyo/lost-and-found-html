import { itemService } from '../services/itemService.js';

function consumeAuthFeedback(session) {
  const feedback = session?.authFeedback || null;

  if (session?.authFeedback) {
    delete session.authFeedback;
  }

  return feedback;
}

export const pageController = {
  async renderHome(req, res, next) {
    try {
      const items = await itemService.getBrowseItems({});
      const featuredItems = items.slice(0, 3);

      return res.render('pages/index', {
        title: 'Lost & Found | Home',
        pageCss: 'pages/index.css',
        pageJs: 'pages/index.js',
        featuredItems
      });
    } catch (error) {
      return next(error);
    }
  },

  renderLogin(req, res) {
    res.render('pages/login', {
      title: 'Login',
      layout: 'layouts/auth',
      pageCss: 'pages/login.css',
      pageJs: 'pages/login.js',
      authFeedback: consumeAuthFeedback(req.session)
    });
  },

  renderRegister(req, res) {
    res.render('pages/register', {
      title: 'Register',
      layout: 'layouts/auth',
      pageCss: 'pages/register.css',
      pageJs: 'pages/register.js',
      authFeedback: consumeAuthFeedback(req.session)
    });
  },

  async renderDashboard(req, res, next) {
    try {
      const summary = await itemService.getDashboardSummary(req.session.user.id);

      return res.render('pages/dashboard', {
        title: 'Dashboard',
        layout: 'layouts/dashboard',
        pageCss: 'pages/dashboard.css',
        pageJs: 'pages/dashboard.js',
        summary
      });
    } catch (error) {
      return next(error);
    }
  }
};
