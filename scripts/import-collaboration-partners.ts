import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface OldClient {
  _id: { $oid: string };
  email: string;
  password: string;
  firstName: string;
  surName: string;
  companyName: string;
  country: string;
  role: string;
  businessCategory: string;
  phoneNo: number | string;
  telephoneNo?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  pinCode?: string | number;
  memberShipNo?: string;
  inputNumber?: string;
  gstNo?: string;
  isApproved?: boolean;
  validUpTo?: string;
  approvedAt?: string;
  createdAt?: { $date: string } | string;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function buildAddress(c: OldClient): string {
  const parts = [c.address1, c.address2, c.city, c.state, String(c.pinCode ?? '')]
    .map(p => (p ?? '').trim())
    .filter(Boolean);
  // Deduplicate consecutive identical parts
  const deduped = parts.filter((p, i) => i === 0 || p !== parts[i - 1]);
  return deduped.join(', ');
}

function inferSectors(category: string): string[] {
  const map: Record<string, string[]> = {
    Lawyer: ['Legal Services', 'Arbitration', 'Corporate Law'],
    'Export Adviser': ['Trade Advisory', 'Export Consulting'],
    'New Market consultant': ['Market Entry', 'Business Development'],
    Other: [],
  };
  return map[category] ?? [category];
}

async function main() {
  const dataPath = path.resolve(__dirname, '../../aecci_database.clients.json');
  if (!fs.existsSync(dataPath)) {
    console.error(`❌ File not found: ${dataPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(dataPath, 'utf-8');
  const clients: OldClient[] = JSON.parse(raw);

  console.log(`📂 Loaded ${clients.length} records from export`);
  console.log('🔑 Hashing Partner@123 password...');
  const hashedPassword = await bcrypt.hash('Partner@123', 10);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const c of clients) {
    try {
      const email = c.email?.trim().toLowerCase();
      if (!email) {
        console.warn(`  ⚠️  Skipping record with no email (id: ${c._id?.$oid})`);
        skipped++;
        continue;
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        console.log(`  ⏭  Skipped (already exists): ${email}`);
        skipped++;
        continue;
      }

      const fullName = `${(c.firstName ?? '').trim()} ${(c.surName ?? '').trim()}`.trim();
      const country = decodeHtmlEntities((c.country ?? '').trim());
      const companyName = decodeHtmlEntities((c.companyName ?? '').trim());
      const businessAddress = buildAddress(c);
      const mobileNumber = c.phoneNo ? String(c.phoneNo) : (c.telephoneNo ?? undefined);
      const applicationNumber = c.memberShipNo ?? c.gstNo ?? undefined;
      const createdAtRaw = c.createdAt;
      const createdAt = typeof createdAtRaw === 'object' && createdAtRaw !== null
        ? new Date((createdAtRaw as { $date: string }).$date)
        : createdAtRaw
          ? new Date(createdAtRaw as string)
          : undefined;

      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          companyName,
          country,
          mobileNumber,
          businessAddress,
          applicationNumber,
          professionalTitle: (c.role ?? '').trim(),
          industrySector: (c.businessCategory ?? '').trim(),
          role: 'partner',
          userType: 'business',
          verificationStatus: 'active',
          isEmailVerified: true,
          ...(createdAt ? { createdAt } : {}),
        },
      });

      const agreementDate = c.approvedAt ? new Date(c.approvedAt) : undefined;
      const validUpTo = c.validUpTo ? new Date(c.validUpTo) : undefined;

      await prisma.partnerProfile.create({
        data: {
          userId: user.id,
          organization: companyName,
          expertiseCountries: country ? [country] : [],
          expertiseSectors: inferSectors(c.businessCategory ?? ''),
          tier: 'Standard',
          status: 'active',
          signedAgreement: true,
          ...(agreementDate ? { agreementDate } : {}),
          // Store membership validity as availability note via bio
          bio: validUpTo
            ? `Collaboration member. Membership valid up to: ${validUpTo.toISOString().split('T')[0]}`
            : 'Collaboration member.',
        },
      });

      console.log(`  ✅ Created: ${fullName} <${email}> — ${country}`);
      created++;
    } catch (err: any) {
      console.error(`  ❌ Error for ${c.email}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n📊 Import complete — ${created} created, ${skipped} skipped, ${errors} errors`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
