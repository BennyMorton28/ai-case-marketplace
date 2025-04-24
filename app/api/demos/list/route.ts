import { NextResponse } from 'next/server';
import { s3Client, BUCKET_NAME, getSignedDownloadUrl } from '../../../lib/s3';
import { ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List of static demo IDs to exclude
const STATIC_DEMOS = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

export async function GET() {
  try {
    // List all directories in the demos/ prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: 'demos/',
      Delimiter: '/'
    });

    const { CommonPrefixes } = await s3Client.send(listCommand);
    
    // Get all demos from the database
    const dbDemos = await prisma.case.findMany({
      where: {
        id: { notIn: STATIC_DEMOS }
      }
    });

    // Create a set of demo IDs that exist in S3
    const s3DemoIds = new Set(
      CommonPrefixes?.map(prefix => prefix.Prefix?.split('/')[1]).filter(Boolean) || []
    );

    // Delete database entries for demos that don't exist in S3
    for (const dbDemo of dbDemos) {
      if (!s3DemoIds.has(dbDemo.id)) {
        console.log(`Cleaning up orphaned database entry for demo ${dbDemo.id}`);
        try {
          await prisma.case.delete({
            where: { id: dbDemo.id }
          });
        } catch (error) {
          console.error(`Error deleting orphaned demo ${dbDemo.id}:`, error);
        }
      }
    }

    if (!CommonPrefixes) {
      return new NextResponse(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const demos = [];
    for (const prefix of CommonPrefixes) {
      if (!prefix.Prefix) continue;

      // Extract demo ID from the prefix (demos/demo-id/)
      const demoId = prefix.Prefix.split('/')[1];
      
      // Skip static demos
      if (STATIC_DEMOS.includes(demoId)) continue;

      try {
        // Check if the demo directory exists
        const headCommand = new HeadObjectCommand({
          Bucket: BUCKET_NAME,
          Key: prefix.Prefix
        });

        try {
          await s3Client.send(headCommand);
        } catch (error) {
          // Skip if directory doesn't exist
          continue;
        }

        // Get the config.json for this demo
        const configCommand = new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: `${prefix.Prefix}config.json`
        });

        try {
          const configResponse = await s3Client.send(configCommand);
          if (!configResponse.Body) continue;

          // Parse the config file
          const configText = await configResponse.Body.transformToString();
          const config = JSON.parse(configText);

          // Get signed URLs for icons if they exist
          if (config.iconPath) {
            try {
              config.iconUrl = await getSignedDownloadUrl(config.iconPath);
            } catch (error) {
              console.warn(`Could not get signed URL for icon ${config.iconPath}:`, error);
              // Don't fail if icon is missing
              config.iconUrl = null;
            }
          }

          // Get signed URLs for assistant icons
          if (config.assistants) {
            for (const assistant of config.assistants) {
              if (assistant.iconPath) {
                try {
                  assistant.iconUrl = await getSignedDownloadUrl(assistant.iconPath);
                } catch (error) {
                  console.warn(`Could not get signed URL for assistant icon ${assistant.iconPath}:`, error);
                  // Don't fail if assistant icon is missing
                  assistant.iconUrl = null;
                }
              }
            }
          }

          demos.push(config);
        } catch (error) {
          // If config file doesn't exist, check if we have a database entry to clean up
          try {
            const dbDemo = await prisma.case.findUnique({
              where: { id: demoId }
            });
            if (dbDemo) {
              console.log(`Cleaning up database entry for demo ${demoId} with missing config.json`);
              await prisma.case.delete({
                where: { id: demoId }
              });
            }
          } catch (dbError) {
            console.error(`Error cleaning up database for demo ${demoId}:`, dbError);
          }
          console.warn(`No config file found for demo ${demoId}`);
          continue;
        }
      } catch (error) {
        console.error(`Error processing demo ${demoId}:`, error);
        // Continue with other demos even if one fails
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