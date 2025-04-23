import { NextRequest, NextResponse } from 'next/server';
import { getSignedDownloadUrl } from '../../../lib/s3';
import { promises as fs } from 'fs';
import path from 'path';

// Simple in-memory cache
const cache = new Map<string, { content: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const key = params.key;
    if (!key) {
      return NextResponse.json({ error: { message: 'No key provided' } }, { status: 400 });
    }

    // Check cache first
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Serving from cache:', key);
      return new NextResponse(cached.content, {
        headers: {
          'Content-Type': key.endsWith('.svg') ? 'image/svg+xml' : 'text/plain',
          'Cache-Control': 'public, max-age=300', // 5 minutes browser caching
        },
      });
    }

    // Check if the file exists in the public directory
    const publicPath = path.join(process.cwd(), 'public', key);
    try {
      const content = await fs.readFile(publicPath, 'utf-8');
      
      // Update cache
      cache.set(key, {
        content,
        timestamp: Date.now()
      });
      
      return new NextResponse(content, {
        headers: {
          'Content-Type': key.endsWith('.svg') ? 'image/svg+xml' : 'text/plain',
          'Cache-Control': 'public, max-age=300', // 5 minutes browser caching
        },
      });
    } catch (error) {
      // File not found in public directory, continue to S3
    }

    // Try S3
    try {
      const url = await getSignedDownloadUrl(key);
      const response = await fetch(url);
      const content = await response.text();

      // Update cache
      cache.set(key, {
        content,
        timestamp: Date.now()
      });

      return new NextResponse(content, {
        headers: {
          'Content-Type': key.endsWith('.svg') ? 'image/svg+xml' : 'text/plain',
          'Cache-Control': 'public, max-age=300', // 5 minutes browser caching
        },
      });
    } catch (error) {
      console.error('Error fetching from S3:', error);
      return NextResponse.json(
        { error: { message: 'Failed to fetch document from S3' } },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: { message: 'Failed to fetch document' } },
      { status: 500 }
    );
  }
} 