---
description: Run Ripley debugger with Speckit memory integration
argument-hint: 
tools:
  bash: true
---

<objective>
Run the core Ripley debugging pipeline, enhanced with Speckit memory integration.
</objective>

<process>
## 1. Execute Ripley

```bash
npx ts-node src/cli/index.ts
```

## 2. Check Results

Review the output in `outputs/issues.json`.
</process>
