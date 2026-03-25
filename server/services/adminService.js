import mongoose from 'mongoose';
import { User } from '../models/User.js';
import { Item } from '../models/Item.js';
import { logService } from './logService.js';

function mapUserForAdmin(userDocument) {
  const user = userDocument.toObject ? userDocument.toObject({ virtuals: true }) : userDocument;

  return {
    id: String(user._id),
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    itemCount: typeof user.itemCount === 'number' ? user.itemCount : 0
  };
}

function mapItemForAdmin(itemDocument) {
  const item = itemDocument.toObject ? itemDocument.toObject({ virtuals: true }) : itemDocument;

  return {
    id: String(item._id),
    title: item.title,
    type: item.type,
    category: item.category,
    location: item.location,
    status: item.status,
    incidentDate:
      item.formattedIncidentDate || new Date(item.incidentDate).toISOString().split('T')[0],
    ownerName: item.owner?.fullName || 'Unknown user',
    ownerEmail: item.owner?.email || '',
    imagePath: item.imagePath || '',
    createdAt: item.createdAt
  };
}

function buildUserQuery(filters = {}) {
  const query = {};

  if (filters.role && ['member', 'admin'].includes(filters.role)) {
    query.role = filters.role;
  }

  if (filters.status && ['active', 'suspended'].includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.search) {
    query.$or = [
      { firstName: { $regex: filters.search, $options: 'i' } },
      { lastName: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } }
    ];
  }

  return query;
}

function buildItemQuery(filters = {}) {
  const query = {};

  if (filters.type && ['lost', 'found'].includes(filters.type)) {
    query.type = filters.type;
  }

  if (filters.status && ['active', 'resolved'].includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.search) {
    query.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { category: { $regex: filters.search, $options: 'i' } },
      { location: { $regex: filters.search, $options: 'i' } }
    ];
  }

  return query;
}

export const adminService = {
  async getDashboardSummary() {
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      adminUsers,
      totalItems,
      activeItems,
      resolvedItems,
      lostItems,
      foundItems,
      recentUsers,
      recentItems
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ role: 'admin' }),
      Item.countDocuments({}),
      Item.countDocuments({ status: 'active' }),
      Item.countDocuments({ status: 'resolved' }),
      Item.countDocuments({ type: 'lost' }),
      Item.countDocuments({ type: 'found' }),
      User.find({}).sort({ createdAt: -1 }).limit(5).lean({ virtuals: true }),
      Item.find({})
        .populate('owner', 'firstName lastName fullName email')
        .sort({ createdAt: -1 })
        .limit(6)
        .lean({ virtuals: true })
    ]);

    return {
      totals: {
        totalUsers,
        activeUsers,
        suspendedUsers,
        adminUsers,
        totalItems,
        activeItems,
        resolvedItems,
        lostItems,
        foundItems
      },
      recentUsers: recentUsers.map(mapUserForAdmin),
      recentItems: recentItems.map(mapItemForAdmin)
    };
  },

  async getUsers(filters = {}) {
    const query = buildUserQuery(filters);

    const users = await User.aggregate([
      { $match: query },
      {
        $lookup: {
          from: 'items',
          localField: '_id',
          foreignField: 'owner',
          as: 'ownedItems'
        }
      },
      {
        $addFields: {
          itemCount: { $size: '$ownedItems' },
          fullName: {
            $trim: {
              input: { $concat: ['$firstName', ' ', '$lastName'] }
            }
          }
        }
      },
      {
        $project: {
          ownedItems: 0,
          password: 0
        }
      },
      { $sort: { createdAt: -1 } }
    ]);

    return users.map(mapUserForAdmin);
  },

  async getItems(filters = {}) {
    const query = buildItemQuery(filters);
    const items = await Item.find(query)
      .populate('owner', 'firstName lastName fullName email')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });

    return items.map(mapItemForAdmin);
  },

  async toggleUserStatus(targetUserId) {
    if (!mongoose.isValidObjectId(targetUserId)) {
      return null;
    }

    const user = await User.findById(targetUserId);
    if (!user) {
      return null;
    }

    user.status = user.status === 'active' ? 'suspended' : 'active';
    await user.save();

    return mapUserForAdmin(user);
  },

  async deleteItem(itemId) {
    if (!mongoose.isValidObjectId(itemId)) {
      return null;
    }

    const item = await Item.findByIdAndDelete(itemId)
      .populate('owner', 'firstName lastName fullName email')
      .lean({ virtuals: true });

    return item ? mapItemForAdmin(item) : null;
  },

  async getLogSummary(filters = {}) {
    return logService.getLogSummary(filters);
  },

  async markItemResolved(itemId) {
    if (!mongoose.isValidObjectId(itemId)) {
      return null;
    }

    const item = await Item.findByIdAndUpdate(
      itemId,
      { status: 'resolved' },
      { new: true }
    )
      .populate('owner', 'firstName lastName fullName email')
      .lean({ virtuals: true });

    return item ? mapItemForAdmin(item) : null;
  }
};
