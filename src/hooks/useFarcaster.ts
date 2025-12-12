import { useState, useEffect, useCallback } from 'react'

interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface FarcasterState {
  isSDKLoaded: boolean
  isInMiniApp: boolean
  user: FarcasterUser | null
  clientAdded: boolean
  error: string | null
}

// SDK instance - loaded dynamically
let sdkInstance: any = null;

export function useFarcaster() {
  const [state, setState] = useState<FarcasterState>({
    isSDKLoaded: false,
    isInMiniApp: false,
    user: null,
    clientAdded: false,
    error: null,
  })

  useEffect(() => {
    const initSDK = async () => {
      // Timeout helper
      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('SDK timeout')), ms)
          )
        ]);
      };

      try {
        // Dynamically import the SDK to prevent crashes on import
        console.log('[Farcaster] Loading SDK...');
        const module = await withTimeout(
          import('@farcaster/miniapp-sdk'),
          3000
        );
        sdkInstance = module.sdk;
        console.log('[Farcaster] SDK loaded');

        // Check if we're in a Mini App context
        console.log('[Farcaster] Checking miniapp context...');
        const inMiniApp = await withTimeout(sdkInstance.isInMiniApp(), 3000);
        console.log('[Farcaster] In miniapp:', inMiniApp);
        
        if (inMiniApp) {
          // Get context with timeout protection
          console.log('[Farcaster] Getting context...');
          const context = await withTimeout(sdkInstance.context, 3000);
          console.log('[Farcaster] Context received:', context?.user?.username);
          
          setState({
            isSDKLoaded: true,
            isInMiniApp: true,
            user: context?.user ?? null,
            clientAdded: context?.client?.added ?? false,
            error: null,
          });
        } else {
          // Not in Mini App - browser testing
          console.log('[Farcaster] Not in miniapp, browser mode');
          setState({
            isSDKLoaded: true,
            isInMiniApp: false,
            user: null,
            clientAdded: false,
            error: null,
          });
        }
      } catch (err) {
        console.error('[Farcaster] SDK init failed:', err);
        // IMPORTANT: Still mark as loaded so app renders even on error
        setState({
          isSDKLoaded: true,
          isInMiniApp: false,
          user: null,
          clientAdded: false,
          error: err instanceof Error ? err.message : 'Failed to initialize SDK',
        });
      }
    };

    initSDK();
  }, []);

  // Call this when your app UI is ready to display
  const ready = useCallback(async (options?: { disableNativeGestures?: boolean }) => {
    if (!sdkInstance) {
      console.warn('[Farcaster] SDK not loaded, skipping ready()');
      return;
    }
    try {
      console.log('[Farcaster] Calling ready()...');
      await sdkInstance.actions.ready(options);
      console.log('[Farcaster] ready() complete');
    } catch (err) {
      console.error('[Farcaster] ready() failed:', err);
    }
  }, []);

  // Prompt user to add the Mini App
  const addMiniApp = useCallback(async () => {
    if (!state.isInMiniApp || !sdkInstance) return;
    try {
      await sdkInstance.actions.addMiniApp();
    } catch (err) {
      console.error('Failed to add Mini App:', err);
    }
  }, [state.isInMiniApp]);

  // Open cast composer with share content
  const composeCast = useCallback(async (text: string, embedUrl?: string) => {
    if (!state.isInMiniApp || !sdkInstance) {
      // Fallback for browser testing - open Warpcast intent
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${embedUrl ? `&embeds[]=${encodeURIComponent(embedUrl)}` : ''}`;
      window.open(url, '_blank');
      return;
    }
    
    try {
      await sdkInstance.actions.composeCast({
        text,
        embeds: embedUrl ? [embedUrl] : undefined,
      });
    } catch (err) {
      console.error('Failed to compose cast:', err);
    }
  }, [state.isInMiniApp]);

  // View a Farcaster profile
  const viewProfile = useCallback(async (fid: number) => {
    if (!state.isInMiniApp || !sdkInstance) return;
    try {
      await sdkInstance.actions.viewProfile({ fid });
    } catch (err) {
      console.error('Failed to view profile:', err);
    }
  }, [state.isInMiniApp]);

  // Close the Mini App
  const close = useCallback(async () => {
    if (!state.isInMiniApp || !sdkInstance) return;
    try {
      await sdkInstance.actions.close();
    } catch (err) {
      console.error('Failed to close:', err);
    }
  }, [state.isInMiniApp]);

  return {
    ...state,
    ready,
    addMiniApp,
    composeCast,
    viewProfile,
    close,
  };
}
