import { logService } from '../services/logService.js';

function getIpAddress(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || '';
}

export async function logAction(req, details = {}) {
  try {
    await logService.createLog({
      userId: req.session?.user?.id || null,
      userRole: req.session?.user?.role || 'guest',
      action: details.action,
      outcome: details.outcome || 'success',
      method: req.method,
      route: req.originalUrl || req.path,
      statusCode: details.statusCode || 200,
      ipAddress: getIpAddress(req),
      metadata: details.metadata || {}
    });
  } catch (error) {
    console.error('Failed to write accountability log:', error);
  }
}
