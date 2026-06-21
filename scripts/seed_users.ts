import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('Current users in DB:', users.map(u => ({ id: u.id, email: u.email, role: u.role })));

  const roles = ['admin', 'partner', 'user'];
  
  for (const role of roles) {
    const existing = users.find(u => u.role === role);
    if (!existing) {
      console.log(`Creating dummy user for role: ${role}`);
      const hashedPassword = await bcrypt.hash('password123', 10);
      const newUser = await prisma.user.create({
        data: {
          email: `${role}@example.com`,
          password: hashedPassword,
          fullName: `Test ${role}`,
          role: role,
          kycStatus: 'approved',
          isEmailVerified: true
        }
      });
      console.log(`Created user:`, newUser.email);
    } else {
      console.log(`Role ${role} already has a user: ${existing.email}`);
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
