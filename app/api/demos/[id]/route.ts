import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getSavePaths } from '../../../lib/files';
import { s3Client, BUCKET_NAME, getSignedDownloadUrl, uploadToS3 } from '../../../lib/s3';
import { GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of static demo IDs that should be protected
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const demoId = params.id;

    // For static demos, use local filesystem
    if (staticDemoIds.includes(demoId)) {
      // ... existing code for static demos ...
      return new NextResponse('Static demos not implemented', { status: 501 });
    }

    // For dynamic demos, fetch from S3
    try {
      const configKey = `demos/${demoId}/config.json`;
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: configKey
      });

      const response = await s3Client.send(command);
      if (!response.Body) {
        return new NextResponse('Demo not found', { status: 404 });
    }

      const configText = await response.Body.transformToString();
      const config = JSON.parse(configText);

      // Get signed URLs for icons
      if (config.iconPath) {
        config.iconUrl = await getSignedDownloadUrl(config.iconPath);
      }

      // Get signed URLs for assistant icons
      if (config.assistants) {
        for (const assistant of config.assistants) {
          if (assistant.iconPath) {
            assistant.iconUrl = await getSignedDownloadUrl(assistant.iconPath);
          }
        }
      }

      return new NextResponse(JSON.stringify(config), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error fetching demo from S3:', error);
      return new NextResponse('Demo not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error getting demo:', error);
    return new NextResponse('Error getting demo', { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const demoId = params.id;
    const updatedDemo = await request.json();

    // Validate the demo ID matches
    if (demoId !== updatedDemo.id) {
      return new NextResponse('Demo ID mismatch', { status: 400 });
    }

    // Update timestamps
    updatedDemo.updatedAt = new Date().toISOString();

    // Save to S3
    const s3Key = `demos/${demoId}/config.json`;
    console.log('Updating demo config in S3:', s3Key);
    
    await uploadToS3(
      Buffer.from(JSON.stringify(updatedDemo, null, 2)),
      s3Key,
      'application/json'
    );

    return new NextResponse(JSON.stringify(updatedDemo), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error updating demo:', error);
    return new NextResponse('Error updating demo', { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const demoId = params.id;
    
    // Don't allow deletion of static demos
    if (staticDemoIds.includes(demoId)) {
      return new NextResponse('Cannot delete static demos', { status: 403 });
    }

    // First delete from database (this will cascade to CaseAccess)
    try {
      await prisma.case.delete({
        where: { id: demoId }
      });
    } catch (error) {
      console.warn('Case not found in database or already deleted:', error);
      // Continue with S3 cleanup even if database entry doesn't exist
    }

    // For dynamic demos, delete from S3
    try {
      // First check if the demo exists
      const configKey = `demos/${demoId}/config.json`;
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: configKey
      });

      try {
        await s3Client.send(command);
      } catch (error) {
        const s3Error = error as { name?: string };
        if (s3Error.name === 'NoSuchKey') {
          return new NextResponse('Demo not found', { status: 404 });
        }
        throw error;
      }

      // Get the demo config to find all associated files
      const demoConfigResponse = await s3Client.send(command);
      if (!demoConfigResponse.Body) {
        return new NextResponse('Demo not found', { status: 404 });
      }

      const configText = await demoConfigResponse.Body.transformToString();
      const config = JSON.parse(configText);
      
      // List all files in the demo's directory to delete them
      // This is a simplified approach - in production you would want to use
      // S3's listObjectsV2 and deleteObjects for batch operations
      
      // Delete config file
      await s3Client.send(new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: configKey
      }));
      console.log(`Deleted S3 config file: ${configKey}`);
      
      // Delete demo icon if exists
      if (config.iconPath) {
        await s3Client.send(new DeleteObjectCommand({
          Bucket: BUCKET_NAME,
          Key: config.iconPath
        }));
        console.log(`Deleted S3 demo icon: ${config.iconPath}`);
      }
      
      // Delete all assistant icons and markdown files
      if (config.assistants && config.assistants.length > 0) {
        for (const assistant of config.assistants) {
          // Delete assistant icon if exists
          if (assistant.iconPath) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: assistant.iconPath
            }));
            console.log(`Deleted S3 assistant icon: ${assistant.iconPath}`);
          }
          
          // Delete assistant markdown if exists
          const markdownKey = `demos/${demoId}/markdown/${assistant.id}.md`;
          try {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: markdownKey
            }));
            console.log(`Deleted S3 assistant markdown: ${markdownKey}`);
          } catch (error) {
            console.warn(`Could not delete markdown for assistant ${assistant.id}, it may not exist`);
          }
        }
      }
      
      // Delete all documents if exists
      if (config.documents && config.documents.length > 0) {
        for (const doc of config.documents) {
          if (doc.path) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: doc.path
            }));
            console.log(`Deleted S3 document: ${doc.path}`);
          }
        }
      }

      // Delete any remaining files in the demo directory
      const listCommand = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `demos/${demoId}/`
      });
      
      const { Contents } = await s3Client.send(listCommand);
      if (Contents) {
        for (const file of Contents) {
          if (file.Key) {
            await s3Client.send(new DeleteObjectCommand({
              Bucket: BUCKET_NAME,
              Key: file.Key
            }));
            console.log(`Deleted remaining S3 file: ${file.Key}`);
          }
        }
      }
      
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error('Error deleting demo from S3:', error);
      return new NextResponse('Error deleting demo', { status: 500 });
    }
  } catch (error) {
    console.error('Error deleting demo:', error);
    return new NextResponse('Error deleting demo', { status: 500 });
  }
} 