const { v4: uuidv4 } = require('uuid');
const { minioClient, BUCKET_NAME } = require('../config/minio');

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

class StorageService {
  /**
   * Upload a file buffer to MinIO.
   * @param {Buffer} buffer      – file content
   * @param {string} originalName – original filename (e.g. "license.jpg")
   * @param {string} mimeType    – MIME type
   * @param {string} userId      – owner's user ID
   * @param {string} category    – e.g. "license-front", "license-back", "vehicle-registration"
   * @returns {Promise<object>}  – { fileKey, bucket, size, url }
   */
  async uploadFile(buffer, originalName, mimeType, userId, category = 'general') {
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new Error(
        `File type "${mimeType}" is not allowed. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`
      );
    }

    // Validate size
    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File size ${(buffer.length / 1024 / 1024).toFixed(2)} MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024} MB`
      );
    }

    // Sanitize original name
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileKey = `${category}/${userId}/${uuidv4()}-${safeName}`;

    const metadata = {
      'Content-Type': mimeType,
      'x-amz-meta-user-id': userId,
      'x-amz-meta-category': category,
      'x-amz-meta-original-name': originalName,
      'x-amz-meta-uploaded-at': new Date().toISOString(),
    };

    await minioClient.putObject(BUCKET_NAME, fileKey, buffer, buffer.length, metadata);

    return {
      fileKey,
      bucket: BUCKET_NAME,
      size: buffer.length,
      mimeType,
      category,
      originalName,
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * List all files for a given user (by prefix).
   */
  async listFiles(userId, category = null) {
    const prefix = category ? `${category}/${userId}/` : '';
    const files = [];

    return new Promise((resolve, reject) => {
      const stream = minioClient.listObjectsV2(BUCKET_NAME, prefix, true);
      stream.on('data', (obj) => {
        // Filter by userId in the path when no category specified
        if (!category && !obj.name.includes(`/${userId}/`)) return;
        files.push({
          fileKey: obj.name,
          size: obj.size,
          lastModified: obj.lastModified,
          etag: obj.etag,
        });
      });
      stream.on('error', reject);
      stream.on('end', () => resolve(files));
    });
  }

  /**
   * Get a readable stream for a file.
   */
  async getFileStream(fileKey) {
    // Check if the file exists first
    const stat = await minioClient.statObject(BUCKET_NAME, fileKey);
    const stream = await minioClient.getObject(BUCKET_NAME, fileKey);
    return { stream, stat };
  }

  /**
   * Generate a presigned URL for temporary access (default 1 hour).
   */
  async getPresignedUrl(fileKey, expiry = 3600) {
    const url = await minioClient.presignedGetObject(BUCKET_NAME, fileKey, expiry);
    return { url, expiresIn: expiry, fileKey };
  }

  /**
   * Delete a file from MinIO.
   */
  async deleteFile(fileKey) {
    await minioClient.removeObject(BUCKET_NAME, fileKey);
    return { deleted: true, fileKey };
  }

  /**
   * Check if MinIO is reachable.
   */
  async healthCheck() {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    return { healthy: true, bucket: BUCKET_NAME, bucketExists: exists };
  }
}

module.exports = StorageService;
