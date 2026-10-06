const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    tender_number: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    relevant_to: { type: String, default: '' },
    category: { type: String, default: '' },
    description: { type: String, default: '' },
    other: { type: String, default: '' },

    bid_start_date: { type: Date, default: null },
    bid_open_date: { type: Date, default: null },
    bid_closing_date: { type: Date, default: null },
    approved_date: { type: Date, default: null },

    file_sent_to_tec_date: { type: Date, default: null },
    file_sent_to_tec_second_time: { type: Date, default: null },

    bid_bond_number: { type: String, default: '' },
    bid_bond_bank: { type: String, default: '' },
    bid_validity_period: { type: Date, default: null },

    remark: { type: String, default: '' },

    status: {
      type: String,
      default: 'Under Evaluation'
    },

    tec_committee_number: { type: String, default: '' },
    tec_chairman: { type: String, default: '' },
    tec_member1: { type: String, default: '' },
    tec_member2: { type: String, default: '' },

    awarded_to: { type: String, default: '' },

    service_agreement_start_date: {
      type: Date,
      default: null
    },

    service_agreement_end_date: {
      type: Date,
      default: null
    },

    performance_bond_number: {
      type: String,
      default: ''
    },

    performance_bond_bank: {
      type: String,
      default: ''
    },

    performance_bond_remark: {
      type: String,
      default: ''
    },

    delay: {
      type: Number,
      default: 0
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

module.exports = mongoose.model('Record', recordSchema);
