import { useState, useEffect, useCallback } from 'react'
import { sdk } from '@farcaster/miniapp-sdk'

interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
}

interface FarcasterClient {
  added?: boolean
}

interface FarcasterContext {
  user?: FarcasterUser
  client?: FarcasterClient
}

interface FarcasterState {
  isSDKLoaded: boolean
  isInMiniApp: boolean
  context: FarcasterContext | null
  error: string | null
}

export function useFarcaster() {
  const [state, setState] = useState<FarcasterState>({
    isSDKLoaded: false,
    isInMiniApp: false,
    context: null,
    error: null,
  })

  useEffect(() => {
    const initSDK = async () => {
      try {
        // Check if we're in a Mini App context
        const inMiniApp = await sdk.isInMiniApp()
        
        if (inMiniApp) {
          // Get context (user info, client info, etc.) - now returns a Promise
          const context = await sdk.context
          
          setState({
            isSDKLoaded: true,
            isInMiniApp: true,
            context: context as FarcasterContext,
            error: null,
          })
        } else {
          // Not in Mini App - could be testing in browser
          setState({
            isSDKLoaded: true,
            isInMiniApp: false,
            context: null,
            error: null,
          })
        }
      } catch (err) {
        console.error('Failed to initialize Farcaster SDK:', err)
        setState(prev => ({
          ...prev,
          isSDKLoaded: true,
          error: err instanceof Error ? err.message : 'Failed to initialize SDK',
        }))
      }
    }

    initSDK()
  }, [])

  // Call this when your app UI is ready to display
  const ready = useCallback(async () => {
    if (state.isInMiniApp) {
      try {
        await sdk.actions.ready()
      } catch (err) {
        console.error('Failed to call ready:', err)
      }
    }
  }, [state.isInMiniApp])

  // Prompt user to add the Mini App
  const addMiniApp = useCallback(async () => {
    if (!state.isInMiniApp) return
    try {
      await sdk.actions.addMiniApp()
    } catch (err) {
      console.error('Failed to add Mini App:', err)
    }
  }, [state.isInMiniApp])

  // Open cast composer with share content
  const composeCast = useCallback(async (text: string, embedUrl?: string) => {
    if (!state.isInMiniApp) {
      // Fallback for browser testing - open Warpcast intent
      const url = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}${embedUrl ? `&embeds[]=${encodeURIComponent(embedUrl)}` : ''}`
      window.open(url, '_blank')
      return
    }
    
    try {
      await sdk.actions.composeCast({
        text,
        embeds: embedUrl ? [embedUrl] : undefined,
      })
    } catch (err) {
      console.error('Failed to compose cast:', err)
    }
  }, [state.isInMiniApp])

  // View a Farcaster profile
  const viewProfile = useCallback(async (fid: number) => {
    if (!state.isInMiniApp) return
    try {
      await sdk.actions.viewProfile({ fid })
    } catch (err) {
      console.error('Failed to view profile:', err)
    }
  }, [state.isInMiniApp])

  // Close the Mini App
  const close = useCallback(async () => {
    if (!state.isInMiniApp) return
    try {
      await sdk.actions.close()
    } catch (err) {
      console.error('Failed to close:', err)
    }
  }, [state.isInMiniApp])

  return {
    ...state,
    ready,
    addMiniApp,
    composeCast,
    viewProfile,
    close,
    // Expose user info directly for convenience
    user: state.context?.user ?? null,
    clientAdded: state.context?.client?.added ?? false,
  }
}
