/**
 * ServerWakeup.jsx
 *
 * Shows an attractive full-screen "Server is waking up" splash while the
 * Render (or similar) free-tier backend is cold-starting.
 *
 * Designed with a premium light theme (white & red) to match the DocSign website.
 */

import { useEffect, useRef, useState } from 'react';

const BACKEND_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
const POLL_INTERVAL_MS = 500;

export default function ServerWakeup({ children }) {
  const [status, setStatus] = useState('checking'); // 'checking' | 'sleeping' | 'success' | 'awake'
  const [showSplash, setShowSplash] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [dots, setDots] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const pollRef = useRef(null);
  const fadeOutTimeoutRef = useRef(null);
  const showSplashTimeoutRef = useRef(null);
  const startRef = useRef(Date.now());

  const ping = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(3500),
      });
      if (res.ok) return true;
    } catch { /* ignore */ }
    return false;
  };

  useEffect(() => {
    let destroyed = false;
    startRef.current = Date.now();

    // Show splash screen after 300ms if server is slow / sleeping
    showSplashTimeoutRef.current = setTimeout(() => {
      if (!destroyed) {
        setShowSplash(true);
        setStatus('sleeping');
      }
    }, 300);

    const poll = async () => {
      if (destroyed) return;
      const ok = await ping();
      if (destroyed) return;
      if (ok) {
        clearTimeout(showSplashTimeoutRef.current);
        const elapsed = Date.now() - startRef.current;
        const wasSplashShown = elapsed > 300;

        if (wasSplashShown) {
          if (elapsed > 1500) {
            // Woke up after waiting → show success state
            setStatus('success');
            fadeOutTimeoutRef.current = setTimeout(() => {
              if (!destroyed) {
                setFadeOut(true);
                fadeOutTimeoutRef.current = setTimeout(() => {
                  if (!destroyed) {
                    setStatus('awake');
                  }
                }, 400);
              }
            }, 2000);
          } else {
            // Splash was shown briefly → fade out directly
            setFadeOut(true);
            fadeOutTimeoutRef.current = setTimeout(() => {
              if (!destroyed) {
                setStatus('awake');
              }
            }, 400);
          }
        } else {
          // Splash was never shown → wake up instantly with zero UI impact
          setStatus('awake');
        }
      } else {
        setAttempt(a => a + 1);
        pollRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      destroyed = true;
      clearTimeout(pollRef.current);
      clearTimeout(fadeOutTimeoutRef.current);
      clearTimeout(showSplashTimeoutRef.current);
    };
  }, []);

  // Animated dots …
  useEffect(() => {
    if (status !== 'sleeping') return;
    const id = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, [status]);

  // Elapsed seconds counter
  useEffect(() => {
    if (status !== 'sleeping') return;
    const id = setInterval(() => setElapsedSec(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [status]);

  // ── Render ──
  const dotStr = '.'.repeat(dots);
  const shouldRenderChildren = status === 'awake' || fadeOut || (status === 'checking' && !showSplash);

  return (
    <>
      {shouldRenderChildren && children}
      {showSplash && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 0,
            opacity: fadeOut ? 0 : 1,
            transition: 'opacity 0.4s ease-out',
            pointerEvents: fadeOut ? 'none' : 'auto',
          }}
        >
          {/* Decorative blobs */}
          <div style={{
            position: 'absolute', width: 500, height: 500,
            borderRadius: '50%', top: -120, left: -120,
            background: 'radial-gradient(circle, rgba(232,34,44,0.04) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute', width: 400, height: 400,
            borderRadius: '50%', bottom: -80, right: -80,
            background: status === 'success'
              ? 'radial-gradient(circle, rgba(16,185,129,0.04) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(232,34,44,0.03) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Logo / Icon */}
          {status === 'success' ? (
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(16,185,129,0.25), 0 8px 10px -6px rgba(16,185,129,0.2)',
              marginBottom: 32, flexShrink: 0,
              animation: 'successPulse 2s ease-in-out infinite',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
                style={{
                  strokeDasharray: 50,
                  strokeDashoffset: 50,
                  animation: 'drawCheckmark 0.6s ease-in-out 0.2s forwards',
                }}
              >
                <polyline points="4 12 9 17 20 6" />
              </svg>
            </div>
          ) : (
            <div style={{
              width: 80, height: 80, borderRadius: 24,
              background: 'linear-gradient(135deg, #e8222c, #f43f5e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 25px -5px rgba(232,34,44,0.3), 0 8px 10px -6px rgba(232,34,44,0.2)',
              marginBottom: 32, flexShrink: 0,
              animation: 'serverPulse 2s ease-in-out infinite',
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"
                fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
          )}

          {/* Title */}
          <h1 style={{
            color: '#0f172a', fontSize: 28, fontWeight: 800,
            letterSpacing: -0.5, margin: 0, marginBottom: 10,
            fontFamily: 'Inter, sans-serif',
          }}>
            {status === 'success' ? 'Server is Live!' : 'DocSign'}
          </h1>

          {/* Status line */}
          {status === 'success' ? (
            <p style={{
              color: '#475569', fontSize: 15, margin: 0, marginBottom: 36,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              textAlign: 'center',
            }}>
              Thanks for waiting, we are redirecting you...
            </p>
          ) : (
            <p style={{
              color: '#475569', fontSize: 15, margin: 0, marginBottom: 36,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <span>Our server is waking up</span>
              <span style={{ display: 'inline-block', width: '20px', textAlign: 'left', marginLeft: '2px' }}>{dotStr}</span>
            </p>
          )}

          {/* Dynamic loading or success visual representation */}
          {status !== 'success' && (
            <>
              {/* Spinner ring */}
              <div style={{ position: 'relative', width: 56, height: 56, marginBottom: 32 }}>
                {/* Track */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '3px solid rgba(15,23,42,0.06)',
                }} />
                {/* Spinning arc */}
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: '#e8222c',
                  borderRightColor: 'rgba(232,34,44,0.3)',
                  animation: 'spin 0.9s linear infinite',
                }} />
              </div>

              {/* Progress dots */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 32 }}>
                {[0,1,2,3,4,5,6].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: i <= (attempt % 7) ? '#e8222c' : 'rgba(15,23,42,0.1)',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
            </>
          )}

          {/* Cards */}
          {status === 'success' ? (
            <div style={{
              background: 'rgba(240,253,250,0.85)',
              border: '1px solid rgba(16,185,129,0.18)',
              borderRadius: 16, padding: '20px 28px',
              maxWidth: 400, textAlign: 'center',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 10px 25px -5px rgba(16,185,129,0.05)',
              animation: 'successCardSlideIn 0.5s ease-out forwards',
            }}>
              <p style={{
                color: '#065f46', fontSize: 14, lineHeight: 1.7,
                margin: 0, fontFamily: 'Inter, sans-serif',
                fontWeight: 500,
              }}>
                Thanks for waiting! Our server is live now.
                <br />
                <span style={{ color: '#047857', fontSize: 13, fontWeight: 400 }}>
                  Enjoy secure, fast document signing.
                </span>
              </p>
            </div>
          ) : (
            <div style={{
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(15,23,42,0.08)',
              borderRadius: 16, padding: '20px 28px',
              maxWidth: 400, textAlign: 'center',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.03), 0 8px 10px -6px rgba(0,0,0,0.03)',
            }}>
              <p style={{
                color: '#334155', fontSize: 14, lineHeight: 1.7,
                margin: 0, fontFamily: 'Inter, sans-serif',
              }}>
                We're running on a free-tier server that sleeps during inactivity.
                <br />
                <span style={{ color: '#64748b', fontSize: 13 }}>
                  It usually wakes up in 30–60 seconds. We apologise for the wait!
                </span>
              </p>
            </div>
          )}

          {/* Elapsed time */}
          {status !== 'success' && elapsedSec >= 5 && (
            <p style={{
              marginTop: 20, color: '#64748b',
              fontSize: 12, fontFamily: 'Inter, sans-serif',
              fontWeight: 500,
            }}>
              Waiting {elapsedSec}s…
            </p>
          )}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes serverPulse {
          0%, 100% { box-shadow: 0 10px 25px -5px rgba(232,34,44,0.3); transform: scale(1); }
          50% { box-shadow: 0 15px 30px -5px rgba(232,34,44,0.45); transform: scale(1.04); }
        }
        @keyframes successPulse {
          0%, 100% { box-shadow: 0 10px 25px -5px rgba(16,185,129,0.25); transform: scale(1); }
          50% { box-shadow: 0 15px 30px -5px rgba(16,185,129,0.4); transform: scale(1.04); }
        }
        @keyframes drawCheckmark {
          to { stroke-dashoffset: 0; }
        }
        @keyframes successCardSlideIn {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
