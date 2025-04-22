const { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

async function testS3Connection() {
  try {
    console.log('Testing S3 connection...');
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    console.log('✅ Successfully connected to S3');
    console.log('Available buckets:', response.Buckets?.map(b => b.Name).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to S3:', error);
    return false;
  }
}

async function testFileOperations() {
  try {
    console.log('\nTesting file operations...');
    
    // Test file upload
    const testContent = Buffer.from('Test content');
    const testKey = `test/test-file-${Date.now()}.txt`;
    
    console.log('Uploading test file...');
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    });
    await s3Client.send(uploadCommand);
    console.log('✅ Successfully uploaded test file');
    
    // Test signed URL generation
    console.log('Generating signed URL...');
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
    });
    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    console.log('✅ Successfully generated signed URL');
    console.log('Signed URL:', signedUrl);
    
    return true;
  } catch (error) {
    console.error('❌ Failed file operations:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Starting S3 tests...\n');
  
  const connectionSuccess = await testS3Connection();
  if (!connectionSuccess) {
    console.log('❌ Stopping tests due to connection failure');
    return;
  }
  
  await testFileOperations();
}

runTests(); 
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config();

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

async function testS3Connection() {
  try {
    console.log('Testing S3 connection...');
    const command = new ListBucketsCommand({});
    const response = await s3Client.send(command);
    console.log('✅ Successfully connected to S3');
    console.log('Available buckets:', response.Buckets?.map(b => b.Name).join(', '));
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to S3:', error);
    return false;
  }
}

async function testFileOperations() {
  try {
    console.log('\nTesting file operations...');
    
    // Test file upload
    const testContent = Buffer.from('Test content');
    const testKey = `test/test-file-${Date.now()}.txt`;
    
    console.log('Uploading test file...');
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain'
    });
    await s3Client.send(uploadCommand);
    console.log('✅ Successfully uploaded test file');
    
    // Test signed URL generation
    console.log('Generating signed URL...');
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: testKey,
    });
    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
    console.log('✅ Successfully generated signed URL');
    console.log('Signed URL:', signedUrl);
    
    return true;
  } catch (error) {
    console.error('❌ Failed file operations:', error);
    return false;
  }
}

// Run tests
async function runTests() {
  console.log('Starting S3 tests...\n');
  
  const connectionSuccess = await testS3Connection();
  if (!connectionSuccess) {
    console.log('❌ Stopping tests due to connection failure');
    return;
  }
  
  await testFileOperations();
}

runTests(); 