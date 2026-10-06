const mongoose = require('mongoose');
const Category = require('../models/Category');
const AuditLog = require('../utils/auditLogger');

const formatCategory = (category) => {
  if (!category) return null;

  const id = category._id.toString();

  return {
    _id: id,
    id,
    name: category.name,
    description: category.description || '',
    status: category.status || 'Active',
    createdAt: category.created_at,
    updatedAt: category.updated_at
  };
};

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.list = async (req, res, next) => {
  try {
    const categories = await Category.find({})
      .sort({ created_at: -1 });

    res.json(categories.map(formatCategory));
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    const { name, description, status } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        message: 'Category name is required'
      });
    }

    const category = await Category.create({
      name: String(name).trim(),
      description: description || '',
      status: status || 'Active'
    });

    const item = formatCategory(category);

    await AuditLog.create({
      user: req.user?.email,
      type: 'create:category',
      message: `Created category ${item.name}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.status(201).json(item);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        message: 'Category name already exists'
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

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    res.json(formatCategory(category));
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

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        message: 'Not found'
      });
    }

    if (req.body.name !== undefined) {
      category.name = String(req.body.name).trim();
    }

    if (req.body.description !== undefined) {
      category.description = req.body.description;
    }

    if (req.body.status !== undefined) {
      category.status = req.body.status;
    }

    const updated = await category.save();
    const item = formatCategory(updated);

    await AuditLog.create({
      user: req.user?.email,
      type: 'update:category',
      message: `Updated category ${item.name}`
    }).catch(err =>
      console.error('AuditLog error:', err)
    );

    res.json(item);
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({
        message: 'Category name already exists'
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

    const category = await Category.findByIdAndDelete(req.params.id);

    if (category) {
      await AuditLog.create({
        user: req.user?.email,
        type: 'delete:category',
        message: `Deleted category ${category.name}`
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
