const mongoose = require('mongoose');
const Committee = require('../models/Committee');
const AuditLog = require('../utils/auditLogger');

const formatCommittee = (committee) => {
  if (!committee) return null;

  const id = committee._id.toString();

  return {
    _id: id,
    id,
    committeeNumber: committee.committee_number || '',
    member1: committee.member1 || '',
    member2: committee.member2 || '',
    member3: committee.member3 || '',
    additionalMembers: Array.isArray(committee.additional_members)
      ? committee.additional_members
      : [],
    appointedDate: committee.appointed_date
      ? committee.appointed_date.toISOString().slice(0, 10)
      : '',
    status: committee.status || 'Active',
    createdAt: committee.created_at,
    updatedAt: committee.updated_at
  };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.list = async (req, res, next) => {
  try {
    const committees = await Committee.find({})
      .sort({ created_at: -1 });

    res.json(committees.map(formatCommittee));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const committeeNumber =
      req.body.committeeNumber || req.body.committee_number;

    const member1 = req.body.member1;
    const member2 = req.body.member2;
    const member3 = req.body.member3;

    const additionalMembers = Array.isArray(req.body.additionalMembers)
      ? req.body.additionalMembers
      : Array.isArray(req.body.additional_members)
        ? req.body.additional_members
        : [];

    const appointedDate =
      req.body.appointedDate || req.body.appointed_date;

    const status = req.body.status || 'Active';

    const committee = await Committee.create({
      committee_number: committeeNumber,
      member1,
      member2,
      member3,
      additional_members: additionalMembers,

      // Preserve old controller create behaviour:
      // if no date is supplied, use today's date.
      appointed_date: appointedDate
        ? new Date(String(appointedDate).slice(0, 10))
        : new Date(),

      status
    });

    const item = formatCommittee(committee);

    await AuditLog.create({
      user: req.user?.email,
      type: 'create:committee',
      message: `Created committee ${item.committeeNumber}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.status(201).json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Committee number already exists'
      });
    }

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

    const committee = await Committee.findById(req.params.id);

    if (!committee) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(formatCommittee(committee));
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

    const committee = await Committee.findById(req.params.id);

    if (!committee) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (req.body.committeeNumber !== undefined) {
      committee.committee_number = req.body.committeeNumber;
    } else if (req.body.committee_number !== undefined) {
      committee.committee_number = req.body.committee_number;
    }

    if (req.body.member1 !== undefined) {
      committee.member1 = req.body.member1;
    }

    if (req.body.member2 !== undefined) {
      committee.member2 = req.body.member2;
    }

    if (req.body.member3 !== undefined) {
      committee.member3 = req.body.member3;
    }

    if (req.body.additionalMembers !== undefined) {
      committee.additional_members =
        Array.isArray(req.body.additionalMembers)
          ? req.body.additionalMembers
          : [];
    } else if (req.body.additional_members !== undefined) {
      committee.additional_members =
        Array.isArray(req.body.additional_members)
          ? req.body.additional_members
          : [];
    }

    const rawAppointedDate =
      req.body.appointedDate !== undefined
        ? req.body.appointedDate
        : req.body.appointed_date;

    if (rawAppointedDate !== undefined) {
      committee.appointed_date = rawAppointedDate
        ? new Date(String(rawAppointedDate).slice(0, 10))
        : null;
    }

    if (req.body.status !== undefined) {
      committee.status = req.body.status;
    }

    const updated = await committee.save();
    const item = formatCommittee(updated);

    await AuditLog.create({
      user: req.user?.email,
      type: 'update:committee',
      message: `Updated committee ${item.committeeNumber}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.json(item);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'Committee number already exists'
      });
    }

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

    const committee = await Committee.findByIdAndDelete(req.params.id);

    if (committee) {
      await AuditLog.create({
        user: req.user?.email,
        type: 'delete:committee',
        message: `Deleted committee ${committee.committee_number}`
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
