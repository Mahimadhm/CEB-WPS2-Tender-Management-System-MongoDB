const multer = require('multer');

const storage = multer.memoryStorage();

const excelUpload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls'];
    const extension = require('path')
      .extname(file.originalname)
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      return cb(new Error('Only Excel .xlsx or .xls files are allowed'));
    }

    cb(null, true);
  }
});

module.exports = excelUpload;
