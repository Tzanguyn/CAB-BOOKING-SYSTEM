const StorageService = require('../services/storageService');

class StorageController {
  constructor() {
    this.storageService = new StorageService();
  }

  /**
   * POST /upload
   * Expects multipart/form-data with field "file", plus "userId" and "category" in body.
   */
  upload = async (req, res) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No file provided. Use field name "file".' });
      }

      const userId = req.body.userId || req.headers['x-user-id'] || 'unknown';
      const category = req.body.category || 'general';

      const result = await this.storageService.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId,
        category
      );

      res.status(201).json({
        message: 'File uploaded successfully',
        data: result,
      });
    } catch (error) {
      console.error('Upload error:', error.message);
      res.status(400).json({ error: error.message });
    }
  };

  /**
   * GET /files/:userId
   * Optional query: ?category=license-front
   */
  listFiles = async (req, res) => {
    try {
      const { userId } = req.params;
      const { category } = req.query;

      const files = await this.storageService.listFiles(userId, category || null);

      res.json({
        message: 'Files listed successfully',
        userId,
        count: files.length,
        files,
      });
    } catch (error) {
      console.error('List files error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /download/*fileKey
   * Returns the raw file stream with correct Content-Type.
   */
  download = async (req, res) => {
    try {
      // fileKey can contain slashes, captured via wildcard
      const fileKey = req.params[0] || req.params.fileKey;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey is required' });
      }

      const { stream, stat } = await this.storageService.getFileStream(fileKey);

      res.setHeader('Content-Type', stat.metaData?.['content-type'] || 'application/octet-stream');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Content-Disposition', `inline; filename="${fileKey.split('/').pop()}"`);

      stream.pipe(res);
    } catch (error) {
      console.error('Download error:', error.message);
      if (error.code === 'NoSuchKey' || error.code === 'NotFound') {
        return res.status(404).json({ error: 'File not found' });
      }
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /presigned/*fileKey
   * Returns a temporary presigned URL for the file.
   */
  presignedUrl = async (req, res) => {
    try {
      const fileKey = req.params[0] || req.params.fileKey;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey is required' });
      }

      const expiry = parseInt(req.query.expiry || '3600', 10);
      const result = await this.storageService.getPresignedUrl(fileKey, expiry);

      res.json({
        message: 'Presigned URL generated',
        data: result,
      });
    } catch (error) {
      console.error('Presigned URL error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * DELETE /files/*fileKey
   */
  deleteFile = async (req, res) => {
    try {
      const fileKey = req.params[0] || req.params.fileKey;
      if (!fileKey) {
        return res.status(400).json({ error: 'fileKey is required' });
      }

      const result = await this.storageService.deleteFile(fileKey);
      res.json({ message: 'File deleted successfully', data: result });
    } catch (error) {
      console.error('Delete error:', error.message);
      res.status(500).json({ error: error.message });
    }
  };

  /**
   * GET /health
   */
  healthCheck = async (req, res) => {
    try {
      const health = await this.storageService.healthCheck();
      res.json({ service: 'storage-service', ...health });
    } catch (error) {
      res.status(503).json({
        service: 'storage-service',
        healthy: false,
        error: error.message,
      });
    }
  };
}

module.exports = StorageController;
