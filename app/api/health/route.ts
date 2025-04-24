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
  const startTime = Date.now();

  const [dbHealth, s3Health, memoryHealth] = await Promise.all([
    checkDatabase(),
    checkS3(),
    checkMemory(),
  ]);

  const responseTime = Date.now() - startTime;
  
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    responseTime,
    services: {
      database: dbHealth,
      s3: s3Health,
      memory: memoryHealth,
    },
    version: process.env.NEXT_PUBLIC_BUILD_TIME || 'development',
  };

  // Set overall status based on component health
  if (dbHealth.status === 'unhealthy' || s3Health.status === 'unhealthy') {
    health.status = 'unhealthy';
  } else if (memoryHealth.status === 'warning') {
    health.status = 'warning';
  }

  return NextResponse.json(health, {
    status: health.status === 'healthy' ? 200 : 
           health.status === 'warning' ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
} 