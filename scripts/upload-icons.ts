import fs from 'fs';
import path from 'path';
import { uploadToS3 } from '../app/lib/s3';

async function uploadFile(filePath: string, s3Key: string, contentType: string) {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    console.log(`Uploading ${filePath} to S3 key: ${s3Key}`);
    await uploadToS3(fileContent, s3Key, contentType);
    console.log(`Successfully uploaded ${s3Key}`);
  } catch (error) {
    console.error(`Failed to upload ${filePath}:`, error);
  }
}

async function uploadDemoFiles() {
  const demoId = 'ronda';
  const publicPath = path.join(process.cwd(), 'public');
  
  // Upload config file
  const configPath = path.join(publicPath, 'demos', demoId, 'config.json');
  const configS3Key = `demos/${demoId}/config.json`;
  await uploadFile(configPath, configS3Key, 'application/json');

  // Upload main demo icon
  const demoIconPath = path.join(publicPath, 'demos', demoId, 'icon.svg');
  const demoIconS3Key = `demos/${demoId}/icon.svg`;
  await uploadFile(demoIconPath, demoIconS3Key, 'image/svg+xml');

  // Upload assistant icons
  const assistants = [
    { id: 'wendy', iconPath: path.join(publicPath, 'demos', demoId, 'assistants', 'wendy', 'icon.svg') },
    { id: 'frido', iconPath: path.join(publicPath, 'demos', demoId, 'assistants', 'frido', 'icon.svg') }
  ];

  for (const assistant of assistants) {
    const s3Key = `demos/${demoId}/assistants/${assistant.id}/icon.svg`;
    await uploadFile(assistant.iconPath, s3Key, 'image/svg+xml');
  }
}

uploadDemoFiles().catch(console.error); 
import path from 'path';
import { uploadToS3 } from '../app/lib/s3';

async function uploadFile(filePath: string, s3Key: string, contentType: string) {
  try {
    const fileContent = fs.readFileSync(filePath);
    
    console.log(`Uploading ${filePath} to S3 key: ${s3Key}`);
    await uploadToS3(fileContent, s3Key, contentType);
    console.log(`Successfully uploaded ${s3Key}`);
  } catch (error) {
    console.error(`Failed to upload ${filePath}:`, error);
  }
}

async function uploadDemoFiles() {
  const demoId = 'ronda';
  const publicPath = path.join(process.cwd(), 'public');
  
  // Upload config file
  const configPath = path.join(publicPath, 'demos', demoId, 'config.json');
  const configS3Key = `demos/${demoId}/config.json`;
  await uploadFile(configPath, configS3Key, 'application/json');

  // Upload main demo icon
  const demoIconPath = path.join(publicPath, 'demos', demoId, 'icon.svg');
  const demoIconS3Key = `demos/${demoId}/icon.svg`;
  await uploadFile(demoIconPath, demoIconS3Key, 'image/svg+xml');

  // Upload assistant icons
  const assistants = [
    { id: 'wendy', iconPath: path.join(publicPath, 'demos', demoId, 'assistants', 'wendy', 'icon.svg') },
    { id: 'frido', iconPath: path.join(publicPath, 'demos', demoId, 'assistants', 'frido', 'icon.svg') }
  ];

  for (const assistant of assistants) {
    const s3Key = `demos/${demoId}/assistants/${assistant.id}/icon.svg`;
    await uploadFile(assistant.iconPath, s3Key, 'image/svg+xml');
  }
}

uploadDemoFiles().catch(console.error); 