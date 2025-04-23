import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeSuperAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { 
        isSuperAdmin: true,
        isAdmin: true, // Super admins are also admins
      },
    });
    console.log(`Successfully made ${email} a super admin:`, user);
  } catch (error) {
    console.error('Error making user super admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Make your email super admin
makeSuperAdmin('ben.morton@law.northwestern.edu'); 