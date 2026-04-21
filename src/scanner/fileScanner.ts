import * as fs from 'fs';
import * as path from 'path';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage'
]);

const IGNORED_EXTS = new Set([
  '.log',
  '.lock',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.ico'
]);

// ✅ NEW: ignore specific files
const IGNORED_FILES = new Set([
  'package-lock.json',
  'yarn.lock',
  '.env'
]);

export function getFilePriority(filePath: string): number {
  
  const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();
  const fileName = path.basename(normalizedPath);
  
  
  if (fileName === 'package.json') return 1;
  if (normalizedPath.endsWith('/server/index.js') || normalizedPath.endsWith('/server/app.js')) return 2;
  if (normalizedPath.endsWith('/src/index.js')) return 3;
  if (normalizedPath.includes('/config') || fileName.includes('config')) return 4;
  if (normalizedPath.includes('/utils/')) return 5;
  if (normalizedPath.includes('/services/')) return 6;
  if (normalizedPath.includes('/controllers/')) return 7;
  if (normalizedPath.includes('/routes/')) return 8;

  return 9;
}

export function scanProject(rootPath: string): string[] {
  let results: string[] = [];

  function walk(dir: string) {
    let list: fs.Dirent[];
    try {
      list = fs.readdirSync(dir, { withFileTypes: true });
    } catch (err) {
      return;
    }

    for (const dirent of list) {
      const fullPath = path.join(dir, dirent.name);

      if (dirent.isDirectory()) {
        if (!IGNORED_DIRS.has(dirent.name)) {
          walk(fullPath);
        }
      } else if (dirent.isFile()) {
        if (!filePath.match(/\.(js|ts|jsx|tsx)$/)) {
          continue;
        }

        const ext = path.extname(dirent.name).toLowerCase();

        // ✅ NEW: ignore by filename
        if (IGNORED_FILES.has(dirent.name)) {
          continue;
        }

        if (!IGNORED_EXTS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(rootPath);

  results.sort((a, b) => {
    const priorityA = getFilePriority(a);
    const priorityB = getFilePriority(b);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    return a.localeCompare(b);
  });

  return results;
}