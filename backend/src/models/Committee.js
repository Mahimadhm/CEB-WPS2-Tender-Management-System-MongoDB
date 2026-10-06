const mongoose = require('mongoose');

const committeeSchema = new mongoose.Schema(
  {
    committee_number: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    member1: {
      type: String,
      required: true,
      trim: true
    },

    member2: {
      type: String,
      required: true,
      trim: true
    },

    member3: {
      type: String,
      required: true,
      trim: true
    },

    additional_members: {
      type: [String],
      default: []
    },

    appointed_date: {
      type: Date,
      default: null
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

module.exports = mongoose.model('Committee', committeeSchema);
