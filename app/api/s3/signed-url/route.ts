import { NextRequest, NextResponse } from 'next/server';
import { getSignedDownloadUrl } from '../../../lib/s3';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      console.error('No key provided for signed URL');
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    console.log('Generating signed URL for key:', key);
    const url = await getSignedDownloadUrl(key);
    console.log('Generated signed URL:', url);
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    // Check if it's a NoSuchKey error from S3
    if (error instanceof Error && error.message.includes('NoSuchKey')) {
      return NextResponse.json(
        { error: 'File not found in S3' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to get signed URL' },
      { status: 500 }
    );
  }
} 