# Ripley

Ripley is a codebase debugger that doesn’t try to be clever. It reads a project the way a cautious engineer would: file by file, slowly building an understanding of what depends on what, what each piece promises to do, and where those promises quietly break.

It was built out of a very practical frustration. When you use low capability models or “vibe code” quickly, things don’t fail loudly. They drift. A route stops matching a controller, a function returns something slightly different than expected, an import silently points to the wrong place. The system still runs, but the structure underneath starts to rot. Ripley is meant to catch that drift before it becomes a full collapse.

The name comes from Ellen Ripley in *Aliens*. Not because this project is heroic, but because of how she operates. She does not assume things are safe. She does not trust the surface. She pays attention to small inconsistencies and acts before they escalate. This tool is designed with the same mindset. It assumes something is wrong and tries to prove it carefully, without breaking anything else in the process.

---

## What Ripley Does

Ripley walks through your codebase in a controlled loop.

It scans every file that actually matters. Then for each file, it extracts a minimal structural understanding:

Dependencies
What the file relies on

Provides
What it exposes to the rest of the system

Contracts
What shape of data or behavior it promises

Risks
Places where those contracts might already be breaking

Anything it cannot confidently determine is left alone rather than guessed.

This information is written incrementally into a system level debug file, so the tool never loses context as it moves through the project.

Once enough context is built, Ripley runs integrity checks across files. It looks for mismatches between routes and controllers, missing exports, broken assumptions about data shape, and other structural inconsistencies.

Only after that does it attempt fixes. And even then, it is intentionally conservative. It avoids changing function signatures, API shapes, or execution flow unless a mismatch is clearly confirmed. The goal is not to rewrite your code. The goal is to repair it without introducing new damage.

---

## How It Works

The system runs in three stages.

First, it builds context.
Each file is analyzed and added to a growing internal map of the system.

Second, it validates that context.
Cross file checks identify where contracts do not line up.

Third, it applies fixes.
Only issues that are concrete and low risk are modified.

If something is uncertain, it is recorded and deferred rather than forced.

---

## Why It Exists

Most debugging tools either operate at runtime or focus on syntax level issues. They miss the layer where real problems often live: the relationships between files.

Ripley focuses on that layer.

It treats your codebase as a system of agreements. When those agreements drift out of sync, even slightly, bugs appear in ways that are hard to trace. Ripley’s job is to surface those mismatches early and, when safe, correct them.

---

## What It Is Not

It is not a code generator.
It is not a refactoring engine.
It is not trying to be creative.

It is deliberately narrow in scope. It analyzes, validates, and cautiously fixes.

---

## Current State

Ripley is designed to work incrementally and safely. It favors correctness over speed and clarity over cleverness. The system is still evolving, especially around how fixes are selected and applied, but the core idea remains stable: understand first, act second.

---

## Using Ripley

Run it inside any project directory. It will scan the codebase, build its internal context, and begin analysis in batches. As it progresses, it updates its state and debug logs so the process can be resumed without losing information.

Fixes are applied only after sufficient context is gathered.

---

Ripley is built on the assumption that most systems do not fail because of one obvious error. They fail because small inconsistencies accumulate unnoticed. This tool exists to notice them.
