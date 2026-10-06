const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true
    },

    code: {
      type: String,
      default: '',
      trim: true
    },

    description: {
      type: String,
      default: ''
    },

    head_of_department: {
      type: String,
      default: ''
    },

    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
      required: true
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

departmentSchema.index({ code: 1 });

module.exports = mongoose.model('Department', departmentSchema);
