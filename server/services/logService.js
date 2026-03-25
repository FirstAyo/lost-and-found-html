import mongoose from 'mongoose';
import { Log } from '../models/Log.js';

function toObjectIdOrNull(value) {
  return mongoose.isValidObjectId(value) ? new mongoose.Types.ObjectId(value) : null;
}

function mapLog(logDocument) {
  const log = logDocument.toObject ? logDocument.toObject({ virtuals: true }) : logDocument;

  return {
    id: String(log._id),
    action: log.action,
    outcome: log.outcome,
    method: log.method,
    route: log.route,
    statusCode: log.statusCode,
    userRole: log.userRole,
    userId: log.userId ? String(log.userId) : '',
    ipAddress: log.ipAddress || '',
    metadata: log.metadata || {},
    createdAt: log.createdAt
  };
}

function buildLogQuery(filters = {}) {
  const query = {};

  if (filters.outcome && ['success', 'failure', 'blocked'].includes(filters.outcome)) {
    query.outcome = filters.outcome;
  }

  if (filters.userRole && ['guest', 'member', 'admin'].includes(filters.userRole)) {
    query.userRole = filters.userRole;
  }

  if (filters.search) {
    query.$or = [
      { action: { $regex: filters.search, $options: 'i' } },
      { route: { $regex: filters.search, $options: 'i' } }
    ];
  }

  return query;
}

export const logService = {
  async createLog(payload = {}) {
    const createdLog = await Log.create({
      userId: toObjectIdOrNull(payload.userId),
      userRole: payload.userRole || 'guest',
      action: String(payload.action || 'unknown_action').trim(),
      outcome: payload.outcome || 'success',
      method: String(payload.method || 'GET').trim().toUpperCase(),
      route: String(payload.route || '').trim() || '/',
      statusCode: Number(payload.statusCode || 200),
      ipAddress: String(payload.ipAddress || '').trim(),
      metadata: payload.metadata || {}
    });

    return mapLog(createdLog);
  },

  async getRecentLogs(filters = {}, limit = 50) {
    const query = buildLogQuery(filters);
    const logs = await Log.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return logs.map(mapLog);
  },

  async getLogSummary() {
    const [
      totalLogs,
      successLogs,
      blockedLogs,
      failureLogs,
      recentLogs
    ] = await Promise.all([
      Log.countDocuments({}),
      Log.countDocuments({ outcome: 'success' }),
      Log.countDocuments({ outcome: 'blocked' }),
      Log.countDocuments({ outcome: 'failure' }),
      Log.find({}).sort({ createdAt: -1 }).limit(10).lean()
    ]);

    return {
      totals: {
        totalLogs,
        successLogs,
        blockedLogs,
        failureLogs
      },
      recentLogs: recentLogs.map(mapLog)
    };
  }
};
