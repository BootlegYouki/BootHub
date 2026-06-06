/**
 * AnimationLock — Global "Do Not Disturb" system.
 *
 * Two complementary tools:
 *  - `isLocked()` — synchronous ref check for handlers (zero re-renders)
 *  - `locked`     — reactive boolean for UI binding (e.g. editable={!locked})
 *
 * When a photo zoom starts, call lock(ms).
 * Every handler and every text input watches this same central sign.
 */

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

interface AnimationLockContextValue {
  /** Reactive boolean — bind directly to UI props like editable={!locked}. */
  locked: boolean;
  /** Synchronous ref check for use inside handlers. Zero re-render cost. */
  isLocked: () => boolean;
  /** Engage the lock. Auto-releases after durationMs (default 700ms). */
  lock: (durationMs?: number) => void;
  /** Immediately release the lock. */
  unlock: () => void;
}

const AnimationLockContext = createContext<AnimationLockContextValue>({
  locked: false,
  isLocked: () => false,
  lock: () => {},
  unlock: () => {},
});

export const AnimationLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locked, setLocked] = useState(false);
  const lockedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback((durationMs = 700) => {
    lockedRef.current = true;
    setLocked(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      lockedRef.current = false;
      setLocked(false);
    }, durationMs);
  }, []);

  const unlock = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    lockedRef.current = false;
    setLocked(false);
  }, []);

  const isLocked = useCallback(() => lockedRef.current, []);

  return (
    <AnimationLockContext.Provider value={{ locked, isLocked, lock, unlock }}>
      {children}
    </AnimationLockContext.Provider>
  );
};

export const useAnimationLock = () => useContext(AnimationLockContext);
