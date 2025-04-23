import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { ensureDirectoryExists, validatePathWritable, getSavePaths } from '../../lib/files';
import { uploadToS3, s3Client, BUCKET_NAME, getSignedDownloadUrl } from '../../lib/s3';
import { ListObjectsV2Command, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Infer types from Prisma client
type Case = Awaited<ReturnType<typeof prisma.case.findUnique>>;
type CaseAccess = Awaited<ReturnType<typeof prisma.caseAccess.findUnique>>;
type User = Awaited<ReturnType<typeof prisma.user.findUnique>>;

type CaseWithAccess = NonNullable<Case> & {
  userAccess: NonNullable<CaseAccess>[];
  creator: NonNullable<User>;
};

// List of static demo IDs that should be excluded from API results
const staticDemoIds = ['math-assistant', 'writing-assistant', 'language-assistant', 'coding-assistant'];

/**
 * Helper function to get the correct file path in both development and production environments
 * In both development and production, we use process.cwd() which should point to the correct location
 */
function getBasePath(): string {
  return process.cwd();
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user and their case access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        caseAccess: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('DEBUG - User:', {
      id: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      isSuperAdmin: user.isSuperAdmin,
      caseAccessCount: user.caseAccess.length,
      caseAccessIds: user.caseAccess.map((ca: CaseAccess) => ca.caseId)
    });

    // Get all cases the user has access to
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          // Cases the user has explicit access to through CaseAccess
          {
            userAccess: {
              some: {
                userId: user.id,
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
      },
      include: {
        userAccess: true,
        creator: true,
      },
    });

    console.log('DEBUG - Found cases:', cases.map((c: CaseWithAccess) => ({
      id: c.id,
      name: c.name,
      creatorId: c.creatorId,
      accessCount: c.userAccess.length,
      userHasAccess: c.userAccess.some((ua: CaseAccess) => ua.userId === user.id),
      isCreator: c.creatorId === user.id
    })));

    // Filter out cases that the user doesn't have access to
    const filteredCases = cases.filter((ca: CaseWithAccess) => {
      const hasAdminAccess = user.isAdmin || user.isSuperAdmin;
      const isCreator = ca.creatorId === user.id;
      const hasExplicitAccess = ca.userAccess.some((access: CaseAccess) => access.userId === user.id);
      
      console.log('DEBUG - Case access check:', {
        caseId: ca.id,
        caseName: ca.name,
        hasAdminAccess,
        isCreator,
        hasExplicitAccess,
        allowed: hasAdminAccess || isCreator || hasExplicitAccess
      });

      return hasAdminAccess || isCreator || hasExplicitAccess;
    });

    console.log('DEBUG - Accessible cases:', filteredCases.map((c: CaseWithAccess) => ({
      id: c.id,
      name: c.name
    })));

    // Generate signed URLs for icons
    const casesWithUrls = await Promise.all(filteredCases.map(async (c: CaseWithAccess) => {
      let iconUrl;
      // Get the icon path from S3 metadata since it's not in the Prisma schema
      const s3IconPath = `demos/${c.id}/icon.svg`;
      try {
        if (!process.env.AWS_S3_BUCKET_NAME) {
          throw new Error('AWS_S3_BUCKET_NAME not configured');
        }
        const command = new GetObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME,
          Key: s3IconPath,
        });
        iconUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      } catch (error) {
        console.error(`Error getting signed URL for icon: ${error}`);
        // Continue without the icon URL if there's an error
      }

      return {
        id: c.id,
        name: c.name,
        description: c.description,
        iconUrl,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    }));

    return NextResponse.json(casesWithUrls);
  } catch (error) {
    console.error('Error processing demos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the current user's session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();
    const demoData = JSON.parse(formData.get('demo') as string);
    
    // Validate required fields
    if (!demoData.id || !demoData.title || !demoData.author || !demoData.assistants) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Check if case password is provided when hasPassword is true
    if (demoData.hasPassword === true && !demoData.password) {
      return new NextResponse('Password is required when case is locked', { status: 400 });
    }

    // Ensure the creator exists and is an admin
    const creator = await prisma.user.upsert({
      where: { email: session.user.email },
      update: { isAdmin: true },
      create: { email: session.user.email, isAdmin: true },
    });

    // Create or update the case in Prisma
    const prismaCase = await prisma.case.upsert({
      where: { id: demoData.id },
      update: {
        name: demoData.title,
        description: demoData.description || null,
        creatorId: creator.id,
      },
      create: {
        id: demoData.id,
        name: demoData.title,
        description: demoData.description || null,
        creatorId: creator.id,
      },
    });

    // Grant admin access to the creator
    await prisma.adminCaseAccess.upsert({
      where: {
        userId_caseId: {
          userId: creator.id,
          caseId: prismaCase.id,
        },
      },
      update: {},
      create: {
        userId: creator.id,
        caseId: prismaCase.id,
        addedBy: creator.id,
      },
    });

    // Save demo icon if provided
    if (formData.has('icon')) {
      const iconFile = formData.get('icon') as File;
      const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
      const extension = iconFile.type.startsWith('image/svg') ? '.svg' : iconFile.name.split('.').pop() || '.png';
      const iconPath = `demos/${demoData.id}/icon${extension}`;
      
      await uploadToS3(
        iconBuffer,
        iconPath,
        iconFile.type
      );
      
      demoData.iconPath = iconPath;
    } else {
      // Create default icon
      const defaultIconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">${demoData.title[0]}</text>
      </svg>`;
      
      const iconPath = `demos/${demoData.id}/icon.svg`;
      await uploadToS3(
        Buffer.from(defaultIconContent),
        iconPath,
        'image/svg+xml'
      );
      
      demoData.iconPath = iconPath;
    }

    // Handle document uploads
    const documents = [];
    for (let i = 0; formData.has(`document_${i}`); i++) {
      const file = formData.get(`document_${i}`) as File;
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      
      const s3Key = `demos/${demoData.id}/documents/${file.name}`;
      await uploadToS3(fileBuffer, s3Key, file.type);
      
      const docMetadata = demoData.documents[i];
      documents.push({
        id: docMetadata.id,
        name: docMetadata.name,
        path: s3Key
      });
    }
    
    demoData.documents = documents;

    // Save markdown files for each assistant
    for (const assistant of demoData.assistants) {
      // Get the prompt content from the assistant data
      const promptContent = assistant.promptContent;
      if (!promptContent) {
        console.error(`No prompt content found for assistant: ${assistant.id}`);
        return new NextResponse(`Missing prompt content for assistant: ${assistant.name}`, { status: 400 });
      }

      const promptMarkdownPath = `demos/${demoData.id}/markdown/${assistant.id}.md`;
      await uploadToS3(
        Buffer.from(promptContent),
        promptMarkdownPath,
        'text/markdown'
      );
      
      assistant.promptMarkdownPath = promptMarkdownPath;

      // Save assistant icon if provided
      if (formData.has(`icon_${assistant.id}`)) {
        const iconFile = formData.get(`icon_${assistant.id}`) as File;
        const iconBuffer = Buffer.from(await iconFile.arrayBuffer());
        const extension = iconFile.type.startsWith('image/svg') ? '.svg' : iconFile.name.split('.').pop() || '.png';
        const iconPath = `demos/${demoData.id}/assistants/${assistant.id}/icon${extension}`;
        
        await uploadToS3(
          iconBuffer,
          iconPath,
          iconFile.type
        );
        
        assistant.iconPath = iconPath;
      } else {
        // Create default assistant icon
        const defaultIconContent = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-size="12">${assistant.name[0]}</text>
        </svg>`;
        
        const iconPath = `demos/${demoData.id}/assistants/${assistant.id}/icon.svg`;
        await uploadToS3(
          Buffer.from(defaultIconContent),
          iconPath,
          'image/svg+xml'
        );
        
        assistant.iconPath = iconPath;
      }
    }

    // Add timestamps and explanation markdown path
    demoData.createdAt = new Date().toISOString();
    demoData.updatedAt = new Date().toISOString();
    demoData.explanationMarkdownPath = `demos/${demoData.id}/markdown/explanation.md`;

    // Create default explanation markdown
    const defaultExplanation = `# ${demoData.title}\n\nWelcome to ${demoData.title}!`;
    await uploadToS3(
      Buffer.from(defaultExplanation),
      demoData.explanationMarkdownPath,
      'text/markdown'
    );

    // Save the final config to S3
    await uploadToS3(
      Buffer.from(JSON.stringify(demoData, null, 2)),
      `demos/${demoData.id}/config.json`,
      'application/json'
    );

    // Get signed URLs for icons
    if (demoData.iconPath) {
      demoData.iconUrl = await getSignedDownloadUrl(demoData.iconPath);
    }

    for (const assistant of demoData.assistants) {
      if (assistant.iconPath) {
        assistant.iconUrl = await getSignedDownloadUrl(assistant.iconPath);
      }
    }

    return new NextResponse(JSON.stringify({ demo: demoData }), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error creating demo:', error);
    return new NextResponse(`Error creating demo: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
} 