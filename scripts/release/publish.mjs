import { copyFileSync, existsSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function releaseMetadata(env) {
  const { RELEASE_VERSION: version, GITHUB_SHA: sha, GITHUB_REPOSITORY: repo } = env;
  if (!/^1\.1\.[1-9]\d*$/.test(version || '')) throw new Error('Missing or invalid RELEASE_VERSION');
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('Missing or invalid GITHUB_SHA');
  if (repo !== 'Ibrahim200546/inclusiveapp') throw new Error('Unexpected release repository');
  return { version, sha, repo, tag: `v${version}`, title: `Edu CoreX v${version}` };
}

export function gh(args, allowFailure = false) {
  const result = spawnSync('gh', args, { encoding: 'utf8', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0 && !allowFailure) throw new Error(`gh ${args.slice(0, 2).join(' ')} failed: ${result.stderr || result.stdout}`);
  return { ok: result.status === 0, text: result.stdout || '' };
}

export function ensureRelease(meta, tag, invoke = gh) {
  const view = () => invoke(['release', 'view', tag, '--repo', meta.repo, '--json', 'tagName'], true);
  if (!view().ok) {
    const created = invoke(['release', 'create', tag, '--repo', meta.repo, '--target', meta.sha,
      '--title', meta.title, '--notes', `Built from ${meta.sha}.\n\nAndroid APK is a debug build; Windows installer is unsigned.`, '--latest=false'], true);
    // Another platform job may have created this release concurrently.
    if (!created.ok && !view().ok) throw new Error(`Unable to create or find release ${tag}`);
  }
  if (tag !== 'apps-latest') {
    const ref = JSON.parse(invoke(['api', `repos/${meta.repo}/git/ref/tags/${tag}`]).text);
    let object = ref.object;
    for (let depth = 0; object.type === 'tag' && depth < 5; depth++) {
      object = JSON.parse(invoke(['api', `repos/${meta.repo}/git/tags/${object.sha}`]).text).object;
    }
    if (object.type !== 'commit' || object.sha !== meta.sha) throw new Error(`Refusing to replace unrelated tag ${tag}`);
  }
}

export function windowsAssetNames(version, manifest) {
  const installer = `Edu-CoreX-Setup-${version}.exe`;
  // electron-builder writes the same file in the modern files list and legacy path field.
  const entries = [...manifest.matchAll(/^\s*-\s*url:\s*(.+)$/gm)].map(match => match[1].trim());
  const legacyPath = manifest.match(/^path:[ \t]*(.+)$/m)?.[1].trim();
  const unquote = value => value?.replace(/^(['"])(.*)\1$/, '$2');
  if (entries.length !== 1 || unquote(entries[0]) !== installer || unquote(legacyPath) !== installer) {
    throw new Error(`Windows update manifest must reference ${installer} in files and path`);
  }
  return [installer, `${installer}.blockmap`, 'latest.yml'];
}

export function publish(platform) {
  const meta = releaseMetadata(process.env);
  let files;
  let alias;
  if (platform === 'windows') {
    files = windowsAssetNames(meta.version, readFileSync(path.join('release', 'latest.yml'), 'utf8')).map(name => path.join('release', name));
    alias = path.join('release', 'Edu-CoreX-Setup.exe');
  } else if (platform === 'android') {
    alias = 'release-assets/Edu-CoreX-Android.apk';
    files = [alias];
  } else throw new Error('Platform must be windows or android');
  for (const file of files) if (!existsSync(file) || statSync(file).size === 0) throw new Error(`Missing release asset: ${file}`);
  if (platform === 'windows') copyFileSync(files[0], alias);
  ensureRelease(meta, meta.tag);
  gh(['release', 'upload', meta.tag, '--repo', meta.repo, ...files, '--clobber']);
  if (platform === 'windows') {
    const { assets } = JSON.parse(gh(['release', 'view', meta.tag, '--repo', meta.repo, '--json', 'assets']).text);
    const assetNames = new Set(assets.map(asset => asset.name));
    for (const file of files) if (!assetNames.has(path.basename(file))) {
      throw new Error(`Published Windows asset name does not match the updater: ${path.basename(file)}`);
    }
  }
  ensureRelease(meta, 'apps-latest');
  gh(['release', 'upload', 'apps-latest', '--repo', meta.repo, alias, '--clobber']);
  gh(['release', 'edit', 'apps-latest', '--repo', meta.repo, '--title', meta.title,
    '--notes', `Latest build: v${meta.version}\nCommit: ${meta.sha}\n\nStable APK and EXE download links. Android APK is a debug build; Windows installer is unsigned.\nFull versioned release: https://github.com/${meta.repo}/releases/tag/${meta.tag}`]);
  gh(['release', 'edit', meta.tag, '--repo', meta.repo, '--title', meta.title, '--draft=false', '--latest']);
  console.log(`Published ${platform} assets for ${meta.tag} (${meta.sha}); stable links retained.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) publish(process.argv[2]);
