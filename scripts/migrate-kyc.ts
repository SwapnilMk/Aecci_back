import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  console.log('Migrating User collection...');
  const result = await prisma.$runCommandRaw({
    update: 'User',
    updates: [
      {
        q: {}, // match all documents
        u: { $rename: { "kycStatus": "verificationStatus", "kycRejectionReason": "rejectionReason", "internationalKycIds": "internationalIds" } },
        multi: true
      }
    ]
  });
  console.log('Migration result:', result);
  console.log('Migration complete.');
}
main().catch(console.error).finally(() => prisma.$disconnect());