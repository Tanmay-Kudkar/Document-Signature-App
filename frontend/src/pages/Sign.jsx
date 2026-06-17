import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  validateSignatureToken as validateTokenApi,
  signWithToken as signTokenApi,
  getDocumentPreviewUrl,
} from '../lib/documents';
import { Document, Page } from 'react-pdf';
import SignatureCanvas from '../components/SignatureCanvas';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

/* ── Signature font styles for the Type tab ── */
const SIG_FONTS = [
  { id: 'greatvibes',  label: 'Great Vibes',   cls: 'font-greatvibes',  size: 32 },
  { id: 'dancing',     label: 'Dancing Script', cls: 'font-dancing',     size: 28 },
  { id: 'sacramento',  label: 'Sacramento',     cls: 'font-sacramento',  size: 32 },
  { id: 'pacifico',    label: 'Pacifico',       cls: 'font-pacifico',    size: 22 },
  { id: 'pinyon',      label: 'Pinyon Script',  cls: 'font-pinyon',      size: 30 },
];

/* ── Inline icons ── */
const ChevLeft  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>;
const ChevRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>;
const XIcon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>;
const CheckIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>;

export default function Sign() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [signature, setSignature]   = useState(null);
  const [docData, setDocData]       = useState(null);

  /* PDF viewer */
  const pdfWrapperRef = useRef(null);
  const [pageWidth, setPageWidth]   = useState(640);
  const [numPages, setNumPages]     = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  /* Signing state */
  const [signing, setSigning]       = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  /* Signature details modal */
  const [showModal, setShowModal]   = useState(false);
  const [modalTab, setModalTab]     = useState('type'); // type | draw | upload
  const [name, setName]             = useState('');
  const [initials, setInitials]     = useState('');
  const [selectedFont, setSelectedFont] = useState('greatvibes');
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);

  /* Flow: skip selection — Sign page is always accessed via a share token */
  const [flowStep, setFlowStep]     = useState('editor');

  /* ── Load & validate token ── */
  useEffect(() => {
    if (!token) { setError('No token provided.'); setLoading(false); return; }
    const load = async () => {
      try {
        setLoading(true);
        const data = await validateTokenApi(token);
        setSignature(data.signature);
        setDocData(data.document);
      } catch (err) {
        setError(err.message || 'Invalid or expired token');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  /* ── Resize observer ── */
  useEffect(() => {
    if (!pdfWrapperRef.current || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(([entry]) => {
      setPageWidth(Math.min(Math.max(280, Math.floor(entry.contentRect.width - 48)), 880));
    });
    obs.observe(pdfWrapperRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Sign ── */
  const handleSign = async () => {
    if (!token) return;
    try {
      setSigning(true);
      await signTokenApi(token, {
        signerName: name || undefined,
        signatureImage: capturedImage || undefined,
      });
      setSignSuccess(true);
      const data = await validateTokenApi(token);
      setSignature(data.signature);
      setDocData(data.document);
    } catch (err) {
      alert(err.message || 'Unable to sign document');
    } finally {
      setSigning(false);
    }
  };

  /* ── Apply from modal ── */
  const handleApply = () => {
    if (modalTab === 'draw' && canvasRef.current) {
      const img = canvasRef.current.getImageDataUrl();
      setCapturedImage(img || null);
    } else if (modalTab === 'type') {
      setCapturedImage(null); // use text/font mode
    } else {
      setCapturedImage(null);
    }
    setShowModal(false);
  };

  /* ── Update initials from name ── */
  useEffect(() => {
    if (name && !initials) {
      const parts = name.trim().split(' ');
      setInitials(parts.map(p => p[0]).join('').toUpperCase().slice(0, 4));
    }
  }, [name]);

  /* ── Loading ── */
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 rounded-full border-[#e8222c] border-t-transparent" style={{ animation: 'spin 0.8s linear infinite' }} />
        <p className="text-gray-500 text-sm font-medium">Loading document...</p>
      </div>
    </div>
  );

  /* ── Error ── */
  if (error) return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border p-8 text-center">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <XIcon />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-500 mb-6 text-sm">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-[#e8222c] text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 transition text-sm">
          Go home
        </Link>
      </div>
    </div>
  );

  /* ── Success screen ── */
  if (signSuccess || signature?.status === 'signed') return (
    <div className="fixed inset-0 flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)' }}>
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-2xl border p-10 text-center">
        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow">
          <CheckIcon />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-2">Document Signed!</h2>
        <p className="text-gray-500 text-sm mb-2">
          <strong>{docData?.original_name || docData?.originalName}</strong> has been signed.
        </p>
        <p className="text-xs text-gray-400 mb-8">The document owner can now download the signed version.</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-2xl font-black hover:bg-green-700 transition shadow text-sm">
          <CheckIcon /> Done
        </Link>
      </div>
    </div>
  );

  /* ── "Who will sign?" selection modal ── */
  if (flowStep === 'selection') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Blurred bg — show editor behind */}
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(4px)' }} />

        <div
          className="relative w-full bg-white rounded-2xl overflow-hidden animate-fade-in"
          style={{ maxWidth: 640, boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}
        >
          {/* Title */}
          <div className="px-10 pt-10 pb-6 text-center">
            <h2 className="font-bold text-gray-900" style={{ fontSize: 26 }}>Who will sign this document?</h2>
          </div>

          {/* Two cards */}
          <div className="flex gap-4 px-8 pb-6">
            {/* Only me */}
            <div
              className="flex-1 flex flex-col items-center rounded-xl border border-gray-200 p-8 cursor-pointer hover:border-[#e8222c] hover:shadow-md transition"
              style={{ background: '#fafafa' }}
              onClick={() => setFlowStep('editor')}
            >
              <div
                className="flex items-center justify-center mb-6 rounded-2xl"
                style={{ width: 140, height: 130, background: '#dce8f5' }}
              >
                <svg viewBox="0 0 90 90" width="90" height="90" fill="none">
                  {/* Document */}
                  <rect x="18" y="8" width="54" height="70" rx="5" fill="white" stroke="#c3d9ef" strokeWidth="2"/>
                  <line x1="28" y1="24" x2="62" y2="24" stroke="#c3d9ef" strokeWidth="2"/>
                  <line x1="28" y1="34" x2="62" y2="34" stroke="#c3d9ef" strokeWidth="2"/>
                  <line x1="28" y1="44" x2="50" y2="44" stroke="#c3d9ef" strokeWidth="2"/>
                  {/* Hand + pen */}
                  <ellipse cx="58" cy="72" rx="16" ry="10" fill="#3d5a9a" opacity="0.85"/>
                  <rect x="48" y="52" width="6" height="22" rx="3" fill="#3d5a9a" transform="rotate(-20 51 63)"/>
                  <rect x="50" y="50" width="4" height="5" rx="1" fill="#f0c040" transform="rotate(-20 52 53)"/>
                  {/* Signature line */}
                  <path d="M26 62 Q34 54 42 60 Q48 52 56 58" stroke="#4a7fc1" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>
              <button
                className="w-4/5 text-white font-bold rounded-lg py-3 mb-2 hover:opacity-90 transition"
                style={{ background: '#e8222c', fontSize: 15 }}
              >
                Only me
              </button>
              <p className="text-sm text-gray-500">Sign this document</p>
            </div>

            {/* Several people */}
            <div
              className="flex-1 flex flex-col items-center rounded-xl border border-gray-200 p-8 cursor-pointer hover:border-[#e8222c] hover:shadow-md transition"
              style={{ background: '#fafafa' }}
              onClick={() => setFlowStep('editor')}
            >
              <div
                className="flex items-center justify-center mb-6 rounded-full"
                style={{ width: 140, height: 130, background: '#e8f5f0' }}
              >
                <svg viewBox="0 0 90 90" width="90" height="90" fill="none">
                  <circle cx="45" cy="14" r="9" fill="#4a7fc1"/>
                  <ellipse cx="45" cy="30" rx="13" ry="9" fill="#4a7fc1"/>
                  <circle cx="16" cy="40" r="8" fill="#e8702a"/>
                  <ellipse cx="16" cy="55" rx="12" ry="8" fill="#e8702a"/>
                  <circle cx="74" cy="40" r="8" fill="#50b383"/>
                  <ellipse cx="74" cy="55" rx="12" ry="8" fill="#50b383"/>
                  <circle cx="45" cy="68" r="8" fill="#9b59b6"/>
                  <ellipse cx="45" cy="82" rx="12" ry="8" fill="#9b59b6"/>
                  <circle cx="45" cy="45" r="18" fill="#d4ebe2" opacity="0.5"/>
                  <rect x="39" y="38" width="12" height="14" rx="2" fill="white" stroke="#b8d4c8" strokeWidth="1"/>
                  <line x1="42" y1="42" x2="48" y2="42" stroke="#b8d4c8" strokeWidth="1"/>
                  <line x1="42" y1="46" x2="48" y2="46" stroke="#b8d4c8" strokeWidth="1"/>
                </svg>
              </div>
              <button
                className="w-4/5 text-white font-bold rounded-lg py-3 mb-2 hover:opacity-90 transition"
                style={{ background: '#e8222c', fontSize: 15 }}
              >
                Several people
              </button>
              <p className="text-sm text-gray-500">Invite others to sign</p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-10 py-4 text-center">
            <p className="text-sm text-gray-600">
              Uploaded documents:{' '}
              <span className="font-bold text-gray-900">{docData?.original_name || docData?.originalName}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main 3-panel editor (ilovepdf style) ── */
  const pdfFileSource = docData
    ? { url: `${getDocumentPreviewUrl(docData.id)}?token=${encodeURIComponent(token)}` }
    : null;

  const currentFont = SIG_FONTS.find(f => f.id === selectedFont) || SIG_FONTS[0];

  return (
    <>
      <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: '#f0f1f5', overflow: 'hidden' }}>

        {/* ── Toolbar ── */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 border-b border-gray-200 bg-white"
          style={{ height: 48 }}
        >
          {/* Page controls */}
          <div className="flex items-center bg-gray-100 rounded" style={{ height: 30 }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage <= 1}
              className="px-2 h-full flex items-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 rounded-l transition">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 3l5 6H1z"/></svg>
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(numPages, p+1))} disabled={currentPage >= numPages}
              className="px-2 h-full flex items-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 rounded-r transition">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 9L1 3h10z"/></svg>
            </button>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-700 border border-gray-200 rounded px-2 py-0.5 bg-white">
            <span className="font-bold">{currentPage}</span>
            <span className="text-gray-400">/</span>
            <span>{numPages || 1}</span>
          </div>

          <div className="h-5 w-px bg-gray-200 mx-1" />

          {/* Filename */}
          <span className="text-sm font-medium text-gray-600 truncate max-w-xs">
            {docData?.original_name || docData?.originalName || 'Document'}
          </span>

          <div className="flex-1" />

          {/* Signature ready indicator */}
          {capturedImage && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1 text-xs font-bold text-green-700">
              <CheckIcon /> Signature ready
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">

          {/* ── LEFT: Page thumbnails ── */}
          <aside className="hidden lg:flex shrink-0 flex-col overflow-y-auto custom-scrollbar bg-white border-r border-gray-200 p-3 gap-3" style={{ width: 148 }}>
            {numPages > 0 && pdfFileSource && Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
              <button key={pg} onClick={() => setCurrentPage(pg)}
                className={`flex flex-col items-center gap-1 group`}>
                <div className={`border-2 rounded overflow-hidden transition ${currentPage === pg ? 'border-[#e8222c] shadow-md' : 'border-gray-200 group-hover:border-gray-400'}`} style={{ width: 108 }}>
                  <Document file={pdfFileSource} loading={<div style={{ width: 108, height: 136, background: '#f3f4f6' }} />}>
                    <Page pageNumber={pg} width={108} renderAnnotationLayer={false} renderTextLayer={false} />
                  </Document>
                </div>
                <span className={`text-[10px] font-bold ${currentPage === pg ? 'text-[#e8222c]' : 'text-gray-400'}`}>{pg}</span>
              </button>
            ))}
          </aside>

          {/* ── CENTER: PDF canvas ── */}
          <main
            ref={pdfWrapperRef}
            className="flex-1 overflow-auto custom-scrollbar flex justify-center items-start"
            style={{ background: '#f0f1f5', padding: 32 }}
          >
            <div className="relative" style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.18)' }}>
              {pdfFileSource && (
                <Document
                  file={pdfFileSource}
                  onLoadSuccess={({ numPages: n }) => { setNumPages(n); setCurrentPage(1); }}
                  loading={
                    <div style={{ width: pageWidth, height: 400, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div className="w-6 h-6 border-4 border-[#e8222c] border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
                    </div>
                  }
                >
                  <Page pageNumber={currentPage} width={pageWidth} renderAnnotationLayer renderTextLayer />
                </Document>
              )}

              {/* Signature overlay on PDF */}
              {signature && (signature.page_number ?? signature.pageNumber) === currentPage && (
                <div
                  className="absolute z-20 group"
                  style={{ left: `${signature.x}%`, top: `${signature.y}%`, transform: 'translate(-50%, -50%)' }}
                >
                  <div
                    className="flex items-center justify-center rounded"
                    style={{
                      background: '#ebf2fb',
                      border: '1.5px dashed #4a7fc1',
                      minWidth: 140,
                      minHeight: 52,
                      padding: '6px 12px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setShowModal(true)}
                  >
                    {capturedImage ? (
                      <img src={capturedImage} alt="Signature" style={{ maxHeight: 40, maxWidth: 160, objectFit: 'contain' }} />
                    ) : name && selectedFont ? (
                      <span className={currentFont.cls} style={{ fontSize: currentFont.size, color: '#1a1a1a', lineHeight: 1.1 }}>
                        {name}
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="#4a7fc1">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                        </svg>
                        <span style={{ fontSize: 13, color: '#4a7fc1', fontWeight: 600 }}>Signature</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* ── RIGHT: Signing Options ── */}
          <aside className="hidden lg:flex shrink-0 flex-col bg-white border-l border-gray-200" style={{ width: 320 }}>
            {/* Header */}
            <div className="shrink-0 flex items-center px-6 border-b border-gray-100" style={{ height: 56 }}>
              <h2 className="font-bold text-gray-900" style={{ fontSize: 22 }}>Signing options</h2>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6">

              {/* Required fields */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">Required fields</p>
                <div
                  className="flex items-center gap-2 rounded-xl cursor-pointer hover:shadow-md transition"
                  style={{ border: '1.5px solid #e0e7ef', background: '#fff', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                  onClick={() => setShowModal(true)}
                >
                  <div className="flex-1 flex items-center justify-center rounded" style={{ background: '#f7f9fc', border: '1px solid #e0e7ef', height: 52, padding: '4px 10px' }}>
                    <div style={{ textAlign: 'right', width: '100%' }}>
                      <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>Signature</div>
                      <div className={currentFont.cls} style={{ fontSize: currentFont.size * 0.75, color: '#1a1a1a', lineHeight: 1 }}>
                        {name || 'John Doe'}
                      </div>
                    </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setShowModal(true); }} className="shrink-0 text-gray-400 hover:text-gray-700 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Optional fields */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3">Optional fields</p>
                {[
                  { label: 'Initials', preview: initials || 'JD JD' },
                  { label: 'Name', preview: name || '' },
                ].map(field => (
                  <div key={field.label}
                    className="flex items-center gap-2 rounded-xl mb-2"
                    style={{ border: '1.5px solid #e0e7ef', background: '#fff', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div className="flex-1 flex items-center rounded" style={{ background: '#f7f9fc', border: '1px solid #e0e7ef', height: field.label === 'Initials' ? 52 : 40, padding: '4px 10px' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: 9, color: '#9ca3af', fontWeight: 600, marginBottom: 2 }}>{field.label}</div>
                        {field.label === 'Initials' && (
                          <div className={currentFont.cls} style={{ fontSize: 20, color: '#1a1a1a', lineHeight: 1 }}>{field.preview}</div>
                        )}
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#9ca3af">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </div>
                ))}
              </div>
            </div>

            {/* Sign → button */}
            <div className="shrink-0 p-4 border-t border-gray-100">
              <button
                onClick={handleSign}
                disabled={signing || !signature}
                className="flex items-center justify-between w-full rounded-xl text-white font-bold text-xl px-6 transition hover:opacity-90 disabled:opacity-40"
                style={{ background: '#e8222c', height: 56 }}
              >
                <span>{signing ? 'Signing...' : 'Sign'}</span>
                <div className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                </div>
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          "Set your signature details" Modal — exact ilovepdf design
      ══════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
            onClick={() => setShowModal(false)}
          />

          <div
            className="relative w-full bg-white rounded-2xl flex flex-col animate-fade-in"
            style={{ maxWidth: 700, maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-8 pt-7 pb-5 shrink-0">
              <h2 className="font-bold text-gray-900" style={{ fontSize: 24 }}>Set your signature details</h2>
              <Link
                to="/login"
                className="text-sm font-bold text-[#e8222c] border-2 border-[#e8222c] px-4 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                Login
              </Link>
            </div>

            {/* Name + Initials + Avatar row */}
            <div className="flex items-start gap-4 px-8 pb-5 shrink-0">
              {/* Avatar circle */}
              <div
                className="shrink-0 flex items-center justify-center rounded-full mt-5"
                style={{ width: 44, height: 44, border: '2px solid #e8222c' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#e8222c" opacity="0.6">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>

              {/* Full name */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name:</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition"
                  style={{ background: '#f9fafb' }}
                  onFocus={e => e.target.style.borderColor = '#e8222c'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Initials */}
              <div style={{ width: 160 }}>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initials:</label>
                <input
                  value={initials}
                  onChange={e => setInitials(e.target.value.toUpperCase())}
                  placeholder="Your initials"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-800 uppercase outline-none transition"
                  style={{ background: '#f9fafb' }}
                  onFocus={e => e.target.style.borderColor = '#e8222c'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            {/* ── Tabs: Signature | Initials | Company Stamp ── */}
            <div className="flex items-center border-b border-gray-200 px-8 shrink-0">
              {[
                { id: 'type', label: 'Signature', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                )},
                { id: 'initials_tab', label: 'Initials', icon: (
                  <span className="font-bold" style={{ fontSize: 12 }}>AC</span>
                )},
                { id: 'stamp', label: 'Company Stamp', icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
                )},
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id)}
                  className="flex items-center gap-2 px-5 py-3 font-semibold text-sm transition border-b-2"
                  style={{
                    borderBottomColor: modalTab === tab.id ? '#e8222c' : 'transparent',
                    color: modalTab === tab.id ? '#1a1a1a' : '#9ca3af',
                    marginBottom: -1,
                  }}
                >
                  <span style={{ color: modalTab === tab.id ? '#4a7fc1' : '#9ca3af' }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab content area ── */}
            <div className="flex flex-1 overflow-hidden" style={{ minHeight: 220, maxHeight: 320 }}>

              {/* Left icon strip (Type/Draw/Upload sub-tabs) — only for Signature tab */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && (
                <div
                  className="shrink-0 flex flex-col items-center gap-2 border-r border-gray-100 pt-4 px-3"
                  style={{ width: 56, background: '#fafafa' }}
                >
                  {/* Type icon */}
                  <button
                    onClick={() => setModalTab('type')}
                    title="Type"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalTab === 'type' ? '#fff' : 'transparent', border: modalTab === 'type' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M5 17v2h14v-2H5zm4.5-4.2h5l.9 2.2h2.1L12.75 4h-1.5L6.5 15h2.1l.9-2.2zM12 5.98L13.87 11h-3.74L12 5.98z"/></svg>
                  </button>
                  {/* Draw icon */}
                  <button
                    onClick={() => setModalTab('draw')}
                    title="Draw"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalTab === 'draw' ? '#fff' : 'transparent', border: modalTab === 'draw' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  {/* Upload icon */}
                  <button
                    onClick={() => setModalTab('upload')}
                    title="Upload"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalTab === 'upload' ? '#fff' : 'transparent', border: modalTab === 'upload' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/></svg>
                  </button>
                </div>
              )}

              {/* ── Type tab: font-style radio list ── */}
              {modalTab === 'type' && (
                <div className="flex-1 overflow-y-auto sig-font-list" style={{ padding: '12px 16px' }}>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {SIG_FONTS.map((font, idx) => (
                      <label
                        key={font.id}
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer transition"
                        style={{
                          background: selectedFont === font.id ? '#f0f9f0' : '#fff',
                          borderBottom: idx < SIG_FONTS.length - 1 ? '1px solid #f0f0f0' : 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="sigFont"
                          value={font.id}
                          checked={selectedFont === font.id}
                          onChange={() => setSelectedFont(font.id)}
                          className="w-4 h-4 accent-green-500"
                        />
                        <span className={font.cls} style={{ fontSize: font.size, color: '#1a1a1a', lineHeight: 1.1, flex: 1 }}>
                          {name || 'Signature'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Draw tab ── */}
              {modalTab === 'draw' && (
                <div className="flex-1 flex gap-3 p-4">
                  {/* Canvas */}
                  <div className="flex-1 rounded-lg overflow-hidden border border-gray-200" style={{ background: '#f7f9fc' }}>
                    <SignatureCanvas
                      ref={canvasRef}
                      width={380}
                      height={200}
                      lineColor="#1a1a1a"
                      lineWidth={2.5}
                    />
                  </div>
                  {/* QR code side panel */}
                  <div className="shrink-0 flex flex-col items-center justify-center gap-2 rounded-lg border border-gray-200 p-4" style={{ width: 140, background: '#f7f9fc' }}>
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      {/* QR-like pattern */}
                      <rect width="64" height="64" rx="4" fill="#f0f0f0"/>
                      <rect x="6" y="6" width="20" height="20" rx="2" stroke="#333" strokeWidth="2" fill="none"/>
                      <rect x="10" y="10" width="12" height="12" rx="1" fill="#333"/>
                      <rect x="38" y="6" width="20" height="20" rx="2" stroke="#333" strokeWidth="2" fill="none"/>
                      <rect x="42" y="10" width="12" height="12" rx="1" fill="#333"/>
                      <rect x="6" y="38" width="20" height="20" rx="2" stroke="#333" strokeWidth="2" fill="none"/>
                      <rect x="10" y="42" width="12" height="12" rx="1" fill="#333"/>
                      <rect x="38" y="38" width="6" height="6" fill="#333"/>
                      <rect x="46" y="38" width="6" height="6" fill="#333"/>
                      <rect x="54" y="38" width="6" height="6" fill="#333"/>
                      <rect x="38" y="46" width="6" height="6" fill="#333"/>
                      <rect x="54" y="46" width="6" height="6" fill="#333"/>
                      <rect x="38" y="54" width="6" height="6" fill="#333"/>
                      <rect x="46" y="54" width="6" height="6" fill="#333"/>
                      <rect x="54" y="54" width="6" height="6" fill="#333"/>
                    </svg>
                    <p className="text-center text-xs font-bold text-[#e8222c] leading-tight" style={{ textDecoration: 'underline', cursor: 'pointer' }}>
                      Draw from your mobile device
                    </p>
                  </div>
                </div>
              )}

              {/* ── Upload tab ── */}
              {modalTab === 'upload' && (
                <div className="flex-1 flex items-center justify-center p-6">
                  <div
                    className="w-full h-full flex flex-col items-center justify-center rounded-lg gap-3"
                    style={{ border: '2px dashed #c3d4e8', background: '#f7f9fc', minHeight: 160 }}
                  >
                    <button
                      className="font-bold text-[#e8222c] border-2 border-[#e8222c] px-5 py-2 rounded-lg hover:bg-red-50 transition text-sm"
                    >
                      Upload signature
                    </button>
                    <p className="text-sm text-gray-400">or drop file here</p>
                    <p className="text-xs text-gray-400">Accepted formats: <strong>PNG</strong>, <strong>JPG</strong> and <strong>SVG</strong></p>
                  </div>
                </div>
              )}

              {/* ── Initials tab / Company Stamp tab ── */}
              {(modalTab === 'initials_tab' || modalTab === 'stamp') && (
                <div className="flex-1 flex items-center justify-center p-6 text-gray-400">
                  <div className="text-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" opacity="0.3" className="mx-auto mb-2">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    <p className="text-sm">Coming soon</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="shrink-0 flex items-center justify-end px-8 py-5 border-t border-gray-100">
              <button
                onClick={handleApply}
                className="text-white font-bold px-8 py-2.5 rounded-lg transition hover:opacity-90 text-sm"
                style={{ background: '#e8222c' }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
