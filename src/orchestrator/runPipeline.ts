import * as fs from 'fs';
import * as path from 'path';
import { log, success } from '../utils/logger';
import { scanProject } from '../scanner/fileScanner';
import { initState, getState } from '../state/stateManager';
import { initDebugFile } from '../state/debugWriter';
import { extractContracts } from '../agents/contractExtractor';
import { analyzeBatch } from '../agents/analyzer';
import { runIntegrityCheck } from '../agents/integrityChecker';
import { runFixes } from '../agents/fixer';

export async function runPipeline(): Promise<void> {
  log('Starting full pipeline...');
  const cwd = process.cwd();

  // 1. Scan project
  log('Scanning project...');
  const files = scanProject(cwd);
  log(`Found ${files.length} files.`);

  // 2. Initialize state
  initState(files);

  // 3. Initialize debug file
  initDebugFile(files);

  // 4. Contract extraction (once)
  log('Running contract extraction...');
  await extractContracts(files);

  // 5. Analyze ALL files in batches
  const batchSize = 7;
  let state = getState();

  while (state.currentIndex < state.files.length) {
    state = getState();

    const nextBatch = state.files.slice(
      state.currentIndex,
      state.currentIndex + batchSize
    );

    if (nextBatch.length === 0) break;

    log(`Processing batch of ${nextBatch.length} files...`);

    await analyzeBatch(nextBatch);

    await runIntegrityCheck();

    // reload updated state after batch
    state = getState();
  }

  // ✅ 6. RUN FIX PHASE ONLY ONCE (AFTER ALL ANALYSIS)
  log('Running fix phase...');
  await runFixes();

  // 7. Summary
  let totalIssues = 0;
  let totalFixes = 0;

  const deferredFile = path.join(cwd, 'outputs', 'deferred.json');

  if (fs.existsSync(deferredFile)) {
    try {
      const deferredData = JSON.parse(
        fs.readFileSync(deferredFile, 'utf-8')
      );

      const issues = Array.isArray(deferredData)
        ? deferredData
        : deferredData.issues || [];

      totalIssues = issues.length;
      totalFixes = issues.filter((i: any) => i.status === 'resolved').length;
    } catch {
      // ignore
    }
  }

  success('Pipeline execution completed.');
  log(`Total files analyzed: ${state.completed.length}`);
  log(`Total issues found: ${totalIssues}`);
  log(`Total fixes applied: ${totalFixes}`);
}