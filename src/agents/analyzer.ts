import * as fs from 'fs';
import * as path from 'path';
import { callLLM } from '../llm/client';
import { appendFileAnalysis, markFileComplete } from '../state/debugWriter';
import { updateProgress } from '../state/stateManager';
import { fetchContext } from '../utils/speckitBridge';

export async function analyzeBatch(files: string[]): Promise<void> {
  const outputDir = path.join(process.cwd(), 'outputs');
  const issuesPath = path.join(outputDir, 'issues.json');

  // ensure output dir + file exist ONCE
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  if (!fs.existsSync(issuesPath)) {
    fs.writeFileSync(issuesPath, JSON.stringify([], null, 2));
  }

  for (const file of files) {
    try {
      // 🔴 skip useless files
      if (
        file.includes('outputs') ||
        file.endsWith('.md') ||
        file.endsWith('.json') ||
        file.includes('node_modules') ||
        file.includes('package-lock.json') ||
        file.includes('yarn.lock') ||
        file.includes('.env')
      ) {
        continue;
      }

      const stats = fs.statSync(file);
      if (stats.size > 50 * 1024) continue;

      let content = fs.readFileSync(file, 'utf-8');

      // limit size
      if (content.length > 1500) {
        content = content.slice(0, 1500);
      }

      console.log(`Analyzing: ${file}`);

      const prompt = `
You are a STRICT static analyzer.

You MUST follow EXACT format.
If you do not follow format, the system will BREAK.

ONLY output:

DEPENDS ON:
- ...

PROVIDES:
- ...

CONTRACTS:
- ...

RISKS:
- ...

UNKNOWN:
- ...

RULES:
- NO explanations
- NO prose
- NO reasoning
- ONLY bullet points
- If empty → write NONE

FILE PATH: ${file}

HISTORICAL ISSUES (SPECKIT MEMORY):
${fetchContext(file, '')}

FILE CONTENT:
${content}
`;

      const response = await callLLM(prompt);

      if (
        !response ||
        typeof response !== 'string' ||
        !response.includes('DEPENDS ON:')
      ) {
        console.log(`Bad LLM response -> skipping ${file}`);
        continue;
      }

      const parsed = parseResponse(response);

      const isValid =
        parsed.dependsOn.length > 0 ||
        parsed.provides.length > 0 ||
        parsed.contracts.length > 0 ||
        parsed.risks.length > 0;

      if (!isValid) {
        console.log(`Skipping file (invalid analysis): ${file}`);
        continue;
      }

      // ===== ISSUE EXTRACTION (SINGLE SOURCE) =====
      const newIssues: any[] = [];

      for (const risk of parsed.risks) {
        newIssues.push({
          file,
          type: "RISK",
          description: risk,
          status: "pending"
        });
      }

      for (const contract of parsed.contracts) {
        if (contract.toLowerCase().includes("missing")) {
          newIssues.push({
            file,
            type: "CONTRACT_MISSING",
            description: contract,
            status: "pending"
          });
        }
      }

      // write issues once
      if (newIssues.length > 0) {
        let existing: any[] = [];

        try {
          existing = JSON.parse(fs.readFileSync(issuesPath, 'utf-8'));
        } catch {
          existing = [];
        }

        fs.writeFileSync(
          issuesPath,
          JSON.stringify([...existing, ...newIssues], null, 2),
          'utf-8'
        );
      }

      appendFileAnalysis(file, parsed);
      markFileComplete(file);

    } catch (error) {
      console.error(`Error analyzing file ${file}:`, error);

      appendFileAnalysis(file, {
        dependsOn: [],
        provides: [],
        contracts: [],
        risks: ['ANALYSIS_FAILED'],
        unknown: ['UNKNOWN']
      });

      markFileComplete(file);
    } finally {
      updateProgress(file);

      // jitter delay INSIDE loop (correct)
      const delay = 1500 + Math.random() * 500;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function parseResponse(response: string) {
  const result = {
    dependsOn: [] as string[],
    provides: [] as string[],
    contracts: [] as string[],
    risks: [] as string[],
    unknown: [] as string[]
  };

  let current: keyof typeof result | null = null;

  for (let line of response.split('\n')) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith('DEPENDS ON:')) { current = 'dependsOn'; continue; }
    if (line.startsWith('PROVIDES:')) { current = 'provides'; continue; }
    if (line.startsWith('CONTRACTS:')) { current = 'contracts'; continue; }
    if (line.startsWith('RISKS:')) { current = 'risks'; continue; }
    if (line.startsWith('UNKNOWN:')) { current = 'unknown'; continue; }

    if (current) {
      const clean = line.replace(/^[\*\-]\s*/, '').trim();
      if (clean && clean !== 'NONE' && clean !== 'UNKNOWN') {
        result[current].push(clean);
      }
    }
  }

  return result;
}