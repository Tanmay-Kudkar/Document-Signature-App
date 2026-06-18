import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  validateSignatureToken as validateTokenApi,
  signWithToken as signTokenApi,
  getDocumentPreviewUrl,
} from '../lib/documents';
import { Document, Page } from 'react-pdf';
import SignatureCanvas from '../components/SignatureCanvas';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import {
  ChevronLeft, ChevronRight, X, Check, FileSignature, Users,
  PenTool, Type, Calendar, AlignLeft, BadgeCheck, UploadCloud,
  PlayCircle, User, ChevronRight as ChevronRightIcon, Settings
} from 'lucide-react';

const SIG_FONTS = [
  { id: 'greatvibes',  label: 'Great Vibes',   cls: 'font-greatvibes',  size: 32 },
  { id: 'dancing',     label: 'Dancing Script', cls: 'font-dancing',     size: 28 },
  { id: 'sacramento',  label: 'Sacramento',     cls: 'font-sacramento',  size: 32 },
  { id: 'pacifico',    label: 'Pacifico',       cls: 'font-pacifico',    size: 22 },
  { id: 'pinyon',      label: 'Pinyon Script',  cls: 'font-pinyon',      size: 30 },
];

const PRESET_COLORS = [
  { label: 'Black', color: '#1a1a1a' },
  { label: 'Red',   color: '#e8222c' },
  { label: 'Blue',  color: '#2563eb' },
  { label: 'Green', color: '#16a34a' },
];

/* ── Inline icons ── */
const ChevLeft  = () => <ChevronLeft size={14} />;
const ChevRight = () => <ChevronRight size={14} />;
const XIcon     = () => <X size={16} />;
const CheckIcon = () => <Check size={18} />;

export default function Sign() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

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
  const [rejecting, setRejecting]   = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);

  /* Signature details modal */
  const [showModal, setShowModal]   = useState(false);
  const [modalTab, setModalTab]     = useState('type'); // type | initials_tab | stamp
  const [modalSubTab, setModalSubTab] = useState('type'); // type | draw | upload
  const [name, setName]             = useState('');
  const [initials, setInitials]     = useState('');
  const [selectedFont, setSelectedFont] = useState('greatvibes');
  const canvasRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [sigEditColor, setSigEditColor] = useState('#1a1a1a');
  
  /* Resizing & Dragging state */
  const [resizingInfo, setResizingInfo] = useState(null);
  const dragOffsetRef = useRef({ ox: 0, oy: 0 });
  const wasDraggingRef = useRef(false);
  const [isDraggingField, setIsDraggingField] = useState(false);
  const [isSelected, setIsSelected] = useState(true);

  /* Mobile responsiveness */
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isMobileView, setIsMobileView] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [isSmallScreen, setIsSmallScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 1024);
      setIsSmallScreen(window.innerWidth < 640);
      if (window.innerWidth >= 1024) setShowMobileSidebar(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const [stampImageB64, setStampImageB64] = useState(null);
  const [uploadedSigImage, setUploadedSigImage] = useState(null);
  const stampFileRef = useRef(null);
  const sigFileRef = useRef(null);

  /* Flow: skip selection — Sign page is always accessed via a share token */
  const [flowStep, setFlowStep]     = useState('editor');

  const fType = signature?.type || 'signature';
  const isSigned = !!capturedImage || (fType === 'initials' ? !!initials : (fType === 'stamp' ? false : !!name));

  const handleImageUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target.result;
      if (result.startsWith('data:image/svg+xml')) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 300;
          canvas.height = img.height || 150;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          callback(canvas.toDataURL('image/png'));
        };
        img.src = result;
      } else {
        callback(result);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ── Main 3-panel editor (ilovepdf style) ── */
  const pdfFileSource = React.useMemo(() => {
    if (docData?.file_data) {
      if (docData.file_data.type === 'Buffer') {
        const arr = new Uint8Array(docData.file_data.data);
        const blob = new Blob([arr], { type: 'application/pdf' });
        return URL.createObjectURL(blob);
      }
      return docData.file_data;
    }
    return docData ? { url: `${getDocumentPreviewUrl(docData.id)}?token=${encodeURIComponent(token)}` } : null;
  }, [docData, token]);

  /* ── Load & validate token ── */
  useEffect(() => {
    if (!token) { setError('No token provided.'); setLoading(false); return; }
    const load = async () => {
      try {
        setLoading(true);
        const data = await validateTokenApi(token);
        setSignature(data.signature);
        setDocData(data.document);
        
        const fType = data.signature.type || 'signature';
        const fieldDefs = {
          'signature': { color: '#e8222c' },
          'initials':  { color: '#e8222c' },
          'name':      { color: '#1a1a1a' },
          'date':      { color: '#1a1a1a' },
          'text':      { color: '#1a1a1a' },
          'stamp':     { color: '#8b5cf6' },
        };
        const def = fieldDefs[fType] || fieldDefs['signature'];
        setSigEditColor(data.signature.metadata?.color || def.color);
        
        // If already signed, directly redirect to download success page!
        if (data.signature.status === 'signed') {
          const docName = data.document.original_name || data.document.originalName || 'document.pdf';
          navigate(`/signed?docId=${data.document.id}&name=${encodeURIComponent(docName)}`, { replace: true });
        }
      } catch (err) {
        setError(err.message || 'Invalid or expired token');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token, navigate]);

  /* ── Resize observer ── */
  useEffect(() => {
    if (!pdfWrapperRef.current || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(([entry]) => {
      setPageWidth(Math.min(Math.max(280, Math.floor(entry.contentRect.width - 48)), 880));
    });
    obs.observe(pdfWrapperRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── Resize logic ── */
  const handleResizeStart = (e, sig, dir) => {
    e.stopPropagation(); e.preventDefault();
    if (!pdfWrapperRef.current) return;
    const w = sig.metadata?.w || 200;
    const h = sig.metadata?.h || 50;
    const rect = pdfWrapperRef.current.getBoundingClientRect();
    const cx = (sig.x / 100) * rect.width;
    const cy = (sig.y / 100) * rect.height;
    
    let anchorX, anchorY;
    if (dir === 'se') { anchorX = cx - w / 2; anchorY = cy - h / 2; }
    if (dir === 'sw') { anchorX = cx + w / 2; anchorY = cy - h / 2; }
    if (dir === 'ne') { anchorX = cx - w / 2; anchorY = cy + h / 2; }
    if (dir === 'nw') { anchorX = cx + w / 2; anchorY = cy + h / 2; }
    if (dir === 'e')  { anchorX = cx - w / 2; anchorY = cy; }
    if (dir === 'w')  { anchorX = cx + w / 2; anchorY = cy; }
    if (dir === 'n')  { anchorX = cx; anchorY = cy + h / 2; }
    if (dir === 's')  { anchorX = cx; anchorY = cy - h / 2; }

    const meta = sig.metadata || {};
    const defaultPadX = sig.type === 'stamp' ? 8 : 6;
    const defaultPadY = sig.type === 'stamp' ? 6 : 4;
    setResizingInfo({ 
      fieldId: sig.id, dir, anchorX, anchorY, currentH: h, currentW: w,
      padTop: meta.padTop !== undefined ? meta.padTop : defaultPadY,
      padBottom: meta.padBottom !== undefined ? meta.padBottom : defaultPadY,
      padLeft: meta.padLeft !== undefined ? meta.padLeft : defaultPadX,
      padRight: meta.padRight !== undefined ? meta.padRight : defaultPadX
    });
  };

  const handleGlobalMouseMove = (e) => {
    if (resizingInfo && pdfWrapperRef.current) {
      const rect = pdfWrapperRef.current.getBoundingClientRect();
      const mx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const my = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const { dir, anchorX, anchorY } = resizingInfo;
      let newW, newH, newCX, newCY;
      let padTop = resizingInfo.padTop, padBottom = resizingInfo.padBottom, padLeft = resizingInfo.padLeft, padRight = resizingInfo.padRight;
      const MIN_W = 60, MIN_H = 28;
      const aspect = resizingInfo.currentW / resizingInfo.currentH;
      
      let maxW = rect.width;
      let maxH = rect.height;
      if (dir.includes('e')) maxW = rect.width - anchorX;
      if (dir.includes('w')) maxW = anchorX;
      if (dir.includes('s')) maxH = rect.height - anchorY;
      if (dir.includes('n')) maxH = anchorY;

      if (dir === 'se' || dir === 'sw' || dir === 'ne' || dir === 'nw') {
        const capH = Math.min(maxH, maxW / aspect);
        newH = Math.max(MIN_H, Math.min(capH, Math.abs(my - anchorY)));
        newW = newH * aspect;
        const scaleFactor = newH / resizingInfo.currentH;
        padTop = Math.round(resizingInfo.padTop * scaleFactor);
        padBottom = Math.round(resizingInfo.padBottom * scaleFactor);
        padLeft = Math.round(resizingInfo.padLeft * scaleFactor);
        padRight = Math.round(resizingInfo.padRight * scaleFactor);
        newCX = dir.includes('e') ? anchorX + newW / 2 : anchorX - newW / 2;
        newCY = dir.includes('s') ? anchorY + newH / 2 : anchorY - newH / 2;
      } else {
        newW = resizingInfo.currentW;
        newH = resizingInfo.currentH;
        newCX = anchorX; newCY = anchorY;
        if (dir === 'e') { newW = Math.max(MIN_W, Math.min(maxW, mx - anchorX)); newCX = anchorX + newW / 2; padRight = Math.max(0, resizingInfo.padRight + (newW - resizingInfo.currentW)); }
        if (dir === 'w') { newW = Math.max(MIN_W, Math.min(maxW, anchorX - mx)); newCX = anchorX - newW / 2; padLeft = Math.max(0, resizingInfo.padLeft + (newW - resizingInfo.currentW)); }
        if (dir === 'n') { newH = Math.max(MIN_H, Math.min(maxH, anchorY - my)); newCY = anchorY - newH / 2; padTop = Math.max(0, resizingInfo.padTop + (newH - resizingInfo.currentH)); }
        if (dir === 's') { newH = Math.max(MIN_H, Math.min(maxH, my - anchorY)); newCY = anchorY + newH / 2; padBottom = Math.max(0, resizingInfo.padBottom + (newH - resizingInfo.currentH)); }
      }

      const wPct = (newW / rect.width) * 100;
      const hPct = (newH / rect.height) * 100;
      const newX = Math.max(wPct / 2, Math.min(100 - wPct / 2, (newCX / rect.width) * 100));
      const newY = Math.max(hPct / 2, Math.min(100 - hPct / 2, (newCY / rect.height) * 100));

      setSignature(s => ({
        ...s, x: newX, y: newY, 
        metadata: { ...(s.metadata || {}), w: Math.round(newW), h: Math.round(newH), padTop, padBottom, padLeft, padRight }
      }));
    } else if (isDraggingField && pdfWrapperRef.current && signature) {
      const rect = pdfWrapperRef.current.getBoundingClientRect();
      const meta = signature.metadata || {};
      const w = meta.w || 200;
      const h = meta.h || 50;

      const mx = e.clientX - dragOffsetRef.current.ox - rect.left;
      const my = e.clientY - dragOffsetRef.current.oy - rect.top;

      const wPct = (w / rect.width) * 100;
      const hPct = (h / rect.height) * 100;
      const minX = wPct / 2;
      const maxX = 100 - wPct / 2;
      const minY = hPct / 2;
      const maxY = 100 - hPct / 2;

      const newX = Math.max(minX, Math.min(maxX, (mx / rect.width) * 100));
      const newY = Math.max(minY, Math.min(maxY, (my / rect.height) * 100));

      setSignature(s => ({ ...s, x: newX, y: newY }));
    }
  };

  const handleFieldMouseDown = (e) => {
    e.stopPropagation();
    if (!pdfWrapperRef.current || !signature) return;
    const rect = pdfWrapperRef.current.getBoundingClientRect();
    const centerX = (signature.x / 100) * rect.width + rect.left;
    const centerY = (signature.y / 100) * rect.height + rect.top;
    dragOffsetRef.current = { ox: e.clientX - centerX, oy: e.clientY - centerY };
    setIsDraggingField(true);
  };

  const handleGlobalMouseUp = (e) => {
    if (resizingInfo || isDraggingField) {
      wasDraggingRef.current = true;
      setTimeout(() => { wasDraggingRef.current = false; }, 0);
      setResizingInfo(null);
      setIsDraggingField(false);
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [resizingInfo, isDraggingField, signature]);

  /* ── Sign ── */
  const handleSign = async () => {
    if (!token || !signature) return;
    try {
      setSigning(true);
      
      let finalSignatureImage = capturedImage;
      const meta = signature.metadata || {};
      
      if (!finalSignatureImage) {
        // Generated a canvas image exactly like Dashboard.jsx to match "Only Me" mode perfectly!
        const getFieldSize = (sig) => {
          if (sig.type === 'stamp') return { w: 120, h: 120 };
          return { w: sig.metadata?.w || 140, h: sig.metadata?.h || 50 };
        };
        const { w, h } = getFieldSize(signature);
        const scale = 3;
        const defaultPadX = signature.type === 'stamp' ? 8 : 6;
        const defaultPadY = signature.type === 'stamp' ? 6 : 4;
        const padTop = meta.padTop !== undefined ? meta.padTop : defaultPadY;
        const padBottom = meta.padBottom !== undefined ? meta.padBottom : defaultPadY;
        const padLeft = meta.padLeft !== undefined ? meta.padLeft : defaultPadX;
        const padRight = meta.padRight !== undefined ? meta.padRight : defaultPadX;
        const border = 2;
        const headerH = 16;
        const actualPadL = padLeft + border;
        const actualPadR = padRight + border;
        const actualPadT = padTop + border + headerH;
        const actualPadB = padBottom + border;

        const canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        let text = name || 'Signed';
        if (signature.type === 'initials') text = initials || 'ME';
        
        const isCursive = signature.type === 'signature';
        const isInitials = signature.type === 'initials';
        
        const availW = Math.max(1, w - actualPadL - actualPadR);
        const availH = Math.max(1, h - actualPadT - actualPadB);
        const maxFontH = isCursive ? availH * 0.75 : availH * 0.8;
        
        let estWidthEms = 0;
        for (let i = 0; i < text.length; i++) {
          const c = text[i];
          if (c === ' ') estWidthEms += isCursive ? 0.30 : 0.32;
          else if (c === c.toUpperCase() && c.toLowerCase() !== c.toUpperCase()) estWidthEms += isInitials ? 0.85 : (isCursive ? 0.68 : 0.75);
          else estWidthEms += isInitials ? 0.55 : (isCursive ? 0.48 : 0.50);
        }
        let maxFontW = availW / Math.max(1, estWidthEms);
        if (isCursive) maxFontW *= 0.92;
        const fontSize = Math.round(Math.min(maxFontH, maxFontW));
        
        const getFontFamily = (f) => {
          if (!f) return 'Inter';
          if (f.includes('great')) return '"Great Vibes", cursive';
          if (f.includes('dancing')) return '"Dancing Script", cursive';
          if (f.includes('sacramento')) return '"Sacramento", cursive';
          if (f.includes('pacifico')) return '"Pacifico", cursive';
          if (f.includes('pinyon')) return '"Pinyon Script", cursive';
          return f;
        };
        const fontFamily = getFontFamily(selectedFont);
        
        ctx.font = `${isCursive ? 'italic ' : ''}normal ${fontSize}px ${fontFamily}`;
        ctx.fillStyle = sigEditColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const centerX = actualPadL + availW / 2;
        const centerY = actualPadT + availH / 2;
        ctx.fillText(text, centerX, centerY + (fontSize * 0.1));
        finalSignatureImage = canvas.toDataURL('image/png');
      }

      await signTokenApi(token, {
        signerName: name || undefined,
        signatureImage: finalSignatureImage || undefined,
      });
      const docName = docData?.original_name || docData?.originalName || 'document.pdf';
      navigate(`/signed?docId=${docData.id}&name=${encodeURIComponent(docName)}`, { replace: true });
    } catch (err) {
      alert(err.message || 'Unable to sign document');
    } finally {
      setSigning(false);
    }
  };

  /* ── Reject ── */
  const handleReject = async () => {
    if (!token) return;
    const reason = window.prompt("Please provide a reason for rejection (optional):");
    if (reason === null) return; // cancelled
    try {
      setRejecting(true);
      await signTokenApi(token, { action: 'reject', reason });
      setSignSuccess(true);
      const data = await validateTokenApi(token);
      setSignature(data.signature);
      setDocData(data.document);
    } catch (err) {
      alert(err.message || 'Unable to reject document');
    } finally {
      setRejecting(false);
    }
  };

  const handleApply = () => {
    if (modalTab === 'stamp') {
      setCapturedImage(stampImageB64);
    } else if (modalTab === 'type' || modalTab === 'initials_tab') {
      if (modalSubTab === 'draw' && canvasRef.current) {
        setCapturedImage(canvasRef.current.getImageDataUrl());
      } else if (modalSubTab === 'upload') {
        setCapturedImage(uploadedSigImage);
      } else {
        setCapturedImage(null); // use text/font mode
      }
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

  /* ── Already Signed/Rejected ── */
  if (signature && (signature.status === 'signed' || signature.status === 'rejected')) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 p-6">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg border p-8 text-center">
          <div className={`w-14 h-14 ${signature.status === 'signed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {signature.status === 'signed' ? <CheckIcon /> : <XIcon />}
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Signature {signature.status === 'signed' ? 'Completed' : 'Rejected'}
          </h2>
          <p className="text-gray-500 mb-6 text-sm">
            {signature.status === 'signed' 
              ? 'This document has already been signed successfully.' 
              : 'You have rejected signing this document.'}
          </p>
          <Link to="/" className="inline-flex items-center gap-2 bg-[#e8222c] text-white px-6 py-2.5 rounded-lg font-bold hover:opacity-90 transition text-sm">
            Go home
          </Link>
        </div>
      </div>
    );
  }
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
                <FileSignature className="w-12 h-12 text-[#3d5a9a]" />
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
                <Users className="w-12 h-12 text-[#4a7fc1]" />
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

  /* ── Load & validate token ── */

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
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(numPages, p+1))} disabled={currentPage >= numPages}
              className="px-2 h-full flex items-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 rounded-r transition">
              <ChevronRight className="w-3.5 h-3.5" />
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
            className="flex-1 overflow-auto custom-scrollbar flex justify-center items-start relative"
            style={{ background: '#f0f1f5', padding: isSmallScreen ? 12 : 32, userSelect: 'none', WebkitUserSelect: 'none' }}
            onClick={() => setIsSelected(false)}
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

              {/* Field overlay on PDF */}
              {signature && (signature.page_number ?? signature.pageNumber) === currentPage && (() => {
                  const m = signature.metadata || {};
                  const fType = signature.type || 'signature';
                  const w = m.w || 200;
                  const h = m.h || 50;
                  const padLeft = m.padLeft || 0;
                  const padRight = m.padRight || 0;
                  const padTop = m.padTop || 0;
                  const padBottom = m.padBottom || 0;

                  const fieldDefs = {
                    'signature': { label: 'Signature', color: '#e8222c', bg: '#fef2f2' },
                    'initials':  { label: 'Initials',  color: '#e8222c', bg: '#fef2f2' },
                    'name':      { label: 'Name',      color: '#1a1a1a', bg: '#f3f4f6' },
                    'date':      { label: 'Date',      color: '#1a1a1a', bg: '#f3f4f6' },
                    'text':      { label: 'Text',      color: '#1a1a1a', bg: '#f3f4f6' },
                    'stamp':     { label: 'Company Stamp', color: '#8b5cf6', bg: '#f3e8ff' },
                  };
                  const def = fieldDefs[fType] || fieldDefs['signature'];

                  return (
                    <div
                      className="absolute z-20 group"
                      style={{
                        left: `${signature.x}%`,
                        top: `${signature.y}%`,
                        width: w,
                        height: h,
                        transform: 'translate(-50%, -50%)',
                        cursor: isDraggingField ? 'grabbing' : 'grab'
                      }}
                      onMouseDown={handleFieldMouseDown}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (wasDraggingRef.current) return;
                        setIsSelected(true);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (wasDraggingRef.current) return;
                        const typeVal = signature?.type || 'signature';
                        if (typeVal === 'stamp') {
                          setModalTab('stamp');
                        } else if (typeVal === 'initials') {
                          setModalTab('initials_tab');
                          setModalSubTab('type');
                        } else {
                          setModalTab('type');
                          setModalSubTab('type');
                        }
                        setShowModal(true);
                      }}
                    >
                      <div className="flex items-center justify-center w-full h-full rounded"
                        style={{
                          background: isSigned ? 'transparent' : `${def.color}11`,
                          border: `1.5px solid ${def.color}`,
                          paddingTop: 16 + padTop,
                          paddingBottom: padBottom,
                          paddingLeft: padLeft,
                          paddingRight: padRight,
                          backdropFilter: 'blur(1px)',
                        }}
                      >
                        {isSigned ? (
                          capturedImage ? (
                            <img src={capturedImage} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} draggable={false} />
                          ) : (
                            <div className={currentFont.cls} style={{ fontSize: currentFont.size, color: sigEditColor, whiteSpace: 'nowrap' }}>
                              {fType === 'initials' ? initials : name}
                            </div>
                          )
                        ) : (
                          <div className="flex-1 flex items-center justify-center opacity-50">
                             <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm" style={{ color: def.color }}>
                               <PenTool className="w-3.5 h-3.5" />
                             </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Resize handles */}
                      {isSelected && [
                        { dir: 'nw', style: { top: 0, left: 0,    transform: 'translate(-50%,-50%)', cursor: 'nw-resize' } },
                        { dir: 'ne', style: { top: 0, right: 0,   transform: 'translate(50%,-50%)',  cursor: 'ne-resize' } },
                        { dir: 'sw', style: { bottom: 0, left: 0,  transform: 'translate(-50%,50%)', cursor: 'sw-resize' } },
                        { dir: 'se', style: { bottom: 0, right: 0, transform: 'translate(50%,50%)',  cursor: 'se-resize' } },
                        { dir: 'w', style: { top: '50%', left: 0,    transform: 'translate(-50%,-50%)', cursor: 'w-resize' } },
                        { dir: 'e', style: { top: '50%', right: 0,   transform: 'translate(50%,-50%)',  cursor: 'e-resize' } },
                        { dir: 'n', style: { top: 0,    left: '50%', transform: 'translate(-50%,-50%)', cursor: 'n-resize' } },
                        { dir: 's', style: { bottom: 0, left: '50%', transform: 'translate(-50%,50%)',  cursor: 's-resize' } },
                      ].map(({ dir, style }) => (
                        <div key={dir}
                          className="absolute w-3 h-3 bg-white rounded-full z-30"
                          style={{ ...style, border: `2px solid ${def.color}` }}
                          onMouseDown={e => handleResizeStart(e, signature, dir)}
                          onClick={e => e.stopPropagation()} />
                      ))}
                    </div>
                  );
              })()}
            </div>
          </main>

          {/* ── Mobile Sidebar Toggle & Floating Sign Button ── */}
          <div className="lg:hidden fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
            <button
              className="flex items-center gap-2 bg-white text-gray-800 font-bold px-4 py-3 rounded-2xl shadow-xl hover:bg-gray-50 active:scale-95 transition-all border border-gray-200"
              style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
              onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            >
              <Settings className="w-5 h-5" />
              <span className="text-sm">Options</span>
            </button>
            <button
              onClick={handleSign}
              disabled={signing || !isSigned}
              className="flex items-center gap-2 text-white font-bold px-5 py-3 rounded-2xl shadow-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#e8222c', boxShadow: '0 8px 30px rgba(232,34,44,0.35)' }}
            >
              <Check className="w-5 h-5" />
              <span className="text-sm">{signing ? 'Signing...' : 'Sign'}</span>
            </button>
          </div>

          {/* ── Mobile sidebar backdrop ── */}
          {showMobileSidebar && (
            <div
              className="lg:hidden fixed inset-0 z-[70] bg-black/30"
              onClick={() => setShowMobileSidebar(false)}
            />
          )}

          {/* ── RIGHT: Signing Options ── */}
          <aside
            className={`shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-hidden
              fixed lg:static inset-y-0 right-0 z-[80] w-[85vw] sm:w-[340px] lg:w-[320px]
              transition-transform duration-300 ease-out
              ${showMobileSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}
            style={{ top: 0, boxShadow: showMobileSidebar ? '-8px 0 40px rgba(0,0,0,0.15)' : 'none' }}
          >
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-6 border-b border-gray-100" style={{ height: 56 }}>
              <h2 className="font-bold text-gray-900" style={{ fontSize: 22 }}>Signing options</h2>
              <button
                className="lg:hidden p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                onClick={() => setShowMobileSidebar(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6">

              {/* Required Action */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-3 uppercase" style={{ letterSpacing: 0.5 }}>Required Action</p>
                {(() => {
                  const fType = signature?.type || 'signature';
                  const fieldDefs = {
                    'signature': { label: 'Signature', color: '#e8222c', icon: <PenTool size={18} color="#ffffff" /> },
                    'initials':  { label: 'Initials',  color: '#e8222c', icon: <PenTool size={18} color="#ffffff" /> },
                    'name':      { label: 'Name',      color: '#1a1a1a', icon: <Type size={18} color="#ffffff" /> },
                    'date':      { label: 'Date',      color: '#1a1a1a', icon: <Calendar size={18} color="#ffffff" /> },
                    'text':      { label: 'Text',      color: '#1a1a1a', icon: <AlignLeft size={18} color="#ffffff" /> },
                    'stamp':     { label: 'Company Stamp', color: '#8b5cf6', icon: <BadgeCheck size={18} color="#ffffff" /> },
                  };
                  const def = fieldDefs[fType] || fieldDefs['signature'];
                  
                  return (
                    <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:shadow-md transition"
                         style={{ borderLeft: `4px solid ${def.color}` }}
                         onClick={() => {
                           const typeVal = signature?.type || 'signature';
                           if (typeVal === 'stamp') {
                             setModalTab('stamp');
                           } else if (typeVal === 'initials') {
                             setModalTab('initials_tab');
                             setModalSubTab('type');
                           } else {
                             setModalTab('type');
                             setModalSubTab('type');
                           }
                           setShowModal(true);
                         }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: def.color }}>
                        {def.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-gray-900">{def.label}</div>
                        <div className="text-xs text-gray-500 truncate" style={{ maxWidth: 140 }}>
                           {capturedImage ? 'Ready to sign' : (signature?.type === 'initials' ? (initials || 'Click to configure') : (signature?.type === 'stamp' ? 'Click to configure' : (name || 'Click to configure')))}
                        </div>
                      </div>
                      <div className="shrink-0 text-gray-400">
                        <ChevronRightIcon className="w-4 h-4" />
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Sign / Reject buttons */}
            <div className="shrink-0 p-4 border-t border-gray-100 flex flex-col gap-2">
              <button
                onClick={handleSign}
                disabled={signing || rejecting || !signature || !isSigned}
                className="flex items-center justify-between w-full rounded-xl text-white font-bold text-xl px-6 transition hover:opacity-90 disabled:opacity-40"
                style={{ background: '#e8222c', height: 56 }}
              >
                <span>{signing ? 'Signing...' : 'Sign'}</span>
                <div className="flex items-center justify-center w-9 h-9 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <PlayCircle className="w-5 h-5 text-white" />
                </div>
              </button>
              <button
                onClick={handleReject}
                disabled={signing || rejecting || !signature}
                className="flex items-center justify-center w-full rounded-xl text-[#e8222c] font-bold text-lg border-2 border-[#e8222c] transition hover:bg-red-50 disabled:opacity-40"
                style={{ height: 48 }}
              >
                {rejecting ? 'Rejecting...' : 'Reject Document'}
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
              <h2 className="font-bold text-gray-900" style={{ fontSize: 24 }}>
                {modalTab === 'stamp' ? 'Set your company stamp' : modalTab === 'initials_tab' ? 'Set your initials' : 'Set your signature details'}
              </h2>
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
                <User className="w-6 h-6 text-[#e8222c] opacity-60" />
              </div>

              {/* Full name */}
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full name:</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  disabled={modalTab === 'stamp'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 outline-none transition disabled:opacity-50"
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
                  disabled={modalTab === 'stamp'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-800 uppercase outline-none transition disabled:opacity-50"
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
                  <PenTool className="w-4 h-4" />
                )},
                { id: 'initials_tab', label: 'Initials', icon: (
                  <span className="font-bold" style={{ fontSize: 12 }}>AC</span>
                )},
                { id: 'stamp', label: 'Company Stamp', icon: (
                  <BadgeCheck className="w-4 h-4" />
                )},
              ].filter(tab => tab.id === modalTab).map(tab => (
                <button
                  key={tab.id}
                  className="flex items-center gap-2 px-5 py-3 font-semibold text-sm transition border-b-2 cursor-default"
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

              {/* Left icon strip (Type/Draw/Upload sub-tabs) — only for Signature / Initials tab */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && (
                <div
                  className="shrink-0 flex flex-col items-center gap-2 border-r border-gray-100 pt-4 px-3"
                  style={{ width: 56, background: '#fafafa' }}
                >
                  {/* Type icon */}
                  <button
                    onClick={() => setModalSubTab('type')}
                    title="Type"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalSubTab === 'type' ? '#fff' : 'transparent', border: modalSubTab === 'type' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <Type className="w-4 h-4" />
                  </button>
                  {/* Draw icon */}
                  <button
                    onClick={() => setModalSubTab('draw')}
                    title="Draw"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalSubTab === 'draw' ? '#fff' : 'transparent', border: modalSubTab === 'draw' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <PenTool className="w-4 h-4" />
                  </button>
                  {/* Upload icon */}
                  <button
                    onClick={() => setModalSubTab('upload')}
                    title="Upload"
                    className="flex items-center justify-center w-9 h-9 rounded-lg transition"
                    style={{ background: modalSubTab === 'upload' ? '#fff' : 'transparent', border: modalSubTab === 'upload' ? '1px solid #e0e7ef' : '1px solid transparent', color: '#6b7280' }}
                  >
                    <UploadCloud className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* ── Type tab: font-style radio list ── */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && modalSubTab === 'type' && (
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
                          {modalTab === 'initials_tab' ? (initials || 'ME') : (name || 'Signature')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Draw tab ── */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && modalSubTab === 'draw' && (
                <div className="flex-1 flex gap-3 p-4">
                  {/* Canvas */}
                  <div className="flex-1 rounded-lg overflow-hidden border border-gray-200" style={{ background: '#f7f9fc' }}>
                    <SignatureCanvas
                      ref={canvasRef}
                      width={380}
                      height={200}
                      lineColor={sigEditColor}
                      lineWidth={2.5}
                    />
                  </div>
                </div>
              )}

              {/* ── Upload tab ── */}
              {(modalTab === 'type' || modalTab === 'initials_tab') && modalSubTab === 'upload' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
                  <input ref={sigFileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      handleImageUpload(file, setUploadedSigImage);
                    }} />
                  
                  <div onClick={() => sigFileRef.current?.click()} onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault(); const file = e.dataTransfer.files?.[0];
                      handleImageUpload(file, setUploadedSigImage);
                    }}
                    className="w-full rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition hover:border-red-400 hover:bg-red-50"
                    style={{ borderColor: uploadedSigImage ? '#e8222c' : '#d1d5db', background: uploadedSigImage ? '#fdf2f2' : '#fafafa', minHeight: 180 }}>
                    {uploadedSigImage ? (
                      <>
                        <img src={uploadedSigImage} alt="Signature preview" style={{ maxHeight: 110, maxWidth: 300, objectFit: 'contain' }} />
                        <span className="text-xs text-red-500 font-semibold">Click to change</span>
                      </>
                    ) : (
                      <>
                        <button className="font-bold text-[#e8222c] border-2 border-[#e8222c] px-5 py-2 rounded-lg hover:bg-red-50 transition text-sm">Upload Signature</button>
                        <p className="text-sm text-gray-400">or drop file here</p>
                        <p className="text-[10px] text-gray-300">Accepted formats: PNG, JPG and SVG</p>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── Company Stamp tab ── */}
              {modalTab === 'stamp' && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
                  <input ref={stampFileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      handleImageUpload(file, setStampImageB64);
                    }} />
                  
                  <div onClick={() => stampFileRef.current?.click()} onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      e.preventDefault(); const file = e.dataTransfer.files?.[0];
                      handleImageUpload(file, setStampImageB64);
                    }}
                    className="w-full rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition hover:border-purple-400 hover:bg-purple-50"
                    style={{ borderColor: stampImageB64 ? '#8b5cf6' : '#d1d5db', background: stampImageB64 ? '#f5f3ff' : '#fafafa', minHeight: 180 }}>
                    {stampImageB64 ? (
                      <>
                        <img src={stampImageB64} alt="Stamp preview" style={{ maxHeight: 110, maxWidth: 300, objectFit: 'contain' }} />
                        <span className="text-xs text-purple-500 font-semibold">Click to change</span>
                      </>
                    ) : (
                      <>
                        <button className="font-bold text-[#8b5cf6] border-2 border-[#8b5cf6] px-5 py-2 rounded-lg hover:bg-purple-50 transition text-sm">Upload Stamp</button>
                        <p className="text-sm text-gray-400">or drop file here</p>
                        <p className="text-[10px] text-gray-300">Accepted formats: PNG, JPG and SVG</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Color picker row for type/draw */}
            {(modalTab === 'type' || modalTab === 'initials_tab') && (modalSubTab === 'type' || modalSubTab === 'draw') && (
              <div className="flex items-center gap-3 px-8 py-3 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Color:</span>
                {PRESET_COLORS.map(p => (
                  <button key={p.color}
                    onClick={() => setSigEditColor(p.color)}
                    className="w-7 h-7 rounded-full border-2 transition flex items-center justify-center"
                    style={{
                      background: p.color,
                      borderColor: sigEditColor === p.color ? '#94a3b8' : 'transparent',
                      boxShadow: sigEditColor === p.color ? `0 0 0 2px white, 0 0 0 4px ${p.color}` : 'none',
                    }}
                    title={p.label}
                  />
                ))}
                {/* Color wheel / custom picker */}
                <label className="relative w-7 h-7 rounded-full overflow-hidden border-2 cursor-pointer flex items-center justify-center"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
                    borderColor: !PRESET_COLORS.find(p => p.color === sigEditColor) ? '#94a3b8' : '#e5e7eb',
                    boxShadow: !PRESET_COLORS.find(p => p.color === sigEditColor) ? `0 0 0 2px white, 0 0 0 4px ${sigEditColor}` : 'none',
                  }}
                  title="Custom color">
                  <input type="color" value={sigEditColor}
                    onChange={e => setSigEditColor(e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
              </div>
            )}

            {/* Modal footer */}
            <div className="shrink-0 flex items-center justify-end gap-3 px-8 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-100 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={modalTab === 'stamp' ? !stampImageB64 : (modalSubTab === 'upload' ? !uploadedSigImage : false)}
                className="text-white font-bold px-8 py-2.5 rounded-lg transition hover:opacity-90 text-sm disabled:opacity-50"
                style={{ background: '#f87171' }} // Using the specific light red visible in user's image, wait the image showed pink/light-red (could be from transparency disabled or actual color `#f87171` if disabled) Wait, in Home.jsx the background is #e8222c. 
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
