/**
 * Development seed script — populates the database with realistic test data.
 *
 * Run:  pnpm db:seed
 * Skip: SKIP_SEED=true  (set in scripts/dev.sh to skip on repeated starts)
 *
 * Idempotent: checks for existing records before inserting, safe to run multiple times.
 */
import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcrypt';
import { db } from '../src/db/connection';
import { user, organization, member } from '../src/db/schema';

// ── Seed accounts ─────────────────────────────────────────────────────────────
const SEED_USERS = [
  {
    email: 'admin@example.com',
    password: 'Admin123!',
    name: 'Admin User',
    role: 'admin' as const,
    emailVerified: true,
  },
  {
    email: 'moderator@example.com',
    password: 'Mod123!',
    name: 'Mod User',
    role: 'moderator' as const,
    emailVerified: true,
  },
  {
    email: 'alice@example.com',
    password: 'Alice123!',
    name: 'Alice Johnson',
    role: 'user' as const,
    emailVerified: true,
  },
  {
    email: 'bob@example.com',
    password: 'Bob123!',
    name: 'Bob Smith',
    role: 'user' as const,
    emailVerified: false,
  },
  {
    email: 'charlie@example.com',
    password: 'Charlie123!',
    name: 'Charlie Brown',
    role: 'user' as const,
    emailVerified: true,
  },
];

// ── Seed organization ─────────────────────────────────────────────────────────
const SEED_ORG = {
  name: 'Acme Corp',
  slug: 'acme-corp',
};

async function seed() {
  console.log('🌱  Seeding database...\n');

  // ── Users ──────────────────────────────────────────────────────────────────
  const createdUsers: Array<{ id: string; email: string; role: string }> = [];

  for (const u of SEED_USERS) {
    const existing = await db.query.user.findFirst({ where: eq(user.email, u.email) });
    if (existing) {
      console.log(`   ⏭  User already exists: ${u.email}`);
      createdUsers.push({ id: existing.id, email: existing.email, role: existing.role });
      continue;
    }

    const hashedPassword = await bcrypt.hash(u.password, 10);
    const id = createId();

    // better-auth stores the password in the accounts table, but for the seed
    // we insert a minimal user row — use better-auth sign-up in real flows.
    await db.insert(user).values({
      id,
      email: u.email,
      name: u.name,
      role: u.role,
      emailVerified: u.emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Insert account row so better-auth credential lookup works
    const { account } = await import('../src/db/schema');
    await db.insert(account).values({
      id: createId(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`   ✅  Created user: ${u.email} (${u.role}) — password: ${u.password}`);
    createdUsers.push({ id, email: u.email, role: u.role });
  }

  // ── Organization ───────────────────────────────────────────────────────────
  const existingOrg = await db.query.organization.findFirst({
    where: eq(organization.slug, SEED_ORG.slug),
  });

  if (existingOrg) {
    console.log(`\n   ⏭  Organization already exists: ${SEED_ORG.slug}`);
  } else {
    const orgId = createId();
    await db.insert(organization).values({
      id: orgId,
      name: SEED_ORG.name,
      slug: SEED_ORG.slug,
      createdAt: new Date(),
    });

    // Add admin as owner, alice + charlie as members
    const adminUser  = createdUsers.find((u) => u.role === 'admin');
    const memberUsers = createdUsers.filter((u) => u.email === 'alice@example.com' || u.email === 'charlie@example.com');

    if (adminUser) {
      await db.insert(member).values({
        id: createId(),
        organizationId: orgId,
        userId: adminUser.id,
        role: 'owner',
        createdAt: new Date(),
      });
    }

    for (const m of memberUsers) {
      await db.insert(member).values({
        id: createId(),
        organizationId: orgId,
        userId: m.id,
        role: 'member',
        createdAt: new Date(),
      });
    }

    console.log(`\n   ✅  Created organization: ${SEED_ORG.name}`);
    console.log(`      Owner:   ${adminUser?.email ?? '—'}`);
    console.log(`      Members: ${memberUsers.map((u) => u.email).join(', ')}`);
  }

  console.log('\n✅  Seed complete.\n');
  console.log('   Accounts you can sign in with:');
  for (const u of SEED_USERS) {
    console.log(`   ${u.role.padEnd(10)}  ${u.email}  /  ${u.password}`);
  }
  console.log('');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Seed failed:', err);
  process.exit(1);
});
