#  Ripley  Memory-Augmented AI Debugger

Ripley is an AI-powered debugging system designed to **understand, analyze, and fix code with deep contextual awareness**.

This version integrates a lightweight augmentation layer using `.opencode` and `.speckit`, enabling:

* Persistent memory
* Semantic retrieval
* Context enrichment across files
* Structured debugging workflows

---

##  Core Philosophy

Ripley is not an autonomous agent.

It is:

* Deterministic
* Inspectable
* Pipeline-driven

The added system does not replace Ripley.
It enhances it.

---

##  System Architecture

### Before

```
File → Context → Debug → Fix
```

### After (Current)

```
File
 → Context Builder
 → Retrieval Layer (memory + embeddings)
 → Enriched Context
 → Debug Engine (Ripley core)
 → Fix Output
 → Memory Writeback
```

---

##  What Was Added

### 1. Memory Layer (`.speckit/memory`)

* Stores past debugging sessions
* Enables “have I seen this before?” reasoning
* Supports semantic retrieval

---

### 2. Retrieval Engine

* Embedding-based search (OpenRouter supported)
* Keyword fallback
* Cross-file awareness

---

### 3. Context Enrichment (`.speckit/scripts`)

* Expands local context with relevant global signals
* Reduces hallucination by grounding responses

---

### 4. Hooks & Execution Layer (`.opencode/hooks`)

* Injects retrieval before debugging
* Writes memory after fixes
* Keeps Ripley’s flow intact

---

### 5. Skills (Optional) (`.opencode/skill`)

* Modular debugging modes
* Example: async bugs, auth issues, state bugs

---

##  Folder Structure

```
project-root/
├── ripley/                 # Core debugger (unchanged)
├── .opencode/
│   ├── agent/
│   ├── command/
│   ├── hooks/
│   ├── skill/
│   ├── .speckit/
│   │   ├── memory/
│   │   ├── scripts/
│   │   ├── templates/
│   │   └── features/
│   ├── opencode.json
│   └── settings.json
```

---

##  How It Works

### Step-by-step flow:

1. Input file / bug
2. Ripley builds base context
3. Retrieval layer:

   * Finds similar code
   * Fetches past fixes
   * Expands context
4. Ripley debugs using enriched context
5. Fix is generated
6. Result is stored in memory

---

##  Setup

### 1. LLM (Required)

Use any supported provider:

* OpenRouter (recommended)
* OpenAI / Anthropic (optional)

---

### 2. Embeddings (Optional but Recommended)

Default:

* OpenRouter free embedding model

Upgrade later if needed.

---

### 3. Install

```bash
git clone <repo>
cd project
npm install  # or pip install -r requirements.txt
```

---

### 4. Run

```bash
npm run debug
# or
python ripley.py
```

---

##  Modes

* Standard Debug → default Ripley behavior
* Memory-Augmented Debug → retrieval enabled
* Skill-Based Debug → optional specialized flows

---

##  Guardrails

* Ripley remains the primary system
* No multi-agent loops
* No hidden orchestration
* All enhancements are modular and optional

---

##  What This Improves

| Capability           | Before | After |
| -------------------- | ------ | ----- |
| Cross-file awareness | NO     | YES   |
| Past bug recall      | NO     | YES   |
| Context quality      | Medium | High  |
| Hallucination        | Higher | Lower |

---

##  Design Insight

This system is not an “AI agent”.

It is a:

> **Memory-augmented debugging engine**

The goal is not autonomy.
The goal is **better thinking with better context**.

---

##  Future Improvements

* Better chunking strategies
* Smarter retrieval ranking
* Debug pattern learning
* Lightweight evaluation layer

---

##  Summary

Ripley now:

* Remembers
* Retrieves
* Reasons with context

Without losing:

* Control
* Simplicity
* Determinism
