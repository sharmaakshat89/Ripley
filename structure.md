contract-debugger/
│
├── src/
│
│   ├── cli/
│   │   └── index.ts               # CLI entry
│
│   ├── orchestrator/
│   │   ├── runPipeline.ts         # main flow
│   │   ├── batchManager.ts        # 6–7 file batching
│   │   └── contextBuilder.ts      # builds LLM context
│
│   ├── scanner/
│   │   └── fileScanner.ts         # scans repo
│
│   ├── llm/
│   │   ├── client.ts              # OpenRouter wrapper
│   │   └── models.ts              # model config
│
│   ├── agents/
│   │   ├── contractExtractor.ts
│   │   ├── analyzer.ts
│   │   ├── fixer.ts
│   │   └── integrityChecker.ts
│
│   ├── state/
│   │   ├── stateManager.ts        # read/write JSON + MD
│   │   ├── debugWriter.ts         # writes SYSTEM_DEBUG.md
│   │   └── deferredManager.ts
│
│   ├── prompts/
│   │   ├── contractPrompt.ts
│   │   ├── analysisPrompt.ts
│   │   ├── fixPrompt.ts
│   │   └── integrityPrompt.ts
│
│   └── utils/
│       ├── logger.ts
│       └── fileUtils.ts
│
├── outputs/
│   ├── SYSTEM_DEBUG.md
│   ├── deferred.json
│   └── progress.json
│
├── config.json
├── package.json
└── tsconfig.json