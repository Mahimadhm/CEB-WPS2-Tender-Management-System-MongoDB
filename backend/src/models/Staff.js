const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      default: null,
      trim: true
    },

    area: {
      type: String,
      default: ''
    },

    designation: {
      type: String,
      default: ''
    },

    department_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null
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

staffSchema.index({ department_id: 1 });

module.exports = mongoose.model('Staff', staffSchema);
