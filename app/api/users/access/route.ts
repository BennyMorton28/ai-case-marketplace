import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// POST /api/users/access - Grant access to cases for a professor
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if the requesting user is a super admin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Only super admins can manage professor access' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, caseIds, addedBy } = body;

    // Find or create the professor user
    const professor = await prisma.user.upsert({
      where: { email },
      update: { isAdmin: true },
      create: {
        email,
        isAdmin: true,
      },
    });

    // Grant access to selected cases
    const accessPromises = caseIds.map((caseId: string) =>
      prisma.adminCaseAccess.create({
        data: {
          userId: professor.id,
          caseId,
          addedBy,
        },
      })
    );

    await Promise.all(accessPromises);

    return NextResponse.json({
      message: 'Professor access granted successfully',
      professorId: professor.id,
    });
  } catch (error) {
    console.error('Error managing professor access:', error);
    return NextResponse.json(
      { error: 'Failed to manage professor access' },
      { status: 500 }
    );
  }
} 