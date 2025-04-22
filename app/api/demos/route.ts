import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ensureDirectoryExists, validatePathWritable, getSavePaths } from '../../lib/files';
import { uploadToS3, s3Client, BUCKET_NAME, getSignedDownloadUrl } from '../../lib/s3';
import { ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'demos/',
      Delimiter: '/'
    });

    const { CommonPrefixes } = await s3Client.send(listCommand);
    if (!CommonPrefixes) {
      return new NextResponse(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const demos = [];
    for (const prefix of CommonPrefixes) {
      if (!prefix.Prefix) continue;
      const demoId = prefix.Prefix.split('/')[1];
      if (staticDemoIds.includes(demoId)) continue;

      try {
        // Check if config.json exists first
        const configKey = `${prefix.Prefix}config.json`;
        try {
          await s3Client.send(new HeadObjectCommand({
            Bucket: BUCKET_NAME,
            Key: configKey
          }));
        } catch {
          // Skip this demo if config.json doesn't exist
          continue;
        }

        // Get the config.json for this demo
        const configCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: configKey
        });

        const configResponse = await s3Client.send(configCommand);
        if (!configResponse.Body) continue;

        const configText = await configResponse.Body.transformToString();
        const config = JSON.parse(configText);

        if (config.iconPath) {
          config.iconUrl = await getSignedDownloadUrl(config.iconPath);
        }

        if (config.assistants) {
          for (const assistant of config.assistants) {
            if (assistant.iconPath) {
              assistant.iconUrl = await getSignedDownloadUrl(assistant.iconPath);
            }
          }
        }

        demos.push(config);
      } catch (error: any) {
        console.error(`Error processing demo ${demoId}:`, error?.message || 'Unknown error');
        continue;
      }
    }

    return new NextResponse(JSON.stringify(demos), {
      headers: { 'Content-Type': 'application/json' },
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

    // Save demo icon if provided
    if (formData.has('icon')) {
      const iconFile = formData.get('icon') as File;
      const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
      const extension = iconFile.type.startsWith('image/svg') ? '.svg' : iconFile.name.split('.').pop() || '.png';
      const iconPath = `demos/${demoData.id}/icon${extension}`;
      
      await uploadToS3(
        iconBuffer,
        iconPath,
        iconFile.type
      );
      
      demoData.iconPath = iconPath;
    } else {
      // Create default icon
      const defaultIconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">${demoData.title[0]}</text>
      </svg>`;
      
      const iconPath = `demos/${demoData.id}/icon.svg`;
      await uploadToS3(
        Buffer.from(defaultIconContent),
        iconPath,
        'image/svg+xml'
      );
      
      demoData.iconPath = iconPath;
    }

    // Handle document uploads
    const documents = [];
    for (let i = 0; formData.has(`document_${i}`); i++) {
      const file = formData.get(`document_${i}`) as File;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      const s3Key = `demos/${demoData.id}/documents/${file.name}`;
      await uploadToS3(fileBuffer, s3Key, file.type);
      
      const docMetadata = demoData.documents[i];
      documents.push({
        id: docMetadata.id,
        name: docMetadata.name,
        path: s3Key
      });
    }
    
    demoData.documents = documents;

    // Save markdown files for each assistant
    for (const assistant of demoData.assistants) {
      // Get the prompt content from the assistant data
      const promptContent = assistant.promptContent;
      if (!promptContent) {
        console.error(`No prompt content found for assistant: ${assistant.id}`);
        return new NextResponse(`Missing prompt content for assistant: ${assistant.name}`, { status: 400 });
      }

      const promptMarkdownPath = `demos/${demoData.id}/markdown/${assistant.id}.md`;
      await uploadToS3(
        Buffer.from(promptContent),
        promptMarkdownPath,
        'text/markdown'
      );
      
      assistant.promptMarkdownPath = promptMarkdownPath;

      // Save assistant icon if provided
      if (formData.has(`icon_${assistant.id}`)) {
        const iconFile = formData.get(`icon_${assistant.id}`) as File;
        const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
        const extension = iconFile.type.startsWith('image/svg') ? '.svg' : iconFile.name.split('.').pop() || '.png';
        const iconPath = `demos/${demoData.id}/assistants/${assistant.id}/icon${extension}`;
        
        await uploadToS3(
          iconBuffer,
          iconPath,
          iconFile.type
        );
        
        assistant.iconPath = iconPath;
      } else {
        // Create default assistant icon
        const defaultIconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">${assistant.name[0]}</text>
        </svg>`;
        
        const iconPath = `demos/${demoData.id}/assistants/${assistant.id}/icon.svg`;
        await uploadToS3(
          Buffer.from(defaultIconContent),
          iconPath,
          'image/svg+xml'
        );
        
        assistant.iconPath = iconPath;
      }
    }

    // Add timestamps and explanation markdown path
    demoData.createdAt = new Date().toISOString();
    demoData.updatedAt = new Date().toISOString();
    demoData.explanationMarkdownPath = `demos/${demoData.id}/markdown/explanation.md`;

    // Create default explanation markdown
    const defaultExplanation = `# ${demoData.title}\n\nWelcome to ${demoData.title}!`;
    await uploadToS3(
      Buffer.from(defaultExplanation),
      demoData.explanationMarkdownPath,
      'text/markdown'
    );

    // Save the final config to S3
    await uploadToS3(
      Buffer.from(JSON.stringify(demoData, null, 2)),
      `demos/${demoData.id}/config.json`,
      'application/json'
    );

    // Get signed URLs for icons
    if (demoData.iconPath) {
      demoData.iconUrl = await getSignedDownloadUrl(demoData.iconPath);
    }

    for (const assistant of demoData.assistants) {
      if (assistant.iconPath) {
        assistant.iconUrl = await getSignedDownloadUrl(assistant.iconPath);
      }
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