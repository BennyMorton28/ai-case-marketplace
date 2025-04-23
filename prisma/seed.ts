import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create super admin user
  await prisma.user.upsert({
    where: { email: 'ben.morton@law.northwestern.edu' },
    update: {
      isAdmin: true,
      isSuperAdmin: true,
      canCreateCases: true,
    },
    create: {
      email: 'ben.morton@law.northwestern.edu',
      isAdmin: true,
      isSuperAdmin: true,
      canCreateCases: true,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 