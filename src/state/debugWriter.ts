import * as fs from 'fs';
import * as path from 'path';

const OUTPUT_DIR = path.join(process.cwd(), 'outputs');
const DEBUG_FILE = path.join(OUTPUT_DIR, 'SYSTEM_DEBUG.md');

export function initDebugFile(files: string[]): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const header = `# SYSTEM DEBUG\n\n## FILES\n\n`;
  const fileList = files.map(f => `[ ] ${f}`).join('\n') + '\n\n---\n';

  fs.writeFileSync(DEBUG_FILE, header + fileList, 'utf-8');
}

export interface FileAnalysisData {
  dependsOn?: string[];
  provides?: string[];
  contracts?: string[];
  risks?: string[];
  unknown?: string[];
  fixes?: string[];
}

export function appendFileAnalysis(file: string, data: FileAnalysisData): void {
  if (!fs.existsSync(DEBUG_FILE)) {
    throw new Error(`Debug file not found at ${DEBUG_FILE}`);
  }

  const formatList = (items?: string[]) => {
    if (!items || items.length === 0) return '* NONE';
    return items.map(item => `* ${item}`).join('\n');
  };

  const block = `
---

### FILE: ${file}

DEPENDS ON:
${formatList(data.dependsOn)}

PROVIDES:
${formatList(data.provides)}

CONTRACTS:
${formatList(data.contracts)}

RISKS:
${formatList(data.risks)}

UNKNOWN:
${formatList(data.unknown)}

FIXES:
${formatList(data.fixes)}

---
`;

  fs.appendFileSync(DEBUG_FILE, block, 'utf-8');
}

export function markFileComplete(file: string): void {
  if (!fs.existsSync(DEBUG_FILE)) {
    throw new Error(`Debug file not found at ${DEBUG_FILE}`);
  }

  let content = fs.readFileSync(DEBUG_FILE, 'utf-8');
  content = content.replace(`[ ] ${file}`, `[x] ${file}`);
  fs.writeFileSync(DEBUG_FILE, content, 'utf-8');
}
