import { PutObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getS3Client, getBucketName, getEndpoint } from './s3-client';

/**
 * Storage Service for uploading images to S3/MinIO
 * 
 * Handles:
 * - Fetching images from external URLs and uploading to S3
 * - Uploading base64 encoded images to S3
 */

/**
 * Detects content type from buffer or defaults to image/png
 */
const detectContentType = (buffer: Buffer, url?: string): string => {
  // Check magic bytes for common image formats
  const header = buffer.subarray(0, 4);
  
  // JPEG: FF D8 FF
  if (header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff) {
    return 'image/jpeg';
  }
  
  // PNG: 89 50 4E 47
  if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47) {
    return 'image/png';
  }
  
  // WebP: Check for RIFF header and WEBP
  if (buffer.length >= 12) {
    const webpHeader = buffer.subarray(0, 12);
    if (webpHeader.toString('ascii', 0, 4) === 'RIFF' && 
        webpHeader.toString('ascii', 8, 12) === 'WEBP') {
      return 'image/webp';
    }
  }
  
  // GIF: 47 49 46 38
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x38) {
    return 'image/gif';
  }
  
  // Try to infer from URL extension if available
  if (url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return 'image/jpeg';
    if (urlLower.includes('.png')) return 'image/png';
    if (urlLower.includes('.webp')) return 'image/webp';
    if (urlLower.includes('.gif')) return 'image/gif';
  }
  
  // Default to PNG
  return 'image/png';
};

/**
 * Generates a unique file name with timestamp and random string
 */
const generateFileName = (folderPath: string, extension: string = 'png'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const sanitizedFolder = folderPath.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
  return sanitizedFolder ? `${sanitizedFolder}/${timestamp}-${random}.${extension}` : `${timestamp}-${random}.${extension}`;
};

/**
 * Uploads an image from a temporary URL (from OpenAI/Gemini) to S3/MinIO
 * 
 * Process:
 * 1. Fetch the image from the temporary URL
 * 2. Convert to Buffer/ArrayBuffer
 * 3. Upload to S3 using PutObjectCommand
 * 4. Return the permanent public URL in format: {Endpoint}/{BucketName}/{Key}
 * 
 * @param tempUrl - Temporary URL of the image from OpenAI/Gemini
 * @param folderPath - Folder path in S3 bucket (e.g., 'generated-images/youtube-packages')
 * @returns Promise resolving to the permanent public S3 URL: {Endpoint}/{BucketName}/{Key}
 * 
 * @example
 * const permanentUrl = await uploadImageFromUrl(
 *   'https://oaidalleapiprodscus.blob.core.windows.net/...',
 *   'youtube-packages'
 * );
 * // Returns: https://node02.s3interdata.com:9000/s3-14385-35636-storage-default/youtube-packages/1234567890-abc123.png
 */
export async function uploadImageFromUrl(
  tempUrl: string,
  folderPath: string
): Promise<string> {
  try {
    // Step 1: Fetch the image from the temporary URL
    const response = await fetch(tempUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image from URL: ${response.status} ${response.statusText}`);
    }
    
    // Step 2: Convert response to Buffer/ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Detect content type from buffer magic bytes
    const contentType = detectContentType(buffer, tempUrl);
    const extension = contentType.split('/')[1] || 'png';
    
    // Generate unique file name with folder path
    const key = generateFileName(folderPath, extension);
    
    // Step 3: Prepare S3 upload parameters
    const bucketName = getBucketName();
    const params: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    };
    
    // Upload to S3 using PutObjectCommand
    const command = new PutObjectCommand(params);
    const s3Client = getS3Client();
    await s3Client.send(command);
    
    // Step 4: Construct and return the permanent public URL
    // Format: {Endpoint}/{BucketName}/{Key}
    const endpoint = getEndpoint();
    const publicUrl = `${endpoint}/${bucketName}/${key}`;
    
    return publicUrl;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to upload image from URL: ${error.message}`);
    }
    throw new Error('Failed to upload image from URL: Unknown error');
  }
}

/**
 * Uploads a base64 encoded image to S3
 * 
 * @param base64 - Base64 encoded image string (with or without data URL prefix)
 * @param folderPath - The folder path in S3 bucket (e.g., 'generated-images/album-covers')
 * @returns Promise resolving to the public S3 URL of the uploaded image
 * 
 * @example
 * const s3Url = await uploadBase64Image('data:image/png;base64,iVBORw0KGgo...', 'album-covers');
 * // Or without data URL prefix:
 * const s3Url = await uploadBase64Image('iVBORw0KGgo...', 'album-covers');
 */
export async function uploadBase64Image(
  base64: string,
  folderPath: string
): Promise<string> {
  try {
    // Remove data URL prefix if present (e.g., "data:image/png;base64,")
    let base64Data = base64;
    let contentType = 'image/png'; // Default
    
    if (base64.startsWith('data:')) {
      const matches = base64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        contentType = matches[1] || 'image/png';
        base64Data = matches[2];
      } else {
        // If data URL format is invalid, try to extract base64 part
        const commaIndex = base64.indexOf(',');
        if (commaIndex > 0) {
          const header = base64.substring(0, commaIndex);
          const mimeMatch = header.match(/data:([^;]+)/);
          if (mimeMatch) {
            contentType = mimeMatch[1];
          }
          base64Data = base64.substring(commaIndex + 1);
        }
      }
    }
    
    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Validate buffer is actually an image by checking magic bytes
    const detectedContentType = detectContentType(buffer);
    if (detectedContentType !== 'image/png' && contentType === 'image/png') {
      // Use detected type if it's more accurate
      contentType = detectedContentType;
    }
    
    const extension = contentType.split('/')[1] || 'png';
    
    // Generate unique file name
    const fileName = generateFileName(folderPath, extension);
    
    // Prepare S3 upload parameters
    const bucketName = getBucketName();
    const params: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: contentType,
      // Make the object publicly readable (adjust ACL as needed)
      // ACL: 'public-read', // Uncomment if your S3/MinIO setup supports ACLs
    };
    
    // Upload to S3
    const command = new PutObjectCommand(params);
    const s3Client = getS3Client();
    await s3Client.send(command);
    
    // Construct and return the public URL
    // Format: {Endpoint}/{BucketName}/{Key}
    const endpoint = getEndpoint();
    const publicUrl = `${endpoint}/${bucketName}/${fileName}`;
    
    return publicUrl;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to upload base64 image: ${error.message}`);
    }
    throw new Error('Failed to upload base64 image: Unknown error');
  }
}
