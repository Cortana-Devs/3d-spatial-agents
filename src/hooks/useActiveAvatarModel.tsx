/**
 * useActiveAvatarModel.ts
 * -----------------------------------------------------------------------------
 * Purpose:
 *  Bridge the existing avatar selection store (male-default | female-c-girl)
 *  with runtime model asset paths and (optionally) the female avatar runtime
 *  system (lazy loaded) so UI / simulant systems can react immediately to
 *  selection changes without duplicating logic.
 *
 * What This Provides:
 *  - Hook `useActiveAvatarModel` returning:
 *      avatarId        -> current selected avatar id
 *      modelUrl        -> GLB path to feed into existing loaders
 *      isFemale        -> convenience boolean
 *      femaleRuntime   -> lazily created FemaleAvatarRuntime (or null)
 *      loading         -> runtime loading state (only relevant for female)
 *      error           -> load error (if any)
 *      ensureFemaleRuntime() -> imperative loader (Promise)
 *  - React Provider / Component `ActiveAvatarModelProvider` that can
 *    pre-initialize the female runtime when selected (optional) and provide
 *    it via context to deep consumers with `useFemaleRuntimeContext`.
 *  - Lightweight event resilience: automatically disposes female runtime
 *    when switching back to male avatar (to conserve memory).
 *
 * Integration Notes:
 *  - Existing simulant components that currently hardcode the male model path
 *    can replace that with this hook's `.modelUrl`.
 *  - For advanced female animation control, call `ensureFemaleRuntime()`
 *    before attempting to play animations.
 *
 * No External Side-Effects:
 *  - Safe for SSR (guards window / dynamic import usage).
 *  - Does not modify global avatar selection state—pure consumer.
 *
 * Future Extensions:
 *  - Could surface animation registry readiness (idle clip preloaded).
 *  - Could expose event counts from the avatar event bus.
 *  - Could unify male runtime once/if a symmetric runtime adapter exists.
 */

import * as React from 'react';
import {
  useAvatarSelection,
  type AvatarId,
} from '@/src/state/avatarSelectionStore';

/* -------------------------------------------------------------------------- */
/*                               Internal Types                               */
/* -------------------------------------------------------------------------- */

interface UseActiveAvatarModelOptions {
  /**
   * Automatically attempt to load the female runtime as soon as the
   * female avatar becomes active (default: false).
   */
  autoLoadFemaleRuntime?: boolean;
  /**
   * Dispose the female runtime when switching away to male
   * (default: true) to reclaim memory.
   */
  disposeOnMaleSwitch?: boolean;
  /**
   * Optional callback invoked after successful female runtime load.
   */
  onFemaleRuntimeReady?: (runtime: FemaleAvatarRuntimeLike) => void;
}

export interface ActiveAvatarModelState {
  avatarId: AvatarId;
  modelUrl: string;
  isFemale: boolean;
  femaleRuntime: FemaleAvatarRuntimeLike | null;
  loading: boolean;
  error: Error | null;
  /**
   * Imperative loader. Safe to call multiple times; resolves same promise.
   * Rejects if avatar is not currently female.
   */
  ensureFemaleRuntime: () => Promise<FemaleAvatarRuntimeLike>;
}

/**
 * Minimal subset of the FemaleAvatarRuntime public shape used here.
 * (Avoids tight compile-time coupling if file moves / refactors.)
 */
export interface FemaleAvatarRuntimeLike {
  id: AvatarId;
  load(): Promise<void>;
  play(animId: string, opts?: { fadeMs?: number; loopOverride?: boolean }): Promise<void>;
  stop(animId?: string): void;
  dispose(): void;
  isReady(): boolean;
  tick(deltaSeconds: number): void;
  debug(): {
    activeAnimation: string | null;
    loadedAnimations: string[];
    memoryEstimateKB?: number;
  };
}

/* -------------------------------------------------------------------------- */
/*                            Constants & Utilities                           */
/* -------------------------------------------------------------------------- */

const MALE_MODEL_URL = '/models/player-ready-player-me.glb';
const FEMALE_MODEL_URL = '/models/c-girl.glb';

function mapAvatarToModel(id: AvatarId): string {
  switch (id) {
    case 'female-c-girl':
      return FEMALE_MODEL_URL;
    case 'male-default':
    default:
      return MALE_MODEL_URL;
  }
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/* -------------------------------------------------------------------------- */
/*                              Runtime Loader API                            */
/* -------------------------------------------------------------------------- */

interface FemaleRuntimeController {
  instance: FemaleAvatarRuntimeLike | null;
  promise: Promise<FemaleAvatarRuntimeLike> | null;
}

function createFemaleRuntimeController(): FemaleRuntimeController {
  return {
    instance: null,
    promise: null,
  };
}

/**
 * Lazy dynamic import wrapper to avoid pulling female runtime code into
 * the initial bundle if not needed.
 */
async function importFemaleRuntimeFactory(): Promise<{
  createFemaleAvatarRuntime: (opts?: Record<string, unknown>) => FemaleAvatarRuntimeLike;
}> {
  // Dynamic import path kept literal for tree-shaking boundary
  return import('@/src/avatars/female/femaleRuntimeAdapter');
}

/* -------------------------------------------------------------------------- */
/*                           Core Hook Implementation                         */
/* -------------------------------------------------------------------------- */

export function useActiveAvatarModel(
  options: UseActiveAvatarModelOptions = {}
): ActiveAvatarModelState {
  const { autoLoadFemaleRuntime = false, disposeOnMaleSwitch = true, onFemaleRuntimeReady } = options;
  const selection = useAvatarSelection();
  const avatarId = selection.current;
  const isFemale = avatarId === 'female-c-girl';
  const modelUrl = mapAvatarToModel(avatarId);

  const runtimeCtrlRef = React.useRef<FemaleRuntimeController | null>(null);
  const [femaleRuntime, setFemaleRuntime] = React.useState<FemaleAvatarRuntimeLike | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  // Ensure controller
  if (!runtimeCtrlRef.current) {
    runtimeCtrlRef.current = createFemaleRuntimeController();
  }

  const disposeFemaleRuntime = React.useCallback(() => {
    const ctrl = runtimeCtrlRef.current;
    if (ctrl?.instance) {
      try {
        ctrl.instance.dispose();
      } catch {
        /* ignore */
      }
      ctrl.instance = null;
    }
    ctrl!.promise = null;
    setFemaleRuntime(null);
  }, []);

  const ensureFemaleRuntime = React.useCallback(async () => {
    if (!isFemale) {
      throw new Error('ensureFemaleRuntime(): current avatar is not female');
    }
    const ctrl = runtimeCtrlRef.current!;
    if (ctrl.instance) {
      return ctrl.instance;
    }
    if (ctrl.promise) {
      return ctrl.promise;
    }
    if (!isBrowser()) {
      throw new Error('Female runtime cannot be loaded during SSR');
    }

    setLoading(true);
    setError(null);

    ctrl.promise = (async () => {
      try {
        const mod = await importFemaleRuntimeFactory();
        const inst = mod.createFemaleAvatarRuntime({ blendMs: 250, enableMetrics: true });
        await inst.load();
        ctrl.instance = inst;
        setFemaleRuntime(inst);
        onFemaleRuntimeReady?.(inst);
        return inst;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        // Reset so subsequent calls can retry
        ctrl.instance = null;
        throw e;
      } finally {
        setLoading(false);
        ctrl.promise = null;
      }
    })();

    return ctrl.promise;
  }, [isFemale, onFemaleRuntimeReady]);

  // Auto-load female runtime when switching to female (if enabled)
  React.useEffect(() => {
    if (isFemale && autoLoadFemaleRuntime) {
      // Fire and forget; errors stored in state
      void ensureFemaleRuntime();
    }
  }, [isFemale, autoLoadFemaleRuntime, ensureFemaleRuntime]);

  // Dispose runtime if switching back to male
  React.useEffect(() => {
    if (!isFemale && disposeOnMaleSwitch) {
      disposeFemaleRuntime();
    }
  }, [isFemale, disposeOnMaleSwitch, disposeFemaleRuntime]);

  // Cleanup on unmount
  React.useEffect(
    () => () => {
      disposeFemaleRuntime();
    },
    [disposeFemaleRuntime]
  );

  return {
    avatarId,
    modelUrl,
    isFemale,
    femaleRuntime,
    loading,
    error,
    ensureFemaleRuntime,
  };
}

/* -------------------------------------------------------------------------- */
/*                              Context Provider                              */
/* -------------------------------------------------------------------------- */

interface ActiveAvatarModelContextValue extends ActiveAvatarModelState {}

const ActiveAvatarModelContext = React.createContext<ActiveAvatarModelContextValue | null>(null);

export interface ActiveAvatarModelProviderProps
  extends UseActiveAvatarModelOptions {
  children: React.ReactNode;
}

/**
 * Provider component which wires the hook into context so deep children
 * (e.g. animation controllers) can consume the current runtime/model
 * without prop-drilling.
 */
export function ActiveAvatarModelProvider({
  children,
  ...opts
}: ActiveAvatarModelProviderProps): JSX.Element {
  const state = useActiveAvatarModel(opts);
  return (
    <ActiveAvatarModelContext.Provider value={state}>
      {children}
    </ActiveAvatarModelContext.Provider>
  );
}

/**
 * Context consumer hook. Throws if used outside provider to surface integration mistakes.
 */
export function useFemaleRuntimeContext(): ActiveAvatarModelContextValue {
  const ctx = React.useContext(ActiveAvatarModelContext);
  if (!ctx) {
    throw new Error('useFemaleRuntimeContext must be used within <ActiveAvatarModelProvider>');
  }
  return ctx;
}

/* -------------------------------------------------------------------------- */
/*                        Convenience Loader Component                        */
/* -------------------------------------------------------------------------- */

interface FemaleRuntimeGateProps {
  /**
   * Render prop / children invoked once female runtime is ready (or immediately
   * if current avatar is male—gate only applies to female assets).
   */
  children: (state: {
    ready: boolean;
    avatarId: AvatarId;
    modelUrl: string;
    isFemale: boolean;
    femaleRuntime: FemaleAvatarRuntimeLike | null;
    loading: boolean;
    error: Error | null;
    ensureFemaleRuntime: () => Promise<FemaleAvatarRuntimeLike>;
  }) => React.ReactNode;
  /**
   * If true, will call ensureFemaleRuntime automatically on mount
   * when the female avatar is active. (Defaults to true here for
   * convenience—override by passing false.)
   */
  autoLoad?: boolean;
  /**
   * Optional fallback while loading female runtime.
   */
  fallback?: React.ReactNode;
  /**
   * Optional error UI override.
   */
  errorUI?: (error: Error) => React.ReactNode;
}

export function FemaleRuntimeGate({
  children,
  autoLoad = true,
  fallback = null,
  errorUI,
}: FemaleRuntimeGateProps): JSX.Element {
  const state = useActiveAvatarModel({ autoLoadFemaleRuntime: autoLoad });

  React.useEffect(() => {
    if (autoLoad && state.isFemale && !state.femaleRuntime && !state.loading && !state.error) {
      void state.ensureFemaleRuntime();
    }
  }, [autoLoad, state]);

  if (state.error && errorUI) {
    return <>{errorUI(state.error)}</>;
  }

  if (state.isFemale && state.loading && !state.femaleRuntime) {
    return <>{fallback}</>;
  }

  return <>{children({ ready: !state.isFemale || !!state.femaleRuntime, ...state })}</>;
}

/* -------------------------------------------------------------------------- */
/*                               Dev Diagnostics                              */
/* -------------------------------------------------------------------------- */

/**
 * Minimal global dev helper (optional). Attach only in development.
 */
declare const window: (Window & { __avatarHookDebug?: () => unknown }) | undefined;

if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.__avatarHookDebug = () => {
    return {
      maleModel: MALE_MODEL_URL,
      femaleModel: FEMALE_MODEL_URL,
      note: 'Call useActiveAvatarModel() within a React component to inspect live state.',
    };
  };
}

/* -------------------------------------------------------------------------- */
/*                                    EOF                                     */
/* -------------------------------------------------------------------------- */
