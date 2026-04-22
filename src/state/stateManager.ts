import * as fs from 'fs';
import * as path from 'path';

export interface ProgressState {
  currentIndex: number;
  files: string[];
  completed: string[];
}

const OUTPUT_DIR = path.join(process.cwd(), 'outputs');
const PROGRESS_FILE = path.join(OUTPUT_DIR, 'progress.json');

export function initState(files: string[]): void {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const issuesFile = path.join(OUTPUT_DIR, 'issues.json');
  fs.writeFileSync(issuesFile, JSON.stringify([], null, 2), 'utf-8');

  const initialState: ProgressState = {
    currentIndex: 0,
    files,
    completed: []
  };

  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
}

export function getState(): ProgressState {
  if (!fs.existsSync(PROGRESS_FILE)) {
    throw new Error(`Progress file not found at ${PROGRESS_FILE}`);
  }
  const content = fs.readFileSync(PROGRESS_FILE, 'utf-8');
  return JSON.parse(content) as ProgressState;
}

export function updateProgress(file: string): void {
  const state = getState();
  if (!state.completed.includes(file)) {
    state.completed.push(file);
  }
  state.currentIndex += 1;
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(state, null, 2), 'utf-8');
}