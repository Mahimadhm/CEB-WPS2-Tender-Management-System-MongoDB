const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const AuditLog = require('../utils/auditLogger');

const formatUser = (user) => {
  if (!user) return null;

  const id = user._id.toString();

  return {
    _id: id,
    id,
    name: user.name || '',
    email: user.email || '',
    epfNumber: user.epf_number || '',
    role: user.role || 'Clerk',
    status: user.status || 'Active',
    lastLogin: user.last_login || null,
    createdAt: user.created_at,
    updatedAt: user.updated_at
  };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.list = async (req, res, next) => {
  try {
    const users = await User.find({})
      .select('-password')
      .sort({ created_at: -1 });

    res.json(users.map(formatUser));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      name,
      email,
      epfNumber,
      password,
      role,
      status
    } = req.body;

    if (!email || !password || !name || !epfNumber) {
      return res.status(400).json({
        message: 'Missing fields'
      });
    }

    // Only a Super Admin may create another Super Admin.
    if (
      role === 'Super Admin' &&
      req.user?.role !== 'Super Admin'
    ) {
      return res.status(403).json({
        message: 'Only a Super Admin can create a Super Admin account'
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedEPF = String(epfNumber).trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail
    }).select('_id');

    if (existingEmail) {
      return res.status(400).json({
        message: 'Email already registered'
      });
    }

    const existingEPF = await User.findOne({
      epf_number: normalizedEPF
    }).select('_id');

    if (existingEPF) {
      return res.status(400).json({
        message: 'EPF Number already registered'
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email: normalizedEmail,
      epf_number: normalizedEPF,
      password: hash,
      role: role || 'Clerk',
      status: status || 'Active'
    });

    const item = formatUser(newUser);

    await AuditLog.create({
      user: req.user?.email,
      type: 'create:user',
      message: `Created user ${normalizedEmail} (EPF: ${normalizedEPF})`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.status(201).json(item);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        message: 'Email or EPF Number already registered'
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

    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(formatUser(user));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const {
      email,
      epfNumber,
      password,
      name,
      role,
      status
    } = req.body;

    const userId = req.params.id;

    if (!isValidId(userId)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const currentUser = await User.findById(userId);

    if (!currentUser) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const requesterIsSuperAdmin = req.user?.role === 'Super Admin';

    if (
      !requesterIsSuperAdmin &&
      (
        currentUser.role === 'Super Admin' ||
        role === 'Super Admin'
      )
    ) {
      return res.status(403).json({
        message: 'Only a Super Admin can modify or assign the Super Admin role'
      });
    }

    if (epfNumber !== undefined) {
      const normalizedEPF = String(epfNumber).trim();

      const existingEPF = await User.findOne({
        epf_number: normalizedEPF,
        _id: { $ne: userId }
      }).select('_id');

      if (existingEPF) {
        return res.status(400).json({
          message: 'EPF Number already in use by another user'
        });
      }
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();

      const existingEmail = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId }
      }).select('_id');

      if (existingEmail) {
        return res.status(400).json({
          message: 'Email already in use by another user'
        });
      }
    }

    if (name !== undefined) {
      currentUser.name = name;
    }

    if (email !== undefined) {
      currentUser.email = String(email).trim().toLowerCase();
    }

    if (epfNumber !== undefined) {
      currentUser.epf_number = String(epfNumber).trim();
    }

    if (role !== undefined) {
      currentUser.role = role;
    }

    if (status !== undefined) {
      currentUser.status = status;
    }

    if (password) {
      currentUser.password = await bcrypt.hash(password, 10);
    }

    const updated = await currentUser.save();

    const item = formatUser(updated);

    await AuditLog.create({
      user: req.user?.email,
      type: 'update:user',
      message: `Updated user ${item.email}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.json(item);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        message: 'Email or EPF Number already in use by another user'
      });
    }

    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const userId = req.params.id;

    if (!isValidId(userId)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (
      user.role === 'Super Admin' &&
      req.user?.role !== 'Super Admin'
    ) {
      return res.status(403).json({
        message: 'Only a Super Admin can delete a Super Admin account'
      });
    }

    await User.findByIdAndDelete(userId);

    if (user) {
      await AuditLog.create({
        user: req.user?.email,
        type: 'delete:user',
        message: `Deleted user ${user.email}`
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
