const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('admin123', 10);
  await prisma.user.update({
    where: { username: 'admin' },
    data: { passwordHash: hash }
  });
  console.log('Admin password updated successfully!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
