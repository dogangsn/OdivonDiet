import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

const git = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return '';
  }
};

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
// CI ortamları (Cloudflare Workers Builds, GitHub Actions) commit bilgisini ortam değişkeniyle verir.
const envSha = process.env.WORKERS_CI_COMMIT_SHA || process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || '';
const commit = (envSha.slice(0, 7) || git('rev-parse', '--short', 'HEAD') || 'development');
const branch = process.env.WORKERS_CI_BRANCH || process.env.CF_PAGES_BRANCH || process.env.GITHUB_REF_NAME || git('rev-parse', '--abbrev-ref', 'HEAD') || '';
const builtAt = new Date().toISOString();
const buildId = `${builtAt.replace(/\D/g, '').slice(0, 14)}-${commit}`;
const info = { version: pkg.version, buildId, commit, branch, builtAt };

mkdirSync('src/app/core/version', { recursive: true });
writeFileSync('src/app/core/version/build-info.ts', `export const BUILD_INFO = ${JSON.stringify(info)} as const;\n`);
writeFileSync('public/version.json', JSON.stringify({ ...info, releasedAt: builtAt, releaseNotes: [] }, null, 2));
console.log(`[version] v${info.version} · ${commit} · ${buildId}`);
