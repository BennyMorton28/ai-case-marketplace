import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { s3Client } from '../../lib/s3';
import { ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Prisma } from '@prisma/client';

// List of static demo IDs that should be excluded from API results
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

interface CaseWithRelations {
  id: string;
  name: string;
  description: string | null;
  creatorId: string;
  creator: {
    id: string;
    email: string;
  };
  userAccess: Array<{
    user: {
      id: string;
      email: string;
    };
  }>;
}

// GET /api/cases - Get all cases
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        caseAccess: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // List all demo directories in S3
    const command = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Prefix: 'demos/',
      Delimiter: '/'
    });

    const s3Response = await s3Client.send(command);
    const demoPrefixes = s3Response.CommonPrefixes || [];

    // For each demo directory, check for config.json and sync with Prisma
    for (const prefix of demoPrefixes) {
      const demoId = prefix.Prefix?.split('/')[1];
      if (!demoId || staticDemoIds.includes(demoId)) continue;

      try {
        const configCommand = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: `demos/${demoId}/config.json`
        });

        const configResponse = await s3Client.send(configCommand);
        const configData = JSON.parse(await configResponse.Body?.transformToString() || '{}');

        // Ensure the creator exists
        const creator = await prisma.user.upsert({
          where: { email: session.user.email },
          update: {},
          create: { email: session.user.email }
        });

        // Sync the case with Prisma
        await prisma.case.upsert({
          where: { id: demoId },
          create: {
            id: demoId,
            name: configData.title || demoId,
            description: configData.description || null,
            creatorId: creator.id,
          },
          update: {
            name: configData.title || demoId,
            description: configData.description || null,
          }
        });
      } catch (error) {
        console.error(`Error processing demo ${demoId}:`, error);
        // Continue with next demo if one fails
      }
    }

    // Now get all cases from Prisma
    const cases = await prisma.case.findMany({
      where: {
        AND: [
          {
            id: {
              notIn: staticDemoIds
            }
          },
          {
            OR: [
              // Cases the user has explicit access to
              {
                userAccess: {
                  some: {
                    userId: user.id,
                    role: {
                      in: ['STUDENT', 'PROFESSOR']
                    }
                  },
                },
              },
              // Cases created by the user
              {
                creatorId: user.id,
              },
              // All cases if user is admin or superadmin
              ...(user.isAdmin || user.isSuperAdmin ? [{}] : []),
            ],
          }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
          },
        },
        userAccess: {
          where: {
            userId: user.id
          },
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Generate signed URLs for icons
    const casesWithUrls = await Promise.all(
      cases.map(async (c: CaseWithRelations) => {
        let iconUrl;
        const s3IconPath = `demos/${c.id}/icon.svg`;
        try {
          const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: s3IconPath,
          });
          iconUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
        } catch (error) {
          console.error(`Error getting signed URL for icon: ${error}`);
        }

        return {
          ...c,
          iconUrl,
        };
      })
    );

    return NextResponse.json(casesWithUrls);
  } catch (error) {
    console.error('Error fetching cases:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 