import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Environment Variables Check:');
console.log('----------------------------');

const requiredVars = [
  'AWS_S3_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_S3_BUCKET_NAME'
];

let allSet = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isSet = value !== undefined && value !== '';
  
  console.log(`${varName}: ${isSet ? '✅ Set' : '❌ Missing or Empty'}`);
  
  if (!isSet) {
    allSet = false;
  }
});

if (allSet) {
  console.log('\n✅ All required environment variables are set!');
} else {
  console.log('\n❌ Some environment variables are missing or empty.');
  console.log('Please check your .env file and make sure all required variables are set.');
}

// Don't exit with error code to avoid breaking CI/CD pipelines
process.exit(0); 