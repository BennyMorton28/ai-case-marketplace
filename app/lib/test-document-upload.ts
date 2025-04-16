import { uploadToS3, getSignedDownloadUrl } from './s3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testDocumentUpload() {
  try {
    // Create a test file
    const testFilePath = path.join(process.cwd(), 'test-upload.txt');
    const testContent = 'This is a test file for document upload verification.';
    fs.writeFileSync(testFilePath, testContent);

    console.log('Testing document upload and retrieval...');

    // Test 1: Upload file
    console.log('\n1. Uploading test file...');
    const fileBuffer = fs.readFileSync(testFilePath);
    const key = `test-uploads/${Date.now()}-test-upload.txt`;
    
    await uploadToS3(fileBuffer, key, 'text/plain');
    console.log('✅ File uploaded successfully');
    console.log('Upload key:', key);

    // Test 2: Get signed URL
    console.log('\n2. Getting signed URL...');
    const signedUrl = await getSignedDownloadUrl(key);
    console.log('✅ Signed URL generated successfully');
    console.log('Signed URL:', signedUrl);

    // Clean up test file
    fs.unlinkSync(testFilePath);
    console.log('\n✅ Test file cleaned up');

    return true;
  } catch (error) {
    console.error('❌ Document Upload Test Failed:', error);
    return false;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testDocumentUpload()
    .then(success => {
      if (success) {
        console.log('\n✅ All document upload tests passed!');
      } else {
        console.log('\n❌ Document upload tests failed. Please check the errors above.');
      }
      process.exit(success ? 0 : 1);
    });
}

export { testDocumentUpload }; 