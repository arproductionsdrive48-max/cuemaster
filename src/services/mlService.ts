import { generateNicknames, generateTournamentSuggestions, generateCommentary } from './smartGenerator';

type ProgressInfo = {
  status: 'init' | 'downloading' | 'done' | 'progress' | 'generating' | string;
  progress?: number;
  file?: string;
};

type MLTask = 'nicknames' | 'tournament' | 'commentary' | 'generic';

class MLService {
  public isWorkerAvailable = true;

  constructor() {}

  /** Dummy subscription to prevent UI crashes */
  public onProgress(callback: (info: ProgressInfo) => void): () => void {
    return () => {};
  }

  /** Instantly resolves since the engine is lightweight */
  public async forceDownloadModel(): Promise<string> {
    if (typeof window !== 'undefined') {
      localStorage.setItem('snookos_ai_model_ready', 'true');
    }
    return 'Instant engine ready';
  }

  /** 
   * Instantly generate smart content using the offline combinatorial engine.
   * Completely bypasses heavy WebAssembly downloads for maximum speed on mobile.
   */
  public async generateText(
    systemPrompt: string,
    userMessage: string,
    maxNewTokens = 80,
    task: MLTask = 'generic',
    context?: { name?: string; format?: string; players?: string; tableNum?: string | number; winner?: string }
  ): Promise<string> {
    
    // Tiny artificial delay to give users visual feedback that it "processed"
    await new Promise(resolve => setTimeout(resolve, 600));

    switch (task) {
      case 'nicknames':
        return generateNicknames(context?.name ?? 'Player').join(', ');
      case 'tournament':
        return generateTournamentSuggestions(context?.format ?? 'Snooker').map(t => t.name).join(', ');
      case 'commentary':
        const pList = context?.players ? context.players.split(' & ') : ['Player 1', 'Player 2'];
        return generateCommentary(pList, context?.tableNum as number, context?.winner);
      default:
        // Generic fallback
        return `Highlight: A fantastic session on Table ${context?.tableNum ?? 'X'}! Great snooker played today.`;
    }
  }
}

export const mlService = new MLService();
