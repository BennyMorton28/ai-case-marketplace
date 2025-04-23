import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { accessControlList, grantAccess, revokeAccess } from '../../utils/access-control';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET /api/users - Get all users (admin/superadmin only)
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if the requesting user is an admin or superadmin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      adminOf: true, // Include cases they can manage if they're an admin
    }
  });

  if (!user?.isAdmin && !user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // If superadmin, return all users
  if (user.isSuperAdmin) {
    const users = await prisma.user.findMany({
      include: {
        caseAccess: true,
        adminOf: true,
      },
    });
    return NextResponse.json(users);
  }

  // If regular admin, only return users for cases they manage
  const managedCaseIds = user.adminOf.map(access => access.caseId);
  const users = await prisma.user.findMany({
    include: {
      caseAccess: {
        where: {
          caseId: {
            in: managedCaseIds
          }
        }
      }
    },
    where: {
      OR: [
        {
          caseAccess: {
            some: {
              caseId: {
                in: managedCaseIds
              }
            }
          }
        }
      ]
    }
  });

  return NextResponse.json(users);
}

// POST /api/users - Update user roles or access
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if the requesting user is an admin or superadmin
  const adminUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      adminOf: true,
    }
  });

  if (!adminUser?.isAdmin && !adminUser?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { action, userId, caseId, emails, makeAdmin, makeProf, role } = body;

  // Verify the admin has access to manage this case
  if (!adminUser.isSuperAdmin && caseId) {
    const hasAccess = adminUser.adminOf.some(access => access.caseId === caseId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'You do not have permission to manage this case' }, { status: 403 });
    }
  }

  switch (action) {
    case 'makeSuperAdmin':
      if (!adminUser.isSuperAdmin) {
        return NextResponse.json({ error: 'Only super admins can create other super admins' }, { status: 403 });
      }
      return await makeUserSuperAdmin(userId);
    
    case 'makeAdmin':
      if (!adminUser.isSuperAdmin) {
        return NextResponse.json({ error: 'Only super admins can create admins' }, { status: 403 });
      }
      return await makeUserAdmin(userId);
    
    case 'assignAdminToCase':
      if (!adminUser.isSuperAdmin) {
        return NextResponse.json({ error: 'Only super admins can assign admins to cases' }, { status: 403 });
      }
      return await assignAdminToCase(userId, caseId, session.user.email);
    
    case 'addUserToCase':
      return await addUserToCase(userId, caseId, role || 'STUDENT', session.user.email);
    
    case 'addUsersByEmail':
      return await addUsersByEmail(emails, makeAdmin, makeProf, caseId, role, session.user.email);
    
    case 'removeUserFromCase':
      return await removeUserFromCase(userId, caseId);

    default:
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }
}

async function makeUserSuperAdmin(userId: string) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { 
      isSuperAdmin: true,
      isAdmin: true, // Super admins are also admins
    },
  });
  return NextResponse.json(updatedUser);
}

async function makeUserAdmin(userId: string) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: true },
  });
  return NextResponse.json(updatedUser);
}

async function assignAdminToCase(userId: string, caseId: string, addedBy: string) {
  const access = await prisma.adminCaseAccess.create({
    data: {
      userId,
      caseId,
      addedBy,
    },
  });
  return NextResponse.json(access);
}

async function addUserToCase(userId: string, caseId: string, role: 'STUDENT' | 'PROFESSOR', addedBy: string) {
  const access = await prisma.caseAccess.create({
    data: {
      userId,
      caseId,
      role,
      addedBy,
    },
  });
  return NextResponse.json(access);
}

async function removeUserFromCase(userId: string, caseId: string) {
  await prisma.caseAccess.delete({
    where: {
      userId_caseId: {
        userId,
        caseId,
      },
    },
  });
  return NextResponse.json({ success: true });
}

async function addUsersByEmail(emails: string[], makeAdmin: boolean, makeProf: boolean, selectedCases: Array<{id: string, role: 'STUDENT' | 'PROFESSOR'}>, addedBy?: string) {
  const results = await Promise.all(
    emails.map(async (email) => {
      // Find or create user
      const user = await prisma.user.upsert({
        where: { email },
        create: { 
          email,
          isAdmin: makeAdmin,
          canCreateCases: makeProf,
        },
        update: {
          isAdmin: makeAdmin,
          canCreateCases: makeProf,
        },
      });

      // Add case access for selected cases
      if (selectedCases && selectedCases.length > 0 && addedBy) {
        // Remove any existing case access first
        await prisma.caseAccess.deleteMany({
          where: {
            userId: user.id,
            caseId: {
              in: selectedCases.map(c => c.id)
            }
          }
        });

        // Add new case access entries
        await Promise.all(
          selectedCases.map(async (caseAccess) => {
            await prisma.caseAccess.create({
              data: {
                userId: user.id,
                caseId: caseAccess.id,
                role: caseAccess.role,
                addedBy,
              },
            });
          })
        );
      }

      return { user };
    })
  );

  return NextResponse.json(results[0]); // Return first result since we usually only add one user
} 