const mongoose = require('mongoose');
const Department = require('../models/Department');
const Staff = require('../models/Staff');
const AuditLog = require('../utils/auditLogger');

const formatDepartment = (department) => {
  if (!department) return null;

  const id = department._id.toString();

  return {
    _id: id,
    id,
    name: department.name || '',
    code: department.code || '',
    description: department.description || '',
    headOfDepartment: department.head_of_department || '',
    status: department.status || 'Active',
    createdAt: department.created_at,
    updatedAt: department.updated_at
  };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.list = async (req, res, next) => {
  try {
    const departments = await Department.find({})
      .sort({ created_at: -1 });

    res.json(departments.map(formatDepartment));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const {
      name,
      code,
      description,
      headOfDepartment,
      head_of_department,
      status
    } = req.body;

    const department = await Department.create({
      name: name || '',
      code: code || '',
      description: description || '',
      head_of_department:
        headOfDepartment !== undefined
          ? headOfDepartment
          : (head_of_department || ''),
      status: status || 'Active'
    });

    const item = formatDepartment(department);

    await AuditLog.create({
      user: req.user?.email,
      type: 'create:department',
      message: `Created department ${item.name} (${item.code})`
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

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(formatDepartment(department));
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

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (req.body.name !== undefined) {
      department.name = req.body.name;
    }

    if (req.body.code !== undefined) {
      department.code = req.body.code;
    }

    if (req.body.description !== undefined) {
      department.description = req.body.description;
    }

    if (req.body.headOfDepartment !== undefined) {
      department.head_of_department = req.body.headOfDepartment;
    } else if (req.body.head_of_department !== undefined) {
      department.head_of_department = req.body.head_of_department;
    }

    if (req.body.status !== undefined) {
      department.status = req.body.status;
    }

    const updated = await department.save();
    const item = formatDepartment(updated);

    await AuditLog.create({
      user: req.user?.email,
      type: 'update:department',
      message: `Updated department ${item.name}`
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

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    // PostgreSQL ON DELETE SET NULL equivalent
    await Staff.updateMany(
      { department_id: department._id },
      { $set: { department_id: null } }
    );

    await Department.findByIdAndDelete(department._id);

    await AuditLog.create({
      user: req.user?.email,
      type: 'delete:department',
      message: `Deleted department ${department.name}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.json({
      message: 'Deleted'
    });
  } catch (err) {
    next(err);
  }
};
