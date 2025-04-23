import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin(email: string) {
  try {
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    });
    console.log(`Successfully made ${email} an admin:`, user);
  } catch (error) {
    console.error('Error making user admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Replace with your email
makeAdmin('ben.morton@law.northwestern.edu'); 