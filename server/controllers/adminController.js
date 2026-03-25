import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminService } from '../services/adminService.js';
import { logAction } from '../middleware/logAction.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

async function deleteUploadedFile(imagePath) {
  if (!imagePath) {
    return;
  }

  try {
    const relativePath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    await fs.unlink(path.join(projectRoot, 'public', relativePath.replace(/^uploads\//, 'uploads/')));
  } catch {
    // Ignore cleanup failures during moderation deletes.
  }
}

function consumeAdminFeedback(session) {
  const feedback = session?.adminFeedback || null;

  if (session?.adminFeedback) {
    delete session.adminFeedback;
  }

  return feedback;
}

function setAdminFeedback(req, feedback) {
  req.session.adminFeedback = feedback;
}

export const adminController = {
  async renderDashboard(req, res, next) {
    try {
      const summary = await adminService.getDashboardSummary();

      return res.render('pages/admin/dashboard', {
        title: 'Admin Dashboard',
        layout: 'layouts/dashboard',
        pageCss: 'pages/admin.css',
        pageJs: 'pages/admin.js',
        summary,
        adminFeedback: consumeAdminFeedback(req.session)
      });
    } catch (error) {
      return next(error);
    }
  },

  async renderUsers(req, res, next) {
    try {
      const filters = {
        role: String(req.query.role || '').trim(),
        status: String(req.query.status || '').trim(),
        search: String(req.query.search || '').trim()
      };

      const users = await adminService.getUsers(filters);

      return res.render('pages/admin/users', {
        title: 'Manage Users',
        layout: 'layouts/dashboard',
        pageCss: 'pages/admin.css',
        pageJs: 'pages/admin.js',
        users,
        filters,
        adminFeedback: consumeAdminFeedback(req.session)
      });
    } catch (error) {
      return next(error);
    }
  },

  async renderListings(req, res, next) {
    try {
      const filters = {
        type: String(req.query.type || '').trim(),
        status: String(req.query.status || '').trim(),
        search: String(req.query.search || '').trim()
      };

      const items = await adminService.getItems(filters);

      return res.render('pages/admin/listings', {
        title: 'Manage Listings',
        layout: 'layouts/dashboard',
        pageCss: 'pages/admin.css',
        pageJs: 'pages/admin.js',
        items,
        filters,
        adminFeedback: consumeAdminFeedback(req.session)
      });
    } catch (error) {
      return next(error);
    }
  },

  async renderLogs(req, res, next) {
    try {
      const filters = {
        outcome: String(req.query.outcome || '').trim(),
        userRole: String(req.query.userRole || '').trim(),
        search: String(req.query.search || '').trim()
      };

      const summary = await adminService.getLogSummary(filters);

      return res.render('pages/admin/logs', {
        title: 'Accountability Logs',
        layout: 'layouts/dashboard',
        pageCss: 'pages/admin.css',
        pageJs: 'pages/admin.js',
        summary,
        filters,
        adminFeedback: consumeAdminFeedback(req.session)
      });
    } catch (error) {
      return next(error);
    }
  },

  async toggleUserStatus(req, res, next) {
    try {
      if (req.session.user.id === req.params.id) {
        setAdminFeedback(req, {
          type: 'warning',
          title: 'Action blocked',
          messages: ['You cannot suspend your own administrator account.']
        });
        return res.redirect('/admin/users');
      }

      const user = await adminService.toggleUserStatus(req.params.id);

      if (!user) {
        setAdminFeedback(req, {
          type: 'danger',
          title: 'User update failed',
          messages: ['The selected user could not be found.']
        });
        return res.redirect('/admin/users');
      }

      setAdminFeedback(req, {
        type: 'success',
        title: 'User updated',
        messages: [`${user.fullName} is now ${user.status}.`]
      });

      await logAction(req, {
        action: 'admin_toggle_user_status',
        outcome: 'success',
        statusCode: 302,
        metadata: { targetUserId: user.id, targetStatus: user.status }
      });

      return res.redirect('/admin/users');
    } catch (error) {
      return next(error);
    }
  },

  async resolveItem(req, res, next) {
    try {
      const item = await adminService.markItemResolved(req.params.id);

      if (!item) {
        setAdminFeedback(req, {
          type: 'danger',
          title: 'Listing update failed',
          messages: ['The selected listing could not be found.']
        });
        return res.redirect('/admin/listings');
      }

      setAdminFeedback(req, {
        type: 'success',
        title: 'Listing updated',
        messages: [`${item.title} has been marked as resolved.`]
      });

      await logAction(req, {
        action: 'admin_resolve_item',
        outcome: 'success',
        statusCode: 302,
        metadata: { itemId: item.id, title: item.title }
      });

      return res.redirect('/admin/listings');
    } catch (error) {
      return next(error);
    }
  },

  async deleteItem(req, res, next) {
    try {
      const item = await adminService.deleteItem(req.params.id);

      if (!item) {
        setAdminFeedback(req, {
          type: 'danger',
          title: 'Delete failed',
          messages: ['The selected listing could not be found.']
        });
        return res.redirect('/admin/listings');
      }

      await deleteUploadedFile(item.imagePath);

      setAdminFeedback(req, {
        type: 'success',
        title: 'Listing removed',
        messages: [`${item.title} has been deleted.`]
      });

      await logAction(req, {
        action: 'admin_delete_item',
        outcome: 'success',
        statusCode: 302,
        metadata: { itemId: item.id, title: item.title }
      });

      return res.redirect('/admin/listings');
    } catch (error) {
      return next(error);
    }
  }
};
