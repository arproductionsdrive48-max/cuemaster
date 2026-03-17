import { useState, useEffect } from 'react';
import { Wand2, Download, CheckCircle2, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { mlService } from '@/services/mlService';
import { toast } from 'sonner';

type ModelStatus = 'unknown' | 'downloading' | 'ready' | 'error';

const AIStatusCard = () => {
  const [status, setStatus] = useState<ModelStatus>('unknown');
  const [progress, setProgress] = useState(0);
  const [progressFile, setProgressFile] = useState('');
  const [isTriggering, setIsTriggering] = useState(false);

  // Check if model is cached in IndexedDB on mount
  useEffect(() => {
    checkCacheStatus();
  }, []);

  const checkCacheStatus = async () => {
    try {
      // Transformers.js stores models in the browser's Cache Storage
      const cacheNames = await caches.keys();
      const transformersCache = cacheNames.find(n => n.includes('transformers') || n.includes('huggingface'));
      if (transformersCache) {
        const cache = await caches.open(transformersCache);
        const keys = await cache.keys();
        // If there are cached model files, mark as ready
        if (keys.length > 0) {
          setStatus('ready');
          return;
        }
      }
      setStatus('unknown');
    } catch {
      setStatus('unknown');
    }
  };

  const handleDownload = async () => {
    if (isTriggering) return;
    setIsTriggering(true);
    setStatus('downloading');
    setProgress(0);

    const unsubscribe = mlService.onProgress((info: any) => {
      if (info?.status === 'progress' || info?.status === 'downloading' || info?.status === 'init') {
        if (typeof info.progress === 'number') {
          setProgress(Math.round(info.progress));
        }
        if (info.file) setProgressFile(info.file);
      }
      if (info?.status === 'done') {
        setStatus('ready');
        setIsTriggering(false);
        unsubscribe();
        toast.success('✅ AI Smart Features are ready!');
      }
    });

    try {
      // Trigger model load by sending a dummy generation
      await mlService.generateText(
        'Reply OK only.',
        'OK',
        1,
        'generic'
      );
      setStatus('ready');
      toast.success('✅ AI Smart Features are ready!');
    } catch (err: any) {
      console.error('[AIStatusCard] Download failed:', err.message);
      setStatus('error');
      toast.error('Model download failed. Check your internet connection and try again.');
    } finally {
      setIsTriggering(false);
      unsubscribe();
    }
  };

  const handleClear = async () => {
    try {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        if (name.includes('transformers') || name.includes('huggingface')) {
          await caches.delete(name);
        }
      }
      setStatus('unknown');
      toast.success('AI model cache cleared.');
    } catch {
      toast.error('Failed to clear cache.');
    }
  };

  return (
    <div className="rounded-2xl bg-[#121212] border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/5">
        <div className="w-9 h-9 rounded-xl bg-[hsl(var(--gold))]/10 flex items-center justify-center">
          <Wand2 className="w-5 h-5 text-[hsl(var(--gold))]" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">AI Smart Features</p>
          <p className="text-xs text-gray-500">Nicknames · Tournaments · Commentary</p>
        </div>
        {/* Status Badge */}
        {status === 'ready' && (
          <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-400/10 border border-emerald-400/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </span>
        )}
        {status === 'unknown' && (
          <span className="flex items-center gap-1 text-xs text-gray-400 font-semibold bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            Not Downloaded
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1 text-xs text-red-400 font-semibold bg-red-400/10 border border-red-400/20 px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" /> Error
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {status === 'unknown' && (
          <>
            <p className="text-xs text-gray-400 leading-relaxed">
              The AI model hasn't been downloaded yet. After a <strong className="text-white">one-time ~300 MB download</strong>, all smart suggestions will run instantly and <strong className="text-white">100% offline</strong> forever.
            </p>
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] font-bold flex items-center justify-center gap-2 hover:bg-[hsl(var(--gold))]/20 transition-all text-sm"
            >
              <Download className="w-4 h-4" />
              Download AI Model (~300 MB)
            </button>
          </>
        )}

        {status === 'downloading' && (
          <>
            <div className="flex items-center gap-2 text-sm text-[hsl(var(--gold))]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="font-semibold">Downloading... {progress > 0 ? `${progress}%` : ''}</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-[hsl(var(--gold))] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {progressFile && (
              <p className="text-xs text-gray-500 truncate">Fetching: {progressFile.split('/').pop()}</p>
            )}
            <p className="text-xs text-gray-500">Do not close this tab. This happens only once.</p>
          </>
        )}

        {status === 'ready' && (
          <>
            <p className="text-xs text-gray-400 leading-relaxed">
              The AI model is cached on this device. Smart features (Nickname Suggestions, Tournament Names, Match Commentary) are available offline.
            </p>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear AI model cache
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <p className="text-xs text-red-400">Download failed. Please check your internet connection and try again.</p>
            <button
              onClick={handleDownload}
              className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold flex items-center justify-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" /> Retry Download
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default AIStatusCard;
