const Minio = require('minio');

const BUCKET_NAME = process.env.MINIO_BUCKET || 'cab-documents';

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'minio',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'cab_minio_admin',
  secretKey: process.env.MINIO_SECRET_KEY || 'cab_minio_secret123',
});

/**
 * Ensure the default bucket exists, create it if not.
 */
async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`✅ MinIO bucket "${BUCKET_NAME}" created`);

      // Set bucket policy to allow read access for presigned URLs
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${BUCKET_NAME}/*`],
          },
        ],
      };
      await minioClient.setBucketPolicy(BUCKET_NAME, JSON.stringify(policy));
      console.log(`✅ MinIO bucket policy set for "${BUCKET_NAME}"`);
    } else {
      console.log(`✅ MinIO bucket "${BUCKET_NAME}" already exists`);
    }
  } catch (error) {
    console.error('❌ MinIO bucket initialization error:', error.message);
    // Don't crash – the service will retry on each request
  }
}

module.exports = { minioClient, BUCKET_NAME, ensureBucket };
