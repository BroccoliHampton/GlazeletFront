import { useState, useEffect, useCallback } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

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
      // Timeout to prevent hanging on mobile
      const timeoutMs = 3000;
      const timeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) => 
            setTimeout(() => reject(new Error('SDK timeout')), ms)
          )
        ]);
      };

      try {
        // Race against timeout - mobile Warpcast can hang here
        const inMiniApp = await timeout(sdk.isInMiniApp(), timeoutMs);
        
        if (inMiniApp) {
          // Get context with timeout protection
          const context = await timeout(sdk.context, timeoutMs);
          
          setState({
            isSDKLoaded: true,
            isInMiniApp: true,
            user: context?.user ?? null,
            clientAdded: context?.client?.added ?? false,
            error: null,
          });
        } else {
          // Not in Mini App - browser testing
          setState({
            isSDKLoaded: true,
            isInMiniApp: false,
            user: null,
            clientAdded: false,
            error: null,
          });
        }
      } catch (err) {
        console.error('Failed to initialize Farcaster SDK:', err);
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
  // No longer depends on state to avoid stale closure issues
  const ready = useCallback(async (options?: { disableNativeGestures?: boolean }) => {
    try {
      await sdk.actions.ready(options);
    } catch (err) {
      console.error('Failed to call ready:', err);
    }
  }, []);

  // Prompt user to add the Mini App
  const addMiniApp = useCallback(async () => {
    if (!state.isInMiniApp) return;
    try {
      await sdk.actions.addMiniApp();
    } catch (err) {
      console.error('Failed to add Mini App:', err);
    }
  }, [state.isInMiniApp]);

  // Open cast composer with share content
  const composeCast = useCallback(async (text: string, embedUrl?: string) => {
    if (!state.isInMiniApp) {
      // Fallback for browser testing - open Warpcast intent
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${embedUrl ? `&embeds[]=${encodeURIComponent(embedUrl)}` : ''}`;
      window.open(url, '_blank');
      return;
    }
    
    try {
      await sdk.actions.composeCast({
        text,
        embeds: embedUrl ? [embedUrl] : undefined,
      });
    } catch (err) {
      console.error('Failed to compose cast:', err);
    }
  }, [state.isInMiniApp]);

  // View a Farcaster profile
  const viewProfile = useCallback(async (fid: number) => {
    if (!state.isInMiniApp) return;
    try {
      await sdk.actions.viewProfile({ fid });
    } catch (err) {
      console.error('Failed to view profile:', err);
    }
  }, [state.isInMiniApp]);

  // Close the Mini App
  const close = useCallback(async () => {
    if (!state.isInMiniApp) return;
    try {
      await sdk.actions.close();
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
