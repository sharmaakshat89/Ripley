import 'dotenv/config';
import { log, error, success } from '../utils/logger';
import { scanProject } from '../scanner/fileScanner';
import { initState, getState } from '../state/stateManager';
import { initDebugFile } from '../state/debugWriter';
import { callLLM } from '../llm/client';
import { extractContracts } from '../agents/contractExtractor';
import { analyzeBatch } from '../agents/analyzer';
import { runIntegrityCheck } from '../agents/integrityChecker';
import { runFixes } from '../agents/fixer';
import { runPipeline } from '../orchestrator/runPipeline';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const supportedCommands = ['init', 'analyze', 'fix', 'check', 'test-llm', 'run'];

  if (!command) {
    error('No command provided. Supported commands: ' + supportedCommands.join(', '));
    process.exit(1);
  }

  if (!supportedCommands.includes(command)) {
    error(`Unknown command: ${command}. Supported commands: ` + supportedCommands.join(', '));
    process.exit(1);
  }

  log(`Executing command: ${command}`);

  if (command === 'run') {
    await runPipeline();

  } else if (command === 'analyze') {
    let state;

    try {
      state = getState();
    } catch (err) {
      const files = scanProject(process.cwd());
      console.log(`Total files found: ${files.length}`);
      initState(files);
      initDebugFile(files);
      state = getState();
    }

    const batchSize = 7;
    const nextFiles = state.files.slice(
      state.currentIndex,
      state.currentIndex + batchSize
    );

    if (nextFiles.length > 0) {
      log(`Processing batch of ${nextFiles.length} files...`);
      await analyzeBatch(nextFiles);
      await runIntegrityCheck();
    } else {
      log('All files processed.');
    }

  } else if (command === 'fix') {
    log('Running fixes...');
    await runFixes();

  } else if (command === 'test-llm') {
    try {
      log('Testing LLM...');
      const response = await callLLM('Say OK');
      console.log(response);
    } catch (err: any) {
      error(`LLM error: ${err.message}`);
      process.exit(1);
    }
  }

  success(`Command ${command} executed successfully.`);
}

main().catch((err) => {
  error(`Fatal error: ${err.message}`);
  process.exit(1);
});