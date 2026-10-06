const mongoose = require('mongoose');

const bidderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true
    },

    email: {
      type: String,
      default: '',
      trim: true
    },

    address: {
      type: String,
      default: ''
    },

    contact: {
      type: String,
      default: '',
      trim: true
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

module.exports = mongoose.model('Bidder', bidderSchema);
