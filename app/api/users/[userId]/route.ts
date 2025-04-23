import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if the user is an admin
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { isAdmin: true, isSuperAdmin: true },
    });

    if (!currentUser?.isAdmin && !currentUser?.isSuperAdmin) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Delete the user's case access records first
    await prisma.caseAccess.deleteMany({
      where: { userId: params.userId },
    });

    await prisma.adminCaseAccess.deleteMany({
      where: { userId: params.userId },
    });

    // Delete the user
    await prisma.user.delete({
      where: { id: params.userId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting user:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 