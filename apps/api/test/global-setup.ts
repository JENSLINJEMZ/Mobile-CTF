import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://ctf:ctf@localhost:5432/ctf_test';

const prismaCli = resolve(
  require.resolve('prisma/build/index.js', {
    paths: [resolve(import.meta.dirname, '../../../packages/database')],
  }),
);

export default function globalSetup() {
  execFileSync(
    process.execPath,
    [
      prismaCli,
      'migrate',
      'deploy',
      '--schema',
      join(resolve(import.meta.dirname, '../../../packages/database'), 'prisma/schema.prisma'),
    ],
    {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'inherit',
    },
  );
}