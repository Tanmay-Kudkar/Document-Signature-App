import { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import NeonSweepButton from '../components/NeonSweepButton';
import { savePreferences } from '../lib/preferences';

export default function Home() {
  const {
    fileInputRef,
    selectedFile,
    setSelectedFile,
    isUploading,
    handleTriggerUpload,
    handleUploadAndNavigate,
    clearSelected,
  } = useOutletContext();

  const [isDragging, setIsDragging] = useState(false);
  const [urlModalMode, setUrlModalMode] = useState(null); // 'cloud' | 'url' | null
  const [urlInput, setUrlInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');

  const [showSigConfig, setShowSigConfig] = useState(false);
  const [modalTab, setModalTab] = useState('type'); // type | draw | upload
  const [sigConfig, setSigConfig] = useState({
    name: '',
    initials: '',
    font: 'greatvibes',
    color: '#1a1a1a',
    drawingImage: null
  });
  const [userEditedInitials, setUserEditedInitials] = useState(false);

  // Drawing refs
  const drawingRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef(null);

  const SIG_FONTS = [
    { id: 'greatvibes',  label: 'Great Vibes',   cls: 'font-greatvibes',  size: 32 },
    { id: 'dancing',     label: 'Dancing Script', cls: 'font-dancing',     size: 28 },
    { id: 'sacramento',  label: 'Sacramento',     cls: 'font-sacramento',  size: 32 },
    { id: 'pacifico',    label: 'Pacifico',       cls: 'font-pacifico',    size: 22 },
    { id: 'pinyon',      label: 'Pinyon Script',  cls: 'font-pinyon',      size: 30 },
  ];

  useEffect(() => {
    if (!userEditedInitials) {
      const parts = sigConfig.name.trim().split(/\s+/).filter(Boolean);
      setSigConfig(prev => ({ ...prev, initials: parts.map(p => p[0]).join('').toUpperCase().slice(0, 4) }));
    }
  }, [sigConfig.name, userEditedInitials]);

  const PRESET_COLORS = [
    { color: '#1a1a1a', label: 'Black' },
    { color: '#e8222c', label: 'Red' },
    { color: '#2563eb', label: 'Blue' },
    { color: '#16a34a', label: 'Green' },
  ];

  // Canvas drawing helpers
  const getCanvasPos = (canvas, e) => {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  };
  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getCanvasPos(drawingRef.current, e);
    lastPosRef.current = pos;
  };
  const doDraw = (e) => {
    e.preventDefault();
    if (!isDrawing || !drawingRef.current) return;
    const ctx = drawingRef.current.getContext('2d');
    const pos = getCanvasPos(drawingRef.current, e);
    ctx.strokeStyle = sigConfig.color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };
  const endDraw = () => setIsDrawing(false);
  const clearCanvas = () => {
    if (!drawingRef.current) return;
    const ctx = drawingRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawingRef.current.width, drawingRef.current.height);
  };

  const handleOnlyMeClick = () => {
    localStorage.setItem('signingMode', 'only_me');
    setShowSigConfig(true);
  };

  const handleConfirmSigConfig = () => {
    // Capture drawing if on draw tab
    let finalConfig = { ...sigConfig };
    if (modalTab === 'draw' && drawingRef.current) {
      finalConfig.drawingImage = drawingRef.current.toDataURL('image/png');
    }
    // Save to localStorage
    localStorage.setItem('signatureConfig', JSON.stringify(finalConfig));
    // Persist to database (best-effort, no await needed here)
    savePreferences({ sig_config: finalConfig });
    setShowSigConfig(false);
    handleUploadAndNavigate();
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        alert("Please drop a valid PDF file.");
      }
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setIsFetchingUrl(true);
    setUrlError('');
    try {
      const response = await fetch(urlInput.trim());
      if (!response.ok) throw new Error("Failed to fetch");
      const blob = await response.blob();
      const file = new File([blob], "document.pdf", { type: "application/pdf" });
      setSelectedFile(file);
      setUrlModalMode(null);
      setUrlInput('');
    } catch (e) {
      setUrlError("Could not fetch the PDF. Please ensure the URL is valid, direct, and CORS is allowed.");
    } finally {
      setIsFetchingUrl(false);
    }
  };

  return (
    <>
      {/* ── Main upload area ── */}
      <main
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center px-4 transition-colors duration-300 ${isDragging ? 'bg-red-50 border-4 border-dashed border-[#e8222c]' : 'bg-[#fff]'}`}
        style={{ minHeight: 'calc(100vh - 56px)' }}
      >
        <h1
          className="text-center font-bold mb-3 text-4xl md:text-[42px]"
          style={{ color: '#1a1a1a', letterSpacing: -1, lineHeight: 1.15 }}
        >
          Sign PDF
        </h1>
        <p
          className="text-center mb-10 max-w-xl"
          style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.6 }}
        >
          Your tool to eSign documents. Sign a document yourself or send a
          signature request to others.
        </p>

        {/* Upload button row */}
        <div className="flex items-center gap-3">
          <NeonSweepButton
            onClick={handleTriggerUpload}
            tone="danger"
            size="lg"
            className="shadow-md hover:shadow-lg"
          >
            Select PDF file
          </NeonSweepButton>

          {/* Cloud upload icon */}
          <button
            onClick={() => setUrlModalMode('cloud')}
            title="Upload from Google Drive"
            className="flex items-center justify-center rounded-lg hover:opacity-80 transition bg-white border border-gray-200 shadow-sm"
            style={{ width: 46, height: 46, flexShrink: 0 }}
          >
            <img src="/Google_Drive_icon.svg" alt="Google Drive" className="w-6 h-6" />
          </button>

          {/* URL / link icon */}
          <button
            onClick={() => setUrlModalMode('url')}
            title="Upload from URL"
            className="flex items-center justify-center rounded-lg hover:opacity-80 transition"
            style={{ background: '#e8222c', width: 46, height: 46, flexShrink: 0 }}
          >
            <img src="/link_icon.svg" alt="Link" className="w-6 h-6" style={{ filter: 'invert(1)' }} />
          </button>
        </div>

        <p className="mt-5 text-sm text-gray-400 font-semibold pointer-events-none">or drop PDF here</p>
      </main>

      {/* ── URL Upload Modal ── */}
      {urlModalMode && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }} onClick={() => setUrlModalMode(null)} />
          <div className="relative w-full bg-white rounded-xl animate-fade-in" style={{ maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: '1px solid #e5e7eb' }}>
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: '#f3f4f6' }}>
                {urlModalMode === 'cloud' ? (
                  <img src="/Google_Drive_icon.svg" alt="Google Drive" className="w-5 h-5" />
                ) : (
                  <img src="/link_icon.svg" alt="Link" className="w-5 h-5 opacity-60" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">
                  {urlModalMode === 'cloud' ? 'Upload from Cloud' : 'Upload from URL'}
                </p>
                <p className="text-xs text-gray-400 truncate mt-0.5">
                  {urlModalMode === 'cloud' ? 'Enter Google Drive or Dropbox link' : 'Enter a direct link to a PDF file'}
                </p>
              </div>
            </div>
            
            <div className="px-5 pb-5">
              {urlError && <p className="text-xs text-red-500 font-medium mb-2">{urlError}</p>}
              <input type="url" value={urlInput} autoFocus
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
                placeholder={urlModalMode === 'cloud' ? "https://drive.google.com/file/..." : "https://example.com/document.pdf"}
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none transition mb-3"
                style={{ borderColor: '#d1d5db', background: '#f9fafb' }}
                onFocus={e => e.target.style.borderColor = '#9ca3af'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <div className="flex gap-2">
                <NeonSweepButton onClick={handleUrlSubmit} disabled={!urlInput.trim() || isFetchingUrl}
                  tone="danger" size="sm" className="flex-1 font-semibold">
                  {isFetchingUrl ? 'Fetching...' : 'Upload'}
                </NeonSweepButton>
                <NeonSweepButton onClick={() => { setUrlModalMode(null); setUrlInput(''); setUrlError(''); }}
                  tone="slate" size="sm">
                  Cancel
                </NeonSweepButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── "Who will sign?" overlay modal ── */}
      {selectedFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Blurred backdrop */}
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
          />

          <div
            className="relative w-full bg-white rounded-2xl overflow-hidden animate-fade-in"
            style={{ maxWidth: 640, boxShadow: '0 24px 80px rgba(0,0,0,0.18)' }}
          >
            {/* Header */}
            <div className="px-5 sm:px-10 pt-8 sm:pt-10 pb-6">
              <h2 className="text-center font-bold text-gray-900 text-xl sm:text-[26px]">
                Who will sign this document?
              </h2>
            </div>

            {/* Two cards */}
            <div className="flex flex-col sm:flex-row gap-4 px-5 sm:px-8 pb-6">
              {/* Only me */}
              <div
                className="flex-1 flex flex-col items-center rounded-xl border border-gray-200 p-8 cursor-pointer hover:border-[#e8222c] hover:shadow-md transition group"
                style={{ background: '#fafafa' }}
                onClick={handleOnlyMeClick}
              >
                {/* Illustration */}
                <div
                  className="flex items-center justify-center mb-6 rounded-2xl overflow-hidden"
                  style={{ width: 140, height: 130, background: '#dce8f5' }}
                >
                  <img
                    src="/signing-illustration.png"
                    alt="Only me"
                    className="w-28 h-28 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = `<svg viewBox="0 0 80 80" width="80" height="80" fill="none"><rect width="80" height="80" rx="16" fill="#dce8f5"/><rect x="20" y="12" width="40" height="52" rx="4" fill="white" stroke="#b3cee8" strokeWidth="2"/><line x1="28" y1="24" x2="52" y2="24" stroke="#b3cee8" strokeWidth="2"/><line x1="28" y1="32" x2="52" y2="32" stroke="#b3cee8" strokeWidth="2"/><line x1="28" y1="40" x2="44" y2="40" stroke="#b3cee8" strokeWidth="2"/><path d="M24 56 Q32 48 40 54 Q46 44 54 52" stroke="#4a7fc1" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>`;
                    }}
                  />
                </div>

                <NeonSweepButton
                  disabled={isUploading}
                  tone="danger"
                  className="w-4/5 mb-2"
                >
                  {isUploading ? 'Uploading...' : 'Only me'}
                </NeonSweepButton>
                <p className="text-sm text-gray-500">Sign this document</p>
              </div>

              {/* Several people */}
              <div
                className="flex-1 flex flex-col items-center rounded-xl border border-gray-200 p-8 cursor-pointer hover:border-[#e8222c] hover:shadow-md transition group"
                style={{ background: '#fafafa' }}
                onClick={() => { localStorage.setItem('signingMode', 'several_people'); handleUploadAndNavigate(); }}
              >
                <div
                  className="flex items-center justify-center mb-6 rounded-2xl overflow-hidden"
                  style={{ width: 140, height: 130, background: '#e8f5f0' }}
                >
                  <svg viewBox="0 0 80 80" width="80" height="80" fill="none">
                    {/* Top person */}
                    <circle cx="40" cy="12" r="7" fill="#4a7fc1" opacity="0.9" />
                    <ellipse cx="40" cy="26" rx="10" ry="7" fill="#4a7fc1" opacity="0.9" />
                    {/* Left person */}
                    <circle cx="14" cy="36" r="6" fill="#e8702a" opacity="0.9" />
                    <ellipse cx="14" cy="48" rx="9" ry="6" fill="#e8702a" opacity="0.9" />
                    {/* Right person */}
                    <circle cx="66" cy="36" r="6" fill="#50b383" opacity="0.9" />
                    <ellipse cx="66" cy="48" rx="9" ry="6" fill="#50b383" opacity="0.9" />
                    {/* Bottom person */}
                    <circle cx="40" cy="60" r="6" fill="#9b59b6" opacity="0.9" />
                    <ellipse cx="40" cy="72" rx="9" ry="6" fill="#9b59b6" opacity="0.9" />
                    {/* Table circle */}
                    <circle cx="40" cy="40" r="16" fill="#d4ebe2" opacity="0.6" />
                    {/* Document on table */}
                    <rect x="34" y="33" width="12" height="14" rx="1.5" fill="white" stroke="#b8d4c8" strokeWidth="1" />
                    <line x1="37" y1="37" x2="43" y2="37" stroke="#b8d4c8" strokeWidth="1" />
                    <line x1="37" y1="40" x2="43" y2="40" stroke="#b8d4c8" strokeWidth="1" />
                    <line x1="37" y1="43" x2="41" y2="43" stroke="#b8d4c8" strokeWidth="1" />
                  </svg>
                </div>

                <NeonSweepButton
                  disabled={isUploading}
                  tone="danger"
                  className="w-4/5 mb-2"
                >
                  {isUploading ? 'Uploading...' : 'Several people'}
                </NeonSweepButton>
                <p className="text-sm text-gray-500">Invite others to sign</p>
              </div>
            </div>

            {/* Footer: file name */}
            <div className="border-t border-gray-100 px-10 py-4 text-center">
              <p className="text-sm text-gray-600">
                Uploaded documents:{' '}
                <span className="font-bold text-gray-900">{selectedFile?.name}</span>
              </p>
              <NeonSweepButton
                onClick={clearSelected}
                tone="slate"
                size="sm"
                className="mt-3"
              >
                Cancel and select a different file
              </NeonSweepButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Signature Config Modal ── */}
      {showSigConfig && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(3px)' }}
            onClick={() => setShowSigConfig(false)}
          />

          <div
            className="relative w-full bg-white rounded-2xl flex flex-col animate-fade-in"
            style={{ maxWidth: 700, maxHeight: '90vh', boxShadow: '0 24px 80px rgba(0,0,0,0.2)' }}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 sm:px-8 pt-5 sm:pt-7 pb-5 shrink-0">
              <h2 className="font-bold text-gray-900 text-lg sm:text-[24px]">Set your signature details</h2>
              <Link
                to="/login"
                className="text-sm font-bold text-[#e8222c] border-2 border-[#e8222c] px-4 py-1.5 rounded-lg hover:bg-red-50 transition"
              >
                Login
              </Link>
            </div>

            {/* Name + Initials + Avatar row */}
            <div className="flex flex-col sm:flex-row items-center gap-4 px-5 sm:px-8 pb-5 shrink-0">
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
              <div className="flex-1 min-w-0 w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name:</label>
                <input
                  value={sigConfig.name}
                  onChange={e => setSigConfig({ ...sigConfig, name: e.target.value })}
                  placeholder="Your name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition"
                  style={{ background: '#f9fafb' }}
                  onFocus={e => e.target.style.borderColor = '#e8222c'}
                  onBlur={e => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              {/* Initials */}
              <div className="shrink-0 w-full sm:w-[160px]">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Initials:</label>
                <input
                  value={sigConfig.initials}
                  onChange={e => {
                    setUserEditedInitials(true);
                    setSigConfig({ ...sigConfig, initials: e.target.value.toUpperCase() });
                  }}
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
                          background: sigConfig.font === font.id ? '#f0f9f0' : '#fff',
                          borderBottom: idx < SIG_FONTS.length - 1 ? '1px solid #f0f0f0' : 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="sigFont"
                          value={font.id}
                          checked={sigConfig.font === font.id}
                          onChange={() => setSigConfig({ ...sigConfig, font: font.id })}
                          className="w-4 h-4 accent-green-500 shrink-0"
                        />
                        <span className={`flex-1 min-w-0 truncate ${font.cls}`} style={{ fontSize: font.size, color: sigConfig.color || '#1a1a1a', lineHeight: 1.1 }}>
                          {sigConfig.name || 'Signature'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Draw tab ── */}
              {modalTab === 'draw' && (
                <div className="flex-1 flex flex-col p-4 gap-3">
                  <div className="relative w-full rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden flex-1"
                    style={{ minHeight: 180 }}>
                    <canvas
                      ref={drawingRef}
                      width={580}
                      height={200}
                      className="w-full h-full touch-none"
                      style={{ cursor: 'crosshair' }}
                      onMouseDown={startDraw}
                      onMouseMove={doDraw}
                      onMouseUp={endDraw}
                      onMouseLeave={endDraw}
                      onTouchStart={startDraw}
                      onTouchMove={doDraw}
                      onTouchEnd={endDraw}
                    />
                    {/* placeholder hint */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
                      style={{ opacity: 0.35 }}>
                      <span className="text-sm text-gray-400 font-medium select-none">Draw your signature here</span>
                    </div>
                  </div>
                  <button onClick={clearCanvas}
                    className="self-start text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-1.5 transition hover:border-red-200">
                    Clear
                  </button>
                </div>
              )}

              {/* ── Upload tab ── */}
              {modalTab === 'upload' && (
                <div className="flex-1 flex items-center justify-center p-6 text-gray-400">
                  <div className="text-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor" opacity="0.3" className="mx-auto mb-2">
                      <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                    </svg>
                    <p className="text-sm">Upload signature coming soon</p>
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

            {/* ── Color picker row ── */}
            {(modalTab === 'type' || modalTab === 'draw' || modalTab === 'initials_tab') && (
              <div className="flex items-center gap-3 px-8 py-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Color:</span>
                {PRESET_COLORS.map(p => (
                  <button key={p.color}
                    onClick={() => setSigConfig({ ...sigConfig, color: p.color })}
                    className="w-7 h-7 rounded-full border-2 transition flex items-center justify-center"
                    style={{
                      background: p.color,
                      borderColor: sigConfig.color === p.color ? '#94a3b8' : 'transparent',
                      boxShadow: sigConfig.color === p.color ? `0 0 0 2px white, 0 0 0 4px ${p.color}` : 'none',
                    }}
                    title={p.label}
                  />
                ))}
                {/* Color wheel / custom picker */}
                <label className="relative w-7 h-7 rounded-full overflow-hidden border-2 cursor-pointer flex items-center justify-center"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    borderColor: !PRESET_COLORS.find(p => p.color === sigConfig.color) ? '#94a3b8' : '#e5e7eb',
                    boxShadow: !PRESET_COLORS.find(p => p.color === sigConfig.color) ? `0 0 0 2px white, 0 0 0 4px ${sigConfig.color}` : 'none',
                  }}
                  title="Custom color">
                  <input type="color" value={sigConfig.color}
                    onChange={e => setSigConfig({ ...sigConfig, color: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Modal footer */}
            <div className="shrink-0 flex items-center justify-end gap-3 px-8 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowSigConfig(false)}
                className="px-5 py-2.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-100 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSigConfig}
                disabled={!sigConfig.name.trim() || isUploading}
                className="text-white font-bold px-8 py-2.5 rounded-lg transition hover:opacity-90 text-sm disabled:opacity-50"
                style={{ background: '#e8222c' }}
              >
                {isUploading ? 'Uploading...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
