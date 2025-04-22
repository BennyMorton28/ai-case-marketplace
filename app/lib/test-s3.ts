import { s3Client, uploadToS3, getSignedDownloadUrl, BUCKET_NAME } from './s3';
import { ListBucketsCommand } from '@aws-sdk/client-s3';

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

async function testFileUpload() {
  try {
    console.log('\nTesting file upload...');
    const testContent = Buffer.from('This is a test file for S3 upload');
    const testKey = `test/test-file-${Date.now()}.txt`;
    
    // Upload test file
    await uploadToS3(testContent, testKey, 'text/plain');
    console.log('✅ Successfully uploaded test file');
    
    // Generate signed URL
    const signedUrl = await getSignedDownloadUrl(testKey);
    console.log('✅ Successfully generated signed URL');
    console.log('Signed URL:', signedUrl);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to test file upload:', error);
    return false;
  }
}

async function runTests() {
  console.log('S3 Configuration:');
  console.log('----------------');
  console.log('Region:', process.env.AWS_S3_REGION);
  console.log('Bucket:', BUCKET_NAME);
  console.log('----------------\n');

  const connectionSuccess = await testS3Connection();
  if (!connectionSuccess) {
    console.error('❌ S3 connection test failed. Stopping tests.');
    process.exit(1);
  }

  const uploadSuccess = await testFileUpload();
  if (!uploadSuccess) {
    console.error('❌ File upload test failed.');
    process.exit(1);
  }

  console.log('\n✅ All S3 tests passed successfully!');
}

runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
  process.exit(1);
}); 
import { ListBucketsCommand } from '@aws-sdk/client-s3';

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

async function testFileUpload() {
  try {
    console.log('\nTesting file upload...');
    const testContent = Buffer.from('This is a test file for S3 upload');
    const testKey = `test/test-file-${Date.now()}.txt`;
    
    // Upload test file
    await uploadToS3(testContent, testKey, 'text/plain');
    console.log('✅ Successfully uploaded test file');
    
    // Generate signed URL
    const signedUrl = await getSignedDownloadUrl(testKey);
    console.log('✅ Successfully generated signed URL');
    console.log('Signed URL:', signedUrl);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to test file upload:', error);
    return false;
  }
}

async function runTests() {
  console.log('S3 Configuration:');
  console.log('----------------');
  console.log('Region:', process.env.AWS_S3_REGION);
  console.log('Bucket:', BUCKET_NAME);
  console.log('----------------\n');

  const connectionSuccess = await testS3Connection();
  if (!connectionSuccess) {
    console.error('❌ S3 connection test failed. Stopping tests.');
    process.exit(1);
  }

  const uploadSuccess = await testFileUpload();
  if (!uploadSuccess) {
    console.error('❌ File upload test failed.');
    process.exit(1);
  }

  console.log('\n✅ All S3 tests passed successfully!');
}

runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
  process.exit(1);
}); 