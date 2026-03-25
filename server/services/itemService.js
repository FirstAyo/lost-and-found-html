import { Item } from '../models/Item.js';

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
      { location: { $regex: filters.search, $options: 'i' } }
    ];
  }

  return query;
}

function mapItemForView(itemDocument) {
  const item = itemDocument.toObject ? itemDocument.toObject({ virtuals: true }) : itemDocument;

  return {
    id: String(item._id),
    title: item.title,
    type: item.type,
    category: item.category,
    description: item.description,
    location: item.location,
    incidentDate: item.formattedIncidentDate || new Date(item.incidentDate).toISOString().split('T')[0],
    imagePath: item.imagePath,
    status: item.status,
    createdAt: item.createdAt,
    ownerName: item.owner?.fullName || 'Unknown user',
    ownerId: item.owner?._id ? String(item.owner._id) : String(item.owner || ''),
    isResolved: item.status === 'resolved'
  };
}

async function fetchOwnedItemOrThrow(itemId, ownerId) {
  const item = await Item.findOne({ _id: itemId, owner: ownerId });
  return item;
}

export const itemService = {
  async createItem(payload, ownerId) {
    const createdItem = await Item.create({
      ...payload,
      owner: ownerId
    });

    await createdItem.populate('owner', 'firstName lastName fullName');
    return mapItemForView(createdItem);
  },

  async updateOwnedItem(itemId, ownerId, payload) {
    const item = await fetchOwnedItemOrThrow(itemId, ownerId);

    if (!item) {
      return null;
    }

    Object.assign(item, payload);
    await item.save();
    await item.populate('owner', 'firstName lastName fullName');

    return mapItemForView(item);
  },

  async markOwnedItemResolved(itemId, ownerId) {
    const item = await fetchOwnedItemOrThrow(itemId, ownerId);

    if (!item) {
      return null;
    }

    item.status = 'resolved';
    await item.save();
    await item.populate('owner', 'firstName lastName fullName');

    return mapItemForView(item);
  },

  async deleteOwnedItem(itemId, ownerId) {
    const item = await fetchOwnedItemOrThrow(itemId, ownerId);

    if (!item) {
      return null;
    }

    const snapshot = mapItemForView(item);
    await item.deleteOne();

    return snapshot;
  },

  async getBrowseItems(filters = {}) {
    const query = buildBrowseQuery(filters);
    const items = await Item.find(query)
      .populate('owner', 'firstName lastName fullName')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    return items.map(mapItemForView);
  },

  async getItemById(itemId) {
    const item = await Item.findById(itemId)
      .populate('owner', 'firstName lastName fullName')
      .lean({ virtuals: true });

    return item ? mapItemForView(item) : null;
  },

  async getItemsByOwner(ownerId) {
    const items = await Item.find({ owner: ownerId })
      .populate('owner', 'firstName lastName fullName')
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
      Item.find({ owner: ownerId }).sort({ createdAt: -1 }).limit(4).lean({ virtuals: true })
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
