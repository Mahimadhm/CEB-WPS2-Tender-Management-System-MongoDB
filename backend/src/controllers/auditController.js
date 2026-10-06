const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

const formatAuditLog = (row) => {
  if (!row) return null;

  const id = row._id ? row._id.toString() : '';

  return {
    _id: id,
    id,
    user: row.user || 'System',
    type: row.type || '',
    message: row.message || '',
    ipAddress: row.ip_address || '',
    timestamp: row.created_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
};

exports.list = async (req, res, next) => {
  try {
    const data = await AuditLog.find({})
      .sort({ created_at: -1 })
      .limit(500)
      .lean();

    const items = data.map(formatAuditLog);

    res.json(items);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ message: 'Not found' });
    }

    const data = await AuditLog.findById(id).lean();

    if (!data) {
      return res.status(404).json({ message: 'Not found' });
    }

    res.json(formatAuditLog(data));
  } catch (err) {
    next(err);
  }
};
