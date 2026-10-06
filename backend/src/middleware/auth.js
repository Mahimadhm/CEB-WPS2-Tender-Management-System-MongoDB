const jwt = require('jsonwebtoken');
const User = require('../models/User');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET not set in environment');
  process.exit(1);
}

const protect = async function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({ message: 'Token error' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Always use the current MongoDB user state instead of trusting
    // potentially stale role/status values stored inside the JWT.
    const userId = decoded.id || decoded._id;

    if (!userId) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const currentUser = await User.findById(userId).select(
      '_id name email epfNumber role status'
    );

    if (!currentUser) {
      return res.status(401).json({ message: 'User account not found' });
    }

    if (currentUser.status !== 'Active') {
      return res.status(403).json({
        message: 'This user account is inactive. Please contact the system administrator.'
      });
    }

    req.user = {
      id: currentUser._id.toString(),
      _id: currentUser._id.toString(),
      name: currentUser.name,
      email: currentUser.email,
      epfNumber: currentUser.epfNumber,
      role: currentUser.role,
      status: currentUser.status
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({
        message: 'Access denied. User session context not discovered.'
      });
    }

    // Dynamically bridge legacy and standardized role names.
    const expandedRoles = [];
    const flattenedRoles = allowedRoles.flat();

    flattenedRoles.forEach(role => {
      const cleanRole = role.toLowerCase().trim();
      expandedRoles.push(cleanRole);

      if (cleanRole === 'admin') expandedRoles.push('super admin');
      if (cleanRole === 'commercial user') expandedRoles.push('clerk');
      if (cleanRole === 'clerk') expandedRoles.push('commercial user');
      if (cleanRole === 'c.com user') expandedRoles.push('cecom');
      if (cleanRole === 'cecom') expandedRoles.push('c.com user');
    });

    const currentUserRole = (req.user.role || '').toLowerCase().trim();

    if (!expandedRoles.includes(currentUserRole)) {
      return res.status(403).json({
        message: `Access denied. Your role '${req.user.role || 'Guest'}' is not authorized to access this function.`
      });
    }

    next();
  };
};

module.exports = { protect, authorize };
