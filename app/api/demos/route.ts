import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ensureDirectoryExists, validatePathWritable, getSavePaths } from '../../lib/files';
import { uploadToS3 } from '../../lib/s3';

// List of static demo IDs that should be excluded from API results
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

/**
 * Helper function to get the correct file path in both development and production environments
 * In both development and production, we use process.cwd() which should point to the correct location
 */
function getBasePath(): string {
  return process.cwd();
}

export async function GET() {
  try {
    // Get all dynamic demos from the public/demos directory
    const demosDir = path.join(getBasePath(), 'public', 'demos');
    const dynamicDemos = [];

    if (fs.existsSync(demosDir)) {
      const demoFolders = fs.readdirSync(demosDir);
      
      for (const folder of demoFolders) {
        // Skip static demo folders
        if (staticDemoIds.includes(folder)) continue;
        
        const configPath = path.join(demosDir, folder, 'config.json');
        if (fs.existsSync(configPath)) {
          const configData = fs.readFileSync(configPath, 'utf-8');
          const config = JSON.parse(configData);
          dynamicDemos.push(config);
        }
      }
    }

    return new NextResponse(JSON.stringify(dynamicDemos), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error listing demos:', error);
    return new NextResponse('Error listing demos', { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const demoData = JSON.parse(formData.get('demo') as string);
    
    // Validate required fields
    if (!demoData.id || !demoData.title || !demoData.author || !demoData.assistants) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Check if case password is provided when hasPassword is true
    if (demoData.hasPassword === true && !demoData.password) {
      return new NextResponse('Password is required when case is locked', { status: 400 });
    }

    // Get the paths for saving files
    const { publicPath, standalonePath } = getSavePaths();
    console.log(`Using paths: publicPath=${publicPath}, standalonePath=${standalonePath || 'none'} for case creation`);

    // Create necessary directories in the public path
    const demoDir = path.join(publicPath, 'public', 'demos', demoData.id);
    const markdownDir = path.join(publicPath, 'public', 'markdown');
    
    // Use our helper function to create directories
    ensureDirectoryExists(demoDir);
    ensureDirectoryExists(markdownDir);
    
    // If we have a standalone path, also create directories there
    let standaloneDemoDir: string | null = null;
    let standaloneMarkdownDir: string | null = null;
    
    if (standalonePath) {
      standaloneDemoDir = path.join(standalonePath, 'public', 'demos', demoData.id);
      standaloneMarkdownDir = path.join(standalonePath, 'public', 'markdown');
      
      ensureDirectoryExists(standaloneDemoDir);
      ensureDirectoryExists(standaloneMarkdownDir);
    }
    
    // Validate that critical paths are writable
    const demoConfigPath = path.join(demoDir, 'config.json');
    if (!validatePathWritable(demoConfigPath)) {
      console.error(`Cannot write to demo config path: ${demoConfigPath}`);
      return new NextResponse('Server file access error', { status: 500 });
    }

    // Save demo icon if provided - to both locations
    if (formData.has('icon')) {
      const iconFile = formData.get('icon') as File;
      const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
      
      // Save to public directory
      const iconPath = path.join(demoDir, 'icon.svg');
      fs.writeFileSync(iconPath, iconBuffer);
      console.log(`Saved demo icon to: ${iconPath}`);
      
      // Also save to standalone directory if it exists
      if (standaloneDemoDir) {
        const standaloneIconPath = path.join(standaloneDemoDir, 'icon.svg');
        fs.writeFileSync(standaloneIconPath, iconBuffer);
        console.log(`Also saved demo icon to standalone: ${standaloneIconPath}`);
      }
      
      demoData.icon = `demos/${demoData.id}/icon.svg`;
    }

    // Handle document uploads
    const documents = [];
    for (let i = 0; formData.has(`document_${i}`); i++) {
      const file = formData.get(`document_${i}`) as File;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      // Upload to S3
      const s3Key = `cases/${demoData.id}/documents/${file.name}`;
      await uploadToS3(fileBuffer, s3Key, file.type);
      
      // Add to documents array using metadata from demoData
      const docMetadata = demoData.documents[i];
      documents.push({
        name: docMetadata.name,
        description: docMetadata.description,
        key: s3Key,
        type: file.type,
        size: file.size,
        originalName: file.name
      });
    }
    
    // Add documents to demo data
    demoData.documents = documents;

    // Save markdown files for each assistant
    for (const assistant of demoData.assistants) {
      const markdownFile = formData.get(`markdown_${assistant.id}`) as File;
      if (!markdownFile) {
        console.error(`No markdown file found for assistant: ${assistant.id}`);
        return new NextResponse(`Missing markdown file for assistant: ${assistant.name}`, { status: 400 });
      }

      const markdownBuffer = Buffer.from(await markdownFile.arrayBuffer());
      
      // Save to public directory
      const markdownPath = path.join(markdownDir, `${demoData.id}-${assistant.id}.md`);
      fs.writeFileSync(markdownPath, markdownBuffer);
      console.log(`Saved markdown to: ${markdownPath}`);
      
      // Also save to standalone directory if it exists
      if (standaloneMarkdownDir) {
        const standaloneMarkdownPath = path.join(standaloneMarkdownDir, `${demoData.id}-${assistant.id}.md`);
        fs.writeFileSync(standaloneMarkdownPath, markdownBuffer);
        console.log(`Also saved markdown to standalone: ${standaloneMarkdownPath}`);
      }

      // Save assistant icon if provided
      if (formData.has(`icon_${assistant.id}`)) {
        const iconFile = formData.get(`icon_${assistant.id}`) as File;
        const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
        
        // Save to public directory
        const iconPath = path.join(demoDir, `icon_${assistant.id}.svg`);
        fs.writeFileSync(iconPath, iconBuffer);
        console.log(`Saved assistant icon to: ${iconPath}`);
        
        // Also save to standalone directory if it exists
        if (standaloneDemoDir) {
          const standaloneIconPath = path.join(standaloneDemoDir, `icon_${assistant.id}.svg`);
          fs.writeFileSync(standaloneIconPath, iconBuffer);
          console.log(`Also saved assistant icon to standalone: ${standaloneIconPath}`);
        }
        
        assistant.icon = `demos/${demoData.id}/icon_${assistant.id}.svg`;
      }
    }

    // Save the final config
    fs.writeFileSync(demoConfigPath, JSON.stringify(demoData, null, 2));
    console.log(`Saved demo config to: ${demoConfigPath}`);
    
    if (standaloneDemoDir) {
      const standaloneConfigPath = path.join(standaloneDemoDir, 'config.json');
      fs.writeFileSync(standaloneConfigPath, JSON.stringify(demoData, null, 2));
      console.log(`Also saved demo config to standalone: ${standaloneConfigPath}`);
    }

    return new NextResponse(JSON.stringify({ demo: demoData }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating demo:', error);
    return new NextResponse(`Error creating demo: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
} 