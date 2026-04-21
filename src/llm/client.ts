import dotenv from 'dotenv';
import path from 'path';
import { EventEmitter } from 'events';
EventEmitter.defaultMaxListeners = 50;
dotenv.config({
  path: path.resolve(__dirname, '../../.env')
});

import axios from 'axios';
import { DEFAULT_MODEL } from './models';

// RATE LIMIT CONTROL
let lastCallTime = 0;

async function throttle() {
  const now = Date.now();
  const diff = now - lastCallTime;

  // ~2s spacing for MiniMax free tier
  const MIN_DELAY = 2000;

  if (diff < MIN_DELAY) {
    await new Promise(r => setTimeout(r, MIN_DELAY - diff));
  }

  lastCallTime = Date.now();
}


type LLMOptions = {
  model?: string;
  temperature?: number;
};

// 🔴 ADD THIS FUNCTION ABOVE callLLM
async function requestWithRetry(fn: () => Promise<any>, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const status = err?.response?.status;

      // 🔴 HANDLE RATE LIMIT
      if (status === 429) {
        console.log("Rate limited. Waiting 8 seconds...");
        await new Promise(r => setTimeout(r, 8000));
        continue;
      }

      // 🔴 HANDLE TEMPORARY FAILURES
      if (status === 524 || status === 502 || status === 503) {
        console.log(`Retrying LLM... (${i + 1})`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }

      throw err;
    }
  }

  throw new Error("LLM failed after retries");
}

export async function callLLM(prompt: string, options?: LLMOptions): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  //  REMOVEd THIS (too noisy now)
  // console.log("CALL_LLM KEY:", process.env.OPENROUTER_API_KEY?.slice(0, 12));

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  const model = "openai/gpt-oss-20b:free";
  const temperature = options?.temperature ?? 0;

  try {
    await throttle();
    //  REPLACE axios.post WITH THIS
    const response = await requestWithRetry(() =>
      axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
    );
    if (response.data?.error?.code === 524) {
      throw new Error("Provider timeout");
    }
    const content = response.data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("RAW RESPONSE:", JSON.stringify(response.data, null, 2));
      return "UNKNOWN";
    }

    return content;

  } catch (error) {
    //  ADD SAFE FALLBACK (don’t crash pipeline)
    console.error("LLM FINAL FAILURE:", error);
    return "UNKNOWN";
  }
}