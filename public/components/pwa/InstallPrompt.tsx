import { useState } from 'react';
import { Download, Share, Plus } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Exported so MoreSheet can trigger install
export const triggerInstall = (() => {
  let _deferredPrompt: BeforeInstallPromptEvent | null = null;
  let _showIOSGuide: (() => void) | null = null;
  let _showFallbackGuide: (() => void) | null = null;

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      _deferredPrompt = e as BeforeInstallPromptEvent;
    });
  }

  return {
    setIOSGuideCallback: (cb: () => void) => { _showIOSGuide = cb; },
    setFallbackGuideCallback: (cb: () => void) => { _showFallbackGuide = cb; },
    trigger: async () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        _showIOSGuide?.();
        return;
      }
      if (_deferredPrompt) {
        _deferredPrompt.prompt();
        await _deferredPrompt.userChoice;
        _deferredPrompt = null;
      } else {
        // No deferred prompt available — show fallback instructions
        _showFallbackGuide?.();
      }
    },
  };
})();

const InstallPrompt = () => {
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showFallbackGuide, setShowFallbackGuide] = useState(false);

  // Register callbacks
  triggerInstall.setIOSGuideCallback(() => setShowIOSGuide(true));
  triggerInstall.setFallbackGuideCallback(() => setShowFallbackGuide(true));

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;

  if (isStandalone) return null;

  return (
    <>
      {/* iOS Guidance Overlay */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="glass-card p-6 max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--gold))]/20 flex items-center justify-center mx-auto">
              <Download className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Install CueMaster</h2>
              <p className="text-sm text-muted-foreground">Follow these steps to add the app to your home screen:</p>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Share className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Step 1</p>
                  <p className="text-xs text-muted-foreground">Tap the <strong>Share</strong> button in Safari's toolbar</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))]/20 flex items-center justify-center flex-shrink-0">
                  <Plus className="w-4 h-4 text-[hsl(var(--gold))]" />
                </div>
                <div>
                  <p className="font-medium text-sm">Step 2</p>
                  <p className="text-xs text-muted-foreground">Scroll down and tap <strong>"Add to Home Screen"</strong></p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-available/20 flex items-center justify-center flex-shrink-0">
                  <Download className="w-4 h-4 text-available" />
                </div>
                <div>
                  <p className="font-medium text-sm">Step 3</p>
                  <p className="text-xs text-muted-foreground">Tap <strong>"Add"</strong> to confirm</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Android / Desktop Fallback Guide */}
      {showFallbackGuide && (
        <div className="fixed inset-0 z-[90] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6">
          <div className="glass-card p-6 max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--gold))]/20 flex items-center justify-center mx-auto">
              <Download className="w-8 h-8 text-[hsl(var(--gold))]" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">Install Snook OS</h2>
              <p className="text-sm text-muted-foreground">To install this app on your device:</p>
            </div>

            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Open in Chrome</p>
                  <p className="text-xs text-muted-foreground">Make sure you're using <strong>Chrome</strong> or <strong>Edge</strong></p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-[hsl(var(--gold))]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-[hsl(var(--gold))]">2</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Tap Menu (⋮)</p>
                  <p className="text-xs text-muted-foreground">Tap the <strong>three-dot menu</strong> in the top-right</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30">
                <div className="w-8 h-8 rounded-lg bg-available/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-available">3</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Install App</p>
                  <p className="text-xs text-muted-foreground">Select <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowFallbackGuide(false)}
              className="w-full py-3 rounded-xl bg-secondary text-foreground font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default InstallPrompt;
