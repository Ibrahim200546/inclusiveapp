import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function releaseVersion(commitCount) {
  const count = Number(commitCount);
  if (!Number.isSafeInteger(count) || count < 1 || count > 65535) {
    throw new Error('Invalid full-history commit count for release version');
  }
  return { version: `1.1.${count}`, versionCode: count + 1000 };
}

export function setReleaseVersion() {
  if (execFileSync('git', ['rev-parse', '--is-shallow-repository'], { encoding: 'utf8' }).trim() !== 'false') {
    throw new Error('Release version requires full Git history (checkout fetch-depth: 0)');
  }
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (process.env.GITHUB_SHA && sha !== process.env.GITHUB_SHA) throw new Error('Checkout does not match GITHUB_SHA');
  const { version, versionCode } = releaseVersion(execFileSync('git', ['rev-list', '--count', 'HEAD'], { encoding: 'utf8' }).trim());
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  pkg.version = version;
  // Run after npm ci; the committed dependency lock is intentionally unchanged.
  writeFileSync('package.json', `${JSON.stringify(pkg, null, 2)}\n`);
  if (process.env.GITHUB_ENV) appendFileSync(process.env.GITHUB_ENV,
    `RELEASE_VERSION=${version}\nRELEASE_VERSION_CODE=${versionCode}\nRELEASE_TAG=v${version}\n`);
  console.log(`Release ${version}, Android versionCode ${versionCode}, commit ${sha}`);
  return { version, versionCode, sha };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) setReleaseVersion();
