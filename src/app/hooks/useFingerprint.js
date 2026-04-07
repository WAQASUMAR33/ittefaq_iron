'use client';

import { useState, useRef, useCallback } from 'react';
import {
  isFingerprintAvailable,
  isFingerprintRegistered,
  registerFingerprint,
  verifyFingerprint,
} from '../utils/fingerprint';

export function useFingerprint() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('setup'); // 'setup' | 'error'
  const [errorMsg, setErrorMsg] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const resolveRef = useRef(null);

  // Call this before any save action. Returns Promise<boolean>.
  const requireFingerprint = useCallback(async () => {
    if (typeof window === 'undefined') return true;

    const available = await isFingerprintAvailable();
    if (!available) {
      setErrorMsg('No fingerprint sensor available on this device/browser.');
      setDialogMode('error');
      setDialogOpen(true);
      return false;
    }

    if (!isFingerprintRegistered()) {
      // Open setup dialog and wait for user decision
      return new Promise((resolve) => {
        resolveRef.current = resolve;
        setDialogMode('setup');
        setDialogOpen(true);
      });
    }

    // Credential already registered — verify directly (browser shows native UI)
    try {
      const ok = await verifyFingerprint();
      return ok;
    } catch (e) {
      const msg =
        e.name === 'NotAllowedError'
          ? 'Fingerprint not recognized or authentication was cancelled.'
          : 'Fingerprint authentication failed: ' + e.message;
      setErrorMsg(msg);
      setDialogMode('error');
      setDialogOpen(true);
      return false;
    }
  }, []);

  // Called when user taps "Set Up Fingerprint" in the setup dialog
  const handleFpSetup = useCallback(async () => {
    setFpLoading(true);
    try {
      await registerFingerprint();
      const ok = await verifyFingerprint();
      setDialogOpen(false);
      if (resolveRef.current) {
        resolveRef.current(ok);
        resolveRef.current = null;
      }
    } catch (e) {
      const msg =
        e.name === 'NotAllowedError'
          ? 'Setup cancelled. Please try again.'
          : 'Fingerprint setup failed: ' + e.message;
      setErrorMsg(msg);
      setDialogMode('error');
    }
    setFpLoading(false);
  }, []);

  // Called on Cancel or Close
  const handleFpCancel = useCallback(() => {
    setDialogOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
      resolveRef.current = null;
    }
  }, []);

  return {
    requireFingerprint,
    fpDialogOpen: dialogOpen,
    fpDialogMode: dialogMode,
    fpErrorMsg: errorMsg,
    fpLoading,
    handleFpSetup,
    handleFpCancel,
  };
}
