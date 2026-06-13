import React, { useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { uploadDocument } from '../lib/documents';
import NeonSweepButton from '../components/NeonSweepButton';

/* ── ilovepdf-style top navbar ── */
export default function Layout() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleTriggerUpload = () => fileInputRef.current?.click();

  const handleUploadAndNavigate = async () => {
    if (!selectedFile) { navigate('/dashboard'); return; }
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
      alert(error.message || 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200" style={{ height: 56 }}>
        <div className="mx-auto max-w-[1400px] px-4 h-full flex items-center gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 mr-2 select-none gap-2 hover:opacity-90 transition" style={{ minWidth: 110 }}>
            <div className="bg-[#e8222c] p-1.5 rounded-lg shadow-sm flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM16 11V18.1L13.9 16L11.1 18.1V11H16Z" />
              </svg>
            </div>
            <span style={{
              fontWeight: 900,
              fontSize: 22,
              letterSpacing: '-0.5px',
              color: '#1a1a1a',
              lineHeight: 1,
            }}>
              DocSign
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden lg:flex items-center gap-0">
            {['MERGE PDF', 'SPLIT PDF', 'COMPRESS PDF'].map(label => (
              <a
                key={label}
                href="#"
                className="px-4 py-1 text-[13px] font-semibold text-gray-700 hover:text-gray-900 transition-colors tracking-wide whitespace-nowrap"
                onClick={e => e.preventDefault()}
              >
                {label}
              </a>
            ))}
            {['CONVERT PDF', 'ALL PDF TOOLS'].map(label => (
              <button
                key={label}
                className="flex items-center gap-1 px-4 py-1 text-[13px] font-semibold text-gray-700 hover:text-gray-900 transition-colors tracking-wide whitespace-nowrap"
              >
                {label}
                <svg className="w-3 h-3 ml-0.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <NeonSweepButton
                  onClick={() => navigate('/dashboard')}
                  tone="slate"
                  size="sm"
                  className="font-semibold"
                >
                  Dashboard
                </NeonSweepButton>
                <NeonSweepButton
                  onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }}
                  tone="slate"
                  size="sm"
                  className="font-semibold"
                >
                  Log out
                </NeonSweepButton>
              </>
            ) : (
              <>
                <NeonSweepButton
                  onClick={() => navigate('/login')}
                  tone="slate"
                  size="sm"
                  className="font-semibold"
                >
                  Login
                </NeonSweepButton>
                <NeonSweepButton
                  onClick={() => navigate('/signup')}
                  tone="danger"
                  size="sm"
                  className="font-semibold"
                >
                  Sign up
                </NeonSweepButton>
              </>
            )}

            {/* 3×3 grid dots icon */}
            <button className="ml-1 p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="5" r="2" /><circle cx="12" cy="5" r="2" /><circle cx="19" cy="5" r="2" />
                <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                <circle cx="5" cy="19" r="2" /><circle cx="12" cy="19" r="2" /><circle cx="19" cy="19" r="2" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Hidden file input shared across pages */}
      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <main className="flex-1">
        <Outlet context={{
          fileInputRef,
          selectedFile,
          setSelectedFile,
          isUploading,
          handleTriggerUpload,
          handleUploadAndNavigate,
          clearSelected: () => setSelectedFile(null),
        }} />
      </main>
    </div>
  );
}
