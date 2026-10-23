import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
let commit = 'development';
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch {}
const builtAt = new Date().toISOString();
const buildId = `${builtAt.replace(/\D/g, '').slice(0, 14)}-${commit}`;
const info = { version: pkg.version, buildId, commit, builtAt };
mkdirSync('src/app/core/version', { recursive: true });
writeFileSync('src/app/core/version/build-info.ts', `export const BUILD_INFO = ${JSON.stringify(info)} as const;\n`);
writeFileSync('public/version.json', JSON.stringify({ ...info, releasedAt: builtAt, releaseNotes: [] }, null, 2));
