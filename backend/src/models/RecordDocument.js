const mongoose = require('mongoose');

const recordDocumentSchema = new mongoose.Schema(
  {
    record_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Record',
      required: true
    },

    file_name: {
      type: String,
      required: true,
      trim: true
    },

    file_path: {
      type: String,
      required: true
    },

    file_size: {
      type: Number,
      default: 0
    },

    mime_type: {
      type: String,
      default: ''
    },

    uploaded_at: {
      type: Date,
      default: Date.now
    }
  },
  {
    versionKey: false
  }
);

recordDocumentSchema.index({ record_id: 1 });

module.exports = mongoose.model(
  'RecordDocument',
  recordDocumentSchema
);
