import { S3Client } from '@aws-sdk/client-s3';

/**
 * S3 Client Configuration for MinIO/InterData
 * 
 * Specific Configuration:
 * - Endpoint: https://node02.s3interdata.com:9000
 * - Bucket: s3-14385-35636-storage-default
 * - Region: us-east-1 (Default)
 * - Force Path Style: true (REQUIRED for MinIO/InterData compatibility)
 * - Signature Version: v4 (default and only supported in AWS SDK v3)
 */

const DEFAULT_S3_ENDPOINT = 'https://node02.s3interdata.com:9000';
const DEFAULT_S3_BUCKET = 's3-14385-35636-storage-default';

// Lazy initialization pattern - only create client when needed (at runtime, not build time)
let s3ClientInstance: S3Client | null = null;

/**
 * Gets or creates the S3Client singleton instance
 * Uses lazy initialization to avoid errors during Next.js build process
 */
export const getS3Client = (): S3Client => {
  // Return existing instance if already created
  if (s3ClientInstance) {
    return s3ClientInstance;
  }

  // Create new instance only when first needed (at runtime)
  const endpoint = process.env.S3_ENDPOINT ?? DEFAULT_S3_ENDPOINT;
  const region = process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('S3_ACCESS_KEY and S3_SECRET_KEY must be set in environment variables');
  }

  s3ClientInstance = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true, // MUST be true - Required for MinIO/InterData compatibility
    // Signature Version v4 is the default and only supported version in AWS SDK v3
  });

  return s3ClientInstance;
};

// Export bucket name - defaults to InterData bucket, can be overridden via env var
export const getBucketName = (): string => {
  return process.env.S3_BUCKET ?? process.env.S3_BUCKET_NAME ?? DEFAULT_S3_BUCKET;
};

// Export endpoint for public URL construction
export const getEndpoint = (): string => {
  return process.env.S3_ENDPOINT ?? DEFAULT_S3_ENDPOINT;
};
