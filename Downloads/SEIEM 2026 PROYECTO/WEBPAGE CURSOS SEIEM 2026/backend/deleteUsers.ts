import { prisma } from './src/prisma';

async function main() {
  const result = await prisma.user.deleteMany({
    where: {
      role: 'USER'
    }
  });
  console.log(`Deleted ${result.count} users with role USER.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
