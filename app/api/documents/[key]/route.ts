import { NextRequest, NextResponse } from 'next/server';
import { getSignedDownloadUrl } from '../../../lib/s3';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const { key } = await params;
    const decodedKey = decodeURIComponent(key);
    const url = await getSignedDownloadUrl(decodedKey);
    
    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return new NextResponse('Error getting document URL', { status: 500 });
  }
} 