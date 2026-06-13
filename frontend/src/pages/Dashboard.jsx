import { useEffect, useRef, useState, useCallback } from 'react';
import NeonSweepButton from '../components/NeonSweepButton';
import { Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  fetchDocumentFile,
  getDocument,
  listDocuments,
  getSignatures,
  createSignature,
  deleteSignature,
  generateSignatureToken,
  deleteDocument,
  updateSignatureCoords,
} from '../lib/documents';

/* ── helpers ── */
const DragHandle = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="#9ca3af">
    <circle cx="4" cy="3" r="1.2" /><circle cx="4" cy="7" r="1.2" /><circle cx="4" cy="11" r="1.2" />
    <circle cx="10" cy="3" r="1.2" /><circle cx="10" cy="7" r="1.2" /><circle cx="10" cy="11" r="1.2" />
  </svg>
);
const PencilIcon = ({ color = '#4a7fc1', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);
const XIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
  </svg>
);

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const pdfWrapperRef = useRef(null);
  const pageCanvasRef = useRef(null);
  const token = localStorage.getItem('token');

  const [documents, setDocuments] = useState([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState(location.state?.uploadedDocumentId || null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(680);
  const [previewData, setPreviewData] = useState(null);
  const [signatures, setSignatures] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [toast, setToast] = useState('');
  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const [deletingId, setDeletingId] = useState(null);
  const [isOpeningFile, setIsOpeningFile] = useState(false);

  // Password modal state
  const [pwModal, setPwModal] = useState(null); // { callback, reason }
  const [pwInput, setPwInput] = useState('');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [checkedDocumentIds, setCheckedDocumentIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Dragging placed fields
  const [draggingFieldId, setDraggingFieldId] = useState(null);
  const dragOffsetRef = useRef({ ox: 0, oy: 0 }); // pixel offset of grab point from field center
  const [isSigning, setIsSigning] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editText, setEditText] = useState('');
  const [selectedFieldId, setSelectedFieldId] = useState(null); // click-to-activate
  const [resizingInfo, setResizingInfo] = useState(null); // { fieldId, dir, anchorX, anchorY }

  // Signature/Initials edit modal (ilovepdf style)
  const [sigEditModal, setSigEditModal] = useState(null); // { sig, tab: 'type'|'draw' }
  const [sigEditFont, setSigEditFont] = useState('greatvibes');
  const [sigEditText, setSigEditText] = useState('');
  const [sigEditColor, setSigEditColor] = useState('#1a1a1a');
  const drawingRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef(null);

  // Company Stamp modal
  const [stampModal, setStampModal] = useState(null); // { pendingX, pendingY, sig (for edit) }
  const [stampCompanyName, setStampCompanyName] = useState('');
  const [stampImageB64, setStampImageB64] = useState(null); // base64 data URL
  const stampFileRef = useRef(null);

  // Per-field-type color overrides (double-click sidebar item to change)
  const [fieldColors, setFieldColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('fieldColors') || '{}'); } catch { return {}; }
  });
  const colorInputRef = useRef(null);
  const [colorPickingType, setColorPickingType] = useState(null);

  const handleFieldColorPick = (type, color) => {
    const updated = { ...fieldColors, [type]: color };
    setFieldColors(updated);
    localStorage.setItem('fieldColors', JSON.stringify(updated));
    setColorPickingType(null);
  };

  const openColorPicker = (e, type) => {
    e.stopPropagation();
    e.preventDefault();
    setColorPickingType(type);
    // Trigger the hidden color input immediately
    setTimeout(() => colorInputRef.current?.click(), 0);
  };

  const SIG_FONTS = [
    { id: 'greatvibes',  label: 'Great Vibes',   cls: 'font-greatvibes',  size: 32 },
    { id: 'dancing',     label: 'Dancing Script', cls: 'font-dancing',     size: 28 },
    { id: 'sacramento',  label: 'Sacramento',     cls: 'font-sacramento',  size: 32 },
    { id: 'pacifico',    label: 'Pacifico',       cls: 'font-pacifico',    size: 22 },
    { id: 'pinyon',      label: 'Pinyon Script',  cls: 'font-pinyon',      size: 30 },
  ];

  /* helpers */
  const getDefaultFieldSize = (type) => {
    switch(type) {
      case 'signature': return { w: 260, h: 70 };
      case 'initials':  return { w: 120, h: 62 };
      case 'name':      return { w: 200, h: 46 };
      case 'date':      return { w: 150, h: 42 };
      case 'text':      return { w: 170, h: 42 };
      case 'stamp':     return { w: 150, h: 72 };
      default:          return { w: 170, h: 46 };
    }
  };
  const getFieldSize = (sig) => {
    const m = sig.metadata || {};
    const d = getDefaultFieldSize(sig.type);
    return { w: m.w || d.w, h: m.h || d.h };
  };
  const getFontFamily = (font) => {
    if (!font || font === 'Inter') return 'Inter, sans-serif';
    const map = { greatvibes: 'Great Vibes', dancing: 'Dancing Script', sacramento: 'Sacramento', pacifico: 'Pacifico', pinyon: 'Pinyon Script' };
    return `'${map[font] || font}', cursive`;
  };
  
  // Signing mode from localStorage (set on Home page)
  const signingMode = localStorage.getItem('signingMode') || 'only_me'; // 'only_me' | 'several_people'
  const isOnlyMe = signingMode === 'only_me';
  
  // Local signature config
  const sigConfig = JSON.parse(localStorage.getItem('signatureConfig') || '{"name":"","initials":"","font":"Dancing Script"}');
  
  // Field type definitions
  // Icon sizes are computed to fill the 26×26 sidebar icon container (same logic as PDF canvas fields)
  // availH=22, maxFontH=22*0.72≈16 for sans-serif | 22*0.90≈20 but single-char so width wins
  const fieldDefinitions = [
    { type: 'signature',   label: 'Signature',     icon: <PencilIcon color="#e8222c" size={18}/>, color: '#e8222c', bg: '#fef2f2' },
    { type: 'initials',   label: 'Initials',      icon: <PencilIcon color="#f59e0b" size={18}/>, color: '#f59e0b', bg: '#fffbeb' },
    { type: 'name',       label: 'Name',          icon: <span style={{fontSize:16, fontWeight:'bold', color:'#3b82f6', lineHeight:1}}>A</span>, color: '#3b82f6', bg: '#eff6ff' },
    { type: 'date',       label: 'Date',          icon: <span style={{fontSize:14, fontWeight:'bold', color:'#10b981', lineHeight:1}}>12</span>, color: '#10b981', bg: '#ecfdf5' },
    { type: 'text',       label: 'Text',          icon: <span style={{fontSize:16, fontWeight:'bold', color:'#6366f1', lineHeight:1}}>T</span>, color: '#6366f1', bg: '#eef2ff' },
    { type: 'stamp',      label: 'Company Stamp', icon: <span style={{fontSize:16, fontWeight:'bold', color:'#8b5cf6', lineHeight:1}}>©</span>, color: '#8b5cf6', bg: '#f5f3ff' },
  ];

  /* ── resize observer ── */
  useEffect(() => {
    if (!pdfWrapperRef.current || typeof ResizeObserver === 'undefined') return;
    const obs = new ResizeObserver(([entry]) => {
      setPageWidth(Math.min(Math.max(300, Math.floor(entry.contentRect.width - 48)), 860));
    });
    obs.observe(pdfWrapperRef.current);
    return () => obs.disconnect();
  }, []);

  /* ── load document list — runs once on mount, then only if token changes ──
     IMPORTANT: do NOT add location.state here. Calling navigate('/dashboard',
     {replace:true}) to clear router state changes location, which would
     re-trigger this effect and cause a full refetch on every interaction. */
  const stateProcessedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!token) { setIsLoadingDocuments(false); return; }
      try {
        setIsLoadingDocuments(true);
        const docs = await listDocuments();
        if (!mounted) return;
        setDocuments(docs);
        const prefId = !stateProcessedRef.current ? location.state?.uploadedDocumentId : null;
        setSelectedDocumentId(cur => {
          if (prefId && docs.some(d => d.id === prefId)) return prefId;
          if (cur  && docs.some(d => d.id === cur))    return cur;
          return docs[0]?.id || null;
        });
        if (!stateProcessedRef.current) {
          stateProcessedRef.current = true;
          if (location.state?.uploadedDocumentId || location.state?.refreshDocuments)
            navigate('/dashboard', { replace: true });
        }
      } catch (err) {
        console.error(err);
        if (err.message?.includes('token')) { localStorage.removeItem('token'); navigate('/login'); }
      } finally {
        if (mounted) setIsLoadingDocuments(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  /* ── load selected document metadata ── */
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedDocumentId) { setSelectedDocument(null); return; }
      try {
        setIsLoadingDocument(true);
        // Don't blank the PDF — keep showing old content while new one loads
        setNumPages(0);
        setCurrentPage(1);
        const doc = await getDocument(selectedDocumentId);
        if (mounted) setSelectedDocument(doc);
      } catch (err) { console.error(err); }
      finally { if (mounted) setIsLoadingDocument(false); }
    };
    load();
    return () => { mounted = false; };
  }, [selectedDocumentId]);

  /* ── load signatures ── */
  const refreshSigs = useCallback(async (docId) => {
    if (!docId) { setSignatures([]); return; }
    try { setSignatures((await getSignatures(docId)) || []); }
    catch { setSignatures([]); }
  }, []);

  useEffect(() => { refreshSigs(selectedDocumentId); }, [selectedDocumentId, refreshSigs]);

  /* ── fetch PDF blob URL ──
     We use a blob: URL (not Uint8Array) because react-pdf TRANSFERS the
     ArrayBuffer on first render, neutering it for all subsequent <Document>
     instances (thumbnails, main viewer). A URL string is never consumed.
     We only re-run when selectedDocumentId changes, NOT when selectedDocument
     metadata updates — that would double-fire for the same doc. */
  const blobUrlRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    const loadPdf = async () => {
      // Clear old URL and previewData to completely unmount the old <Document>
      // This stops any pending password prompts from bleeding into the next file
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
      setPreviewData(null);
      setPwModal(null);
      setPwInput('');

      if (!selectedDocumentId) return;
      try {
        const blob = await fetchDocumentFile(selectedDocumentId, false);
        if (!mounted) return;
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setPreviewData(url); // atomic swap — no blank flash
      } catch (err) { console.error(err); }
    };
    loadPdf();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocumentId]);

  /* ── drag & drop ── */
  const handleDragStart = (e, type) => {
    e.stopPropagation();
    e.dataTransfer.setData('sigType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };
  const handleDragOver  = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDragOver(true); };
  const handleDragLeave = (e) => { if (!pageCanvasRef.current?.contains(e.relatedTarget)) setIsDragOver(false); };
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!selectedDocumentId || !pageCanvasRef.current) return;
    
    const type = e.dataTransfer.getData('sigType');
    if (!type) return;

    const rect = pageCanvasRef.current.getBoundingClientRect();
    const dSize = getDefaultFieldSize(type);
    const wPct = (dSize.w / rect.width) * 100;
    const hPct = (dSize.h / rect.height) * 100;

    let minX = wPct / 2;
    let maxX = 100 - wPct / 2;
    if (minX > maxX) { minX = 50; maxX = 50; }
    const x = Math.max(minX, Math.min(maxX, ((e.clientX - rect.left) / rect.width) * 100));

    let minY = hPct / 2;
    let maxY = 100 - hPct / 2;
    if (minY > maxY) { minY = 50; maxY = 50; }
    const y = Math.max(minY, Math.min(maxY, ((e.clientY - rect.top) / rect.height) * 100));

    let metadata = {};
    // Use per-type custom color if set, else fall back to sigConfig color
    const fieldColor = fieldColors[type] || sigConfig.color || '#1a1a1a';
    if (type === 'signature') metadata = { text: sigConfig.name, font: sigConfig.font, color: fieldColors['signature'] || sigConfig.color || '#1a1a1a', drawingImage: sigConfig.drawingImage };
    else if (type === 'initials') metadata = { text: sigConfig.initials, font: sigConfig.font, color: fieldColors['initials'] || sigConfig.color || '#1a1a1a' };
    else if (type === 'name') metadata = { text: sigConfig.name, font: 'Inter', color: fieldColor };
    else if (type === 'date') metadata = { text: new Date().toLocaleDateString(), font: 'Inter', color: fieldColor };
    else if (type === 'text') metadata = { text: 'Double click to edit', font: 'Inter', color: fieldColor };
    else if (type === 'stamp') {
      // Show stamp config modal instead of placing immediately
      setStampCompanyName('');
      setStampImageB64(null);
      setStampModal({ pendingX: x, pendingY: y });
      return;
    }

    try {
      const newSig = await createSignature(selectedDocumentId, { pageNumber: currentPage, x, y, type, metadata });
      // Append the new field directly — do NOT call refreshSigs here.
      // refreshSigs replaces the entire local state from the backend, which would
      // discard any locally-applied customizations (color, font, etc.) on existing
      // fields that haven't been fully flushed yet.
      if (newSig) {
        setSignatures(prev => [...prev, newSig]);
      } else {
        await refreshSigs(selectedDocumentId); // fallback if backend didn't return the sig
      }
    } catch (err) { showToast('⚠️ ' + (err.message || 'Unable to place field')); }
  };

  /* ── move placed fields + resize ── */
  const handleFieldMouseDown = (e, sigId) => {
    e.stopPropagation();
    setSelectedFieldId(sigId);
    // Capture where inside the field the user grabbed (offset from the field's center)
    if (pageCanvasRef.current) {
      const rect = pageCanvasRef.current.getBoundingClientRect();
      const sigField = signatures.find(s => s.id === sigId);
      if (sigField) {
        const centerX = (sigField.x / 100) * rect.width  + rect.left;
        const centerY = (sigField.y / 100) * rect.height + rect.top;
        dragOffsetRef.current = { ox: e.clientX - centerX, oy: e.clientY - centerY };
      }
    }
    setDraggingFieldId(sigId);
  };

  const handleResizeStart = (e, sig, dir) => {
    e.stopPropagation();
    e.preventDefault();
    if (!pageCanvasRef.current) return;
    const { w, h } = getFieldSize(sig);
    const rect = pageCanvasRef.current.getBoundingClientRect();
    const cx = (sig.x / 100) * rect.width;
    const cy = (sig.y / 100) * rect.height;
    // anchor = opposite corner/edge from the handle being dragged
    let anchorX, anchorY;
    if (dir === 'se') { anchorX = cx - w / 2; anchorY = cy - h / 2; } // TL anchored
    if (dir === 'sw') { anchorX = cx + w / 2; anchorY = cy - h / 2; } // TR anchored
    if (dir === 'ne') { anchorX = cx - w / 2; anchorY = cy + h / 2; } // BL anchored
    if (dir === 'nw') { anchorX = cx + w / 2; anchorY = cy + h / 2; } // BR anchored
    if (dir === 'e')  { anchorX = cx - w / 2; anchorY = cy; }          // Left-center anchored
    if (dir === 'w')  { anchorX = cx + w / 2; anchorY = cy; }          // Right-center anchored
    if (dir === 'n')  { anchorX = cx; anchorY = cy + h / 2; }          // Bottom-center anchored
    if (dir === 's')  { anchorX = cx; anchorY = cy - h / 2; }          // Top-center anchored
    setResizingInfo({ fieldId: sig.id, dir, anchorX, anchorY, currentH: h, currentW: w });
  };

  const handleGlobalMouseMove = (e) => {
    if (resizingInfo && pageCanvasRef.current) {
      const rect = pageCanvasRef.current.getBoundingClientRect();
      const mx = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const my = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const { dir, anchorX, anchorY, fieldId } = resizingInfo;
      let newW, newH, newCX, newCY;
      const MIN_W = 60, MIN_H = 28;
      // Estimate min width from text length so field can't be shrunk below readable size
      const sigField = signatures.find(s => s.id === fieldId);
      const textLen = (sigField?.metadata?.text || '').length || 4;
      const isCursiveField = sigField?.type === 'signature' || sigField?.type === 'initials';
      const estimatedMinW = Math.max(MIN_W, textLen * (isCursiveField ? 14 : 8));
      const aspect = resizingInfo.currentW / resizingInfo.currentH;
      
      let maxW = rect.width;
      let maxH = rect.height;
      if (dir.includes('e')) maxW = rect.width - anchorX;
      if (dir.includes('w')) maxW = anchorX;
      if (dir.includes('s')) maxH = rect.height - anchorY;
      if (dir.includes('n')) maxH = anchorY;

      if (dir === 'se' || dir === 'sw' || dir === 'ne' || dir === 'nw') {
        const capH = Math.min(maxH, maxW / aspect);
        const minH = Math.max(MIN_H, estimatedMinW / aspect);
        newH = Math.max(minH, Math.min(capH, Math.abs(my - anchorY)));
        newW = newH * aspect;
        
        const isEast = dir.includes('e');
        const isSouth = dir.includes('s');
        newCX = isEast ? anchorX + newW / 2 : anchorX - newW / 2;
        newCY = isSouth ? anchorY + newH / 2 : anchorY - newH / 2;
      } else {
        // Mid-edge handles: freeform stretch
        if (dir === 'e') { newW = Math.max(estimatedMinW, Math.min(maxW, mx - anchorX)); newH = resizingInfo.currentH; newCX = anchorX + newW / 2; newCY = anchorY; }
        if (dir === 'w') { newW = Math.max(estimatedMinW, Math.min(maxW, anchorX - mx)); newH = resizingInfo.currentH; newCX = anchorX - newW / 2; newCY = anchorY; }
        if (dir === 'n') { newH = Math.max(MIN_H, Math.min(maxH, anchorY - my)); newW = resizingInfo.currentW; newCX = anchorX; newCY = anchorY - newH / 2; }
        if (dir === 's') { newH = Math.max(MIN_H, Math.min(maxH, my - anchorY)); newW = resizingInfo.currentW; newCX = anchorX; newCY = anchorY + newH / 2; }
      }

      const wPct = (newW / rect.width) * 100;
      const hPct = (newH / rect.height) * 100;
      const newX = Math.max(wPct / 2, Math.min(100 - wPct / 2, (newCX / rect.width) * 100));
      const newY = Math.max(hPct / 2, Math.min(100 - hPct / 2, (newCY / rect.height) * 100));

      setSignatures(sigs => sigs.map(s => s.id === fieldId
        ? { ...s, x: newX, y: newY, metadata: { ...(s.metadata || {}), w: Math.round(newW), h: Math.round(newH) } }
        : s
      ));
      return;
    }
    if (!draggingFieldId || !pageCanvasRef.current) return;
    const rect = pageCanvasRef.current.getBoundingClientRect();
    const sigField = signatures.find(s => s.id === draggingFieldId);
    if (!sigField) return;
    const { w, h } = getFieldSize(sigField);

    // Subtract grab offset so the field doesn't snap its center to the cursor
    const { ox, oy } = dragOffsetRef.current;
    const rawCX = e.clientX - ox - rect.left; // desired center X in px relative to page
    const rawCY = e.clientY - oy - rect.top;  // desired center Y in px relative to page

    // Clamp so no part of the field escapes the page boundary
    const halfW = w / 2;
    const halfH = h / 2;
    const clampedCX = Math.max(halfW, Math.min(rect.width  - halfW, rawCX));
    const clampedCY = Math.max(halfH, Math.min(rect.height - halfH, rawCY));

    const x = (clampedCX / rect.width)  * 100;
    const y = (clampedCY / rect.height) * 100;

    setSignatures(sigs => sigs.map(s => s.id === draggingFieldId ? { ...s, x, y } : s));
  };

  const handleGlobalMouseUp = async (e) => {
    if (resizingInfo) {
      const field = signatures.find(s => s.id === resizingInfo.fieldId);
      setResizingInfo(null);
      if (field && selectedDocumentId) {
        try {
          await updateSignatureCoords(selectedDocumentId, field.id, {
            pageNumber: field.page_number ?? field.pageNumber,
            x: field.x, y: field.y, metadata: field.metadata,
          });
        } catch { showToast('⚠️ Failed to save size'); }
      }
      return;
    }
    if (draggingFieldId) {
      const sigToUpdate = signatures.find(s => s.id === draggingFieldId);
      setDraggingFieldId(null);
      if (sigToUpdate && selectedDocumentId) {
        try {
          await updateSignatureCoords(selectedDocumentId, draggingFieldId, { pageNumber: sigToUpdate.pageNumber || sigToUpdate.page_number, x: sigToUpdate.x, y: sigToUpdate.y });
        } catch (err) {
          showToast('⚠️ Failed to save field position');
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingFieldId, resizingInfo, signatures]);

  /* ── signature actions ── */
  const handleDeleteSig = async (sig) => {
    setDeletingId(sig.id);
    try { await deleteSignature(selectedDocumentId, sig.id); await refreshSigs(selectedDocumentId); showToast('Field removed.'); }
    catch (err) { showToast('⚠️ ' + (err.message || 'Error')); }
    finally { setDeletingId(null); }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedFieldId && !editingFieldId) {
        const sigToDelete = signatures.find(s => s.id === selectedFieldId);
        if (sigToDelete) {
          e.preventDefault();
          handleDeleteSig(sigToDelete);
          setSelectedFieldId(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFieldId, editingFieldId, signatures, selectedDocumentId]);

  const handleShare = async (sig) => {
    try {
      const t = await generateSignatureToken(sig.id);
      await navigator.clipboard.writeText(`${window.location.origin}/sign?token=${encodeURIComponent(t)}`);
      showToast('✅ Link copied!');
    } catch (err) { showToast('⚠️ ' + (err.message || 'Error')); }
  };

  /* ── stamp modal handlers ── */
  const handleOpenStampEdit = (e, sig) => {
    e.stopPropagation();
    const meta = sig.metadata || {};
    setStampCompanyName(meta.text && meta.text !== 'Stamp Placeholder' ? meta.text : '');
    setStampImageB64(meta.image || null);
    setStampModal({ sig }); // editing existing field
  };

  const handleStampApply = async () => {
    if (!stampModal) return;
    const { pendingX, pendingY, sig } = stampModal;
    const metadata = {
      text: stampCompanyName || 'Company Stamp',
      font: 'Inter',
      ...(stampImageB64 ? { image: stampImageB64 } : {}),
    };
    setStampModal(null);

    if (sig) {
      // Editing existing placed stamp
      setSignatures(sigs => sigs.map(s =>
        s.id === sig.id ? { ...s, metadata } : s
      ));
      try {
        await updateSignatureCoords(selectedDocumentId, sig.id, {
          pageNumber: sig.page_number ?? sig.pageNumber,
          x: sig.x, y: sig.y, metadata,
        });
      } catch (err) { showToast('⚠️ ' + err.message); }
    } else {
      // Creating new stamp field at drop position
      try {
        const newSig = await createSignature(selectedDocumentId, {
          pageNumber: currentPage, x: pendingX, y: pendingY,
          type: 'stamp', metadata,
        });
        if (newSig) {
          setSignatures(prev => [...prev, newSig]);
        } else {
          await refreshSigs(selectedDocumentId);
        }
      } catch (err) { showToast('⚠️ ' + (err.message || 'Unable to place field')); }
    }
  };

  const handleOpenSigEdit = (e, sig) => {
    e.stopPropagation();
    const meta = sig.metadata || {};
    setSigEditFont(meta.font || 'greatvibes');
    setSigEditColor(meta.color || '#1a1a1a');
    // For initials: auto-compute from name if not set
    let textVal = meta.text || '';
    if (!textVal) {
      const fullName = sigConfig.name || '';
      if (sig.type === 'initials') {
        textVal = fullName.trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('');
      } else {
        textVal = fullName;
      }
    }
    setSigEditText(textVal);
    setSigEditModal({ sig, tab: 'type' });
  };

  const handleSigEditApply = async () => {
    if (!sigEditModal) return;
    const { sig } = sigEditModal;
    // For draw tab, capture canvas as dataURL
    let drawingDataUrl = null;
    if (sigEditModal.tab === 'draw' && drawingRef.current) {
      drawingDataUrl = drawingRef.current.toDataURL('image/png');
    }
    const newMeta = {
      ...(sig.metadata || {}),
      font: sigEditFont,
      text: sigEditText,
      color: sigEditColor,
      ...(drawingDataUrl ? { drawingImage: drawingDataUrl } : {}),
    };
    setSignatures(sigs => sigs.map(s => s.id === sig.id ? { ...s, metadata: newMeta } : s));
    setSigEditModal(null);
    try {
      await updateSignatureCoords(selectedDocumentId, sig.id, {
        pageNumber: sig.page_number ?? sig.pageNumber,
        x: sig.x, y: sig.y, metadata: newMeta,
      });
    } catch (err) { showToast('⚠️ Failed to save: ' + err.message); }
  };

  /* ── inline field text editing ── */
  const handleFieldDoubleClick = (e, sig) => {
    e.stopPropagation();
    if (sig.type === 'date') return; // date is auto-generated, not manually editable inline
    if (sig.type === 'signature' || sig.type === 'initials') {
      handleOpenSigEdit(e, sig); // open the signature/initials style editor
      return;
    }
    if (sig.type === 'stamp') {
      handleOpenStampEdit(e, sig); // open the stamp editor
      return;
    }
    setEditingFieldId(sig.id);
    setEditText((sig.metadata || {}).text || '');
  };

  const handleFieldTextSave = async (sig) => {
    const newText = editText.trim();
    setEditingFieldId(null);
    if (!newText) return;
    // Optimistically update local state
    setSignatures(sigs => sigs.map(s =>
      s.id === sig.id ? { ...s, metadata: { ...(s.metadata || {}), text: newText } } : s
    ));
    // Persist via the PUT signatures endpoint
    try {
      await updateSignatureCoords(selectedDocumentId, sig.id, {
        pageNumber: sig.page_number ?? sig.pageNumber,
        x: sig.x,
        y: sig.y,
        metadata: { ...(sig.metadata || {}), text: newText },
      });
    } catch (err) {
      showToast('⚠️ Failed to save text: ' + err.message);
    }
  };

  /* ── sign all fields (only_me mode) ── */
  const handleSignAndDownload = async () => {
    if (!selectedDocumentId || signatures.length === 0) return;
    try {
      setIsSigning(true);
      const { signWithToken } = await import('../lib/documents');
      const pendingSigs = signatures.filter(s => s.status === 'pending');
      for (const sig of pendingSigs) {
        const t = await generateSignatureToken(sig.id);
        const meta = sig.metadata || {};
        // Pass the specific text for this field type so the backend renders it correctly
        await signWithToken(t, {
          signerName: sigConfig.name || 'Me',
          fieldType: sig.type,
          fieldText: meta.text || '',
          fieldFont: meta.font || 'Inter',
        });
      }
      await refreshSigs(selectedDocumentId);
      // Navigate to the success page instead of auto-downloading
      const safeName = selectedDocument?.originalName || 'document.pdf';
      navigate(`/signed?docId=${selectedDocumentId}&name=${encodeURIComponent(safeName)}`);
    } catch (err) {
      showToast('⚠️ ' + (err.message || 'Signing failed'));
    } finally {
      setIsSigning(false);
    }
  };
  const handleDownload = async (isDownload = false) => {
    if (!selectedDocumentId) return;
    try {
      setIsOpeningFile(true);
      const blob = await fetchDocumentFile(selectedDocumentId, isDownload);
      const url  = URL.createObjectURL(blob);
      if (isDownload) {
        // Always ensure .pdf extension on the downloaded filename
        const rawName = selectedDocument?.originalName || 'document';
        const safeFilename = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
        const a = window.document.createElement('a');
        a.href = url; a.download = safeFilename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } else { window.open(url, '_blank'); }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) { showToast('⚠️ ' + err.message); }
    finally { setIsOpeningFile(false); }
  };

  /* ── delete ── */
  const handleDelete = () => { if (selectedDocumentId) setShowDeleteModal(true); };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      if (pwModal) { pwModal.callback(null); setPwModal(null); setPwInput(''); }
      await deleteDocument(selectedDocumentId);
      const docs = await listDocuments();
      setDocuments(docs);
      setSelectedDocumentId(docs[0]?.id || null);
      setShowDeleteModal(false);
      showToast('Document deleted.');
    } catch (err) { showToast('⚠️ ' + (err.message || 'Error')); }
    finally { setIsDeleting(false); }
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      if (pwModal) { pwModal.callback(null); setPwModal(null); setPwInput(''); }
      for (const id of checkedDocumentIds) {
        await deleteDocument(id);
      }
      const docs = await listDocuments();
      setDocuments(docs);
      if (checkedDocumentIds.includes(selectedDocumentId)) {
        setSelectedDocumentId(docs[0]?.id || null);
      }
      setCheckedDocumentIds([]);
      setShowBulkDeleteModal(false);
      showToast('Selected documents deleted.');
    } catch (err) { showToast('⚠️ ' + (err.message || 'Error deleting some documents')); }
    finally { setIsDeleting(false); }
  };

  const toggleDocumentCheck = (id) => {
    setCheckedDocumentIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  /* ── password (react-pdf onPassword callback) ── */
  const handlePassword = (callback, reason) => { setPwInput(''); setPwModal({ callback, reason }); };
  const submitPassword = () => { if (!pwModal) return; pwModal.callback(pwInput); setPwModal(null); setPwInput(''); };

  const isSigned  = selectedDocument?.status === 'signed';
  const pageSigs  = signatures.filter(s => (s.page_number ?? s.pageNumber) === currentPage);

  /* ════════════════════════════════════════════════════════ RENDER ═══ */
  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', background: '#f0f1f5', overflow: 'hidden' }}>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-xl animate-fade-in">
          {toast}
        </div>
      )}

      {/* ── Page nav toolbar ── */}
      {selectedDocument && (
        <div className="shrink-0 flex items-center gap-3 px-4 border-b border-gray-200 bg-white" style={{ height: 48 }}>
          <div className="flex items-center bg-gray-100 rounded" style={{ height: 30 }}>
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage <= 1}
              className="px-2 h-full flex items-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 rounded-l transition">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 3l5 6H1z" /></svg>
            </button>
            <button onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))} disabled={currentPage >= numPages}
              className="px-2 h-full flex items-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 rounded-r transition">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor"><path d="M6 9L1 3h10z" /></svg>
            </button>
          </div>
          <div className="flex items-center gap-1 text-sm text-gray-700 border border-gray-200 rounded px-2 py-0.5 bg-white">
            <span className="font-bold">{currentPage}</span><span className="text-gray-400">/</span><span>{numPages || 1}</span>
          </div>
          <div className="relative flex items-center">
            <select
              value={selectedDocumentId || ''}
              onChange={(e) => setSelectedDocumentId(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded px-3 py-1 pr-8 text-sm font-medium text-gray-700 outline-none hover:bg-gray-50 transition cursor-pointer max-w-[250px] truncate"
            >
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>{doc.originalName}</option>
              ))}
            </select>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="#9ca3af" className="absolute right-2.5 pointer-events-none">
              <path d="M6 8L2 4h8z" />
            </svg>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            {isSigned && (
              <button onClick={() => handleDownload(true)} disabled={isOpeningFile}
                className="flex items-center gap-1.5 text-xs font-bold text-white px-3 py-1.5 rounded-lg transition hover:opacity-90"
                style={{ background: '#22c55e' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg>
                Download Signed
              </button>
            )}
            <NeonSweepButton onClick={() => handleDownload(false)}
              tone="slate" size="sm" className="px-4 text-xs font-semibold">
              Open
            </NeonSweepButton>
            {token && (
              <NeonSweepButton onClick={handleDelete}
                tone="danger" size="sm" className="px-4 text-xs font-semibold">
                Delete
              </NeonSweepButton>
            )}
          </div>
        </div>
      )}

      {/* ── Three-panel editor ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: thumbnail strip ── */}
        <aside className="shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto custom-scrollbar" style={{ width: 160 }}>
          {isLoadingDocuments ? (
            <div className="p-3 space-y-2">
              {[1,2].map(i => <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : (
            <>
              {documents.length > 0 && (
                <div className="p-2 border-b border-gray-100">
                  {checkedDocumentIds.length > 0 && (
                    <button onClick={() => setShowBulkDeleteModal(true)} className="w-full mb-2 bg-red-50 text-red-600 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1 hover:bg-red-100 border border-red-200 transition">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
                      Delete Selected ({checkedDocumentIds.length})
                    </button>
                  )}
                  {documents.map(doc => {
                    const isSel = doc.id === selectedDocumentId;
                    const isChecked = checkedDocumentIds.includes(doc.id);
                    return (
                      <div key={doc.id} className={`flex items-center w-full rounded-lg mb-1 transition border ${isSel ? 'bg-red-50 border-[#e8222c]/30' : 'hover:bg-gray-50 border-transparent'}`}>
                        <div className="pl-2 flex items-center justify-center">
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => toggleDocumentCheck(doc.id)}
                            className="w-3.5 h-3.5 text-[#e8222c] bg-white border-gray-300 rounded focus:ring-[#e8222c] cursor-pointer accent-[#e8222c]"
                          />
                        </div>
                        <button onClick={() => setSelectedDocumentId(doc.id)}
                          className="flex-1 text-left p-2 text-xs flex flex-col overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill={isSel ? '#e8222c' : '#9ca3af'} className="shrink-0">
                              <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                            </svg>
                            <span className={`truncate font-medium ${isSel ? 'text-[#e8222c]' : 'text-gray-600'}`}>{doc.originalName}</span>
                          </div>
                          {doc.status === 'signed' && (
                            <span className="mt-1 inline-block text-[9px] font-bold text-green-600 bg-green-50 rounded px-1.5 py-0.5 w-max">SIGNED</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                  <Link to="/" className="block text-center text-[10px] font-bold text-[#e8222c] hover:underline mt-1 py-1">+ Upload PDF</Link>
                </div>
              )}

              {numPages > 0 && (
                <div className="flex flex-col items-center gap-3 p-3">
                  {Array.from({ length: numPages }, (_, i) => i + 1).map(pg => (
                    <button key={pg} onClick={() => setCurrentPage(pg)} className="flex flex-col items-center gap-1 group transition">
                      <div className={`border-2 rounded overflow-hidden transition ${currentPage === pg ? 'border-[#e8222c] shadow-md' : 'border-gray-200 group-hover:border-gray-400'}`} style={{ width: 112 }}>
                        {previewData && (
                          <Document file={previewData} loading={<div style={{ width: 112, height: 140, background: '#f3f4f6' }} />} onPassword={handlePassword}>
                            <Page pageNumber={pg} width={112} renderAnnotationLayer={false} renderTextLayer={false} />
                          </Document>
                        )}
                      </div>
                      <span className={`text-[10px] font-bold ${currentPage === pg ? 'text-[#e8222c]' : 'text-gray-400'}`}>{pg}</span>
                    </button>
                  ))}
                </div>
              )}

              {documents.length === 0 && (
                <div className="p-4 text-center">
                  <p className="text-xs text-gray-400 mt-4">No documents yet.</p>
                  <Link to="/" className="block mt-3 text-xs font-bold text-[#e8222c] hover:underline">Upload PDF</Link>
                </div>
              )}
            </>
          )}
        </aside>

        {/* ── CENTER: PDF canvas ── */}
        <main ref={pdfWrapperRef}
          className="flex-1 overflow-auto custom-scrollbar flex justify-center items-start"
          style={{ background: '#f0f1f5', padding: 32 }}
          onClick={() => { setSelectedFieldId(null); setEditingFieldId(null); }}>
          {!selectedDocument && !isLoadingDocument ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.25">
                <path d="M14 2H6C4.9 2 4 2.9 4 4v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
              </svg>
              <p className="text-sm font-medium">Select a document to preview</p>
              <Link to="/" className="text-sm font-bold text-[#e8222c] hover:underline">Upload PDF</Link>
            </div>
          ) : isLoadingDocument ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-[#e8222c] border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
            </div>
          ) : (
            <div ref={pageCanvasRef} className="relative"
              style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.18)' }}
              onClick={() => { setSelectedFieldId(null); setEditingFieldId(null); }}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>

              {/* Drag overlay */}
              {isDragOver && (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded pointer-events-none"
                  style={{ background: 'rgba(74,127,193,0.08)', border: '2px dashed #4a7fc1' }}>
                  <div className="flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-lg" style={{ background: '#4a7fc1' }}>
                    <PencilIcon color="white" size={14} /> Drop to place field
                  </div>
                </div>
              )}

              {/* PDF */}
              {previewData && (
                <Document file={previewData}
                  loading={<div style={{ width: pageWidth, height: 400, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="w-6 h-6 border-4 border-[#e8222c] border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
                  </div>}
                  onLoadSuccess={({ numPages: n }) => { setNumPages(n); setCurrentPage(1); }}
                  onLoadError={e => console.error('PDF error', e)}
                  onPassword={handlePassword}>
                  <Page pageNumber={currentPage} width={pageWidth} renderAnnotationLayer renderTextLayer />
                </Document>
              )}

              {/* Signature overlays — click to select, content-only when deselected */}
              {pageSigs.map(sig => {
                const def = fieldDefinitions.find(d => d.type === sig.type) || fieldDefinitions[0];
                const meta = sig.metadata || {};
                const isSelected = selectedFieldId === sig.id;
                const isEditing = editingFieldId === sig.id;
                const isEditable = sig.type !== 'signature' && sig.type !== 'date' && sig.type !== 'stamp';
                const { w, h } = getFieldSize(sig);
                const isDragging = draggingFieldId === sig.id;
                const isResizing = resizingInfo?.fieldId === sig.id;

                // Font size: fill the box without overflowing
                // Initials and Signature are both cursive but behave differently:
                //   Initials: short, uppercase-heavy (S,Q,G,T,V,K…), wider per em, smaller box
                //   Signature: longer mixed-case name, narrower average per em, larger box
                const isCursive  = sig.type === 'signature' || sig.type === 'initials';
                const isInitials = sig.type === 'initials';
                const PAD_X = 6;
                const PAD_Y = 4;

                // Height constraint — leave room for ascenders & descenders
                const availH = Math.max(20, h - PAD_Y * 2);
                const maxFontH = isInitials
                  ? availH * 0.68                // initials: shorter box, all-caps → more conservative
                  : isCursive
                    ? availH * 0.80              // signature: room for ascenders/descenders
                    : availH * 0.68;             // sans-serif

                // Width constraint — character width estimates per 1em
                // Initials are uppercase-heavy; uppercase script glyphs (S, Q, G, etc.)
                // are ~0.85em wide vs ~0.68em for mixed-case signature text.
                const availW = Math.max(20, w - PAD_X * 2);
                const textStr = meta.text || def.label;
                let estWidthEms = 0;
                for (let i = 0; i < textStr.length; i++) {
                  const c = textStr[i];
                  if (c === ' ') {
                    estWidthEms += isCursive ? 0.30 : 0.32;
                  } else if (c === c.toUpperCase() && c.toLowerCase() !== c.toUpperCase()) {
                    // Uppercase: initials are much wider (S, Q, G…); signature is mixed-case average
                    estWidthEms += isInitials ? 0.85 : (isCursive ? 0.68 : 0.75);
                  } else {
                    // Lowercase: initials rarely have these; signature has many
                    estWidthEms += isInitials ? 0.55 : (isCursive ? 0.48 : 0.50);
                  }
                }

                const maxFontW = availW / Math.max(1, estWidthEms);
                const FONT_SIZE = Math.round(Math.min(maxFontH, maxFontW));

                // Shared content renderer
                const renderContent = () => {
                  if (isEditing) return (
                    <div className="flex items-center gap-1 w-full px-2" onClick={e => e.stopPropagation()}>
                      <input autoFocus value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleFieldTextSave(sig); if (e.key === 'Escape') setEditingFieldId(null); }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 outline-none text-sm min-w-0" />
                      <button onClick={() => handleFieldTextSave(sig)}
                        className="shrink-0 w-6 h-6 rounded flex items-center justify-center text-white"
                        style={{ background: '#10b981' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                      </button>
                    </div>
                  );
                  if (sig.type === 'stamp') return (
                    <div className="w-full h-full flex flex-col items-center justify-center" style={{ padding: '6px 8px' }}>
                      {meta.image
                        ? <img src={meta.image} alt="Stamp" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        : <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600, textAlign: 'center' }}>{meta.text && meta.text !== 'Stamp Placeholder' ? meta.text : 'Tap Edit'}</span>}
                    </div>
                  );
                  if (meta.drawingImage) return (
                    <img src={meta.drawingImage} alt="Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  );
                  return (
                    <span style={{
                      fontSize: FONT_SIZE,
                      fontFamily: getFontFamily(meta.font),
                      color: meta.color || (sig.type === 'text' && meta.text === 'Double click to edit' ? '#9ca3af' : '#1a1a1a'),
                      lineHeight: 1.3,
                      whiteSpace: 'nowrap',
                      fontStyle: isCursive ? 'italic' : 'normal',
                    }}>
                      {meta.text || def.label}
                    </span>
                  );
                };

                return (
                  <div key={sig.id}
                    className="absolute z-20"
                    style={{ left: `${sig.x}%`, top: `${sig.y}%`, transform: 'translate(-50%, -50%)', width: w, height: h,
                      cursor: isEditing ? 'default' : isSelected ? (isDragging ? 'grabbing' : 'grab') : 'default',
                      userSelect: 'none',
                    }}
                    onClick={e => { e.stopPropagation(); setSelectedFieldId(sig.id); }}
                    onMouseDown={e => { if (!isEditing && !resizingInfo) { handleFieldMouseDown(e, sig.id); } }}
                    onDoubleClick={e => handleFieldDoubleClick(e, sig)}>

                    {sig.status === 'signed' ? (
                      <div className="flex items-center gap-2 rounded px-3 py-1.5 h-full"
                        style={{ background: '#f0fdf4', border: '1.5px solid #86efac' }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                        <span className="text-xs font-bold text-green-700">Signed</span>
                      </div>
                    ) : isSelected ? (
                      /* ── SELECTED: full card with header + resize handles ── */
                      <>
                        {/* Action toolbar above field */}
                        {!isEditing && (
                          <div className="absolute flex gap-1 z-30" style={{ top: -30, left: 0 }}>
                            {(sig.type === 'signature' || sig.type === 'initials') && (
                              <button onClick={e => handleOpenSigEdit(e, sig)}
                                className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded"
                                style={{ background: sig.type === 'initials' ? '#f59e0b' : '#e8222c', fontSize: 10 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                Edit
                              </button>
                            )}
                            {sig.type === 'stamp' && (
                              <button onClick={e => handleOpenStampEdit(e, sig)}
                                className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded"
                                style={{ background: '#8b5cf6', fontSize: 10 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                Edit
                              </button>
                            )}
                            {isEditable && sig.type !== 'initials' && (
                              <button onClick={e => { e.stopPropagation(); handleFieldDoubleClick(e, sig); }}
                                className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded"
                                style={{ background: '#10b981', fontSize: 10 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                Edit
                              </button>
                            )}
                            {!isOnlyMe && (
                              <button onClick={e => { e.stopPropagation(); handleShare(sig); }}
                                className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-1 rounded"
                                style={{ background: '#4a7fc1', fontSize: 10 }}>
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="white"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                                Share
                              </button>
                            )}
                            <button onClick={e => { e.stopPropagation(); handleDeleteSig(sig); }}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-red-500 transition shadow-sm">
                              <XIcon />
                            </button>
                          </div>
                        )}

                        {/* Card — semi-transparent so PDF content is always visible behind */}
                        <div className="flex flex-col rounded overflow-hidden w-full h-full"
                          style={{ background: `${def.bg}bb`, border: `2px solid ${def.color}`,
                            backdropFilter: 'blur(1px)',
                            boxShadow: isDragging || isResizing ? '0 10px 24px rgba(0,0,0,0.15)' : `0 0 0 1px ${def.color}33, 0 4px 12px rgba(0,0,0,0.08)` }}>
                          {/* Header */}
                          <div className="shrink-0 flex items-center gap-1 px-1.5 border-b" style={{ height: 16, borderColor: `${def.color}33`, background: `${def.color}22` }}>
                            <DragHandle />
                            {def.icon}
                            <span className="font-bold truncate" style={{ color: def.color, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5 }}>{def.label}</span>
                          </div>
                          {/* Content — text scales with height, always centered */}
                          <div className="flex-1 overflow-hidden flex items-center justify-center"
                            style={{ padding: `${PAD_Y}px ${PAD_X}px` }}>
                            {renderContent()}
                          </div>
                        </div>

                        {/* 8-point resize handles: 4 corners + 4 mid-edges */}
                        {!isEditing && [
                          // Corners
                          { dir: 'nw', style: { top: 0, left: 0,    transform: 'translate(-50%,-50%)', cursor: 'nw-resize' } },
                          { dir: 'ne', style: { top: 0, right: 0,   transform: 'translate(50%,-50%)',  cursor: 'ne-resize' } },
                          { dir: 'sw', style: { bottom: 0, left: 0,  transform: 'translate(-50%,50%)', cursor: 'sw-resize' } },
                          { dir: 'se', style: { bottom: 0, right: 0, transform: 'translate(50%,50%)',  cursor: 'se-resize' } },
                          // Mid-edges: left, right, top, bottom
                          { dir: 'w', style: { top: '50%', left: 0,    transform: 'translate(-50%,-50%)', cursor: 'w-resize' } },
                          { dir: 'e', style: { top: '50%', right: 0,   transform: 'translate(50%,-50%)',  cursor: 'e-resize' } },
                          { dir: 'n', style: { top: 0,    left: '50%', transform: 'translate(-50%,-50%)', cursor: 'n-resize' } },
                          { dir: 's', style: { bottom: 0, left: '50%', transform: 'translate(-50%,50%)',  cursor: 's-resize' } },
                        ].map(({ dir, style }) => (
                          <div key={dir}
                            className="absolute w-3 h-3 bg-white rounded-sm z-30 border-2"
                            style={{ ...style, borderColor: def.color }}
                            onMouseDown={e => handleResizeStart(e, sig, dir)} />
                        ))}
                      </>
                    ) : (
                      /* ── DESELECTED: completely transparent to preview the final result ── */
                      <div className="flex items-center justify-center w-full h-full rounded transition-all"
                        style={{ background: 'transparent', border: '1.5px solid transparent' }}
                        onMouseEnter={e => e.currentTarget.style.border = `1.5px dashed ${def.color}88`}
                        onMouseLeave={e => e.currentTarget.style.border = '1.5px solid transparent'}>
                        {renderContent()}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ── RIGHT: Signing options ── */}
        <aside className="shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden" style={{ width: 320 }}>
          <div className="shrink-0 flex items-center px-6 border-b border-gray-100" style={{ height: 56 }}>
            <h2 className="font-bold text-gray-900" style={{ fontSize: 20 }}>Signing options</h2>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-5 py-5 space-y-6">
            {/* Type */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-3 uppercase" style={{ letterSpacing: 0.5 }}>Type</p>
              <div className="flex gap-3">
                <button className="flex-1 flex flex-col items-center gap-2 rounded-xl py-4" style={{ border: '2px solid #e8222c' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#e8222c">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                  </svg>
                  <span className="text-xs font-bold" style={{ color: '#e8222c' }}>Simple Signature</span>
                </button>
                <button disabled className="flex-1 flex flex-col items-center gap-2 rounded-xl py-4 relative opacity-50 cursor-not-allowed" style={{ border: '2px solid #e5e7eb', background: '#fafafa' }}>
                  <div className="absolute -top-2 -right-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b"><path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm0 3a1 1 0 000 2h14a1 1 0 000-2H5z" /></svg>
                  </div>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#9ca3af">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                  </svg>
                  <span className="text-xs font-bold text-gray-400">Digital Signature</span>
                </button>
              </div>
            </div>

            {/* Fields Toolbar */}
            {selectedDocumentId && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase" style={{ letterSpacing: 0.5 }}>Fields</p>
                </div>
                <p className="text-[10px] text-gray-400 mb-2" style={{ lineHeight: 1.4 }}>
                  Drag to place · <span className="font-semibold">Double-click to change text color</span>
                </p>
                {/* Hidden native color input — programmatically triggered on double-click */}
                <input
                  ref={colorInputRef}
                  type="color"
                  value={colorPickingType
                    ? (fieldColors[colorPickingType]
                        || ((colorPickingType === 'signature' || colorPickingType === 'initials') ? (sigConfig.color || '#1a1a1a') : '#1a1a1a'))
                    : '#1a1a1a'}
                  onChange={e => colorPickingType && handleFieldColorPick(colorPickingType, e.target.value)}
                  onBlur={() => setColorPickingType(null)}
                  style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
                />
                <div className="flex flex-col gap-1">
                  {fieldDefinitions.map(f => {
                    const customColor = fieldColors[f.type];
                    // Effective text color: custom override → sigConfig.color (for sig/initials) → black
                    const isSigType = f.type === 'signature' || f.type === 'initials';
                    const effectiveColor = customColor || (isSigType ? (sigConfig.color || '#1a1a1a') : '#1a1a1a');
                    return (
                      <div key={f.type} draggable onDragStart={e => handleDragStart(e, f.type)}
                        onDoubleClick={e => openColorPicker(e, f.type)}
                        className="flex flex-row items-center justify-start gap-2.5 rounded-lg cursor-grab active:cursor-grabbing hover:shadow-md hover:-translate-y-0.5 transition-all select-none bg-white"
                        style={{ border: `1px solid ${f.color}40`, padding: '5px 10px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}
                        title={`Drag to place ${f.label} · Double-click to change text color`}>
                        <div className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: 26, height: 26, background: f.bg }}>
                          {f.icon}
                        </div>
                        <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, flex: 1 }}>{f.label}</div>
                        {/* Color dot — shows the actual text color that will be used */}
                        <div
                          className="shrink-0 rounded-full"
                          style={{ width: 10, height: 10, background: effectiveColor, boxShadow: '0 0 0 1.5px #e5e7eb' }}
                          title={`Text color: ${effectiveColor}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}


          </div>

          <div className="shrink-0 p-4 border-t border-gray-100">
            {!token ? (
              <Link to="/login" className="flex items-center justify-center w-full rounded-xl text-white font-bold text-lg gap-3 transition hover:opacity-90" style={{ background: '#e8222c', height: 56 }}>
                Login to sign
              </Link>
            ) : !selectedDocumentId ? (
              <button disabled className="flex items-center justify-center w-full rounded-xl text-white font-bold text-lg gap-3 opacity-40 cursor-not-allowed" style={{ background: '#e8222c', height: 56 }}>
                Sign
                <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
                </div>
              </button>
            ) : signatures.length === 0 ? (
              <div>
                <p className="text-center text-xs text-gray-400 mb-2">Drag a field onto the PDF to continue</p>
                <button disabled className="flex items-center justify-center w-full rounded-xl text-white font-bold text-lg gap-3 opacity-40 cursor-not-allowed" style={{ background: '#e8222c', height: 56 }}>
                  Sign
                  <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
                  </div>
                </button>
              </div>
            ) : isOnlyMe && signatures.some(s => s.status === 'pending') ? (
              /* Only Me mode: direct sign + download */
              <div>
                <NeonSweepButton
                  onClick={handleSignAndDownload}
                  disabled={isSigning}
                  tone="danger"
                  className="w-full text-lg h-14"
                >
                  {isSigning ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /> Signing...</>
                  ) : (
                    <>Sign &amp; Download <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" /></svg></>
                  )}
                </NeonSweepButton>
              </div>
            ) : !isOnlyMe && signatures.some(s => s.status === 'pending') ? (
              /* Several people mode: open signing page via token */
              <div>
                <p className="text-center text-xs text-gray-400 mb-2">Share links with signers or sign yourself</p>
                <NeonSweepButton
                  onClick={async () => {
                    const pending = signatures.find(s => s.status === 'pending');
                    if (!pending) return;
                    const t = await generateSignatureToken(pending.id);
                    window.open(`/sign?token=${encodeURIComponent(t)}`, '_blank');
                  }}
                  tone="danger"
                  className="w-full text-lg h-14"
                >
                  Sign
                  <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" /></svg>
                  </div>
                </NeonSweepButton>
              </div>
            ) : (
              <NeonSweepButton onClick={() => handleDownload(true)}
                tone="emerald"
                className="w-full text-lg h-14">
                Download Signed PDF
              </NeonSweepButton>
            )}
          </div>
        </aside>
      </div>

      {/* ── Password-protected PDF Modal (calm, minimal) ── */}
      {pwModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }}
            onClick={() => { pwModal.callback(null); setPwModal(null); setPwInput(''); }} />
          <div className="relative w-full bg-white rounded-xl animate-fade-in"
            style={{ maxWidth: 388, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: '1px solid #e5e7eb' }}>
            {/* Header */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-4">
              <div className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: '#f3f4f6' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">Password required</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{selectedDocument?.originalName}</p>
              </div>
              <button onClick={() => { pwModal.callback(null); setPwModal(null); setPwInput(''); }}
                className="p-1 text-gray-400 hover:text-gray-600 transition rounded">
                <XIcon />
              </button>
            </div>

            <div className="px-5 pb-5">
              {pwModal.reason === 2 && (
                <p className="text-xs text-red-500 font-medium mb-2">Incorrect password — try again.</p>
              )}
              <input type="password" value={pwInput} autoFocus
                onChange={e => setPwInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitPassword()}
                placeholder="Enter PDF password"
                className="w-full rounded-lg border px-3 py-2.5 text-sm text-gray-800 outline-none transition mb-3"
                style={{ borderColor: '#d1d5db', background: '#f9fafb' }}
                onFocus={e => e.target.style.borderColor = '#9ca3af'}
                onBlur={e => e.target.style.borderColor = '#d1d5db'}
              />
              <div className="flex gap-2">
                <button onClick={submitPassword} disabled={!pwInput.trim()}
                  className="flex-1 font-semibold text-sm text-white rounded-lg py-2.5 transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: '#4b5563' }}>
                  Unlock
                </button>
                <NeonSweepButton onClick={() => { pwModal.callback(null); setPwModal(null); setPwInput(''); }}
                  tone="slate" size="sm">
                  Cancel
                </NeonSweepButton>
              </div>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">don't know the password?</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <button
                onClick={() => { pwModal.callback(null); setPwModal(null); setPwInput(''); setShowDeleteModal(true); }}
                className="w-full flex items-center justify-center gap-1.5 rounded-lg py-2 text-sm text-red-500 hover:bg-red-50 transition border border-red-100">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                Delete file instead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal (calm, minimal) ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }}
            onClick={() => !isDeleting && setShowDeleteModal(false)} />
          <div className="relative w-full bg-white rounded-xl animate-fade-in"
            style={{ maxWidth: 368, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: '1px solid #e5e7eb' }}>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: '#fef2f2' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#e8222c">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">Delete document?</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{selectedDocument?.originalName}</p>
                </div>
                <button onClick={() => !isDeleting && setShowDeleteModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition rounded">
                  <XIcon />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                This will permanently remove this file and all its signature fields. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <NeonSweepButton onClick={() => setShowDeleteModal(false)} disabled={isDeleting}
                  tone="slate" size="sm" className="flex-1">
                  Cancel
                </NeonSweepButton>
                <NeonSweepButton onClick={confirmDelete} disabled={isDeleting}
                  tone="danger"
                  className="flex-1">
                  {isDeleting
                    ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /> Deleting...</>
                    : 'Delete'}
                </NeonSweepButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirmation Modal ── */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.28)' }}
            onClick={() => !isDeleting && setShowBulkDeleteModal(false)} />
          <div className="relative w-full bg-white rounded-xl animate-fade-in"
            style={{ maxWidth: 368, boxShadow: '0 4px 20px rgba(0,0,0,0.10)', border: '1px solid #e5e7eb' }}>
            <div className="px-5 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: 32, height: 32, background: '#fef2f2' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#e8222c">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">Delete {checkedDocumentIds.length} documents?</p>
                </div>
                <button onClick={() => !isDeleting && setShowBulkDeleteModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition rounded">
                  <XIcon />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                This will permanently remove the selected files and all their signature fields. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <NeonSweepButton onClick={() => setShowBulkDeleteModal(false)} disabled={isDeleting}
                  tone="slate" size="sm" className="flex-1">
                  Cancel
                </NeonSweepButton>
                <NeonSweepButton onClick={confirmBulkDelete} disabled={isDeleting}
                  tone="danger"
                  className="flex-1">
                  {isDeleting
                    ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full" style={{ animation: 'spin 0.7s linear infinite' }} /> Deleting...</>
                    : 'Delete'}
                </NeonSweepButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════════════════
          Signature / Initials Style Edit Modal
      ══════════════════════════════════════════════════════ */}
      {sigEditModal && (() => {
        const { sig, tab } = sigEditModal;
        const isInitials = sig.type === 'initials';
        const accentColor = isInitials ? '#f59e0b' : '#e8222c';

        // Auto-compute initials from full name (all words)
        const autoInitials = sigConfig.name
          ? sigConfig.name.trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase()).join('')
          : 'TK';

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
          ctx.strokeStyle = sigEditColor;
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

        return (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSigEditModal(null)} />
            <div className="relative w-full bg-white rounded-2xl flex flex-col animate-fade-in overflow-hidden"
              style={{ maxWidth: 640, maxHeight: '94vh', boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>

              {/* Header row: title + close */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900" style={{ fontSize: 18 }}>
                    Set your signature details
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Choose a style and color for your {isInitials ? 'initials' : 'signature'}</p>
                </div>
                <button onClick={() => setSigEditModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition">
                  <XIcon />
                </button>
              </div>

              {/* Name + Initials row */}
              <div className="flex gap-4 px-6 pt-4 pb-2">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Full name:</label>
                  <input
                    value={sigEditText}
                    onChange={e => {
                      setSigEditText(e.target.value);
                    }}
                    placeholder="e.g. Tanmay Vijay Kudkar"
                    className="w-full border-b-2 border-gray-300 focus:border-red-500 px-1 py-1.5 text-sm outline-none transition bg-transparent"
                  />
                </div>
                {!isInitials && (
                  <div style={{ width: 140 }}>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Initials:</label>
                    <div className="border-b-2 border-gray-300 px-1 py-1.5 text-sm text-gray-700 bg-transparent">
                      {sigEditText.trim().split(/\s+/).filter(Boolean).map(w => w[0]?.toUpperCase() || '').join('') || autoInitials}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 px-6">
                {['type', 'draw'].map(t => (
                  <button key={t} onClick={() => setSigEditModal(m => ({ ...m, tab: t }))}
                    className="relative py-3 px-4 text-sm font-semibold transition"
                    style={{ color: tab === t ? accentColor : '#6b7280' }}>
                    {t === 'type' ? (
                      <span className="flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.5 4v3h5v12h3V7h5V4h-13zm19 5h-9v3h3v7h3v-7h3V9z"/></svg>
                        Type
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        Draw
                      </span>
                    )}
                    {tab === t && <div className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: accentColor }} />}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-4" style={{ minHeight: 260 }}>
                {/* ── TYPE tab ── */}
                {tab === 'type' && (
                  <div className="space-y-1">
                    {SIG_FONTS.map(f => (
                      <button key={f.id} onClick={() => setSigEditFont(f.id)}
                        className="flex items-center w-full rounded-xl px-4 py-3 border transition text-left"
                        style={{
                          borderColor: sigEditFont === f.id ? accentColor : '#e5e7eb',
                          background: sigEditFont === f.id ? `${accentColor}08` : '#fff',
                        }}>
                        {/* Radio indicator */}
                        <div className="shrink-0 w-4 h-4 rounded-full border-2 mr-4 flex items-center justify-center"
                          style={{ borderColor: sigEditFont === f.id ? accentColor : '#d1d5db' }}>
                          {sigEditFont === f.id && (
                            <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
                          )}
                        </div>
                        {/* Text preview in selected color */}
                        <span className={f.cls} style={{ fontSize: f.size * 0.85, color: sigEditColor, lineHeight: 1.2 }}>
                          {sigEditText || (isInitials ? autoInitials : 'Tanmay Vijay Kudkar')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* ── DRAW tab ── */}
                {tab === 'draw' && (
                  <div className="flex flex-col gap-3">
                    <div className="relative w-full rounded-xl border-2 border-gray-200 bg-gray-50 overflow-hidden"
                      style={{ height: 200 }}>
                      <canvas
                        ref={drawingRef}
                        width={580}
                        height={196}
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
              </div>

              {/* Color picker row — always visible */}
              <div className="flex items-center gap-3 px-6 py-3 border-t border-gray-100">
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

              {/* Footer buttons */}
              <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
                <button onClick={() => setSigEditModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleSigEditApply}
                  className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
                  style={{ background: accentColor }}>
                  Apply {isInitials ? 'Initials' : 'Signature'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* ═══════════════════════════════════════════
          Company Stamp Configuration Modal
      ═══════════════════════════════════════════ */}
      {stampModal && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
            onClick={() => setStampModal(null)} />
          <div className="relative w-full bg-white rounded-2xl flex flex-col animate-fade-in overflow-hidden"
            style={{ maxWidth: 540, boxShadow: '0 24px 80px rgba(0,0,0,0.22)' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900" style={{ fontSize: 18 }}>Company Stamp</h3>
                <p className="text-xs text-gray-400 mt-0.5">Upload your company stamp or enter company name</p>
              </div>
              <button onClick={() => setStampModal(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition">
                <XIcon />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Company name input */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Company Name</label>
                <input
                  value={stampCompanyName}
                  onChange={e => setStampCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-gray-400 transition"
                />
              </div>

              {/* Upload area */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block">Upload Stamp Image</label>
                <input
                  ref={stampFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setStampImageB64(ev.target.result);
                    reader.readAsDataURL(file);
                  }}
                />
                <div
                  onClick={() => stampFileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => {
                    e.preventDefault();
                    const file = e.dataTransfer.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => setStampImageB64(ev.target.result);
                    reader.readAsDataURL(file);
                  }}
                  className="w-full rounded-xl border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-3 transition hover:border-purple-400 hover:bg-purple-50"
                  style={{ borderColor: stampImageB64 ? '#8b5cf6' : '#d1d5db', background: stampImageB64 ? '#f5f3ff' : '#fafafa', minHeight: 150 }}>
                  {stampImageB64 ? (
                    <>
                      <img src={stampImageB64} alt="Stamp preview" style={{ maxHeight: 90, maxWidth: 280, objectFit: 'contain' }} />
                      <span className="text-xs text-purple-500 font-semibold">Click to change</span>
                    </>
                  ) : (
                    <>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="#d1d5db">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                      </svg>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-500">Upload company stamp</p>
                        <p className="text-xs text-gray-400 mt-1">or drop file here</p>
                        <p className="text-[10px] text-gray-300 mt-1">Accepted formats: PNG, JPG and SVG</p>
                      </div>
                    </>
                  )}
                </div>
                {stampImageB64 && (
                  <button onClick={() => setStampImageB64(null)}
                    className="mt-2 text-xs text-red-400 hover:text-red-600 font-medium">
                    Remove image
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setStampModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleStampApply}
                disabled={!stampCompanyName && !stampImageB64}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90 disabled:opacity-40"
                style={{ background: '#8b5cf6' }}>
                Apply Stamp
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
