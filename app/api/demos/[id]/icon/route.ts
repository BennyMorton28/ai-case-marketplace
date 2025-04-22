import { NextRequest, NextResponse } from 'next/server';
import { uploadToS3 } from '../../../../lib/s3';

// List of static demo IDs that should be protected
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: demoId } = params;
    
    // Check if it's a static demo
    if (staticDemoIds.includes(demoId)) {
      return new NextResponse('Cannot modify static demos', { status: 403 });
    }

    const formData = await request.formData();
    const iconFile = formData.get('icon') as File;

    if (!iconFile) {
      return new NextResponse('No icon file provided', { status: 400 });
    }

    // Get file extension
    const ext = iconFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !['svg', 'png', 'jpg', 'jpeg'].includes(ext)) {
      return new NextResponse('Invalid file type. Only SVG, PNG, and JPG are allowed.', { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await iconFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Define S3 path - use consistent path format
    const iconPath = `demos/${demoId}/icon.${ext}`;

    try {
      // Upload to S3
      await uploadToS3(buffer, iconPath, iconFile.type);

      // Return the path that will be stored in the database/config
      return new NextResponse(JSON.stringify({ iconPath }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error uploading to S3:', error);
      return new NextResponse('Failed to upload file to S3', { status: 500 });
    }
  } catch (error) {
    console.error('Error processing demo icon upload:', error);
    return new NextResponse('Error uploading icon', { status: 500 });
  }
} 
 
 
import { uploadToS3 } from '../../../../lib/s3';

// List of static demo IDs that should be protected
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: demoId } = params;
    
    // Check if it's a static demo
    if (staticDemoIds.includes(demoId)) {
      return new NextResponse('Cannot modify static demos', { status: 403 });
    }

    const formData = await request.formData();
    const iconFile = formData.get('icon') as File;

    if (!iconFile) {
      return new NextResponse('No icon file provided', { status: 400 });
    }

    // Get file extension
    const ext = iconFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !['svg', 'png', 'jpg', 'jpeg'].includes(ext)) {
      return new NextResponse('Invalid file type. Only SVG, PNG, and JPG are allowed.', { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await iconFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Define S3 path - use consistent path format
    const iconPath = `demos/${demoId}/icon.${ext}`;

    try {
      // Upload to S3
      await uploadToS3(buffer, iconPath, iconFile.type);

      // Return the path that will be stored in the database/config
      return new NextResponse(JSON.stringify({ iconPath }), {
        headers: {
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Error uploading to S3:', error);
      return new NextResponse('Failed to upload file to S3', { status: 500 });
    }
  } catch (error) {
    console.error('Error processing demo icon upload:', error);
    return new NextResponse('Error uploading icon', { status: 500 });
  }
} 
 
 