const mongoose = require('mongoose');
const Bidder = require('../models/Bidder');
const AuditLog = require('../utils/auditLogger');

const formatBidder = (bidder) => {
  if (!bidder) return null;

  const id = bidder._id.toString();

  return {
    _id: id,
    id,
    name: bidder.name || '',
    email: bidder.email || '',
    address: bidder.address || '',
    contact: bidder.contact || '',
    createdAt: bidder.created_at,
    updatedAt: bidder.updated_at
  };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.list = async (req, res, next) => {
  try {
    const bidders = await Bidder.find({})
      .sort({ created_at: -1 });

    res.json(bidders.map(formatBidder));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, address, contact } = req.body;

    const bidder = await Bidder.create({
      name: name || '',
      email: email || '',
      address: address || '',
      contact: contact || ''
    });

    const item = formatBidder(bidder);

    await AuditLog.create({
      user: req.user?.email,
      type: 'create:bidder',
      message: `Created bidder ${item.name}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const bidder = await Bidder.findById(req.params.id);

    if (!bidder) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(formatBidder(bidder));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const bidder = await Bidder.findById(req.params.id);

    if (!bidder) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (req.body.name !== undefined) {
      bidder.name = req.body.name;
    }

    if (req.body.email !== undefined) {
      bidder.email = req.body.email;
    }

    if (req.body.address !== undefined) {
      bidder.address = req.body.address;
    }

    if (req.body.contact !== undefined) {
      bidder.contact = req.body.contact;
    }

    const updated = await bidder.save();
    const item = formatBidder(updated);

    await AuditLog.create({
      user: req.user?.email,
      type: 'update:bidder',
      message: `Updated bidder ${item.name}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.json(item);
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const bidder = await Bidder.findByIdAndDelete(req.params.id);

    if (bidder) {
      await AuditLog.create({
        user: req.user?.email,
        type: 'delete:bidder',
        message: `Deleted bidder ${bidder.name}`
      }).catch(err =>
        console.error('AuditLog error:', err)
      );
    }

    res.json({
      message: 'Deleted'
    });
  } catch (err) {
    next(err);
  }
};
