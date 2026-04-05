---
"@ai-hero/sandcastle": patch
---

Use `.mts` extension for scaffolded main file to fix ESM resolution in projects without `"type": "module"` in package.json. When the project's package.json has `"type": "module"`, the file is scaffolded as `main.ts` instead.
