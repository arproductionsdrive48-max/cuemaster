/**
 * PWA Update Manager — detects service worker updates and notifies the user.
 *
 * Uses vite-plugin-pwa's `registerSW` with `registerType: "prompt"`:
 *  • On new SW detected → shows a toast with "Update available"
 *  • User clicks "Update" → calls updateSW() which activates the new SW + reloads
 *  • Also checks for updates periodically (every 60 minutes)
 */

import { registerSW } from 'virtual:pwa-register';
import { toast } from 'sonner';

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

export const initPWAUpdater = () => {
  updateSWFn = registerSW({
    // Called when a new service worker is available and waiting
    onNeedRefresh() {
      toast('🔄 New version available!', {
        id: 'pwa-update',
        duration: Infinity,
        action: {
          label: 'Update Now',
          onClick: () => {
            updateSWFn?.(true);
          },
        },
        description: 'Tap "Update Now" to get the latest features.',
      });
    },

    // Called when the SW has been registered (first install or cache updated)
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      // Check for updates every 60 minutes
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);

      console.log('[PWA] Service worker registered:', swUrl);
    },

    onRegisterError(error) {
      console.error('[PWA] SW registration error:', error);
    },

    // Called when the app is ready to work offline
    onOfflineReady() {
      console.log('[PWA] App ready for offline use');
    },
  });
};

/** Force check for SW updates now */
export const checkForUpdates = async () => {
  const registration = await navigator.serviceWorker?.getRegistration();
  if (registration) {
    await registration.update();
    console.log('[PWA] Manual update check triggered');
  }
};

/** Force activate waiting SW and reload */
export const forceUpdate = () => {
  updateSWFn?.(true);
};
