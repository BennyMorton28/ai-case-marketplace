import { s3Client, BUCKET_NAME } from './s3';
import { ListBucketsCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testS3Connection() {
  try {
    // Log environment variables (without sensitive data)
    console.log('Environment variables loaded:');
    console.log(`AWS_S3_REGION: ${process.env.AWS_S3_REGION || 'undefined'}`);
    console.log(`AWS_S3_BUCKET_NAME: ${process.env.AWS_S3_BUCKET_NAME || 'undefined'}`);
    console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '***' : 'undefined'}`);
    console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '***' : 'undefined'}`);
    
    // Check if required environment variables are set
    if (!process.env.AWS_S3_REGION || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('Missing required environment variables');
      return false;
    }

    // Test 1: List buckets to verify credentials
    console.log('\nTesting S3 credentials...');
    const listBucketsResponse = await s3Client.send(new ListBucketsCommand({}));
    console.log('✅ Successfully connected to AWS S3');
    console.log('Available buckets:', listBucketsResponse.Buckets?.map(b => b.Name).join(', '));

    // Test 2: Verify bucket access
    console.log(`\nTesting access to bucket: ${BUCKET_NAME}`);
    await s3Client.send(new HeadBucketCommand({
      Bucket: BUCKET_NAME
    }));
    console.log('✅ Successfully accessed bucket');

    return true;
  } catch (error) {
    console.error('❌ S3 Connection Test Failed:');
    
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      
      // Check for specific AWS errors
      if (error.message.includes('credentials')) {
        console.error('\nPossible causes:');
        console.error('1. Invalid AWS credentials');
        console.error('2. Expired AWS credentials');
        console.error('3. Insufficient permissions for the IAM user');
        console.error('\nPlease check your AWS credentials in the .env file and make sure they are valid and have the necessary permissions.');
      } else if (error.message.includes('bucket')) {
        console.error('\nPossible causes:');
        console.error('1. Bucket does not exist');
        console.error('2. Insufficient permissions to access the bucket');
        console.error('3. Bucket is in a different region');
        console.error('\nPlease check your bucket name and make sure it exists and is accessible.');
      }
    }
    
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testS3Connection()
    .then(success => {
      if (success) {
        console.log('\n✅ All S3 tests passed!');
      } else {
        console.log('\n❌ S3 tests failed. Please check the errors above.');
      }
      process.exit(success ? 0 : 1);
    });
}

export { testS3Connection }; 