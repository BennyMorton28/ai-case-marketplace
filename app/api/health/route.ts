import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';

const prisma = new PrismaClient();
const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION || 'us-east-1',
});

export const dynamic = 'force-dynamic';

async function checkDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkS3() {
  try {
    const command = new HeadBucketCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
    });
    await s3Client.send(command);
    return { status: 'healthy' };
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
}

async function checkMemory() {
  const used = process.memoryUsage();
  return {
    status: used.heapUsed < 1024 * 1024 * 512 ? 'healthy' : 'warning', // Warning if heap > 512MB
    metrics: {
      heapUsed: Math.round(used.heapUsed / 1024 / 1024),
      heapTotal: Math.round(used.heapTotal / 1024 / 1024),
      rss: Math.round(used.rss / 1024 / 1024),
    },
  };
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
} 