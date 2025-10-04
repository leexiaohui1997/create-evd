#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import { Command } from 'commander';
import prompts from 'prompts';
import crypto from 'crypto';
import validateName from 'validate-npm-package-name';
import { blue, green, yellow, red, bold } from 'kolorist';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type Options = {
  devPort: number;
  prodPort: number;
  version: string;
  mysqlPlatform?: string;
  git?: boolean;
  force?: boolean;
};

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isDirEmpty(dir: string): boolean {
  try {
    const files = fs.readdirSync(dir);
    return files.length === 0;
  } catch {
    return true;
  }
}

async function ensureDir(targetDir: string, force = false): Promise<void> {
  if (!fs.existsSync(targetDir)) {
    await fse.mkdirp(targetDir);
    return;
  }
  const empty = isDirEmpty(targetDir);
  if (!empty && !force) {
    const { overwrite } = await prompts({
      type: 'confirm',
      name: 'overwrite',
      message: `Target directory '${targetDir}' is not empty. Overwrite?`,
      initial: false,
    });
    if (!overwrite) {
      console.log(yellow('Aborted by user.')); 
      process.exit(1);
    }
    await fse.emptyDir(targetDir);
  }
}

function randomSecret(len = 24): string {
  return crypto.randomBytes(len).toString('base64url');
}

async function copySelectedTemplate(sourceDir: string, targetDir: string): Promise<void> {
  const filterDir = (src: string, base: string): boolean => {
    const rel = path.relative(base, src);
    if (rel === '') return true;
    const parts = rel.split(path.sep);
    if (parts.includes('data')) return false;
    if (parts.includes('logs')) return false;
    if (parts.includes('.pnpm-store')) return false;
    if (parts.includes('run')) return false; // backend/run
    if (parts.includes('node_modules')) return false;
    if (parts.includes('.git') || parts.includes('.idea') || parts.includes('.vscode')) return false;
    if (parts.includes('.DS_Store')) return false;
    return true;
  };
  const items = [
    'backend',
    'frontend',
    'nginx',
    'docker-compose.dev.yml',
    'docker-compose.prod.yml',
    'README.md',
  ];
  for (const item of items) {
    const srcPath = path.join(sourceDir, item);
    const destPath = path.join(targetDir, item);
    if (!fs.existsSync(srcPath)) continue;
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      await fse.copy(srcPath, destPath, { filter: (p) => filterDir(p, srcPath) });
    } else {
      await fse.mkdirp(path.dirname(destPath));
      await fse.copy(srcPath, destPath);
    }
  }
}

async function replaceInFile(filePath: string, reps: Array<[RegExp | string, string]>) {
  if (!fs.existsSync(filePath)) return;
  const content = await fse.readFile(filePath, 'utf8');
  const updated = reps.reduce((acc, [pattern, replacement]) => {
    if (typeof pattern === 'string') {
      return acc.split(pattern).join(replacement);
    } else {
      return acc.replace(pattern, replacement);
    }
  }, content);
  await fse.writeFile(filePath, updated, 'utf8');
}

async function writeVersion(targetDir: string, version: string) {
  await fse.writeFile(path.join(targetDir, 'VERSION'), `${version}\n`, 'utf8');
  const backendVersion = path.join(targetDir, 'backend', 'VERSION');
  if (fs.existsSync(backendVersion)) {
    await fse.writeFile(backendVersion, `${version}\n`, 'utf8');
  }
}

async function writeEnvFiles(targetDir: string) {
  const devEnv = [
    `MYSQL_ROOT_PASSWORD=${randomSecret(16)}`,
    `MYSQL_DATABASE=app_db`,
    `MYSQL_USER=app_user`,
    `MYSQL_PASSWORD=${randomSecret(16)}`,
    `REDIS_PASSWORD=${randomSecret(16)}`,
    ''
  ].join('\n');
  const prodEnv = [
    `MYSQL_ROOT_PASSWORD=${randomSecret(24)}`,
    `MYSQL_DATABASE=app_db`,
    `MYSQL_USER=app_user`,
    `MYSQL_PASSWORD=${randomSecret(24)}`,
    `REDIS_PASSWORD=${randomSecret(24)}`,
    ''
  ].join('\n');
  await fse.writeFile(path.join(targetDir, '.env'), devEnv, 'utf8');
  await fse.writeFile(path.join(targetDir, '.env.prod'), prodEnv, 'utf8');
}

async function applyReplacements(targetDir: string, appName: string, opts: Options) {
 const devCompose = path.join(targetDir, 'docker-compose.dev.yml');
 const prodCompose = path.join(targetDir, 'docker-compose.prod.yml');
 const backendPkg = path.join(targetDir, 'backend', 'package.json');
 const frontendPkg = path.join(targetDir, 'frontend', 'package.json');
 const frontendIndex = path.join(targetDir, 'frontend', 'index.html');
 const readme = path.join(targetDir, 'README.md');

 // First: placeholder-based replacements (for new internal template)
 await replaceInFile(devCompose, [
   ['__APP_NAME__', appName],
   ['__DEV_PORT__', String(opts.devPort)],
 ]);
 await replaceInFile(prodCompose, [
   ['__APP_NAME__', appName],
   ['__PROD_PORT__', String(opts.prodPort)],
 ]);
 await replaceInFile(backendPkg, [['__APP_NAME__', appName]]);
 await replaceInFile(frontendPkg, [['__APP_NAME__', appName]]);
 await replaceInFile(frontendIndex, [['__APP_NAME__', appName]]);
 await replaceInFile(readme, [
   ['__DEV_PORT__', String(opts.devPort)],
   ['__PROD_PORT__', String(opts.prodPort)],
   ['__APP_NAME__', appName],
   ['__APP_VERSION__', String(opts.version)],
 ]);

 // Second: legacy string replacements (for fallback templates)
 await replaceInFile(devCompose, [
   ['container_name: demo-mysql', `container_name: ${appName}-mysql`],
   ['container_name: demo-redis', `container_name: ${appName}-redis`],
   ['container_name: demo-backend', `container_name: ${appName}-backend`],
   ['container_name: demo-frontend', `container_name: ${appName}-frontend`],
   ['container_name: demo-nginx', `container_name: ${appName}-nginx`],
   ['8080:8080', `${opts.devPort}:8080`],
 ]);

 await replaceInFile(prodCompose, [
   ['container_name: demo-mysql-prod', `container_name: ${appName}-mysql-prod`],
   ['container_name: demo-redis-prod', `container_name: ${appName}-redis-prod`],
   ['container_name: demo-backend-prod', `container_name: ${appName}-backend-prod`],
   ['container_name: demo-frontend-prod', `container_name: ${appName}-frontend-prod`],
   ['container_name: demo-nginx-prod', `container_name: ${appName}-nginx-prod`],
   ['image: demo-backend:prod', `image: ${appName}-backend:prod`],
   ['image: demo-frontend:prod', `image: ${appName}-frontend:prod`],
   ['8081:8080', `${opts.prodPort}:8080`],
 ]);

 await replaceInFile(backendPkg, [['"name": "demo-backend"', `"name": "${appName}-backend"`]]);
 await replaceInFile(frontendPkg, [['"name": "demo-frontend"', `"name": "${appName}-frontend"`]]);

 await replaceInFile(readme, [
   [/http:\/\/localhost:8080\b/g, `http://localhost:${opts.devPort}`],
   [/http:\/\/localhost:8081\b/g, `http://localhost:${opts.prodPort}`],
 ]);

  // Optional: apply mysql platform if present
  if (opts.mysqlPlatform) {
    await replaceInFile(devCompose, [[/platform:\s*[^\n]+/g, `platform: ${opts.mysqlPlatform}`]]);
    await replaceInFile(prodCompose, [[/platform:\s*[^\n]+/g, `platform: ${opts.mysqlPlatform}`]]);
  }
}

async function main() {
  const program = new Command();
  program
    .name('create-evd')
    .argument('[appName]', 'Name of the app or \'\.\' for current dir')
    .option('--dev-port <number>', 'Development port to expose', '8080')
    .option('--prod-port <number>', 'Production port to expose', '8081')
    .option('--version <string>', 'Initial VERSION content', '0.1.0')
    .option('--mysql-platform <string>', 'Docker platform for MySQL (e.g., linux/arm64/v8)')
    .option('--git', 'Initialize git repository', false)
    .option('--force', 'Overwrite non-empty directory', false)
    .parse(process.argv);

  let appName = program.args[0];
  const rawOpts = program.opts();
  let opts: Options = {
    devPort: Number(rawOpts.devPort || 8080),
    prodPort: Number(rawOpts.prodPort || 8081),
    version: String(rawOpts.version || '0.1.0'),
    mysqlPlatform: rawOpts.mysqlPlatform,
    git: !!rawOpts.git,
    force: !!rawOpts.force,
  };

  // Interactive mode if no appName provided
  if (!appName) {
    const resp = await prompts([
      {
        type: 'text',
        name: 'appName',
        message: 'App name (use . for current directory):',
        initial: 'my-app',
      },
      {
        type: 'number',
        name: 'devPort',
        message: 'Development port:',
        initial: 8080,
      },
      {
        type: 'number',
        name: 'prodPort',
        message: 'Production port:',
        initial: 8081,
      },
      {
        type: 'text',
        name: 'version',
        message: 'Initial VERSION:',
        initial: '0.1.0',
      },
      {
        type: 'toggle',
        name: 'useMysqlPlatform',
        message: 'Use MySQL platform linux/arm64/v8?',
        initial: true,
        active: 'yes',
        inactive: 'no',
      },
      {
        type: 'toggle',
        name: 'git',
        message: 'Initialize git?',
        initial: false,
        active: 'yes',
        inactive: 'no',
      },
    ]);
    appName = resp.appName;
    opts = { 
      ...opts, 
      devPort: resp.devPort ?? opts.devPort,
      prodPort: resp.prodPort ?? opts.prodPort,
      version: resp.version ?? opts.version,
      mysqlPlatform: resp.useMysqlPlatform ? 'linux/arm64/v8' : undefined,
      git: resp.git ?? opts.git,
    };
  }

  if (!appName) {
    console.error(red('App name is required.'));
    process.exit(1);
  }

  const normalized = appName === '.' ? '.' : slugify(appName);
  if (normalized !== '.' && !validateName(normalized).validForNewPackages) {
    console.error(red(`Invalid app name '${appName}'.`));
    process.exit(1);
  }

  const packageDir = path.resolve(__dirname, '..'); // create-evd
  const workspaceRoot = path.resolve(packageDir, '..'); // workspace root
  const internalTemplateDir = path.resolve(packageDir, 'template'); // create-evd/template

  const targetDir = normalized === '.'
    ? process.cwd()
    : path.resolve(process.cwd(), normalized);

  await ensureDir(targetDir, !!opts.force);
  if (fs.existsSync(internalTemplateDir)) {
    console.log(blue(`Copying internal template from ${internalTemplateDir} to ${targetDir} ...`));
    await fse.copy(internalTemplateDir, targetDir);
  } else {
    console.log(blue(`Copying selected template from ${workspaceRoot} to ${targetDir} ...`));
    await copySelectedTemplate(workspaceRoot, targetDir);
  }

  console.log(blue('Applying replacements (names, ports, images, containers)...'));
  await applyReplacements(targetDir, normalized === '.' ? path.basename(targetDir) : normalized, opts);
  await writeVersion(targetDir, opts.version);
  await writeEnvFiles(targetDir);

  // Optional git init
  if (opts.git) {
    try {
      execSync('git init', { cwd: targetDir, stdio: 'ignore' });
      execSync('git add -A', { cwd: targetDir, stdio: 'ignore' });
      execSync('git commit -m "chore: init scaffold"', { cwd: targetDir, stdio: 'ignore' });
      console.log(green('Initialized git repository.'));
    } catch (err) {
      console.log(yellow('Git initialization skipped or failed.'));
    }
  }

  console.log(green('Scaffold generated successfully!'));
  console.log('');
  console.log(bold('Next steps:'));
  console.log(`  1) cd ${normalized === '.' ? '.' : normalized}`);
  console.log('  2) Development:');
  console.log(`     docker compose -f docker-compose.dev.yml up -d`);
  console.log(`     Open http://localhost:${opts.devPort}/api/health`);
  console.log('  3) Production:');
  console.log(`     docker compose -f docker-compose.prod.yml up -d --build`);
  console.log(`     Open http://localhost:${opts.prodPort}/api/health`);
}

main().catch((e) => {
  console.error(red(String(e?.message || e)));
  process.exit(1);
});