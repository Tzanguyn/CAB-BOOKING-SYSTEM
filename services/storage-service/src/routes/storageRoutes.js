const express = require('express');
const multer = require('multer');
const StorageController = require('../controllers/storageController');

const router = express.Router();
const controller = new StorageController();

// Configure multer for memory storage (buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type "${file.mimetype}" is not allowed`), false);
    }
  },
});

/* HEALTH */
router.get('/health', controller.healthCheck);

/* UPLOAD — multipart/form-data, field name: "file" */
router.post('/upload', upload.single('file'), controller.upload);

/* LIST files by userId */
router.get('/files/:userId', controller.listFiles);

/* DOWNLOAD — wildcard to capture fileKey with slashes */
router.get('/download/*', controller.download);

/* PRESIGNED URL — wildcard to capture fileKey with slashes */
router.get('/presigned/*', controller.presignedUrl);

/* DELETE — wildcard to capture fileKey with slashes */
router.delete('/files/*', controller.deleteFile);

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5 MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
