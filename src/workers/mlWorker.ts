// mlWorker.ts – Runs @huggingface/transformers fully inside a Web Worker
// This keeps the main thread unblocked during the heavy model download/inference.

import { pipeline, env } from '@huggingface/transformers';

// ── Environment Configuration ──────────────────────────────────────────────
// Disable local model loading (we always fetch from HF Hub → cached in IndexedDB).
env.allowLocalModels = false;
// caches API is only available in Secure Contexts (localhost or HTTPS).
// If accessing via local network IP (e.g. 192.168.x.x), it will be disabled.
env.useBrowserCache = typeof caches !== 'undefined';

// Point ONNX Runtime Web to a reliable CDN so Vite's dev server never needs
// to serve the .wasm binaries (avoids 404s from the Vite rewrite layer).
// We let Transformers.js use its default CDN for the exact version it needs.
// env.backends.onnx.wasm.wasmPaths = ...

// ── Pipeline Singleton ─────────────────────────────────────────────────────
// Keeps the model in memory after the first load so subsequent calls are fast.
let generatorInstance: any = null;
const MODEL_NAME = 'Xenova/Qwen1.5-0.5B-Chat';

async function getGenerator(progressCallback: (info: any) => void) {
  if (!generatorInstance) {
    console.log('[mlWorker] Loading model:', MODEL_NAME);
    generatorInstance = await pipeline('text-generation', MODEL_NAME, {
      progress_callback: progressCallback,
      dtype: 'q4',           // 4-bit quantized – much smaller download
    });
    console.log('[mlWorker] Model loaded successfully.');
  }
  return generatorInstance;
}

// ── Message Handler ────────────────────────────────────────────────────────
self.addEventListener('message', async (event: MessageEvent) => {
  const { id, type, systemPrompt, userMessage, maxNewTokens = 80 } = event.data;

  if (type === 'force_download') {
    try {
      console.log('[mlWorker] Force download requested...');
      // Start init progress
      self.postMessage({ id, status: 'init', progress: { status: 'init', progress: 0 } });
      const generator = await getGenerator((progress: any) => {
        console.log('[mlWorker] Download progress:', progress?.status, progress?.progress);
        self.postMessage({ id, status: 'progress', progress });
      });
      self.postMessage({ id, status: 'complete', result: 'Model downloaded successfully.' });
    } catch (err: any) {
      console.error('[mlWorker] Force download failed with exact error:', err);
      self.postMessage({ id, status: 'error', error: err?.message || String(err) });
    }
    return;
  }

  if (type !== 'generate') return;

  try {
    // Send initializing status
    self.postMessage({ id, status: 'init', progress: { status: 'init', progress: 0 } });

    const generator = await getGenerator((progress: any) => {
      self.postMessage({ id, status: 'progress', progress });
    });

    self.postMessage({ id, status: 'generating' });

    // Build the Qwen chat-style prompt
    const promptText =
      `<|im_start|>system\n${systemPrompt}<|im_end|>\n` +
      `<|im_start|>user\n${userMessage}<|im_end|>\n` +
      `<|im_start|>assistant\n`;

    const output = await generator(promptText, {
      max_new_tokens:   maxNewTokens,
      temperature:       0.2, // Low temperature for factual text
      do_sample:         true,
      repetition_penalty: 1.15,
      return_full_text:  false,
    });

    let generatedText: string = output[0]?.generated_text ?? '';

    // Strip the prompt header so only the assistant reply remains
    const cleanOutput = generatedText.split('assistant\n').pop() || generatedText;
    generatedText = cleanOutput.trim();

    // Also strip any trailing <|im_end|> tokens
    generatedText = generatedText.replace(/<\|im_end\|>.*/s, '').trim();

    self.postMessage({ id, status: 'complete', result: generatedText });

  } catch (error: any) {
    const msg =
      error?.message ??
      (typeof error === 'string' ? error : JSON.stringify(error)) ??
      'Unknown worker error';

    console.error('[mlWorker] Pipeline error:', msg, error);
    self.postMessage({ id, status: 'error', error: msg });
  }
});
