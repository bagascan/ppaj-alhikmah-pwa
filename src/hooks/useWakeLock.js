import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * A custom React hook to request and manage a screen wake lock.
 * It prevents the screen from dimming or locking automatically.
 * This hook is designed to be stable and avoid infinite loops.
 */
const useWakeLock = () => {
  const [isSupported, setIsSupported] = useState(false);
  const wakeLockRef = useRef(null);

  useEffect(() => {
    setIsSupported('wakeLock' in navigator);
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) {
      console.warn('Screen Wake Lock API is not supported in this browser.');
      return;
    }
    // Prevent acquiring a new lock if one is already held
    if (wakeLockRef.current) {
      return;
    }
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => {
        console.log('Screen Wake Lock was released by the system.');
        wakeLockRef.current = null;
      });
      console.log('Screen Wake Lock is active.');
    } catch (err) {
      console.error(`Wake Lock request failed: ${err.name}, ${err.message}`);
      wakeLockRef.current = null;
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Screen Wake Lock released programmatically.');
      } catch (err) {
        console.error(`Wake Lock release failed: ${err.name}, ${err.message}`);
      }
    }
  }, []);

  useEffect(() => {
    requestWakeLock();
    return () => {
      releaseWakeLock();
    };
  }, [requestWakeLock, releaseWakeLock]);

  // We no longer return 'isLocked' as its state changes are what caused the loop.
  // The core functionality remains.
  return { isSupported };
};

export default useWakeLock;