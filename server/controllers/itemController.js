import fs from 'fs/promises';
import mongoose from 'mongoose';
import { itemService } from '../services/itemService.js';
import { getUploadErrorMessage } from '../middleware/uploadMiddleware.js';
import { logAction } from '../middleware/logAction.js';
import { getCampusLocationOptions, buildCampusDisplayLabel } from '../config/campusLocations.js';
import { locationService, geocodeLocation } from '../services/locationService.js';

const ITEM_TYPES = ['lost', 'found'];
const CONTACT_METHODS = ['email', 'phone', 'both'];
const CATEGORIES = ['Electronics', 'Wallet', 'Keys', 'Documents', 'Bag', 'Clothing', 'Other'];
const CAMPUS_LOCATION_OPTIONS = getCampusLocationOptions();

function buildItemFormDefaults(type = 'lost', currentUser = null) {
  return {
    title: '',
    type,
    category: '',
    description: '',
    location: '',
    incidentDate: '',
    lastSeenLocation: '',
    lastSeenNotes: '',
    foundLocation: '',
    foundLocationOther: '',
    foundLocationNotes: '',
    pickupLocation: '',
    pickupLocationOther: '',
    pickupInstructions: '',
    contactMethod: 'email',
    contactEmail: currentUser?.email || '',
    contactPhone: ''
  };
}

function normalizeItemPayload(payload = {}, type = 'lost', currentUser = null) {
  return {
    title: String(payload.title || '').trim(),
    type,
    category: String(payload.category || '').trim(),
    description: String(payload.description || '').trim(),
    location: String(payload.location || '').trim(),
    incidentDate: String(payload.incidentDate || '').trim(),
    lastSeenLocation: String(payload.lastSeenLocation || '').trim(),
    lastSeenNotes: String(payload.lastSeenNotes || '').trim(),
    foundLocation: String(payload.foundLocation || '').trim(),
    foundLocationOther: String(payload.foundLocationOther || '').trim(),
    foundLocationNotes: String(payload.foundLocationNotes || '').trim(),
    pickupLocation: String(payload.pickupLocation || '').trim(),
    pickupLocationOther: String(payload.pickupLocationOther || '').trim(),
    pickupInstructions: String(payload.pickupInstructions || '').trim(),
    contactMethod: String(payload.contactMethod || 'email').trim(),
    contactEmail: String(payload.contactEmail || currentUser?.email || '').trim().toLowerCase(),
    contactPhone: String(payload.contactPhone || '').trim()
  };
}

function deriveLegacyLocation(payload) {
  if (payload.type === 'found') {
    const foundLabel = buildCampusDisplayLabel(payload.foundLocation, payload.foundLocationOther);
    return foundLabel || payload.location || 'Langara campus';
  }

  return payload.lastSeenLocation || payload.location || 'Langara campus';
}

function validateItemPayload(payload) {
  const errors = [];
  const campusValues = CAMPUS_LOCATION_OPTIONS.map((location) => location.value);

  if (payload.title.length < 3) {
    errors.push('Title must be at least 3 characters long.');
  }

  if (!CATEGORIES.includes(payload.category)) {
    errors.push('Please choose a valid category.');
  }

  if (payload.description.length < 10) {
    errors.push('Description must be at least 10 characters long.');
  }

  const parsedDate = new Date(payload.incidentDate);
  if (Number.isNaN(parsedDate.getTime())) {
    errors.push('Please enter a valid date.');
  }

  if (payload.type === 'lost') {
    if (payload.lastSeenLocation.length < 2 && payload.location.length < 2) {
      errors.push('Please enter where the item was last seen on campus.');
    }
  }

  if (payload.type === 'found') {
    if (!campusValues.includes(payload.foundLocation)) {
      errors.push('Please choose where on Langara campus the item was found.');
    }

    if (payload.foundLocation === 'other' && payload.foundLocationOther.length < 2) {
      errors.push('Please describe the found location when selecting Other.');
    }

    if (!campusValues.includes(payload.pickupLocation)) {
      errors.push('Please choose where the owner can pick up the item.');
    }

    if (payload.pickupLocation === 'other' && payload.pickupLocationOther.length < 2) {
      errors.push('Please describe the pickup location when selecting Other.');
    }
  }

  if (!CONTACT_METHODS.includes(payload.contactMethod)) {
    errors.push('Please choose a valid contact method.');
  }

  if ((payload.contactMethod === 'email' || payload.contactMethod === 'both') && !payload.contactEmail.includes('@')) {
    errors.push('Please enter a valid contact email.');
  }

  if ((payload.contactMethod === 'phone' || payload.contactMethod === 'both') && payload.contactPhone.length < 7) {
    errors.push('Please enter a valid contact phone number.');
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

async function buildLocationPayload(payload) {
  const legacyLocation = deriveLegacyLocation(payload);

  if (payload.type === 'lost') {
    return {
      location: legacyLocation,
      lastSeenLocation: payload.lastSeenLocation || legacyLocation,
      lastSeenNotes: payload.lastSeenNotes,
      contactMethod: payload.contactMethod,
      contactEmail: payload.contactEmail,
      contactPhone: payload.contactPhone
    };
  }

  const [foundLocationPreview, pickupLocationPreview] = await Promise.all([
    locationService.buildCampusLocationPreview(payload.foundLocation, payload.foundLocationOther),
    locationService.buildCampusLocationPreview(payload.pickupLocation, payload.pickupLocationOther)
  ]);

  return {
    location: legacyLocation,
    foundLocation: payload.foundLocation,
    foundLocationOther: payload.foundLocationOther,
    foundLocationNotes: payload.foundLocationNotes,
    pickupLocation: payload.pickupLocation,
    pickupLocationOther: payload.pickupLocationOther,
    pickupInstructions: payload.pickupInstructions,
    contactMethod: payload.contactMethod,
    contactEmail: payload.contactEmail,
    contactPhone: payload.contactPhone,
    foundLocationPreview,
    pickupLocationPreview
  };
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
      formSubtitle: 'Record where on the Langara campus you last saw the item and how people can reach you.',
      submitLabel: 'Publish Lost Item',
      itemType: 'lost',
      categories: CATEGORIES,
      campusLocations: CAMPUS_LOCATION_OPTIONS,
      contactMethods: CONTACT_METHODS,
      itemFeedback: consumeItemFeedback(req.session),
      values: buildItemFormDefaults('lost', req.session.user)
    });
  },

  renderCreateFound(req, res) {
    return res.render('pages/items/post-item', {
      title: 'Post Found Item',
      layout: 'layouts/dashboard',
      pageCss: 'pages/post-item.css',
      pageJs: 'pages/post-item.js',
      formTitle: 'Report a found item',
      formSubtitle: 'Show exactly where on the Langara campus the item was found and where the owner can verify and collect it.',
      submitLabel: 'Publish Found Item',
      itemType: 'found',
      categories: CATEGORIES,
      campusLocations: CAMPUS_LOCATION_OPTIONS,
      contactMethods: CONTACT_METHODS,
      itemFeedback: consumeItemFeedback(req.session),
      values: buildItemFormDefaults('found', req.session.user)
    });
  },

  async createItem(req, res, next) {
    try {
      const itemType = String(req.params.type || '').trim();
      if (!ITEM_TYPES.includes(itemType)) {
        await deleteUploadedFile(req.file);
        return res.status(400).redirect('/dashboard');
      }

      const payload = normalizeItemPayload(req.body, itemType, req.session.user);
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

      const locationPayload = await buildLocationPayload(payload);
      const createdItem = await itemService.createItem(
        {
          title: payload.title,
          type: itemType,
          category: payload.category,
          description: payload.description,
          incidentDate: new Date(payload.incidentDate),
          imagePath: req.file ? `/uploads/${req.file.filename}` : '',
          ...locationPayload
        },
        req.session.user.id
      );

      await logAction(req, {
        action: 'item_create',
        outcome: 'success',
        statusCode: 302,
        metadata: { itemId: createdItem.id, itemType, title: createdItem.title }
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

      return res.status(200).json({ success: true, items });
    } catch (error) {
      return next(error);
    }
  },

  async getItemApi(req, res, next) {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }

      const item = await itemService.getItemById(id);

      if (!item) {
        return res.status(404).json({ success: false, message: 'Item not found.' });
      }

      return res.status(200).json({ success: true, item });
    } catch (error) {
      return next(error);
    }
  }
};
