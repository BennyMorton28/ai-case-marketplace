import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// Initialize S3 client with minimal configuration
// This will use the default credential provider chain
export const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION
});

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Upload a file to S3
export async function uploadToS3(file: Buffer, key: string, contentType: string) {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME is not set');
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType
  });

  try {
    await s3Client.send(command);
    return `${key}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

// Get a signed URL for downloading a file
export async function getSignedDownloadUrl(key: string) {
  if (!BUCKET_NAME) {
    throw new Error('AWS_S3_BUCKET_NAME is not set');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  try {
    // URL expires in 1 hour
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    return signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
} 