import * as fs from 'fs';
import * as path from 'path';
import { callLLM } from '../llm/client';

export async function extractContracts(files: string[]): Promise<void> {
  const OUTPUT_PATH = path.join(process.cwd(), 'outputs', 'contracts.json');
  
  const filesToRead = files.slice(0, 15);
  let concatenatedContent = '';

  for (const file of filesToRead) {
    try {
      const stat = fs.statSync(file);
      if (stat.size > 50 * 1024) {
        continue;
      }
      const content = fs.readFileSync(file, 'utf-8');
      concatenatedContent += `\n--- File: ${file} ---\n${content}\n`;
    } catch (err) {
      // Ignore read errors
    }
  }

  const prompt = `You are a strict static analyzer.
Do not guess. Do not hallucinate.
Only use information explicitly present.

TASK:
Extract global contracts from the code.

Return STRICT JSON:

{
"apis": [
{ "method": "", "path": "", "input": "", "output": "" }
],
"functions": [
{ "name": "", "params": "", "returns": "" }
],
"env": ["VAR_NAME"],
"models": [
{ "name": "", "fields": [] }
]
}

If unknown → empty string or empty array.
Do NOT add explanations.

CODE:
${concatenatedContent}`;

  try {
    const response = await callLLM(prompt);
    
    let jsonStr = response;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const contracts = JSON.parse(jsonStr);
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(contracts, null, 2), 'utf-8');
  } catch (err) {
    const emptyContracts = {
      apis: [],
      functions: [],
      env: [],
      models: []
    };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(emptyContracts, null, 2), 'utf-8');
  }
}
