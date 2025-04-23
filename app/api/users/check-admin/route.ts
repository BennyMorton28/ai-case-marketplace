import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        email: true,
        isAdmin: true,
        isSuperAdmin: true,
        canCreateCases: true,
      },
    });

    if (!user) {
      return NextResponse.json({ 
        email: session.user.email,
        isAdmin: false,
        isSuperAdmin: false,
        canCreateCases: false,
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        email: true,
        isAdmin: true,
        isSuperAdmin: true,
        canCreateCases: true,
      },
    });

    if (!user) {
      return NextResponse.json({ 
        email,
        isAdmin: false,
        isSuperAdmin: false,
        canCreateCases: false,
      });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 