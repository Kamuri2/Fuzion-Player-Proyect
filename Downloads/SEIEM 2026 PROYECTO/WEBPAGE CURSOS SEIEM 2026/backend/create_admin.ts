import { prisma } from './src/prisma';
import bcrypt from 'bcrypt';

async function main() {
  const hash = await bcrypt.hash('Admin2026!', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash: hash,
      role: 'ADMIN',
      email: 'admin@seiem.mx'
    },
    create: {
      username: 'admin',
      email: 'admin@seiem.mx',
      name: 'Administrador SEIEM',
      passwordHash: hash,
      role: 'ADMIN'
    }
  });
  
  console.log('Admin user created successfully!');
  console.log('Username:', admin.username);
  console.log('Email:', admin.email);
  console.log('Role:', admin.role);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
