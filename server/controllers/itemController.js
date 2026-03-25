import fs from 'fs/promises';
import mongoose from 'mongoose';
import { itemService } from '../services/itemService.js';
import { getUploadErrorMessage } from '../middleware/uploadMiddleware.js';
import { logAction } from '../middleware/logAction.js';

const ITEM_TYPES = ['lost', 'found'];
const CATEGORIES = ['Electronics', 'Wallet', 'Keys', 'Documents', 'Bag', 'Clothing', 'Other'];

function buildItemFormDefaults(type = 'lost') {
  return {
    title: '',
    type,
    category: '',
    description: '',
    location: '',
    incidentDate: ''
  };
}

function normalizeItemPayload(payload = {}, type = 'lost') {
  return {
    title: String(payload.title || '').trim(),
    type,
    category: String(payload.category || '').trim(),
    description: String(payload.description || '').trim(),
    location: String(payload.location || '').trim(),
    incidentDate: String(payload.incidentDate || '').trim()
  };
}

function validateItemPayload(payload) {
  const errors = [];

  if (payload.title.length < 3) {
    errors.push('Title must be at least 3 characters long.');
  }

  if (!CATEGORIES.includes(payload.category)) {
    errors.push('Please choose a valid category.');
  }

  if (payload.description.length < 10) {
    errors.push('Description must be at least 10 characters long.');
  }

  if (payload.location.length < 2) {
    errors.push('Location is required.');
  }

  const parsedDate = new Date(payload.incidentDate);
  if (Number.isNaN(parsedDate.getTime())) {
    errors.push('Please enter a valid date.');
  }

  return errors;
}

function consumeItemFeedback(session) {
  const feedback = session?.itemFeedback || null;
  if (session?.itemFeedback) {
    delete session.itemFeedback;
  }
  return feedback;
}

function setItemFeedback(req, feedback) {
  req.session.itemFeedback = feedback;
}

async function deleteUploadedFile(file) {
  if (!file?.path) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch {
    // Ignore cleanup errors to avoid masking the primary failure.
  }
}

function buildRedirectPath(itemType) {
  return itemType === 'lost' ? '/items/new/lost' : '/items/new/found';
}

export const itemController = {
  async renderBrowse(req, res, next) {
    try {
      const filters = {
        type: String(req.query.type || '').trim(),
        status: String(req.query.status || '').trim(),
        category: String(req.query.category || '').trim(),
        search: String(req.query.search || '').trim()
      };

      const items = await itemService.getBrowseItems(filters);

      return res.render('pages/browse', {
        title: 'Browse Listings',
        pageCss: 'pages/browse.css',
        pageJs: 'pages/browse.js',
        items,
        filters,
        categories: CATEGORIES
      });
    } catch (error) {
      return next(error);
    }
  },

  renderCreateLost(req, res) {
    return res.render('pages/items/post-item', {
      title: 'Post Lost Item',
      layout: 'layouts/dashboard',
      pageCss: 'pages/post-item.css',
      pageJs: 'pages/post-item.js',
      formTitle: 'Report a lost item',
      formSubtitle: 'Provide enough detail so other members can help identify your missing item.',
      submitLabel: 'Publish Lost Item',
      itemType: 'lost',
      categories: CATEGORIES,
      itemFeedback: consumeItemFeedback(req.session),
      values: buildItemFormDefaults('lost')
    });
  },

  renderCreateFound(req, res) {
    return res.render('pages/items/post-item', {
      title: 'Post Found Item',
      layout: 'layouts/dashboard',
      pageCss: 'pages/post-item.css',
      pageJs: 'pages/post-item.js',
      formTitle: 'Report a found item',
      formSubtitle: 'Share where you found the item and enough detail to help the owner claim it.',
      submitLabel: 'Publish Found Item',
      itemType: 'found',
      categories: CATEGORIES,
      itemFeedback: consumeItemFeedback(req.session),
      values: buildItemFormDefaults('found')
    });
  },

  async createItem(req, res, next) {
    try {
      const itemType = String(req.params.type || '').trim();
      if (!ITEM_TYPES.includes(itemType)) {
        await deleteUploadedFile(req.file);
        return res.status(400).redirect('/dashboard');
      }

      const payload = normalizeItemPayload(req.body, itemType);
      const errors = validateItemPayload(payload);

      if (req.fileValidationError) {
        errors.push(req.fileValidationError);
      }

      if (errors.length > 0) {
        await deleteUploadedFile(req.file);
        setItemFeedback(req, {
          type: 'danger',
          title: 'Unable to publish item',
          messages: errors,
          values: payload
        });
        return res.redirect(buildRedirectPath(itemType));
      }

      const createdItem = await itemService.createItem(
        {
          ...payload,
          incidentDate: new Date(payload.incidentDate),
          imagePath: req.file ? `/uploads/${req.file.filename}` : ''
        },
        req.session.user.id
      );

      await logAction(req, {
        action: 'item_create',
        outcome: 'success',
        statusCode: 302,
        metadata: { itemId: createdItem.id, itemType: itemType, title: createdItem.title }
      });

      setItemFeedback(req, {
        type: 'success',
        title: 'Item published',
        messages: [`Your ${itemType} item has been posted successfully.`]
      });

      return res.redirect('/items/mine');
    } catch (error) {
      await deleteUploadedFile(req.file);
      return next(error);
    }
  },

  handleUploadError(error, req, res, next) {
    if (!error) {
      return next();
    }

    req.fileValidationError = getUploadErrorMessage(error);
    return next();
  },

  async renderMyItems(req, res, next) {
    try {
      const items = await itemService.getItemsByOwner(req.session.user.id);

      return res.render('pages/items/my-items', {
        title: 'My Listings',
        layout: 'layouts/dashboard',
        pageCss: 'pages/my-items.css',
        pageJs: 'pages/my-items.js',
        items,
        itemFeedback: consumeItemFeedback(req.session)
      });
    } catch (error) {
      return next(error);
    }
  },

  async renderDetails(req, res, next) {
    try {
      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        return res.status(404).render('pages/not-found', {
          title: 'Item Not Found',
          pageCss: 'pages/not-found.css',
          pageJs: 'pages/not-found.js'
        });
      }

      const item = await itemService.getItemById(id);

      if (!item) {
        return res.status(404).render('pages/not-found', {
          title: 'Item Not Found',
          pageCss: 'pages/not-found.css',
          pageJs: 'pages/not-found.js'
        });
      }

      return res.render('pages/items/details', {
        title: `${item.title} | Details`,
        pageCss: 'pages/item-details.css',
        pageJs: 'pages/item-details.js',
        item
      });
    } catch (error) {
      return next(error);
    }
  },

  async listItemsApi(req, res, next) {
    try {
      const filters = {
        type: String(req.query.type || '').trim(),
        status: String(req.query.status || '').trim(),
        category: String(req.query.category || '').trim(),
        search: String(req.query.search || '').trim()
      };

      const items = await itemService.getBrowseItems(filters);

      return res.status(200).json({
        success: true,
        items
      });
    } catch (error) {
      return next(error);
    }
  },

  async getItemApi(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({
          success: false,
          message: 'Item not found.'
        });
      }

      const item = await itemService.getItemById(id);

      if (!item) {
        return res.status(404).json({
          success: false,
          message: 'Item not found.'
        });
      }

      return res.status(200).json({
        success: true,
        item
      });
    } catch (error) {
      return next(error);
    }
  }
};
