const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { PERMISSIONS } = require('../config/permissions');
const ctrl = require('../controllers/recordController');
const { validateCreateRecord, validateUpdateRecord } = require('../validators/recordValidator');
const { handleDocumentUpload } = require('../middleware/upload');
const excelUpload = require('../middleware/excelUpload');

// All roles in PERMISSIONS.view can view tender records
router.get('/', protect, authorize(...PERMISSIONS.view), ctrl.list);
// Excel Preview - does not write to database

router.post(

  '/preview-excel',

  protect,

  authorize(...PERMISSIONS.add),

  excelUpload.single('file'),

  ctrl.previewExcel

);

// Excel Import
router.post(
  '/import-excel',
  protect,
  authorize(...PERMISSIONS.add),
  excelUpload.single('file'),
  ctrl.importExcel
);

// Create record
router.post('/', protect, authorize(...PERMISSIONS.add), validateCreateRecord, ctrl.create);

// Get record
router.get('/:id', protect, authorize(...PERMISSIONS.view), ctrl.get);

// Update record
router.put('/:id', protect, authorize(...PERMISSIONS.edit), validateUpdateRecord, ctrl.update);

// Delete record
router.delete('/:id', protect, authorize(...PERMISSIONS.delete), ctrl.remove);

// Documents
router.post('/:id/documents', protect, authorize(...PERMISSIONS.add), handleDocumentUpload, ctrl.uploadDocuments);

router.get('/:id/documents', protect, authorize(...PERMISSIONS.view), ctrl.listDocuments);

router.get('/:id/documents/:docId/download', protect, authorize(...PERMISSIONS.view), ctrl.downloadDocument);

router.delete('/:id/documents/:docId', protect, authorize(...PERMISSIONS.delete), ctrl.deleteDocument);

module.exports = router;
