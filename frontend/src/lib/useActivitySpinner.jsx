/**
 * useActivitySpinner.js
 *
 * Provides a lightweight floating spinner that signals to the user that
 * a slow background operation is in progress (dragging, uploading, saving…).
 *
 * Usage
 * ─────
 *   const { startActivity, stopActivity, ActivitySpinner } = useActivitySpinner();
 *
 *   // Wrap slow operations:
 *   startActivity('Uploading PDF…');
 *   await uploadFile(file);
 *   stopActivity();
 *
 *   // Render somewhere near the top of your JSX:
 *   <ActivitySpinner />
 */

import { useState, useCallback, useRef } from 'react';

export function useActivitySpinner() {
  const [state, setState] = useState({ visible: false, label: '' });
  const timerRef = useRef(null);

  const startActivity = useCallback((label = '') => {
    clearTimeout(timerRef.current);
    setState({ visible: true, label });
  }, []);

  const stopActivity = useCallback((delayMs = 300) => {
    timerRef.current = setTimeout(() => setState({ visible: false, label: '' }), delayMs);
  }, []);

  const ActivitySpinner = useCallback(() => {
    if (!state.visible) return null;
    return (
      <div
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 8000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(15,23,42,0.88)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 40,
          padding: '8px 16px 8px 10px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
          animation: 'activityFadeIn 0.18s ease-out',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {/* Spinner ring */}
        <div style={{ position: 'relative', width: 20, height: 20, flexShrink: 0 }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2.5px solid rgba(255,255,255,0.12)',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2.5px solid transparent',
            borderTopColor: '#e8222c',
            borderRightColor: 'rgba(232,34,44,0.35)',
            animation: 'activitySpin 0.75s linear infinite',
          }} />
        </div>
        {state.label && (
          <span style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: 0.1,
            whiteSpace: 'nowrap',
          }}>
            {state.label}
          </span>
        )}
        <style>{`
          @keyframes activitySpin {
            to { transform: rotate(360deg); }
          }
          @keyframes activityFadeIn {
            from { opacity: 0; transform: translateY(6px) scale(0.96); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    );
  }, [state]);

  return { startActivity, stopActivity, ActivitySpinner };
}

/**
 * Tiny inline spinner element — drop it next to any async button.
 * Usage:  {loading && <InlineSpinner />}
 */
export function InlineSpinner({ size = 14, color = '#e8222c' }) {
  return (
    <span style={{ position: 'relative', display: 'inline-flex', width: size, height: size, flexShrink: 0 }}>
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid rgba(0,0,0,0.08)`,
      }} />
      <span style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `2px solid transparent`,
        borderTopColor: color,
        animation: 'activitySpin 0.75s linear infinite',
      }} />
      <style>{`@keyframes activitySpin { to { transform: rotate(360deg); } }`}</style>
    </span>
  );
}
