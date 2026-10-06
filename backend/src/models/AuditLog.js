const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      default: 'System'
    },
    type: {
      type: String,
      default: 'action'
    },
    message: {
      type: String,
      default: ''
    },
    ip_address: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    versionKey: false
  }
);

auditLogSchema.index({ created_at: -1 });
auditLogSchema.index({ type: 1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
