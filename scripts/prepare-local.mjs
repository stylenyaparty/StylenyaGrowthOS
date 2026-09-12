import { spawnSync } from 'node:child_process';
import process from 'node:process';

const preparationEnvironment = {
  ...process.env,
  DATABASE_URL: 'postgresql://prisma:prisma@127.0.0.1:5432/prisma_prepare?schema=public',
};

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  throw new Error('prepare:local must be run through npm');
}

for (const script of ['prisma:validate', 'prisma:generate']) {
  const result = spawnSync(process.execPath, [npmCli, 'run', script], {
    env: preparationEnvironment,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
