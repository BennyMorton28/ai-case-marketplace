import { testS3Connection } from './test-s3-connection';
import { testDocumentUpload } from './test-document-upload';

async function runAllTests() {
  console.log('🔍 Starting S3 and Document Upload Tests\n');

  // Test 1: S3 Connection
  console.log('=== Testing S3 Connection ===');
  const s3Success = await testS3Connection();
  
  if (!s3Success) {
    console.log('\n❌ S3 connection test failed. Stopping further tests.');
    return false;
  }

  // Test 2: Document Upload
  console.log('\n=== Testing Document Upload ===');
  const uploadSuccess = await testDocumentUpload();

  return s3Success && uploadSuccess;
}

// Run all tests if this file is executed directly
if (require.main === module) {
  runAllTests()
    .then(success => {
      if (success) {
        console.log('\n✅ All tests passed successfully!');
      } else {
        console.log('\n❌ Some tests failed. Please check the errors above.');
      }
      process.exit(success ? 0 : 1);
    });
}

export { runAllTests }; 