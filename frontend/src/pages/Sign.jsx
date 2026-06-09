import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { validateSignatureToken as validateTokenApi, signWithToken as signTokenApi, getDocumentPreviewUrl } from '../lib/documents';
import { Document, Page, pdfjs } from 'react-pdf';
import { PenLine, FileText, Hash, User, Type, Palette, Upload, Check, ChevronLeft, ChevronRight, X, MousePointer2 } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Worker is set globally in `main.jsx` to use the local `/pdf.worker.min.mjs` file

export default function Sign() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const ownerJwt = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [signature, setSignature] = useState(null);
  const [document, setDocument] = useState(null);
  const previewWrapperRef = useRef(null);
  const [pageWidth, setPageWidth] = useState(640);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [signing, setSigning] = useState(false);
  const [name, setName] = useState('');
  const [initials, setInitials] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState('signature'); // signature, initials, stamp
  const [flowStep, setFlowStep] = useState('selection'); // selection, editor

  useEffect(() => {
    if (!token) {
      setError('No token provided in the URL.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await validateTokenApi(token);
        setSignature(data.signature);
        setDocument(data.document);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Invalid or expired token');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  useEffect(() => {
    if (!previewWrapperRef.current || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(280, Math.floor(entry.contentRect.width - 32));
      setPageWidth(Math.min(nextWidth, 880));
    });

    observer.observe(previewWrapperRef.current);
    return () => observer.disconnect();
  }, [previewWrapperRef]);

  const handleSign = async () => {
    if (!token) return;
    try {
      setSigning(true);
      await signTokenApi(token, { signerName: name || undefined });
      alert('Document signed successfully.');
      // refresh validation state
      const data = await validateTokenApi(token);
      setSignature(data.signature);
      setDocument(data.document);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Unable to sign document');
    } finally {
      setSigning(false);
    }
  };

  const onDragStart = (e, type) => {
    e.dataTransfer.setData('type', type);
  };

  const onDrop = async (e) => {
    e.preventDefault();
    if (!selectedDocument || !signature) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setSignature({ ...signature, x, y, page_number: currentPage });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-[#e5322d] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-600 font-medium">Loading editor...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border text-center">
        <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <X size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Access Denied</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <Link to="/" className="inline-flex items-center gap-2 bg-[#e5322d] text-white px-6 py-2.5 rounded-lg font-bold hover:bg-[#cc2b26] transition">
          Take me home
        </Link>
      </div>
    </div>
  );

  if (flowStep === 'selection') {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"></div>
        <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden p-10 text-center">
          <h2 className="text-3xl font-black text-slate-900 mb-8">Who will sign this document?</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-10">
            <button 
              onClick={() => setFlowStep('editor')}
              className="flex flex-col items-center gap-6 p-8 rounded-3xl border-2 border-transparent hover:border-[#e5322d] hover:bg-[#fff5f4] transition group"
            >
              <div className="w-40 h-40 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-white border transition relative overflow-hidden">
                <img src="https://img.icons8.com/clouds/200/signing-a-document.png" alt="Only me" className="w-32 h-32" />
              </div>
              <div className="space-y-2">
                <div className="bg-[#e5322d] text-white px-6 py-2 rounded-xl font-bold text-lg group-hover:scale-105 transition italic">Only me</div>
                <p className="text-sm font-bold text-slate-400">Sign this document</p>
              </div>
            </button>

            <button className="flex flex-col items-center gap-6 p-8 rounded-3xl border-2 border-transparent hover:border-[#e5322d] hover:bg-[#fff5f4] transition group">
              <div className="w-40 h-40 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-white border transition relative overflow-hidden">
                 <img src="https://img.icons8.com/clouds/200/group.png" alt="Several people" className="w-32 h-32 opacity-80" />
              </div>
              <div className="space-y-2">
                <div className="bg-[#e5322d] text-white px-6 py-2 rounded-xl font-bold text-lg group-hover:scale-105 transition">Several people</div>
                <p className="text-sm font-bold text-slate-400">Invite others to sign</p>
              </div>
            </button>
          </div>

          <div className="text-slate-400 text-xs font-bold uppercase tracking-widest border-t pt-6">
            Uploaded document: <span className="text-slate-600">{document?.original_name || document?.originalName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-[#f3f3f3]">
      {/* Top Toolbar */}
      <div className="h-12 bg-white border-b flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 hover:bg-white rounded disabled:opacity-30"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="px-3 py-0.5 text-sm font-bold flex items-center gap-1">
              <input 
                type="text" 
                value={currentPage} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val > 0 && val <= numPages) setCurrentPage(val);
                }}
                className="w-6 text-center bg-transparent border-b border-transparent focus:border-slate-400 outline-none"
              />
              <span className="text-slate-400 font-normal">/</span>
              <span>{numPages}</span>
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage >= numPages}
              className="p-1 hover:bg-white rounded disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="h-6 w-px bg-slate-200"></div>

          <button className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-sm font-medium text-slate-700 transition">
            <MousePointer2 size={16} />
            <span>Select</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
           <button 
            onClick={() => setShowDetailsModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-[#e5322d] text-white rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#cc2b26] transition"
          >
            <PenLine size={14} />
            <span>Customize Sign</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Thumbnails (hidden on small screens) */}
        <aside className="hidden lg:flex w-48 bg-white border-r flex-col shrink-0 overflow-y-auto p-4 gap-4 scrollbar-hide">
          {numPages > 0 && Array.from({ length: numPages }, (_, i) => i + 1).map(page => (
            <button 
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`flex flex-col items-center gap-2 group ${currentPage === page ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
            >
              <div className={`p-1 rounded border-2 transition ${currentPage === page ? 'border-[#e5322d] shadow-md' : 'border-transparent group-hover:border-slate-200'}`}>
                <div className="bg-slate-50 w-32 pointer-events-none">
                  <Document 
                    file={{ url: `${getDocumentPreviewUrl(document.id)}?token=${encodeURIComponent(token)}` }}
                  >
                    <Page pageNumber={page} width={128} renderAnnotationLayer={false} renderTextLayer={false} />
                  </Document>
                </div>
              </div>
              <span className="text-xs font-bold text-slate-500">{page}</span>
            </button>
          ))}
        </aside>

        {/* Center: Editor Canvas */}
        <main className="flex-1 overflow-auto bg-[#f3f3f3] p-8 flex justify-center items-start custom-scrollbar">
          <div className="relative shadow-2xl bg-white" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
            <Document
              file={{ url: `${getDocumentPreviewUrl(document.id)}?token=${encodeURIComponent(token)}` }}
              onLoadSuccess={(doc) => setNumPages(doc.numPages || 0)}
              loading={<div className="p-20 text-slate-400 font-medium">Rendering page...</div>}
            >
              <Page pageNumber={currentPage} width={pageWidth} renderAnnotationLayer renderTextLayer />
            </Document>

            {/* Floating Action Button for adding fields - matches iLovePDF */}
            <div className="absolute top-4 right-4 z-10 flex flex-col items-center translate-x-1/2 -translate-y-1/2">
              <button className="h-10 w-10 bg-red-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition group">
                <X size={20} className="rotate-45" />
                <div className="absolute -top-1 -right-1 bg-black text-white text-[10px] h-5 w-5 flex items-center justify-center rounded-full ring-2 ring-white">1</div>
              </button>
            </div>

            {signature && signature.page_number === currentPage && (
              <div
                style={{
                  position: 'absolute',
                  left: `${signature.x}%`,
                  top: `${signature.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="group cursor-move"
              >
                <div className="relative bg-[#fef2f2] border-2 border-[#e5322d] border-dashed px-4 py-2 rounded-lg shadow-lg">
                  <div className="absolute -top-3 -right-3 flex gap-1 group-hover:opacity-100 opacity-0 transition">
                    <button className="bg-white border text-slate-600 p-1 rounded-full shadow hover:text-red-500"><X size={12} /></button>
                  </div>
                  <div className="text-[#e5322d] font-handwriting text-2xl select-none flex items-center gap-2">
                    {signature.status === 'signed' ? (
                      <Check size={20} className="text-green-600" />
                    ) : (
                      <PenLine size={20} className="opacity-50" />
                    )}
                    <span className="whitespace-nowrap italic">{name || 'Your Signature'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar: Signing Options (hidden on small screens) */}
        <aside className="hidden lg:flex w-80 bg-white border-l shrink-0 flex-col">
          <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
            <h2 className="font-black text-xl tracking-tight text-slate-900">Signing options</h2>
          </div>

          <div className="p-6 flex-1 overflow-y-auto space-y-8">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Type</h3>
              <div className="flex gap-2">
                <button className="flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-[#e5322d] bg-[#fff5f4] transition group">
                  <div className="text-[#e5322d]"><PenLine size={24} /></div>
                  <span className="text-sm font-bold text-[#e5322d]">Simple Signature</span>
                </button>
                <button className="flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-slate-100 bg-white hover:border-slate-200 transition opacity-50 grayscale cursor-not-allowed">
                  <div className="text-slate-400"><Hash size={24} /></div>
                  <span className="text-sm font-bold text-slate-400">Digital Signature</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Required fields</h3>
              <div 
                draggable 
                onDragStart={(e) => onDragStart(e, 'signature')}
                className="group flex items-center gap-4 p-3 rounded-xl border-2 border-slate-100 bg-white hover:border-[#e5322d] transition cursor-grab active:cursor-grabbing relative overflow-hidden"
              >
                <div className="text-slate-300">
                  <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor"><circle cx="2" cy="2" r="2" /><circle cx="2" cy="10" r="2" /><circle cx="2" cy="18" r="2" /><circle cx="10" cy="2" r="2" /><circle cx="10" cy="10" r="2" /><circle cx="10" cy="18" r="2" /></svg>
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-blue-600 text-white">
                  <PenLine size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-blue-600 uppercase">Signature</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{name || 'Double click to edit'}</p>
                </div>
                <div className="text-blue-600 flex flex-col items-center gap-1">
                   <button className="p-1 hover:bg-blue-50 rounded"><Palette size={14} /></button>
                   <div className="bg-blue-600 text-white text-[9px] h-4 w-4 flex items-center justify-center rounded-full">1</div>
                </div>
              </div>

               <div 
                draggable 
                onDragStart={(e) => onDragStart(e, 'initials')}
                className="group flex items-center gap-4 p-3 rounded-xl border-2 border-slate-100 bg-white hover:border-[#e5322d] transition cursor-grab active:cursor-grabbing"
              >
                <div className="text-slate-300">
                  <svg width="12" height="20" viewBox="0 0 12 20" fill="currentColor"><circle cx="2" cy="2" r="2" /><circle cx="2" cy="10" r="2" /><circle cx="2" cy="18" r="2" /><circle cx="10" cy="2" r="2" /><circle cx="10" cy="10" r="2" /><circle cx="10" cy="18" r="2" /></svg>
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-slate-600 text-white">
                  <span className="font-black text-xs tracking-tighter">AC</span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Initials</p>
                  <p className="text-sm font-bold text-slate-800">{initials || 'TVK'}</p>
                </div>
                 <div className="text-slate-600">
                   <button className="p-1 hover:bg-slate-50 rounded"><Palette size={14} /></button>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button 
                onClick={handleSign}
                disabled={signing || !signature}
                className="w-full bg-[#f33] hover:bg-red-700 text-white p-5 rounded-2xl font-black text-2xl shadow-xl shadow-red-100 transition flex items-center justify-between px-8 disabled:opacity-50 disabled:shadow-none group"
              >
                <span>{signing ? '...' : 'Sign'}</span>
                <div className="bg-white/20 p-2 rounded-full group-hover:translate-x-1 transition">
                  <ChevronRight size={24} />
                </div>
              </button>
            </div>
          </div>
        </aside>
      </div>

      {showDetailsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowDetailsModal(false)}></div>
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]">
            <div className="flex-1 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black text-slate-900">Set your signature details</h2>
                <button onClick={() => setShowDetailsModal(false)} className="bg-red-50 text-red-600 p-2 rounded-full"><X size={20} /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Full name:</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      value={name} 
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name" 
                      className="w-full bg-slate-50 border-2 border-transparent focus:border-[#e5322d] focus:bg-white rounded-2xl py-3.5 pl-12 pr-4 outline-none transition font-bold text-slate-800"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-wider">Initials:</label>
                  <input 
                    value={initials} 
                    onChange={(e) => setInitials(e.target.value)}
                    placeholder="Your initials" 
                    className="w-full bg-slate-50 border-2 border-transparent focus:border-[#e5322d] focus:bg-white rounded-2xl py-3.5 px-6 outline-none transition font-bold text-slate-800 uppercase"
                  />
                </div>
              </div>

              <div className="flex border-b mb-6">
                <button onClick={() => setSelectedTab('signature')} className={`flex items-center gap-2 px-6 py-4 font-bold transition border-b-2 ${selectedTab === 'signature' ? 'border-[#e5322d] text-[#e5322d]' : 'border-transparent text-slate-400'}`}>
                  <PenLine size={18} />
                  Signature
                </button>
                <button onClick={() => setSelectedTab('initials')} className={`flex items-center gap-2 px-6 py-4 font-bold transition border-b-2 ${selectedTab === 'initials' ? 'border-[#e5322d] text-[#e5322d]' : 'border-transparent text-slate-400'}`}>
                  <span className="text-sm tracking-tighter">AC</span>
                  Initials
                </button>
                <button onClick={() => setSelectedTab('stamp')} className={`flex items-center gap-2 px-6 py-4 font-bold transition border-b-2 ${selectedTab === 'stamp' ? 'border-[#e5322d] text-[#e5322d]' : 'border-transparent text-slate-400'}`}>
                  <Upload size={18} />
                  Company Stamp
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-8 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[200px] text-center">
                {selectedTab === 'signature' && (
                  <div className="space-y-4 w-full max-w-sm text-slate-400 italic text-5xl border-b-2 border-slate-200 pb-4">
                    {name || 'Your Signature'}
                  </div>
                )}
                {selectedTab === 'initials' && (
                  <div className="space-y-4 w-full max-w-xs text-slate-400 font-bold text-7xl border-b-2 border-slate-200 pb-4 uppercase">
                    {initials || 'TVK'}
                  </div>
                )}
                {selectedTab === 'stamp' && (
                  <div className="space-y-4">
                    <button className="px-6 py-2 border-2 border-[#e5322d] text-[#e5322d] font-bold rounded-lg hover:bg-[#fff5f4] transition">
                      Upload signature
                    </button>
                    <div>
                      <p className="text-sm font-medium text-slate-500 mt-2">or drop file here</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest">Accepted formats: PNG, JPG and SVG</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-8 flex justify-end">
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="bg-[#e5322d] hover:bg-[#cc2b26] text-white px-10 py-3.5 rounded-2xl font-black text-lg transition shadow-xl shadow-red-100"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
