import * as fs from 'fs';
import * as path from 'path';

export async function runIntegrityCheck(): Promise<void> {
  const OUTPUT_DIR = path.join(process.cwd(), 'outputs');
  const DEBUG_FILE = path.join(OUTPUT_DIR, 'SYSTEM_DEBUG.md');
  const CONTRACTS_FILE = path.join(OUTPUT_DIR, 'contracts.json');
  const DEFERRED_FILE = path.join(OUTPUT_DIR, 'deferred.json');

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  if (!fs.existsSync(DEFERRED_FILE)) {
    fs.writeFileSync(DEFERRED_FILE, JSON.stringify([], null, 2), 'utf-8');
  }

  let deferredData: any[] = [];
  try {
    deferredData = JSON.parse(fs.readFileSync(DEFERRED_FILE, 'utf-8'));
  } catch (e) {
    deferredData = [];
  }

  let maxId = 0;
  for (const item of deferredData) {
    if (item.id && item.id.startsWith('D')) {
      const num = parseInt(item.id.substring(1), 10);
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  }
  let idCounter = maxId + 1;

  const issues: any[] = [];

  let debugContent = '';
  if (fs.existsSync(DEBUG_FILE)) {
    debugContent = fs.readFileSync(DEBUG_FILE, 'utf-8');
  }

  let contracts: any = { apis: [], functions: [], env: [], models: [] };
  if (fs.existsSync(CONTRACTS_FILE)) {
    try {
      contracts = JSON.parse(fs.readFileSync(CONTRACTS_FILE, 'utf-8'));
    } catch (e) {}
  }

  const fileBlocks = debugContent.split('### FILE: ').slice(1);
  const allProvides = new Set<string>();
  const allDependsOn: { file: string, dep: string }[] = [];

  for (const block of fileBlocks) {
    const lines = block.split('\n');
    const file = lines[0].trim();

    let currentSection = '';
    for (const line of lines) {
      if (line.startsWith('DEPENDS ON:')) currentSection = 'DEPENDS ON';
      else if (line.startsWith('PROVIDES:')) currentSection = 'PROVIDES';
      else if (line.startsWith('CONTRACTS:')) currentSection = 'CONTRACTS';
      else if (line.startsWith('RISKS:')) currentSection = 'RISKS';
      else if (line.startsWith('UNKNOWN:')) currentSection = 'UNKNOWN';
      else if (line.startsWith('FIXES:')) currentSection = 'FIXES';
      else if (line.startsWith('* ') && line.trim() !== '* NONE') {
        const item = line.substring(2).trim();
        if (currentSection === 'PROVIDES') {
          allProvides.add(item);
        } else if (currentSection === 'DEPENDS ON') {
          allDependsOn.push({ file, dep: item });
        }
      }
    }
  }

  const envVars = new Set((contracts.env || []).map((e: string) => e.toUpperCase()));

  for (const { file, dep } of allDependsOn) {
    const isEnvVar = /^[A-Z0-9_]+$/.test(dep) && dep.length > 2;

    if (isEnvVar) {
      if (!envVars.has(dep.toUpperCase())) {
        issues.push({
          id: `D${idCounter++}`,
          type: 'mismatch',
          description: `ENV VARIABLE MISMATCH: ${dep} used in DEPENDS ON but not listed in contracts.json.env`,
          files: [file],
          status: 'pending'
        });
      }
    } else {
      if (!allProvides.has(dep)) {
        if (!['fs', 'path', 'crypto', 'http', 'https', 'express', 'dotenv'].includes(dep)) {
          let foundMismatch = false;
          for (const p of allProvides) {
            if (p.toLowerCase() === dep.toLowerCase() && p !== dep) {
              issues.push({
                id: `D${idCounter++}`,
                type: 'mismatch',
                description: `FUNCTION NAME MISMATCH: ${dep} referenced differently as ${p} across files`,
                files: [file],
                status: 'pending'
              });
              foundMismatch = true;
              break;
            }
          }

          if (!foundMismatch) {
            issues.push({
              id: `D${idCounter++}`,
              type: 'mismatch',
              description: `IMPORT/EXPORT MISMATCH: File depends on ${dep} but no file provides it`,
              files: [file],
              status: 'pending'
            });
          }
        }
      }
    }
  }

  const apis = contracts.apis || [];
  for (const api of apis) {
    if (api.path && !debugContent.includes(api.path)) {
      issues.push({
        id: `D${idCounter++}`,
        type: 'mismatch',
        description: `BASIC API CHECK: Endpoint ${api.path} exists in contracts but no matching usage found`,
        files: [],
        status: 'pending'
      });
    }
  }

  if (issues.length > 0) {
    deferredData.push(...issues);
    fs.writeFileSync(DEFERRED_FILE, JSON.stringify(deferredData, null, 2), 'utf-8');
  }
}
