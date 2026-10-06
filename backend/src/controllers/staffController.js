const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const Department = require('../models/Department');
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
    status: department.status || 'Active'
  };
};

const formatStaff = (staff) => {
  if (!staff) return null;

  const id = staff._id.toString();

  const populatedDepartment =
    staff.department_id &&
    typeof staff.department_id === 'object' &&
    staff.department_id._id
      ? staff.department_id
      : null;

  const departmentId = populatedDepartment
    ? populatedDepartment._id.toString()
    : staff.department_id
      ? staff.department_id.toString()
      : null;

  return {
    _id: id,
    id,
    name: staff.name || '',
    email: staff.email || '',
    area: staff.area || '',
    designation: staff.designation || '',
    department_id: departmentId,
    department: populatedDepartment
      ? formatDepartment(populatedDepartment)
      : departmentId,
    createdAt: staff.created_at,
    updatedAt: staff.updated_at
  };
};

const extractDepartmentId = (body) => {
  if (!body) return null;

  if (
    body.department_id &&
    typeof body.department_id === 'string' &&
    body.department_id.trim() !== ''
  ) {
    return body.department_id.trim();
  }

  if (body.department) {
    if (
      typeof body.department === 'string' &&
      body.department.trim() !== ''
    ) {
      return body.department.trim();
    }

    if (
      typeof body.department === 'object' &&
      body.department.id
    ) {
      return body.department.id;
    }

    if (
      typeof body.department === 'object' &&
      body.department._id
    ) {
      return body.department._id;
    }
  }

  return null;
};

const validateDepartment = async (departmentId) => {
  if (!departmentId) return true;

  if (!mongoose.Types.ObjectId.isValid(departmentId)) {
    return false;
  }

  const department = await Department.exists({
    _id: departmentId
  });

  return Boolean(department);
};

exports.list = async (req, res, next) => {
  try {
    const staff = await Staff.find({})
      .populate('department_id')
      .sort({ created_at: -1 });

    res.json(staff.map(formatStaff));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, email, area, designation } = req.body;
    const departmentId = extractDepartmentId(req.body);

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: 'Staff name is required'
      });
    }

    if (!(await validateDepartment(departmentId))) {
      return res.status(400).json({
        message: 'Invalid department'
      });
    }

    const staff = await Staff.create({
      name: String(name).trim(),
      email:
        email &&
        typeof email === 'string' &&
        email.trim() !== ''
          ? email.trim()
          : null,
      area: area || '',
      designation: designation || '',
      department_id: departmentId || null
    });

    await staff.populate('department_id');

    const item = formatStaff(staff);

    await AuditLog.create({
      user: req.user?.email,
      type: 'create:staff',
      message: `Created staff ${item.name}`
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const staff = await Staff.findById(req.params.id)
      .populate('department_id');

    if (!staff) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(formatStaff(staff));
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (req.body.name !== undefined) {
      staff.name = req.body.name;
    }

    if (req.body.email !== undefined) {
      staff.email =
        req.body.email &&
        typeof req.body.email === 'string' &&
        req.body.email.trim() !== ''
          ? req.body.email.trim()
          : null;
    }

    if (req.body.area !== undefined) {
      staff.area = req.body.area;
    }

    if (req.body.designation !== undefined) {
      staff.designation = req.body.designation;
    }

    if (
      req.body.department !== undefined ||
      req.body.department_id !== undefined
    ) {
      const departmentId = extractDepartmentId(req.body);

      if (!(await validateDepartment(departmentId))) {
        return res.status(400).json({
          message: 'Invalid department'
        });
      }

      staff.department_id = departmentId || null;
    }

    await staff.save();
    await staff.populate('department_id');

    const item = formatStaff(staff);

    await AuditLog.create({
      user: req.user?.email,
      type: 'update:staff',
      message: `Updated staff ${item.name}`
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
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    const staff = await Staff.findByIdAndDelete(req.params.id);

    if (staff) {
      await AuditLog.create({
        user: req.user?.email,
        type: 'delete:staff',
        message: `Deleted staff ${staff.name}`
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
