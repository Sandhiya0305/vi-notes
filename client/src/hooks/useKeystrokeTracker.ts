import type React from 'react';
import { useMemo, useRef, useState } from 'react';
import type { EditEvent, KeystrokeEvent, KeyCategory, PasteEvent } from '../types';

interface TrackerState {
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
}

export interface KeystrokeTracker {
  keystrokes: KeystrokeEvent[];
  pastes: PasteEvent[];
  edits: EditEvent[];
  sessionDurationMs: number;
  isTracking: boolean;
  handleFocus: () => void;
  handleBlur: () => void;
  handleKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
  handlePaste: (event: React.ClipboardEvent<HTMLElement>) => void;
  handleInput: (nextContent: string, inputType?: string | null) => void;
  reset: () => void;
}

const initialState: TrackerState = {
  keystrokes: [],
  pastes: [],
  edits: [],
  sessionDurationMs: 0,
};

function getKeyCategory(key: string): KeyCategory {
  const safeKey = typeof key === 'string' ? key : '';
  if (/^[a-z]$/i.test(safeKey)) {
    return 'alpha';
  }
  if (/^[0-9]$/.test(safeKey)) {
    return 'numeric';
  }
  if (safeKey === ' ' || safeKey === 'Tab') {
    return 'whitespace';
  }
  if (['Backspace', 'Delete'].includes(safeKey)) {
    return 'delete';
  }
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(safeKey)) {
    return 'navigation';
  }
  if (['Shift', 'Control', 'Alt', 'Meta'].includes(safeKey)) {
    return 'modifier';
  }
  if (/^[.,!?;:'"()[\]{}-]$/.test(safeKey)) {
    return 'punctuation';
  }
  return 'special';
}

export default function useKeystrokeTracker(): KeystrokeTracker {
  const [state, setState] = useState<TrackerState>(initialState);
  const [isTracking, setIsTracking] = useState(false);

  const lastKeyTimestampRef = useRef<number | null>(null);
  const sessionStartedAtRef = useRef<number | null>(null);
  const pausedDurationRef = useRef(0);
  const blurStartedAtRef = useRef<number | null>(null);
  const previousContentRef = useRef('');

  const updateDuration = (now = Date.now()) => {
    if (!sessionStartedAtRef.current) {
      return 0;
    }

    const activeDuration = now - sessionStartedAtRef.current - pausedDurationRef.current;
    return Math.max(activeDuration, 0);
  };

  const handleFocus = () => {
    const now = Date.now();

    if (!sessionStartedAtRef.current) {
      sessionStartedAtRef.current = now;
    }

    if (blurStartedAtRef.current) {
      pausedDurationRef.current += now - blurStartedAtRef.current;
      blurStartedAtRef.current = null;
    }

    setIsTracking(true);
    setState((current) => ({
      ...current,
      sessionDurationMs: updateDuration(now),
    }));
  };

  const handleBlur = () => {
    blurStartedAtRef.current = Date.now();
    setIsTracking(false);
    setState((current) => ({
      ...current,
      sessionDurationMs: updateDuration(),
    }));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!isTracking) {
      return;
    }

    const now = Date.now();
    const intervalMs = lastKeyTimestampRef.current ? now - lastKeyTimestampRef.current : 0;
    lastKeyTimestampRef.current = now;
    const safeKey = typeof event?.key === 'string' ? event.key : '';

    const keystroke: KeystrokeEvent = {
      timestamp: now,
      key: safeKey,
      keyCategory: getKeyCategory(safeKey),
      intervalMs,
      documentLength: previousContentRef.current.length,
    };

    setState((current) => ({
      ...current,
      keystrokes: [...current.keystrokes, keystroke],
      sessionDurationMs: updateDuration(now),
    }));
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLElement>) => {
    if (!isTracking) {
      return;
    }

    const now = Date.now();
    const insertedText = event.clipboardData?.getData('text') ?? '';
    const paste: PasteEvent = {
      timestamp: now,
      insertedText,
      insertedLength: insertedText.length,
      documentLength: previousContentRef.current.length + insertedText.length,
    };

    setState((current) => ({
      ...current,
      pastes: [...current.pastes, paste],
      sessionDurationMs: updateDuration(now),
    }));
  };

  const handleInput = (nextContent: string, inputType?: string | null) => {
    const safeContent = typeof nextContent === 'string' ? nextContent : '';
    const previousContent = previousContentRef.current;
    previousContentRef.current = safeContent;

    if (!isTracking) {
      setState((current) => ({
        ...current,
        sessionDurationMs: updateDuration(),
      }));
      return;
    }

    const now = Date.now();
    const delta = safeContent.length - previousContent.length;
    let edit: EditEvent | null = null;

    if (inputType?.startsWith('delete') || delta < 0) {
      edit = {
        timestamp: now,
        type: 'delete',
        delta: Math.abs(delta || 1),
        documentLength: safeContent.length,
      };
    } else if (inputType === 'insertFromPaste') {
      edit = {
        timestamp: now,
        type: 'replace',
        delta: Math.max(delta, 0),
        documentLength: safeContent.length,
      };
    } else if (delta > 1) {
      edit = {
        timestamp: now,
        type: 'replace',
        delta,
        documentLength: safeContent.length,
      };
    } else if (delta === 1) {
      edit = {
        timestamp: now,
        type: 'insert',
        delta,
        documentLength: safeContent.length,
      };
    }

    setState((current) => ({
      ...current,
      edits: edit ? [...current.edits, edit] : current.edits,
      sessionDurationMs: updateDuration(now),
    }));
  };

  const reset = () => {
    lastKeyTimestampRef.current = null;
    sessionStartedAtRef.current = null;
    pausedDurationRef.current = 0;
    blurStartedAtRef.current = null;
    previousContentRef.current = '';
    setIsTracking(false);
    setState(initialState);
  };

  return useMemo(
    () => ({
      ...state,
      isTracking,
      handleFocus,
      handleBlur,
      handleKeyDown,
      handlePaste,
      handleInput,
      reset,
    }),
    [isTracking, state]
  );
}
