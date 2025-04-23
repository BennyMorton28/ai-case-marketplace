import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// DELETE /api/cases/[id] - Delete a case (admin/creator only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const caseId = params.id;
    if (!caseId) {
      return new NextResponse('Case ID is required', { status: 400 });
    }

    // Get the current user to check if they're a super admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isSuperAdmin: true }
    });

    // Get the case and check permissions
    const case_ = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        creator: true,
        adminAccess: {
          include: {
            admin: true
          }
        }
      }
    });

    if (!case_) {
      return new NextResponse('Case not found', { status: 404 });
    }

    // Check if user is the creator, has admin access, or is a super admin
    const isCreator = case_.creator.email === session.user.email;
    const isAdmin = case_.adminAccess.some((access: { admin: { email: string } }) => access.admin.email === session.user.email);
    const isSuperAdmin = currentUser?.isSuperAdmin === true;

    if (!isCreator && !isAdmin && !isSuperAdmin) {
      return new NextResponse('Forbidden: You do not have permission to delete this case', { status: 403 });
    }

    // Delete the case
    await prisma.case.delete({
      where: { id: caseId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting case:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 