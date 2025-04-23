import React from 'react';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import { prisma } from '../../lib/prisma';
import UserManagement from '../components/UserManagement';

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect('/api/auth/signin');
  }

  // Check if user is admin
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { isAdmin: true, isSuperAdmin: true }
  });

  if (!user?.isAdmin && !user?.isSuperAdmin) {
    redirect('/');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Management</h1>
      <UserManagement />
    </div>
  );
} 