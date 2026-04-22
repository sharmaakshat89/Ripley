import * as fs from 'fs';
import * as path from 'path';

const MEMORY_DIR = path.join(process.cwd(), '.opencode', '.speckit', 'memory');
const HISTORY_FILE = path.join(MEMORY_DIR, 'ripley_history.json');

interface MemoryEntry {
  timestamp: string;
  file: string;
  issue: string;
  fixApplied: string;
}

export function fetchContext(file: string, issueDesc: string): string {
  try {
    if (!fs.existsSync(HISTORY_FILE)) {
      return 'No past context available.';
    }

    const history: MemoryEntry[] = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    
    // Simple retrieval: Look for past issues in the same file, or with a similar description
    const relevant = history.filter(h => 
      h.file === file || 
      (h.issue && issueDesc && h.issue.toLowerCase().includes(issueDesc.toLowerCase().substring(0, 20)))
    );

    if (relevant.length === 0) {
      return 'No relevant past context found for this issue.';
    }

    let contextString = 'PAST RESOLUTIONS FOR SIMILAR ISSUES:\n';
    relevant.slice(-3).forEach(r => { // Get last 3
      contextString += `- Issue: ${r.issue}\n  Resolution: ${r.fixApplied}\n`;
    });

    return contextString;

  } catch (error) {
    console.error('Error fetching Speckit context:', error);
    return 'Error loading context.';
  }
}

export function storeResolution(issue: any, fix: string): void {
  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }

    let history: MemoryEntry[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
      history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    }

    history.push({
      timestamp: new Date().toISOString(),
      file: issue.file,
      issue: issue.description || issue.type,
      fixApplied: fix
    });

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error storing Speckit resolution:', error);
  }
}