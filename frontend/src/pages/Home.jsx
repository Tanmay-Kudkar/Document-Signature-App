import { useState, useEffect, useRef } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import NeonSweepButton from '../components/NeonSweepButton';
import { savePreferences } from '../lib/preferences';

import SeveralPeopleModal from '../components/SeveralPeopleModal';
import { 
  UserPen, Users, User, PenTool, BadgeCheck, 
  Type, UploadCloud, Link as LinkIcon 
} from 'lucide-react';

/* ==========================================================================
 * 🏠 COMPONENT: Home
 * --------------------------------------------------------------------------
 * The main entry point for users to upload documents. Supports direct file 
 * uploads, drag-and-drop, and URL fetching. Once a document is selected, 
 * it prompts the user to choose the signing mode ("Only me" or "Several people")
 * and captures their default signature configuration.
 * ========================================================================== */
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

  const [showSeveralPeopleModal, setShowSeveralPeopleModal] = useState(false);

  const [showSigConfig, setShowSigConfig] = useState(false);
  const [modalTab, setModalTab] = useState('type'); // type | initials_tab | stamp
  const [modalSubTab, setModalSubTab] = useState('type'); // type | draw | upload (for sig/initials tabs)
  const [sigConfig, setSigConfig] = useState({
    name: '',
    initials: '',
    font: 'greatvibes',
    color: '#000000',
    drawingImage: null
  });
  const [userEditedInitials, setUserEditedInitials] = useState(false);
  const [stampImage, setStampImage] = useState(null);       // base64 for company stamp
  const [uploadedSig, setUploadedSig] = useState(null);     // base64 for uploaded signature
  const stampInputRef = useRef(null);
  const sigUploadInputRef = useRef(null);

  // Drawing refs
  const drawingRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef(null);
  const drawHistoryRef = useRef([]); // undo stack for draw tab

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
  const saveDrawSnapshot = () => {
    if (!drawingRef.current) return;
    const ctx = drawingRef.current.getContext('2d');
    const snap = ctx.getImageData(0, 0, drawingRef.current.width, drawingRef.current.height);
    drawHistoryRef.current.push(snap);
    if (drawHistoryRef.current.length > 50) drawHistoryRef.current.shift();
  };
  const undoStroke = () => {
    if (!drawingRef.current || drawHistoryRef.current.length === 0) return;
    const ctx = drawingRef.current.getContext('2d');
    ctx.putImageData(drawHistoryRef.current.pop(), 0, 0);
  };
  const startDraw = (e) => {
    e.preventDefault();
    saveDrawSnapshot(); // snapshot before each stroke
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
    saveDrawSnapshot();
    const ctx = drawingRef.current.getContext('2d');
    ctx.clearRect(0, 0, drawingRef.current.width, drawingRef.current.height);
    drawHistoryRef.current = [];
  };

  const handleOnlyMeClick = () => {
    localStorage.setItem('signingMode', 'only_me');
    // Restore previously saved signature config (name, font, color, initials)
    try {
      const saved = localStorage.getItem('signatureConfig');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSigConfig({
          name: parsed.name || '',
          initials: parsed.initials || '',
          font: parsed.font || 'greatvibes',
          color: parsed.color || '#1a1a1a',
          drawingImage: null, // don't restore drawing — always start fresh
        });
        // If initials were saved, mark them as user-edited so the auto-derive doesn't overwrite
        if (parsed.initials) setUserEditedInitials(true);
      }
    } catch {
      // ignore malformed data, use defaults
    }
    setShowSigConfig(true);
  };

  const handleConfirmSigConfig = () => {
    // Capture drawing if on draw tab
    let finalConfig = { ...sigConfig };
    if (modalSubTab === 'draw' && drawingRef.current) {
      finalConfig.drawingImage = drawingRef.current.toDataURL('image/png');
    } else if (modalSubTab === 'upload' && uploadedSig) {
      finalConfig.drawingImage = uploadedSig;
    } else if (modalTab === 'stamp' && stampImage) {
      finalConfig.stampImage = stampImage;
    }
    // Save to localStorage
    localStorage.setItem('signatureConfig', JSON.stringify(finalConfig));
    // Persist to database (best-effort, no await needed here)
    savePreferences({ sig_config: finalConfig });
    setShowSigConfig(false);
    handleUploadAndNavigate();
  };

  // Helper: read a File as base64
  const readFileAsBase64 = (file) =>
    new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsDataURL(file);
    });

  const handleSeveralPeopleApply = (config) => {
    localStorage.setItem('severalPeopleConfig', JSON.stringify(config));
    localStorage.setItem('signingMode', 'several_people');
    setShowSeveralPeopleModal(false);
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
      {selectedFile && !showSigConfig && (
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
                  className="flex items-center justify-center mb-6 rounded-2xl overflow-hidden text-[#4a7fc1]"
                  style={{ width: 140, height: 130, background: '#dce8f5' }}
                >
                  <UserPen className="w-16 h-16" strokeWidth={1.5} />
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
                onClick={() => setShowSeveralPeopleModal(true)}
              >
                <div
                  className="flex items-center justify-center mb-6 rounded-2xl overflow-hidden text-[#50b383]"
                  style={{ width: 140, height: 130, background: '#e8f5f0' }}
                >
                  <Users className="w-16 h-16" strokeWidth={1.5} />
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
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                undoStroke();
              }
            }}
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
                <User className="w-6 h-6 text-[#e8222c] opacity-60" />
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
                { id: 'type', label: 'Signature', icon: <PenTool className="w-4 h-4" /> },
                { id: 'initials_tab', label: 'AC Initials', icon: <span className="font-bold" style={{ fontSize: 12 }}>AC</span> },
                { id: 'stamp', label: 'Company Stamp', icon: <BadgeCheck className="w-4 h-4" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setModalTab(tab.id); setModalSubTab('type'); }}
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
            <div className="flex flex-1 overflow-hidden" style={{ minHeight: 220, maxHeight: 340 }}>

              {/* Left icon strip (Type/Draw/Upload sub-tabs) — only for Signature and Initials tabs */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && (
                <div
                  className="shrink-0 flex flex-col items-center gap-2 border-r border-gray-100 pt-4 px-3"
                  style={{ width: 56, background: '#fafafa' }}
                >
                  <button
                    onClick={() => setModalSubTab('type')}
                    title="Type"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalSubTab === 'type' ? '#fff' : 'transparent', border: modalSubTab === 'type' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setModalSubTab('draw')}
                    title="Draw"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalSubTab === 'draw' ? '#fff' : 'transparent', border: modalSubTab === 'draw' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setModalSubTab('upload')}
                    title="Upload image"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalSubTab === 'upload' ? '#fff' : 'transparent', border: modalSubTab === 'upload' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <UploadCloud className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Type sub-tab: font-style radio list (Signature OR Initials) ── */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && modalSubTab === 'type' && (
                <div className="flex-1 overflow-y-auto sig-font-list" style={{ padding: '12px 16px' }}>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {SIG_FONTS.map((font, idx) => (
                      <label
                        key={font.id}
                        className="flex items-center gap-4 px-4 py-3 cursor-pointer transition"
                        style={{
                          background: sigConfig.font === font.id ? '#f0f4ff' : '#fff',
                          borderBottom: idx < SIG_FONTS.length - 1 ? '1px solid #f0f0f0' : 'none',
                        }}
                      >
                        <input
                          type="radio"
                          name="sigFont"
                          value={font.id}
                          checked={sigConfig.font === font.id}
                          onChange={() => setSigConfig({ ...sigConfig, font: font.id })}
                          className="w-4 h-4 accent-blue-500 shrink-0"
                        />
                        <span
                          className={`flex-1 min-w-0 truncate ${font.cls}`}
                          style={{ fontSize: font.size, color: sigConfig.color || '#1a1a1a', lineHeight: 1.1 }}
                        >
                          {modalTab === 'initials_tab'
                            ? (sigConfig.initials || 'AB')
                            : (sigConfig.name || 'Signature')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Draw sub-tab ── */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && modalSubTab === 'draw' && (
                <div className="flex-1 flex flex-col p-4 gap-3">
                  <div className="relative w-full rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden flex-1"
                    style={{ minHeight: 160 }}>
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
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.35 }}>
                      <span className="text-sm text-gray-400 font-medium select-none">Draw here</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={undoStroke} disabled={drawHistoryRef.current.length === 0}
                      title="Undo (Ctrl+Z)"
                      className="text-xs font-semibold text-gray-500 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-1.5 transition disabled:opacity-30 flex items-center gap-1">
                      &#x21a9; Undo
                    </button>
                    <button onClick={clearCanvas}
                      className="text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                      Clear
                    </button>
                    <span className="text-[10px] text-gray-300 ml-1">Ctrl+Z to undo</span>
                  </div>
                </div>
              )}

              {/* ── Upload sub-tab ── */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && modalSubTab === 'upload' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4">
                  <input
                    ref={sigUploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const b64 = await readFileAsBase64(file);
                      setUploadedSig(b64);
                    }}
                  />
                  {uploadedSig ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center" style={{ maxHeight: 140, width: '100%' }}>
                        <img src={uploadedSig} alt="Uploaded signature" className="max-h-32 max-w-full object-contain" />
                      </div>
                      <button
                        onClick={() => { setUploadedSig(null); sigUploadInputRef.current?.click(); }}
                        className="text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-4 py-1.5 transition"
                      >
                        Change image
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => sigUploadInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl px-10 py-8 hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer w-full"
                    >
                      <UploadCloud className="w-8 h-8 text-gray-300" />
                      <span className="text-sm font-semibold text-gray-400">Click to upload image</span>
                      <span className="text-xs text-gray-300">PNG, JPG, SVG supported</span>
                    </button>
                  )}
                </div>
              )}

              {/* ── Company Stamp tab ── */}
              {modalTab === 'stamp' && (
                <div className="flex-1 flex flex-col items-center justify-center p-5 gap-4">
                  <input
                    ref={stampInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const b64 = await readFileAsBase64(file);
                      setStampImage(b64);
                    }}
                  />
                  {stampImage ? (
                    <div className="flex flex-col items-center gap-3 w-full">
                      <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center" style={{ maxHeight: 160, width: '100%' }}>
                        <img src={stampImage} alt="Company stamp" className="max-h-36 max-w-full object-contain" />
                      </div>
                      <button
                        onClick={() => { setStampImage(null); stampInputRef.current?.click(); }}
                        className="text-xs font-semibold text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-4 py-1.5 transition"
                      >
                        Change stamp
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => stampInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 rounded-xl px-10 py-8 hover:border-purple-400 hover:bg-purple-50 transition cursor-pointer w-full"
                    >
                      <BadgeCheck className="w-10 h-10 text-gray-300" />
                      <span className="text-sm font-semibold text-gray-400">Upload company stamp</span>
                      <span className="text-xs text-gray-300">PNG with transparent background works best</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Color picker row — shown for type/draw tabs (not stamp) ── */}
            {modalTab !== 'stamp' && (
              <div className="flex items-center gap-3 px-8 py-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Color:</span>
                {PRESET_COLORS.map(p => (
                  <button key={p.color}
                    onClick={() => setSigConfig({ ...sigConfig, color: p.color })}
                    className="w-7 h-7 rounded-full border-2 transition"
                    style={{
                      background: p.color,
                      borderColor: sigConfig.color === p.color ? '#94a3b8' : 'transparent',
                      boxShadow: sigConfig.color === p.color ? `0 0 0 2px white, 0 0 0 4px ${p.color}` : 'none',
                    }}
                    title={p.label}
                  />
                ))}
                {/* Custom color wheel */}
                <label
                  className="relative w-7 h-7 rounded-full overflow-hidden border-2 cursor-pointer flex-shrink-0"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    borderColor: !PRESET_COLORS.find(p => p.color === sigConfig.color) ? '#94a3b8' : '#e5e7eb',
                    boxShadow: !PRESET_COLORS.find(p => p.color === sigConfig.color)
                      ? `0 0 0 2px white, 0 0 0 4px ${sigConfig.color}`
                      : 'none',
                  }}
                  title="Custom color"
                >
                  <input
                    type="color"
                    value={sigConfig.color}
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
                disabled={isUploading || (
                  modalTab === 'stamp' ? !stampImage :
                  modalSubTab === 'upload' ? !uploadedSig :
                  !sigConfig.name.trim()
                )}
                className="text-white font-bold px-8 py-2.5 rounded-lg transition hover:opacity-90 text-sm disabled:opacity-50"
                style={{ background: '#e8222c' }}
              >
                {isUploading ? 'Uploading...' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showSeveralPeopleModal && (
        <SeveralPeopleModal
          onCancel={() => setShowSeveralPeopleModal(false)}
          onApply={handleSeveralPeopleApply}
        />
      )}
    </>
  );
}
