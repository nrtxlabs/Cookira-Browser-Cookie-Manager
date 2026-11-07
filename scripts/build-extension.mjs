import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build as viteBuild } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { buildExtensionManifest } from '../src/manifest/buildManifest.mjs';
import { generateExtensionIcons } from './generate-icons.mjs';
import { zipDirectory } from './zip-dir.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

function parseArgs() {
  const args = process.argv.slice(2);
  let targetArg = 'all';
  let pack = false;
  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      targetArg = arg.slice('--target='.length);
    } else if (arg === '--pack') {
      pack = true;
    }
  }
  const targets = targetArg === 'all' ? ['chrome', 'firefox'] : [targetArg];
  return { targets, pack };
}

function readPackageVersion() {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  return String(pkg.version || '1.0.0');
}

async function buildUiStage(stagingDir) {
  fs.rmSync(stagingDir, { recursive: true, force: true });

  await viteBuild({
    root: ROOT_DIR,
    base: './',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: stagingDir,
      emptyOutDir: true,
      sourcemap: false,
      rollupOptions: {
        input: {
          popup: path.join(ROOT_DIR, 'popup.html'),
          sidepanel: path.join(ROOT_DIR, 'sidepanel.html'),
          dashboard: path.join(ROOT_DIR, 'dashboard.html'),
        },
      },
    },
  });

  // Build isolated self-contained background bundle with zero DOM/React dependencies
  await viteBuild({
    root: ROOT_DIR,
    configFile: false,
    build: {
      outDir: stagingDir,
      emptyOutDir: false,
      lib: {
        entry: path.join(ROOT_DIR, 'src', 'background', 'index.ts'),
        formats: ['es'],
        fileName: () => 'background.js',
      },
      rollupOptions: {
        output: {
          codeSplitting: false,
        },
      },
    },
  });

  generateExtensionIcons(path.join(stagingDir, 'icons'));
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  const { targets, pack } = parseArgs();
  const version = readPackageVersion();
  const stagingDir = path.join(ROOT_DIR, 'dist', '.staging');

  await buildUiStage(stagingDir);

  for (const target of targets) {
    if (target !== 'chrome' && target !== 'firefox') {
      throw new Error(`Unsupported build target: ${target}`);
    }
    const targetDir = path.join(ROOT_DIR, 'dist', target);
    fs.rmSync(targetDir, { recursive: true, force: true });
    copyDir(stagingDir, targetDir);

    const manifest = buildExtensionManifest(target, version);
    fs.writeFileSync(
      path.join(targetDir, 'manifest.json'),
      `${JSON.stringify(manifest, null, 2)}\n`,
      'utf8',
    );
    console.log(`[Cookira Build] Built ${target} extension at ${targetDir}`);

    if (pack) {
      const zipPath = path.join(ROOT_DIR, 'release', `cookira-${target}-v${version}.zip`);
      zipDirectory(targetDir, zipPath);
      console.log(`[Cookira Pack] Created ${zipPath}`);
    }
  }

  fs.rmSync(stagingDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('[Cookira Build Error]', err);
  process.exit(1);
});
