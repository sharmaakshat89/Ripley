import * as fs from 'fs';
import * as path from 'path';
import { callLLM } from '../llm/client';

const OUTPUT_DIR = path.join(process.cwd(), 'outputs');
const DEFERRED_FILE = path.join(OUTPUT_DIR, 'deferred.json');
const DEBUG_FILE = path.join(OUTPUT_DIR, 'SYSTEM_DEBUG.md');
const ISSUES_FILE = path.join(OUTPUT_DIR, 'issues.json');

const FIX_PROMPT = `
You are a STRICT code fixer.

You MUST follow EXACT output format.

If you do not follow format, your response will be discarded.

Fix ONLY the issue.

RULES:
- Do NOT explain
- Do NOT add comments
- Do NOT change unrelated code
- Return FULL FILE only

OUTPUT FORMAT (MANDATORY):

UPDATED CODE:
<full updated file content here>

FIXES APPLIED:
- short bullet

SKIPPED:
- NONE

---

ISSUE:
{description}

FILE:
{code}
`;;

interface Issue {
  file: string;
  description: string;
  type: string;
  status: string;
}

export async function runFixes(): Promise<void> {
  // ✅ Ensure outputs folder exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    return;
  }

  // ✅ Prefer issues.json (new system)
  let issues: Issue[] = [];

  if (fs.existsSync(ISSUES_FILE)) {
    try {
      issues = JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
    } catch {
      issues = [];
    }
  } else {
    console.log("No issues.json found → skipping fixes");
    return;
  }

  if (issues.length === 0) {
    console.log("No issues to fix");
    return;
  }

  const safeTypes = [
  'CONTRACT_MISSING',
  'undefined variable',
  'wrong file path',
  'import/export mismatch (confirmed)'
];

  let hasUpdates = false;
  let fixCount = 0;
  for (const issue of issues) {
    if (fixCount > 10) break; // limit per run
    if (issue.status === 'resolved') continue;
    if (issue.description.length < 10) {
    continue;
    }
    if (!issue.description.toLowerCase().includes('missing')) {
    continue;
    }
    if (!safeTypes.includes(issue.type)) {
      continue;
    }
    if (issue.type === 'UNKNOWN') {
      continue;
    }
    const filePath = path.resolve(process.cwd(), issue.file);

    if (!fs.existsSync(filePath)) {
      continue;
    }
    console.log(`Evaluating issue: ${issue.type} → ${issue.description}`);
    console.log(`Fixing: ${issue.file}`);

    const code = fs.readFileSync(filePath, 'utf-8');

    const prompt = FIX_PROMPT
      .replace('{description}', issue.description)
      .replace('{code}', code);

    const response = await callLLM(prompt, { temperature: 0 });
    console.log("FIX RESPONSE:", response.slice(0, 300));
    const updatedCodeMatch = response.match(/UPDATED CODE:\s*([\s\S]*?)(?=FIXES APPLIED:|$)/i);
    const fixesAppliedMatch = response.match(/FIXES APPLIED:\s*([\s\S]*?)(?=SKIPPED:|$)/i);

    if (
          !response.includes('UPDATED CODE:') ||
          !updatedCodeMatch ||
          updatedCodeMatch[1].trim().length < 20
          ) {
            console.log(`Skipped fix (bad format): ${issue.file}`);
            continue;
            }
if (updatedCodeMatch) {
      fixCount++;
      hasUpdates = true;
    }
  }

  // ✅ Save updated issues
  if (hasUpdates) {
    fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2), 'utf-8');
  }
}