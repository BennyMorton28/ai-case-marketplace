import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { uploadToS3, s3Client, BUCKET_NAME } from '../../../../../../../app/lib/s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';

// List of static demo IDs that should use local files
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; assistantId: string } }
) {
  try {
    const { id: demoId, assistantId } = params;

    if (!demoId || !assistantId) {
      return new NextResponse('Invalid demo or assistant ID', { status: 400 });
    }

    // For static demos, use local files
    if (staticDemoIds.includes(demoId)) {
      // Define paths to check for markdown files
      const paths = [
        path.join(process.cwd(), 'public', 'markdown', `${demoId}-${assistantId}.md`),
        path.join(process.cwd(), 'assistants', `${demoId}-${assistantId}.md`),
        path.join(process.cwd(), 'public', 'demos', demoId, 'markdown', `${assistantId}.md`)
      ];

      // Try each path until we find the file
      for (const filePath of paths) {
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          return new NextResponse(content, {
            headers: { 'Content-Type': 'text/markdown' },
          });
        }
      }
    }

    // For dynamic demos, use S3
    // Use the consistent path structure that matches demo creation
    const s3Key = `demos/${demoId}/markdown/${assistantId}.md`;
    console.log('Fetching markdown from S3:', s3Key);
    
    try {
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
      });

      const response = await s3Client.send(command);
      const content = await response.Body?.transformToString();
      
      if (content) {
        console.log('Successfully fetched markdown content, length:', content.length);
        return new NextResponse(content, {
          headers: { 'Content-Type': 'text/markdown' },
        });
      }
    } catch (error) {
      // For NoSuchKey errors (file doesn't exist), return empty content
      const s3Error = error as { name?: string, Code?: string };
      if ((s3Error?.name === 'NoSuchKey') || (s3Error?.Code === 'NoSuchKey')) {
        console.log('Markdown file not found, returning empty content');
        return new NextResponse('', {
          headers: { 'Content-Type': 'text/markdown' },
        });
      }
      
      console.error('Error fetching markdown from S3:', error);
      return new NextResponse('Error fetching markdown', { status: 500 });
    }

    // If no content was found but no error occurred, return empty content
    return new NextResponse('', {
      headers: { 'Content-Type': 'text/markdown' },
    });
  } catch (error) {
    console.error('Error reading markdown file:', error);
    return new NextResponse('Error reading markdown file', { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; assistantId: string } }
) {
  try {
    const { id: demoId, assistantId } = params;
    
    if (!demoId || !assistantId) {
      return new NextResponse('Missing demo ID or assistant ID', { status: 400 });
    }

    const content = await request.text();
    if (!content) {
      return new NextResponse('No content provided', { status: 400 });
    }

    // For static demos, prevent modification
    if (staticDemoIds.includes(demoId)) {
      return new NextResponse('Cannot modify static demo content', { status: 403 });
    }

    // Use consistent S3 path structure that matches demo creation
    const s3Key = `demos/${demoId}/markdown/${assistantId}.md`;
    console.log('Uploading markdown to S3:', s3Key);

    // Upload to S3
    await uploadToS3(Buffer.from(content), s3Key, 'text/markdown');

    return new NextResponse(JSON.stringify({ markdownPath: s3Key }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error uploading markdown:', error);
    return new NextResponse('Error uploading markdown', { status: 500 });
  }
} 