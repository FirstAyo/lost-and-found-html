import { Item } from '../models/Item.js';
import { buildCampusDisplayLabel } from '../config/campusLocations.js';

function buildBrowseQuery(filters = {}) {
  const query = {};

  if (filters.type && ['lost', 'found'].includes(filters.type)) {
    query.type = filters.type;
  }

  if (filters.status && ['active', 'resolved'].includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.category) {
    query.category = filters.category;
  }

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
      { location: { $regex: filters.search, $options: 'i' } },
      { foundLocationNotes: { $regex: filters.search, $options: 'i' } },
      { pickupInstructions: { $regex: filters.search, $options: 'i' } }
    ];
  }

  return query;
}

function getFoundLocationLabel(item) {
  return buildCampusDisplayLabel(item.foundLocation, item.foundLocationOther);
}

function getPickupLocationLabel(item) {
  return buildCampusDisplayLabel(item.pickupLocation, item.pickupLocationOther);
}

function deriveDisplayLocation(item) {
  if (item.type === 'found') {
    return getFoundLocationLabel(item) || item.location || 'Langara campus';
  }

  return item.lastSeenLocation || item.location || 'Langara campus';
}

function mapItemForView(itemDocument) {
  const item = itemDocument.toObject ? itemDocument.toObject({ virtuals: true }) : itemDocument;
  const ownerFullName = item.owner?.fullName || 'Unknown user';
  const ownerEmail = item.owner?.email || '';
  const contactEmail = item.contactEmail || ownerEmail || '';
  const contactPhone = item.contactPhone || '';
  const contactMethod = item.contactMethod || (contactPhone ? 'both' : 'email');

  return {
    id: String(item._id),
    title: item.title,
    type: item.type,
    category: item.category,
    description: item.description,
    location: deriveDisplayLocation(item),
    incidentDate: item.formattedIncidentDate || new Date(item.incidentDate).toISOString().split('T')[0],
    imagePath: item.imagePath,
    status: item.status,
    createdAt: item.createdAt,
    ownerName: ownerFullName,
    ownerEmail,
    ownerId: item.owner?._id ? String(item.owner._id) : String(item.owner || ''),
    isResolved: item.status === 'resolved',
    lastSeenLocation: item.lastSeenLocation || item.location || '',
    lastSeenNotes: item.lastSeenNotes || '',
    foundLocation: item.foundLocation || '',
    foundLocationOther: item.foundLocationOther || '',
    foundLocationLabel: getFoundLocationLabel(item) || item.location || '',
    foundLocationNotes: item.foundLocationNotes || '',
    pickupLocation: item.pickupLocation || '',
    pickupLocationOther: item.pickupLocationOther || '',
    pickupLocationLabel: getPickupLocationLabel(item) || '',
    pickupInstructions: item.pickupInstructions || '',
    contactMethod,
    contactEmail,
    contactPhone,
    foundLocationPreview: item.foundLocationPreview || null,
    pickupLocationPreview: item.pickupLocationPreview || null
  };
}

export const itemService = {
  async createItem(payload, ownerId) {
    const createdItem = await Item.create({
      ...payload,
      owner: ownerId
    });

    await createdItem.populate('owner', 'firstName lastName fullName email');
    return mapItemForView(createdItem);
  },

  async getBrowseItems(filters = {}) {
    const query = buildBrowseQuery(filters);
    const items = await Item.find(query)
      .populate('owner', 'firstName lastName fullName email')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    return items.map(mapItemForView);
  },

  async getItemById(itemId) {
    const item = await Item.findById(itemId)
      .populate('owner', 'firstName lastName fullName email')
      .lean({ virtuals: true });

    return item ? mapItemForView(item) : null;
  },

  async getItemsByOwner(ownerId) {
    const items = await Item.find({ owner: ownerId })
      .populate('owner', 'firstName lastName fullName email')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    return items.map(mapItemForView);
  },

  async getDashboardSummary(ownerId) {
    const [totalItems, activeItems, resolvedItems, lostItems, foundItems, recentItems] = await Promise.all([
      Item.countDocuments({ owner: ownerId }),
      Item.countDocuments({ owner: ownerId, status: 'active' }),
      Item.countDocuments({ owner: ownerId, status: 'resolved' }),
      Item.countDocuments({ owner: ownerId, type: 'lost' }),
      Item.countDocuments({ owner: ownerId, type: 'found' }),
      Item.find({ owner: ownerId })
        .populate('owner', 'firstName lastName fullName email')
        .sort({ createdAt: -1 })
        .limit(4)
        .lean({ virtuals: true })
    ]);

    return {
      totalItems,
      activeItems,
      resolvedItems,
      lostItems,
      foundItems,
      recentItems: recentItems.map(mapItemForView)
    };
  }
};
