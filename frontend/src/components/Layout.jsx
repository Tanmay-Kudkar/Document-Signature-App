import React, { useRef, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { uploadDocument, saveSeveralPeopleConfig } from '../lib/documents';
import NeonSweepButton from '../components/NeonSweepButton';
import { PenTool, ChevronDown, LayoutGrid, Menu, X } from 'lucide-react';

/* ==========================================================================
 * 🚀 COMPONENT: Layout
 * --------------------------------------------------------------------------
 * This is the main application wrapper. It provides the top navigation bar,
 * responsive mobile menu, and a hidden global file input for handling
 * PDF uploads. It passes the upload context down to its child routes.
 * ========================================================================== */
export default function Layout() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const navigate = useNavigate();

  /* ------------------------------------------------------------------------
   * 📂 FUNCTION: handleFileChange
   * ------------------------------------------------------------------------
   * Captures the file selected by the user via the hidden input.
   * ------------------------------------------------------------------------ */
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  /* ------------------------------------------------------------------------
   * 🖱️ FUNCTION: handleTriggerUpload
   * ------------------------------------------------------------------------
   * Programmatically clicks the hidden file input to open the file browser.
   * ------------------------------------------------------------------------ */
  const handleTriggerUpload = () => fileInputRef.current?.click();

  /* ------------------------------------------------------------------------
   * 🚀 FUNCTION: handleUploadAndNavigate
   * ------------------------------------------------------------------------
   * Uploads the selected PDF to the backend and navigates the user to the
   * Dashboard editor with the new document's context.
   * ------------------------------------------------------------------------ */
  const handleUploadAndNavigate = async () => {
    if (!selectedFile) { navigate('/dashboard'); return; }
    try {
      setIsUploading(true);
      const document = await uploadDocument(selectedFile);
      
      const signingMode = localStorage.getItem('signingMode');
      if (signingMode === 'several_people') {
        const configStr = localStorage.getItem('severalPeopleConfig');
        if (configStr) {
          const config = JSON.parse(configStr);
          await saveSeveralPeopleConfig(document.id, config.receivers, config.settings);
        }
      }

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

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const isLoggedIn = !!localStorage.getItem('token');

  /* ==========================================================================
   * 🎨 RENDER UI
   * ========================================================================== */
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      {/* ── TOP NAVBAR ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200" style={{ height: 56 }}>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 h-full flex items-center gap-4">

          {/* Logo Section */}
          <Link to="/" className="flex items-center shrink-0 mr-2 select-none gap-2 hover:opacity-90 transition" style={{ minWidth: 110 }}>
            <div className="bg-[#e8222c] p-1.5 rounded-lg shadow-sm flex items-center justify-center">
              <PenTool className="w-5 h-5 text-white" />
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

          {/* Nav Links (Desktop) */}
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
                <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Right Actions (Desktop) */}
          <div className="hidden lg:flex items-center gap-2">
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

            {/* Application Grid Icon */}
            <button className="ml-1 p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition">
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>

          {/* Hamburger Menu (Mobile) */}
          <button 
            className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md transition"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[56px] left-0 w-full bg-white border-b border-gray-200 shadow-lg flex flex-col p-4 gap-4 z-40">
            <nav className="flex flex-col gap-2">
              {['MERGE PDF', 'SPLIT PDF', 'COMPRESS PDF', 'CONVERT PDF', 'ALL PDF TOOLS'].map(label => (
                <a
                  key={label}
                  href="#"
                  className="px-2 py-2 text-[14px] font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  onClick={e => { e.preventDefault(); setIsMobileMenuOpen(false); }}
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="border-t border-gray-100 pt-4 flex flex-col gap-2">
              {isLoggedIn ? (
                <>
                  <NeonSweepButton
                    onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}
                    tone="slate"
                    className="w-full justify-center"
                  >
                    Dashboard
                  </NeonSweepButton>
                  <NeonSweepButton
                    onClick={() => { localStorage.removeItem('token'); window.location.href = '/'; }}
                    tone="danger"
                    className="w-full justify-center"
                  >
                    Log out
                  </NeonSweepButton>
                </>
              ) : (
                <>
                  <NeonSweepButton
                    onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                    tone="slate"
                    className="w-full justify-center"
                  >
                    Login
                  </NeonSweepButton>
                  <NeonSweepButton
                    onClick={() => { navigate('/signup'); setIsMobileMenuOpen(false); }}
                    tone="danger"
                    className="w-full justify-center"
                  >
                    Sign up
                  </NeonSweepButton>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hidden file input shared across pages */}
      <input
        type="file"
        accept=".pdf"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Outlet for routing */}
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
