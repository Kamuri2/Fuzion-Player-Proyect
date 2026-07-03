const bcrypt = require('bcrypt');
const fs = require('fs');
const { execSync } = require('child_process');

async function main() {
  const hash = await bcrypt.hash('Admin2026!', 10);
  const id = require('crypto').randomUUID();
  const date = new Date().toISOString();

  const sql = `
    INSERT INTO "User" (id, username, email, name, role, "passwordHash", "createdAt", "updatedAt")
    VALUES ('${id}', 'admin', 'admin@seiem.mx', 'Administrador SEIEM', 'ADMIN', '${hash}', '${date}', '${date}')
    ON CONFLICT (username) DO UPDATE 
    SET "passwordHash" = '${hash}', role = 'ADMIN', email = 'admin@seiem.mx';
  `;

  fs.writeFileSync('create_admin.sql', sql);
  console.log('SQL generated. Executing...');
  
  try {
    const result = execSync('npx prisma db execute --file create_admin.sql', { stdio: 'inherit' });
    console.log('Admin created successfully.');
  } catch(e) {
    console.error('Error executing SQL', e);
  }
}

main();
