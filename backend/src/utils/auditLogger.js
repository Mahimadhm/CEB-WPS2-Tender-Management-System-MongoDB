const AuditLog = require('../models/AuditLog');

exports.create = async function(data) {
  try {
    const payload = Array.isArray(data) ? data : [data];

    const rows = payload.map(item => ({
      user: item.user || item.username || 'System',
      type: item.type || 'action',
      message: item.message || '',
      ip_address: item.ipAddress || item.ip_address || ''
    }));

    const inserted = await AuditLog.insertMany(rows);

    return inserted.length > 0 ? inserted[0] : null;
  } catch (err) {
    console.error('[MongoDB AuditLog] Error creating audit log:', err.message);
    return null;
  }
};
