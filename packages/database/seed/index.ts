import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Difficulty, Role, type Prisma } from '@prisma/client';

import { hashFlag, randomSalt } from '../src/flag';
import { prisma } from '../src/client';

function findEnvPath(): string | undefined {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    const candidate = resolve(dir, '.env');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  return undefined;
}

loadEnv({ path: findEnvPath() });

async function upsertDemoUser(params: {
  email: string;
  username: string;
  password: string;
  role: Role;
}) {
  const { email, username, password, role } = params;
  const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
  const passwordHash = await bcrypt.hash(password, rounds);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role },
    create: { email, username, passwordHash, role },
  });
  return user;
}

async function main() {
  const password = process.env.SEED_USER_PASSWORD ?? 'ctfpass123';
  if (password.length < 8) {
    throw new Error('Seed password must be at least 8 characters');
  }

  const admin = await upsertDemoUser({
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@ctf.test',
    username: process.env.SEED_ADMIN_USERNAME ?? 'admin',
    password,
    role: 'ADMIN',
  });
  const user = await upsertDemoUser({
    email: process.env.SEED_USER_EMAIL ?? 'user@ctf.test',
    username: process.env.SEED_USER_USERNAME ?? 'player1',
    password,
    role: 'USER',
  });

  const categories = await seedCategories();
  const tags = await seedTags();
  const challenges = await seedChallenges(admin.id, categories, tags);

  const eventId = await seedEvent(admin.id);
  const demoTeam = await seedDemoTeam(user.id, eventId);
  await seedAnnouncements(admin.id);

  console.log(`[seed] demo admin: ${admin.username} <${admin.email}> (role=${admin.role})`);
  console.log(`[seed] demo user:  ${user.username} <${user.email}> (role=${user.role})`);
  console.log(`[seed] shared dev password for both: "${password}" (bcrypt rounds=${Number(process.env.BCRYPT_ROUNDS ?? 12)})`);
  console.log(`[seed] categories: ${Object.keys(categories).length}, tags: ${Object.keys(tags).length}, challenges: ${challenges}`);
  console.log(`[seed] demo event: ${eventId}, demo team: ${demoTeam.name} (code ${demoTeam.joinCode})`);
  console.log('[seed] done.');
}

type CategorySeed = { name: string; slug: string; icon: string; sortOrder: number };

const CATEGORY_SEEDS: CategorySeed[] = [
  { name: 'Cryptography', slug: 'crypto', icon: 'lock', sortOrder: 1 },
  { name: 'Web Exploitation', slug: 'web', icon: 'globe', sortOrder: 2 },
  { name: 'Forensics', slug: 'forensics', icon: 'search', sortOrder: 3 },
  { name: 'Reverse Engineering', slug: 'reversing', icon: 'cpu', sortOrder: 4 },
  { name: 'OSINT', slug: 'osint', icon: 'compass', sortOrder: 5 },
  { name: 'Miscellaneous', slug: 'misc', icon: 'help-circle', sortOrder: 6 },
];

async function seedCategories(): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const cat of CATEGORY_SEEDS) {
    const row = await prisma.challengeCategory.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
      create: cat,
    });
    result[cat.slug] = row.id;
  }
  return result;
}

type TagSeed = { name: string; slug: string };

async function seedTags(): Promise<Record<string, number>> {
  const tags: TagSeed[] = [
    { name: 'Classic', slug: 'classic' },
    { name: 'Brute Force', slug: 'bruteforce' },
    { name: 'Caesar', slug: 'caesar' },
    { name: 'SQL Injection', slug: 'sqli' },
    { name: 'Log Analysis', slug: 'logs' },
    { name: 'Steganography', slug: 'stego' },
    { name: 'Binary', slug: 'binary' },
    { name: 'Metadata', slug: 'metadata' },
  ];
  const result: Record<string, number> = {};
  for (const tag of tags) {
    const row = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    });
    result[tag.slug] = row.id;
  }
  return result;
}

type ChallengeSeed = {
  slug: string;
  title: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  basePoints: number;
  published: boolean;
  flag: string;
  tags: string[];
  hints: { title: string; body: string; penaltyPoints: number }[];
  attachments: { title: string; url: string; mimeType: string; sizeBytes: number }[];
};

const CHALLENGE_SEEDS: ChallengeSeed[] = [
  {
    slug: 'caesars-secret',
    title: "Caesar's Secret",
    description: [
      "# Caesar's Secret",
      '',
      'A messenger once intercepted this message scrawled across a scroll. The sender trusted an old Roman cipher to keep it safe.',
      '',
      '```',
      'Wkh iodj lv: fdvhw_zrxog_eh_surxg!',
      '```',
      '',
      'Every letter has moved, but always by the same amount. Restore the message and submit the flag in `ctf{...}` form.',
    ].join('\n'),
    category: 'crypto',
    difficulty: 'EASY',
    basePoints: 100,
    published: true,
    flag: 'ctf{caesar_would_be_proud}',
    tags: ['classic', 'caesar'],
    hints: [
      {
        title: 'Direction of travel',
        body: 'The alphabet has been shifted forward by 3. Try shifting it back by 3 instead — or use a ROT13 table to get comfortable.',
        penaltyPoints: 0,
      },
      {
        title: 'Hands-on check',
        body: 'Decode a two-letter clue first: `Wkh` decodes to `The`. If the first word decodes cleanly, the shift is right.',
        penaltyPoints: 0,
      },
    ],
    attachments: [],
  },
  {
    slug: 'xor-marks-the-spot',
    title: 'XOR Marks the Spot',
    description: [
      '# XOR Marks the Spot',
      '',
      'The ciphertext below was produced by XORing a plaintext with a single-byte repeating key.',
      '',
      '```',
      '2f0b1521054d07081a1f0d13053d0e0708420804051f2f070b17',
      '```',
      '',
      'The plaintext starts with the letters `ctf`. Brute-force the one-byte key and reveal the hidden flag.',
    ].join('\n'),
    category: 'crypto',
    difficulty: 'MEDIUM',
    basePoints: 200,
    published: true,
    flag: 'ctf{not_so_simple_xor}',
    tags: ['classic', 'bruteforce'],
    hints: [
      {
        title: 'Known plaintext',
        body: 'XOR is symmetric: `cipher ^ key = plain`. You know the plaintext begins with `ctf`, so XOR the first cipher byte with `0x63` to find the key byte.',
        penaltyPoints: 20,
      },
      {
        title: 'Key repeat',
        body: 'A one-byte key repeats across the whole message. Once you have the key, apply it to each byte in turn.',
        penaltyPoints: 20,
      },
    ],
    attachments: [],
  },
  {
    slug: 'stolen-sql',
    title: 'Stolen SQL',
    description: [
      '# Stolen SQL',
      '',
      'You registered on the demo app `shopinator` and noticed the login form echoes a database error when you type a single quote:',
      '',
      '```',
      "Error: 1, syntax error at or near \"'\"",
      '```',
      '',
      'The login query looks like `SELECT id FROM users WHERE email = \'<input>\' AND password = \'<input>\'`.',
      '',
      'Log in as the user `admin` without knowing the password.',
    ].join('\n'),
    category: 'web',
    difficulty: 'EASY',
    basePoints: 150,
    published: true,
    flag: 'ctf{union_select_from_users}',
    tags: ['sqli'],
    hints: [
      {
        title: 'Break the string',
        body: "Terminate the email string with `'` and comment out the rest of the query with `--`. The password comparison disappears entirely.",
        penaltyPoints: 20,
      },
      {
        title: 'Who is who',
        body: "The simplest injection needs no `UNION` at all: `admin'--` as the email makes the whole password check vanish for the admin row.",
        penaltyPoints: 80,
      },
    ],
    attachments: [],
  },
  {
    slug: 'cookie-jar',
    title: 'Cookie Jar',
    description: [
      '# Cookie Jar',
      '',
      'The support site `https://cookies.example/login` issues a cookie that looks suspiciously long. One part is base64 and decodes to:',
      '',
      '```',
      'role=user;expires=Wed, 06 Oct 2028 03:21:12 GMT',
      '```',
      '',
      'The dashboard only shows the secrets panel when `role=admin`. Forge the cookie and enter the admin area to read the flag.',
    ].join('\n'),
    category: 'web',
    difficulty: 'MEDIUM',
    basePoints: 250,
    published: true,
    flag: 'ctf{cookies_are_secrets_too}',
    tags: ['classic'],
    hints: [
      {
        title: 'Unsigned cookie',
        body: 'The cookie is just base64 of the text with no signature. Re-encode the modified payload and replace the value.',
        penaltyPoints: 30,
      },
      {
        title: 'The dashboard reads it',
        body: 'Set `role=admin`, submit the forged cookie, and navigate to `/dashboard` — the secrets panel contains the flag.',
        penaltyPoints: 60,
      },
    ],
    attachments: [],
  },
  {
    slug: 'hidden-in-the-noise',
    title: 'Hidden in the Noise',
    description: [
      '# Hidden in the Noise',
      '',
      'A picture of a quiet garden at sunset hides a message where the naked eye sees only grass.',
      '',
      'The carrier image is attached. Audit the least significant bits.',
    ].join('\n'),
    category: 'forensics',
    difficulty: 'EASY',
    basePoints: 100,
    published: true,
    flag: 'ctf{lsb_stego_rocks}',
    tags: ['stego'],
    hints: [
      {
        title: 'What are LSBs?',
        body: 'The least significant bit of each colour channel carries the hidden payload. Extract bit 0 of every byte and reassemble into characters.',
        penaltyPoints: 0,
      },
      {
        title: 'Extract in practice',
        body: 'Load the image in an LSB extraction tool or script: gather the low bit of each RGB byte, pack into bytes, and read the ASCII.',
        penaltyPoints: 30,
      },
    ],
    attachments: [
      {
        title: 'garden.png',
        url: 'https://example.com/attachments/garden.png',
        mimeType: 'image/png',
        sizeBytes: 184320,
      },
    ],
  },
  {
    slug: 'log-sweep',
    title: 'LogSweep',
    description: [
      '# LogSweep',
      '',
      'The auth service logs every request, and someone left more than paths behind. The attached access log contains a query that leaks a working credential.',
      '',
      'Find the leaked credential, log in, and grab the flag from your profile page.',
    ].join('\n'),
    category: 'forensics',
    difficulty: 'MEDIUM',
    basePoints: 200,
    published: true,
    flag: 'ctf{credentials_in_the_logs}',
    tags: ['logs'],
    hints: [
      {
        title: 'How to search',
        body: 'Grep for `password`, `token`, or `?` in the log lines — secrets usually ride in the query string.',
        penaltyPoints: 20,
      },
      {
        title: 'The smoking gun',
        body: 'Line 41 of the log contains `GET /login?user=ops&token=GJ4T-7K2Q-0XPL-9MZV`. Use it as your password at sign-in.',
        penaltyPoints: 50,
      },
    ],
    attachments: [
      {
        title: 'access.log',
        url: 'https://example.com/attachments/access.log.txt',
        mimeType: 'text/plain',
        sizeBytes: 28672,
      },
    ],
  },
  {
    slug: 'crack-the-binary-chef',
    title: 'Crack the Binary Chef',
    description: [
      '# Crack the Binary Chef',
      '',
      'Someone shipped a stripped ELF that refuses to give up its secret. Run the usual introspection toolkit on the attached binary before reaching for a debugger.',
    ].join('\n'),
    category: 'reversing',
    difficulty: 'HARD',
    basePoints: 400,
    published: true,
    flag: 'ctf{strings_are_the_low_hanging_fruit}',
    tags: ['binary'],
    hints: [
      {
        title: 'Start polite',
        body: 'Run `strings chef | grep -i ctf` before anything more exotic. Binary authors forget to strip printable strings too.',
        penaltyPoints: 30,
      },
      {
        title: 'Follow the flag',
        body: 'The string near the flag is an obfuscation key — invert the byte order of the hex blob next to `ctf{` to recover what was hidden.',
        penaltyPoints: 80,
      },
    ],
    attachments: [
      {
        title: 'chef',
        url: 'https://example.com/attachments/chef',
        mimeType: 'application/octet-stream',
        sizeBytes: 14848,
      },
    ],
  },
  {
    slug: 'photo-geek',
    title: 'Photo Geek',
    description: [
      '# Photo Geek',
      '',
      'The photographer left breadcrumbs about the shoot location in the attachment. Identify the city from the embedded metadata — the flag is the city name, lowercase, spaces as underscores.',
      '',
      'Submit as `ctf{<city>}`.',
    ].join('\n'),
    category: 'osint',
    difficulty: 'MEDIUM',
    basePoints: 150,
    published: true,
    flag: 'ctf{san_francisco}',
    tags: ['metadata'],
    hints: [
      {
        title: 'EXIF fields',
        body: 'GPS coordinates usually live in the EXIF block. Read them, then look them up — that is the city.',
        penaltyPoints: 20,
      },
      {
        title: 'Cross-check',
        body: 'The coordinates 37.7749 N, 122.4194 W are famously the city once known for cable cars and fog.',
        penaltyPoints: 60,
      },
    ],
    attachments: [
      {
        title: 'golden-gate.jpg',
        url: 'https://example.com/attachments/golden-gate.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 245760,
      },
    ],
  },
];

async function seedChallenges(
  authorId: number,
  categories: Record<string, number>,
  tags: Record<string, number>,
): Promise<number> {
  for (const seed of CHALLENGE_SEEDS) {
    const categoryId = categories[seed.category];
    const tagIds = seed.tags.map((tagSlug) => tags[tagSlug]).filter((id): id is number => !!id);
    if (!categoryId) throw new Error(`Unknown category "${seed.category}"`);
    const salt = randomSalt();
    const flagHash = hashFlag(seed.flag, salt);

    const challenge = await prisma.challenge.upsert({
      where: { slug: seed.slug },
      update: {
        title: seed.title,
        description: seed.description,
        categoryId,
        difficulty: seed.difficulty,
        basePoints: seed.basePoints,
        published: seed.published,
        flagHash,
        flagSalt: salt,
        createdById: authorId,
      },
      create: {
        slug: seed.slug,
        title: seed.title,
        description: seed.description,
        categoryId,
        difficulty: seed.difficulty,
        basePoints: seed.basePoints,
        published: seed.published,
        flagHash,
        flagSalt: salt,
        createdById: authorId,
      },
    });

    await prisma.challengeTag.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.challengeTag.createMany({
      data: tagIds.map((tagId) => ({ challengeId: challenge.id, tagId })),
    });

    await prisma.hint.deleteMany({ where: { challengeId: challenge.id } });
    await prisma.hint.createMany({
      data: seed.hints.map((hint, index) => ({
        challengeId: challenge.id,
        title: hint.title,
        body: hint.body,
        penaltyPoints: hint.penaltyPoints,
        sortOrder: index,
      })),
    });

    await prisma.attachment.deleteMany({ where: { challengeId: challenge.id } });
    if (seed.attachments.length > 0) {
      await prisma.attachment.createMany({
        data: seed.attachments.map((a) => ({ ...a, challengeId: challenge.id })),
      });
    }

    const versionCount = await prisma.challengeVersion.count({ where: { challengeId: challenge.id } });
    if (versionCount === 0) {
      await prisma.challengeVersion.create({
        data: {
          challengeId: challenge.id,
          version: 1,
          title: seed.title,
          description: seed.description,
          difficulty: seed.difficulty,
          basePoints: seed.basePoints,
          createdById: authorId,
          changeSummary: 'Initial release',
        },
      });
    }
  }
  return CHALLENGE_SEEDS.length;
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// ---------------------------------------------------------------------------
// Stage 7: events, teams, announcements
// ---------------------------------------------------------------------------

const EVENT_SEED = {
  slug: 'ctf-summer-sprint',
  title: 'CTF Summer Sprint',
  description: [
    '# CTF Summer Sprint',
    '',
    'The first-ever live event on this platform. Solve challenges, watch the',
    'leaderboard shuffle, and climb the team rankings before the clock runs out.',
    '',
    'Some challenges unlock early, others appear as you earn score — keep solving!',
  ].join('\n'),
};

async function seedEvent(organizerId: number): Promise<number> {
  const startsAt = new Date(Date.now() - 60 * 60 * 1000);
  const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const event = await prisma.event.upsert({
    where: { slug: EVENT_SEED.slug },
    update: {
      title: EVENT_SEED.title,
      description: EVENT_SEED.description,
      status: 'RUNNING',
      startsAt,
      endsAt,
      createdById: organizerId,
    },
    create: {
      slug: EVENT_SEED.slug,
      title: EVENT_SEED.title,
      description: EVENT_SEED.description,
      status: 'RUNNING',
      startsAt,
      endsAt,
      createdById: organizerId,
    },
  });

  await prisma.eventChallenge.deleteMany({ where: { eventId: event.id } });

  async function challengeId(slug: string): Promise<number> {
    const row = await prisma.challenge.findUnique({ where: { slug } });
    if (!row) throw new Error(`Seed event references unknown challenge "${slug}"`);
    return row.id;
  }

  const caesar = await challengeId('caesars-secret');
  const xor = await challengeId('xor-marks-the-spot');
  const sql = await challengeId('stolen-sql');
  const cookie = await challengeId('cookie-jar');

  const entries: {
    challengeId: number;
    sortOrder: number;
    unlock: Prisma.UnlockRuleCreateWithoutEventChallengeInput | undefined;
  }[] = [
    { challengeId: caesar, sortOrder: 0, unlock: undefined },
    {
      challengeId: xor,
      sortOrder: 1,
      unlock: {
        type: 'PREREQUISITE',
        prerequisites: { create: [{ challengeId: caesar }] },
      },
    },
    { challengeId: sql, sortOrder: 2, unlock: { type: 'SCORE', minScore: 110 } },
    {
      challengeId: cookie,
      sortOrder: 3,
      unlock: { type: 'TIME', unlockAt: new Date(Date.now() + 2 * 60 * 60 * 1000) },
    },
  ];

  for (const entry of entries) {
    await prisma.eventChallenge.create({
      data: {
        eventId: event.id,
        challengeId: entry.challengeId,
        sortOrder: entry.sortOrder,
        unlockRule: entry.unlock ? { create: entry.unlock } : undefined,
      },
    });
  }

  return event.id;
}

async function seedDemoTeam(
  leaderId: number,
  eventId: number,
): Promise<{ name: string; joinCode: string }> {
  const team = await prisma.team.upsert({
    where: { joinCode: 'DEMO01' },
    update: {
      name: 'Demo Squad',
      slug: 'demo-squad',
      description: 'The default team created during seeding. Grab a friend with the join code!',
      createdById: leaderId,
    },
    create: {
      name: 'Demo Squad',
      slug: 'demo-squad',
      description: 'The default team created during seeding. Grab a friend with the join code!',
      joinCode: 'DEMO01',
      createdById: leaderId,
    },
  });

  await prisma.teamMember.upsert({
    where: { userId: leaderId },
    update: { teamId: team.id, role: 'LEADER' },
    create: { teamId: team.id, userId: leaderId, role: 'LEADER' },
  });

  await prisma.eventParticipant.upsert({
    where: { eventId_userId: { eventId, userId: leaderId } },
    update: {},
    create: { eventId, userId: leaderId, teamId: team.id },
  });

  await prisma.eventTeam.upsert({
    where: { teamId: team.id },
    update: { eventId },
    create: { eventId, teamId: team.id },
  });

  return { name: team.name, joinCode: team.joinCode };
}

const ANNOUNCEMENT_SEEDS = [
  {
    title: 'Welcome to the Summer Sprint',
    body: [
      'The Summer Sprint event is live! Register before the clock runs out.',
      '',
      'Remember: some challenges are locked until you earn score or solve',
      'their prerequisites. The team leaderboard updates with every solve.',
    ].join('\n'),
    pinned: true,
  },
  {
    title: 'Flag format reminder',
    body: 'All flags follow the `ctf{...}` format. Keep the braces and use underscores between words.',
    pinned: false,
  },
];

async function seedAnnouncements(authorId: number): Promise<void> {
  for (const seed of ANNOUNCEMENT_SEEDS) {
    await prisma.announcement.deleteMany({ where: { title: seed.title } });
    await prisma.announcement.create({
      data: { title: seed.title, body: seed.body, pinned: seed.pinned, createdById: authorId },
    });
  }
}