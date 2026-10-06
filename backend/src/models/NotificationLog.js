const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema(
  {
    record_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
      required: true
    },

    notification_type: {
      type: String,
      required: true,
      enum: [
        'deadline_15',
        'deadline_10',
        'deadline_5',
        'deadline_1',
        'award',
        'tec_appointment',
        'completion',
        'delay_2',
        'delay_5',
        'delay_10'
      ]
    },

    recipient_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    recipient_role: {
      type: String,
      default: ''
    },

    status: {
      type: String,
      enum: ['sent', 'failed'],
      required: true
    },

    error_message: {
      type: String,
      default: null
    },

    sent_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

notificationLogSchema.index({ record_id: 1 });
notificationLogSchema.index({ sent_at: -1 });
notificationLogSchema.index({
  record_id: 1,
  notification_type: 1,
  status: 1
});

module.exports = mongoose.model('NotificationLog', notificationLogSchema);
