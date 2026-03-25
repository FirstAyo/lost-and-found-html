export const adminController = {
  renderDashboard(req, res) {
    return res.render('pages/admin/dashboard', {
      title: 'Admin Dashboard',
      layout: 'layouts/dashboard',
      pageCss: 'pages/admin.css',
      pageJs: 'pages/admin.js'
    });
  }
};
