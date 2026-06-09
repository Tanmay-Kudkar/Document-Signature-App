import React, { useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { uploadDocument } from '../lib/documents';

export default function Layout() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTriggerUpload = () => {
    fileInputRef.current?.click();
  };

  const toggleMenu = () => setIsMenuOpen((s) => !s);

  const handleUploadAndNavigate = async () => {
    if (!selectedFile) {
      navigate('/dashboard');
      return;
    }

    try {
      setIsUploading(true);
      const document = await uploadDocument(selectedFile);
      setSelectedFile(null);

      const isGuest = !localStorage.getItem('token');

      navigate('/dashboard', {
        state: {
          uploadedDocumentId: document.id,
          tempDocument: isGuest ? document : null,
          refreshDocuments: !isGuest,
        },
      });
    } catch (error) {
      console.error('Upload failed', error);
      alert(error.message || 'Upload failed. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="flex items-center h-16">
            <div className="flex-1 flex items-center gap-2 md:gap-8 min-w-0">
              <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                <div className="bg-[#e5322d] p-1.5 rounded-lg transition-transform group-hover:rotate-3">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM16 11V18.1L13.9 16L11.1 18.1V11H16Z" />
                  </svg>
                </div>
                <span className="text-xl sm:text-2xl font-black tracking-tight truncate">DocSign</span>
              </Link>
            </div>

            <div className="flex-1 hidden md:flex justify-center">
              <nav className="flex items-center gap-6 text-sm font-semibold text-gray-600">
                <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide">Merge PDF</a>
                <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide">Split PDF</a>
                <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide">Compress PDF</a>
              </nav>
            </div>

            <div className="flex-1 flex items-center justify-end gap-3">
                <button
                  onClick={handleTriggerUpload}
                  className="hidden md:inline-flex items-center bg-[#e5322d] hover:bg-[#cc2b26] text-white px-4 py-2 rounded-full font-bold shadow-md transition"
                >
                  Select PDF
                </button>
                <button
                  onClick={handleTriggerUpload}
                  className="md:hidden inline-flex items-center justify-center bg-[#e5322d] hover:bg-[#cc2b26] text-white p-2 rounded-full shadow transition"
                  aria-label="Upload PDF"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
                  </svg>
                </button>

              {localStorage.getItem('token') ? (
                <>
                  <Link to="/dashboard" className="text-[14px] sm:text-[15px] font-bold text-gray-700 hover:text-gray-900 transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50">Dashboard</Link>
                  <button
                    onClick={() => { localStorage.removeItem('token'); window.location.href = '/login'; }}
                    className="bg-gray-900 text-white px-3 py-2 rounded-lg font-semibold"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-[14px] sm:text-[15px] font-bold text-gray-700 hover:text-gray-900 transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50">Login</Link>
                  <Link to="/signup" className="bg-[#e5322d] text-white px-3 py-2 rounded-lg font-bold hover:bg-[#cc2b26] transition">Sign up</Link>
                </>
              )}

              <button className="md:hidden p-2 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all" onClick={toggleMenu}>
                <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* hidden file input used by header and pages */}
      <input type="file" accept=".pdf" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

      <main className="flex-1">
        <Outlet context={{ fileInputRef, selectedFile, isUploading, handleTriggerUpload, handleUploadAndNavigate, clearSelected: () => setSelectedFile(null) }} />
      </main>
    </div>
  );
}
