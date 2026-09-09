import React, { useEffect, useRef, useState } from 'react';
import { Barcode, CheckCircle, Radio, Sparkles } from 'lucide-react';

interface ScannerFocusTrapProps {
  onScan: (code: string) => void;
  lastScannedCode: string | null;
  onOpenSimulator: () => void;
}

export const ScannerFocusTrap: React.FC<ScannerFocusTrapProps> = ({
  onScan,
  lastScannedCode,
  onOpenSimulator
}) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const [pulse, setPulse] = useState<boolean>(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in standard text inputs/textareas, unless it's a dedicated scanner field
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      const now = Date.now();
      const interval = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Enter indicates end of barcode
      if (e.key === 'Enter') {
        const barcode = bufferRef.current.trim();
        bufferRef.current = '';

        if (barcode.length >= 3) {
          // If rapid input or barcode format detected
          onScan(barcode);
          setPulse(true);
          setTimeout(() => setPulse(false), 1200);
        }
        return;
      }

      // Ignore special modifier keys
      if (e.key.length > 1) return;

      // If characters are typed quickly (< 65ms between keystrokes), it's characteristic of a barcode scanner
      if (interval < 65 || bufferRef.current.length === 0) {
        bufferRef.current += e.key;
      } else {
        // Human typing slowly outside inputs resets the buffer
        bufferRef.current = e.key;
      }

      // Clear buffer after 300ms of inactivity
      setTimeout(() => {
        if (Date.now() - lastKeyTimeRef.current > 250) {
          bufferRef.current = '';
        }
      }, 300);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);

  // Headless background listener, no bottom bar
  return null;
};
