import fs from 'fs';
import path from 'path';
import { uploadToS3 } from './s3';

async function migrateFilesToS3() {
  console.log('Starting migration of files to S3...');
  
  // Directories to check
  const directories = [
    'public/markdown',
    'public/demos',
    'assistants'
  ];

  for (const dir of directories) {
    console.log(`\nProcessing directory: ${dir}`);
    await processDirectory(dir);
  }
}

async function processDirectory(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dirPath} does not exist, skipping...`);
      return;
    }

    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Recursively process subdirectories
        await processDirectory(fullPath);
      } else {
        await migrateFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
  }
}

async function migrateFile(filePath: string) {
  try {
    // Read file content
    const content = fs.readFileSync(filePath);
    
    // Determine S3 key based on file path
    // Remove 'public/' from the path if it exists
    let s3Key = filePath.replace(/^public\//, '');
    
    // Determine content type
    const contentType = getContentType(filePath);
    
    // Upload to S3
    console.log(`Uploading ${filePath} to S3 as ${s3Key}`);
    await uploadToS3(content, s3Key, contentType);
    console.log(`✅ Successfully migrated ${filePath}`);
    
    // Create backup of local file
    const backupPath = filePath + '.bak';
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup at ${backupPath}`);
    
  } catch (error) {
    console.error(`Failed to migrate ${filePath}:`, error);
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.md':
      return 'text/markdown';
    case '.json':
      return 'application/json';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

// Run migration
migrateFilesToS3().then(() => {
  console.log('\nMigration completed!');
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 
import path from 'path';
import { uploadToS3 } from './s3';

async function migrateFilesToS3() {
  console.log('Starting migration of files to S3...');
  
  // Directories to check
  const directories = [
    'public/markdown',
    'public/demos',
    'assistants'
  ];

  for (const dir of directories) {
    console.log(`\nProcessing directory: ${dir}`);
    await processDirectory(dir);
  }
}

async function processDirectory(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory ${dirPath} does not exist, skipping...`);
      return;
    }

    const files = fs.readdirSync(dirPath);
    
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stats = fs.statSync(fullPath);
      
      if (stats.isDirectory()) {
        // Recursively process subdirectories
        await processDirectory(fullPath);
      } else {
        await migrateFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
  }
}

async function migrateFile(filePath: string) {
  try {
    // Read file content
    const content = fs.readFileSync(filePath);
    
    // Determine S3 key based on file path
    // Remove 'public/' from the path if it exists
    let s3Key = filePath.replace(/^public\//, '');
    
    // Determine content type
    const contentType = getContentType(filePath);
    
    // Upload to S3
    console.log(`Uploading ${filePath} to S3 as ${s3Key}`);
    await uploadToS3(content, s3Key, contentType);
    console.log(`✅ Successfully migrated ${filePath}`);
    
    // Create backup of local file
    const backupPath = filePath + '.bak';
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup at ${backupPath}`);
    
  } catch (error) {
    console.error(`Failed to migrate ${filePath}:`, error);
  }
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.md':
      return 'text/markdown';
    case '.json':
      return 'application/json';
    case '.svg':
      return 'image/svg+xml';
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

// Run migration
migrateFilesToS3().then(() => {
  console.log('\nMigration completed!');
}).catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
}); 