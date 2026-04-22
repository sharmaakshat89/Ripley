# Ripley Augmentation Plan (Gogeta)

This document outlines the exact, minimal, and non-destructive integration of `.opencode` and `.speckit` into the Ripley debugging system.

## 1. Final Architecture

The architecture strictly treats `.opencode` as the orchestrator/wrapper and `.speckit` as the persistent memory engine, keeping Ripley as the core execution engine.

```text
[ Trigger / Orchestration ] 
.opencode/command/gsd-run-ripley.md (or hooks)
      │
      ▼
[ Ripley Core Pipeline (runPipeline.ts) ]
      │
      ├─► 1. Scan Project
      ├─► 2. Extract Contracts
      │
      ▼
[ Ripley Context Builder (analyzer.ts / fixer.ts) ]
      │
      ├─► 🔹 .speckit Retrieval Layer (INJECTED)
      │     - Read `.opencode/.speckit/memory/`
      │     - Fetch past issues, relevant resolutions, and codebase context
      │
      ▼
[ Enriched Context ]
      │
      ▼
[ Ripley Debug/Fix Logic (fixer.ts) - UNCHANGED LLM CALL ]
      │
      ▼
[ Fix Output & Application ]
      │
      ├─► 🔹 .speckit Memory Writeback (INJECTED)
            - Write successful fix to `.opencode/.speckit/memory/resolved_issues.json`
```

---

## 2. Exact Files to Modify (Minimal Changes)

We only need to touch **two existing Ripley files** and create **one helper file** to act as the bridge.

### A. Create Bridge Helper
**File:** `src/utils/speckitBridge.ts`
*   **Purpose:** Contains two simple functions: `fetchContext(file: string, issue: string)` and `storeResolution(issue: any, fix: string)`. It interacts purely with the `.opencode/.speckit/memory/` directory.

### B. Modify `src/agents/fixer.ts` (Retrieval & Writeback)

*   **Injection 1 (Retrieval BEFORE LLM Call):**
    ```typescript
    // Inside runFixes(), before building FIX_PROMPT
    import { fetchContext, storeResolution } from '../utils/speckitBridge';
    
    // ... inside the issue loop ...
    const pastContext = fetchContext(issue.file, issue.description);
    
    // Update FIX_PROMPT to include {speckitContext}
    const prompt = FIX_PROMPT
      .replace('{description}', issue.description)
      .replace('{speckitContext}', pastContext)
      .replace('{code}', code);
    ```

*   **Injection 2 (Writeback AFTER successful fix):**
    ```typescript
    if (updatedCodeMatch) {
       let fixedCode = updatedCodeMatch[1].trim();
       fixedCode = fixedCode.replace(/^```[\w]*\n/i, '').replace(/\n```$/i, '');
       
       fs.writeFileSync(filePath, fixedCode, 'utf-8');
       
       // 🔹 INJECTED: Store successful resolution to Speckit Memory
       storeResolution(issue, fixesAppliedMatch ? fixesAppliedMatch[1].trim() : 'Unknown fix');
       
       issue.status = 'resolved';
       // ...
    }
    ```

### C. Modify `src/agents/analyzer.ts` (Optional Context Enrichment)

*   **Injection 1 (Retrieval BEFORE LLM Call):**
    Append `fetchContext(file)` to the `FILE CONTENT:` section of the prompt so the analyzer knows what risks were historically found in this file.

---

## 3. Example Flow of Execution

1. **Trigger:** The developer runs a command like `/gsd-ripley` (handled by `.opencode/command/gsd-ripley.md`), or a Git hook triggers `.opencode/hooks/trigger-ripley.js`.
2. **Ripley Starts:** Ripley's `runPipeline.ts` boots up and scans files as usual.
3. **Analysis:** `analyzer.ts` identifies a `CONTRACT_MISSING` issue in `auth.ts` and adds it to `outputs/issues.json`.
4. **Retrieval (The Augmentation):** `fixer.ts` picks up the issue. Before asking the LLM to fix it, it calls the `speckitBridge`. The bridge reads `.speckit/memory/` and finds a previous memory: *"Last time auth.ts lacked a contract, we imported TokenValidator from utils."*
5. **Enriched Fix:** Ripley's LLM is prompted with the code, the issue, AND the Speckit memory. It generates a perfectly contextualized fix.
6. **Writeback (The Learning):** The file is overwritten. `speckitBridge.storeResolution()` is called, logging the exact fix pattern into `.speckit/memory/` for future runs.

---

## 4. Minimal Working Integration Plan (MVP)

### Phase A: The Memory Engine (Speckit)
1. Create `.opencode/.speckit/memory/ripley_history.json` to act as the storage array for past fixes.
2. Implement `src/utils/speckitBridge.ts` with basic JSON read/write logic targeting the `.speckit/memory` directory.

### Phase B: Ripley Injection
1. Update `FIX_PROMPT` in `src/agents/fixer.ts` to accept `{speckitContext}`.
2. Inject the `fetchContext` call into `src/agents/fixer.ts` right where `FIX_PROMPT` is prepared.
3. Inject the `storeResolution` call into `src/agents/fixer.ts` right after `fs.writeFileSync`.

### Phase C: Orchestration & Tooling (.opencode)
1. **Command:** Create `.opencode/command/gsd-ripley.md` containing a bash script to execute `npx ts-node src/cli/index.ts` (or Ripley's equivalent start command), ensuring Ripley is first-class but accessible via the opencode CLI.
2. **Skill:** Create `.opencode/skill/ripley-integration/` to instruct any general `.opencode` agents on how to read Ripley's `outputs/issues.json` if they need to report the debugger's status to the user.

**Guardrails Enforced:** 
Ripley's batching, scanning, state management, and strict prompt outputs remain 100% untouched. No multi-agent loops were added to the core debugging process—only a lightweight string injection and a file write layer.