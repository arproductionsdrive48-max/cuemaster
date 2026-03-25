// mlService.ts – Bridges the React UI ↔ mlWorker.ts Web Worker.
//
// Design goals:
//   1. Run all heavy inference off the main thread (Web Worker).
//   2. Cache the model permanently in the browser (IndexedDB via Transformers.js).
//   3. Expose a progress callback so the UI can show a download bar.
//   4. Never crash silently — always propagate errors with human-readable messages.
//   5. If the AI worker is unavailable, fall back to deterministic template-based
//      generation so the feature remains functional in every environment.

type ProgressInfo = {
  status: 'init' | 'downloading' | 'done' | string;
  progress?: number;
  file?: string;
};

type MLTask = 'nicknames' | 'tournament' | 'commentary' | 'generic';

// ── Deterministic Fallback Templates ────────────────────────────────────────
// These run instantly if the AI model is unavailable (no internet, download
// failure, WASM blocked, etc.). They are still contextually appropriate.

export function fallbackNicknames(name: string): string[] {
  const parts = name.trim().split(' ');
  const first  = parts[0];
  const last   = parts.length > 1 ? parts[parts.length - 1] : '';
  const initials = parts.map(p => p[0]).join('').toUpperCase();

  return [
    `${first} The Rocket`,
    `${first} 147`,
    `CueMaster ${last || first}`,
    `${initials} The Sniper`,
    `${first} The Magician`,
  ].slice(0, 5);
}

export function fallbackTournamentNames(format: string): string[] {
  return [
    `${format} Winter Cup`,
    `CueWarriors ${format} Open`,
    `The ${format} Invitational`,
    `147 ${format} Challenge`,
    `${format} Masters Trophy`,
  ];
}

export function fallbackCommentary(players: string, tableNum?: number | string, winner?: string): string {
  const tbl = tableNum ? ` on Table ${tableNum}` : '';
  const winText = winner ? `${winner} took the victory` : `${players} put on a show`;
  
  const templates = [
    // Hype/Energetic
    `\uD83D\uDD25 ${winner ? winner + ' just dominated' : players + ' turned up the heat'}${tbl}! An absolute masterclass in snooker today!`,
    `Unbelievable scenes! ${winner ? winner + ' triumphs' : players + ' tearing it up'}${tbl} with some clinical finishing! \uD83D\uDE80`,
    `Pure magic from ${winner ? winner : players}${tbl}! ${winner ? 'The champion of the table!' : 'What a performance!'} \u2728`,
    `Boom! ${winner || players} dominated the green${tbl} today. Top-tier cue action! \uD83C\uDFB1`,
    
    // Professional/Direct
    `Clinical performance by ${winner || players}${tbl}. ${winner ? winner + ' wins the session.' : 'A solid display of tactical snooker.'}`,
    `Match report: ${players} showed great skill${tbl}, but ${winner ? winner + ' emerged victorious!' : 'it was a session to remember.'}`,
    `A high-quality encounter between ${players}${tbl}. ${winner ? winner + ' takes the win.' : 'Precision at its finest.'}`,
    
    // Short/Punchy
    `${winner || players} = 147 energy! \uD83D\uDD25`,
    `${winner ? winner + ' wins' : 'Game over'}${tbl}! Total clearance vibes!`,
    `${winner || players} owned the table today. \uD83C\uDDEE\uD83C\uDDF3`,
    `Snooker at its best: ${winner ? winner + ' is the winner!' : players + ' on fire!'}`,
    
    // Narrative/Atmospheric
    `The crowd went wild! ${winner ? winner + ' secured the win' : players + ' putting on a show'}${tbl}.`,
    `Cool, calm, and collected. ${winner ? winner + ' navigated the final reds' : players + ' played'} like a pro to win.`,
    `Late night drama${tbl}! ${winner ? winner + ' clinches the victory' : players + ' delivered a nail-biting performance.'}`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

// ── MLService Class ──────────────────────────────────────────────────────────

class MLService {
  private worker: Worker | null = null;
  private pendingCallbacks: Map<string, (res: { status: string; result?: string; error?: string }) => void> = new Map();
  private progressListeners: Set<(info: ProgressInfo) => void> = new Set();
  public isWorkerAvailable = false;
  private workerErrorMsg: string = '';

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (typeof window === 'undefined' || !window.Worker) {
      this.workerErrorMsg = 'window.Worker not found in environment.';
      console.warn('[mlService]', this.workerErrorMsg);
      return;
    }

    try {
      this.worker = new Worker(new URL('../workers/mlWorker.ts', import.meta.url), { type: 'module' });
      this.isWorkerAvailable = true;
      this.workerErrorMsg = '';

      this.worker.addEventListener('message', (e: MessageEvent) => {
        const { id, status, result, error, progress } = e.data;

        if (status === 'init' || status === 'downloading' || status === 'progress') {
          // Broadcast progress to all listeners
          this.progressListeners.forEach(cb => cb(progress || e.data));
          return;
        }

        const resolve = this.pendingCallbacks.get(id);
        if (resolve) {
          resolve({ status, result, error });
          this.pendingCallbacks.delete(id);
        }
      });

      this.worker.addEventListener('error', (e: ErrorEvent) => {
        console.error('[mlService] Unhandled worker script error:', e.message);
        this.isWorkerAvailable = false;
        this.workerErrorMsg = e.message || 'Worker script crashed.';
        // Reject all pending
        this.pendingCallbacks.forEach((resolve) => {
          resolve({ status: 'error', error: e.message || 'Worker crashed.' });
        });
        this.pendingCallbacks.clear();
      });

    } catch (err: any) {
      this.workerErrorMsg = err.message || 'Failed to instantiate Worker class.';
      console.error('[mlService] Failed to create worker:', this.workerErrorMsg);
      this.isWorkerAvailable = false;
    }
  }

  /** Subscribe to model download progress. Returns an unsubscribe function. */
  public onProgress(callback: (info: ProgressInfo) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  public async forceDownloadModel(): Promise<string> {
    // If worker was disabled (due to previous failure), forcibly reconstruct it
    if (!this.worker || !this.isWorkerAvailable) {
      console.log('[mlService] Forcibly reconstructing worker...');
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      this.initWorker();
    }

    if (!this.worker || !this.isWorkerAvailable) {
      throw new Error(`Worker spawn failed. Reason: ${this.workerErrorMsg || 'Browser rejected the Web Worker.'}`);
    }

    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-download`;
      
      const timeout = setTimeout(() => {
        this.pendingCallbacks.delete(id);
        reject(new Error('Force download timed out after 3 minutes.'));
      }, 180_000);

      this.pendingCallbacks.set(id, (res) => {
        clearTimeout(timeout);
        if (res.status === 'error') {
          console.error('[mlService] Manual force download failed:', res.error);
          this.isWorkerAvailable = false; // Mark unavailable again so next retry will respawn
          this.workerErrorMsg = res.error || 'Worker download crash';
          reject(new Error(res.error ?? 'Unknown error during AI model download.'));
        } else {
          resolve(res.result ?? 'Downloaded');
        }
      });
      this.worker!.postMessage({ id, type: 'force_download' });
    });
  }

  /** 
   * Generate text using the local LLM.
   * Falls back to deterministic templates if the worker fails or is unavailable.
   */
  public async generateText(
    systemPrompt: string,
    userMessage: string,
    maxNewTokens = 80,
    task: MLTask = 'generic',
    context?: { name?: string; format?: string; players?: string; tableNum?: string | number; winner?: string }
  ): Promise<string> {
    // ── Attempt AI Worker ────────────────────────────────────────────────────
    if (this.worker && this.isWorkerAvailable) {
      try {
        const result = await this._dispatchToWorker(systemPrompt, userMessage, maxNewTokens);
        if (result && result.trim().length > 3) {
          return result;
        }
        console.warn('[mlService] Worker returned empty result, using fallback.');
      } catch (err: any) {
        console.warn('[mlService] Worker failed, using fallback:', err.message);
        // Mark worker as unavailable for this session so we skip it next time
        this.isWorkerAvailable = false;
      }
    }

    // ── Deterministic Fallback ───────────────────────────────────────────────
    console.log('[mlService] Using template fallback for task:', task);
    switch (task) {
      case 'nicknames':
        return fallbackNicknames(context?.name ?? 'Player').join(', ');
      case 'tournament':
        return fallbackTournamentNames(context?.format ?? 'Snooker').join(', ');
      case 'commentary':
        return fallbackCommentary(context?.players ?? 'The players', context?.tableNum, context?.winner);
      default:
        return 'Smart suggestion unavailable. Please try again.';
    }
  }

  private _dispatchToWorker(
    systemPrompt: string,
    userMessage: string,
    maxNewTokens: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const timeout = setTimeout(() => {
        this.pendingCallbacks.delete(id);
        reject(new Error('Worker timed out after 120 seconds.'));
      }, 120_000);

      this.pendingCallbacks.set(id, (res) => {
        clearTimeout(timeout);
        if (res.status === 'error') {
          reject(new Error(res.error ?? 'Worker returned an error.'));
        } else {
          resolve(res.result ?? '');
        }
      });

      this.worker!.postMessage({ id, type: 'generate', systemPrompt, userMessage, maxNewTokens });
    });
  }
}

export const mlService = new MLService();
