const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../utils/auditLogger');

const formatUserPayload = (user) => {
  const id = user._id.toString();

  return {
    _id: id,
    id,
    name: user.name || '',
    email: user.email || '',
    epfNumber: user.epf_number || '',
    role: user.role || 'Clerk'
  };
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Invalid email/EPF or password'
      });
    }

    const identifier = String(email).trim();

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { epf_number: identifier }
      ]
    });

    if (!user) {
      console.log(
        `❌ LOGIN FAILED: Identifier not found -> ${identifier}`
      );

      return res.status(400).json({
        message: 'Invalid email/EPF or password'
      });
    }

    // Inactive accounts must not be allowed to authenticate.
    if (user.status !== 'Active') {
      return res.status(403).json({
        message: 'This user account is inactive. Please contact the system administrator.'
      });
    }

    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      console.log(
        `❌ LOGIN FAILED: Password Mismatch for -> ${user.email}`
      );

      return res.status(401).json({
        message: 'Invalid email/EPF or password'
      });
    }

    console.log(
      `✅ LOGIN SUCCESS: Authenticated -> ${user.email}`
    );

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error(
        'JWT_SECRET environment variable is not configured'
      );
    }

    const payload = formatUserPayload(user);

    const token = jwt.sign(
      payload,
      secret,
      { expiresIn: '8h' }
    );

    try {
      user.last_login = new Date();
      await user.save();
    } catch (llErr) {
      console.error(
        'Last login update error:',
        llErr
      );
    }

    await AuditLog.create({
      user: user.email,
      type: 'login',
      message: `User logged in: ${user.email}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    return res.status(200).json({
      token,
      user: payload
    });

  } catch (err) {
    console.error('Server Error:', err);
    next(err);
  }
};

exports.verify = async (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    next(err);
  }
};
