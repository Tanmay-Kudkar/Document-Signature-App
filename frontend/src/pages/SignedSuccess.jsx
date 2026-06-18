import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { fetchDocumentFile, backendBase } from '../lib/documents';
import { Check, Download, ArrowLeft, Loader2 } from 'lucide-react';

/* ==========================================================================
 * 🎉 COMPONENT: SignedSuccess
 * --------------------------------------------------------------------------
 * Renders the success screen after a user successfully signs a document.
 * Provides a direct download link for the completed PDF and navigation 
 * options to return to the dashboard or start a new signature process.
 * ========================================================================== */
export default function SignedSuccess() {
  /* ------------------------------------------------------------------------
   * 🗃️ STATE & PARAMS
   * ------------------------------------------------------------------------ */
  const [searchParams] = useSearchParams();
  const docId    = searchParams.get('docId');
  const docName  = searchParams.get('name') || 'document.pdf';
  
  const [downloaded, setDownloaded] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState('');

  /* ------------------------------------------------------------------------
   * 💾 FUNCTION: handleDownload
   * ------------------------------------------------------------------------
   * Securely fetches the completed PDF blob from the backend (using auth 
   * headers), converts it to a Data URI, and triggers a programmatic browser 
   * download to ensure the file is saved correctly without CORS/UUID issues.
   * ------------------------------------------------------------------------ */
  const handleDownload = async (e) => {
    e.preventDefault();
    if (!docId || isPreparing) return;
    setIsPreparing(true);
    setError('');

    try {
      // 1. Fetch the blob securely via the API
      const blob = await fetchDocumentFile(docId, true);

      // 2. Convert to Base64 Data URI
      const dataUri = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(blob);
      });

      // 3. Trigger download using the Data URI
      const safeFilename = docName.toLowerCase().endsWith('.pdf') ? docName : `${docName}.pdf`;
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dataUri;
      a.download = safeFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setDownloaded(true);
    } catch (err) {
      setError('Download failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsPreparing(false);
    }
  };

  const safeFilename = docName.toLowerCase().endsWith('.pdf') ? docName : `${docName}.pdf`;

  /* ==========================================================================
   * 🎨 RENDER UI
   * ========================================================================== */
  return (
    <div style={{
      minHeight: 'calc(100vh - 56px)',
      background: '#f8f9fb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
    }}>
      
      {/* ── SUCCESS CARD ── */}
      <div className="bg-white rounded-[20px] shadow-[0_8px_48px_rgba(0,0,0,0.10)] p-8 sm:p-12 md:p-14 max-w-[520px] w-full flex flex-col items-center gap-0">
        
        {/* Animated Checkmark Badge */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg,#22c55e,#16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 28,
          boxShadow: '0 8px 24px rgba(34,197,94,0.30)',
          animation: 'pop 0.4s cubic-bezier(.4,1.8,.6,1)',
        }}>
          <Check className="w-10 h-10 text-white" strokeWidth={3} />
        </div>

        {/* Success Text */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#111827', margin: 0, textAlign: 'center' }}>
          Document signed successfully!
        </h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 10, marginBottom: 36, textAlign: 'center' }}>
          Your document <strong style={{ color: '#374151' }}>{docName}</strong> has been signed and is ready to download.
        </p>

        {/* ── DOWNLOAD BUTTON ── */}
        <button
          onClick={handleDownload}
          disabled={isPreparing}
          style={{
            width: '100%',
            height: 56,
            borderRadius: 14,
            border: 'none',
            textDecoration: 'none',
            background: downloaded
              ? 'linear-gradient(135deg,#22c55e,#16a34a)'
              : 'linear-gradient(135deg,#e8222c,#c01820)',
            color: '#fff',
            fontSize: 17,
            fontWeight: 800,
            cursor: isPreparing ? 'wait' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: downloaded
              ? '0 6px 20px rgba(34,197,94,0.35)'
              : '0 6px 20px rgba(232,34,44,0.35)',
            transition: 'all 0.3s',
            marginBottom: 16,
          }}
        >
          {isPreparing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Preparing…
            </>
          ) : downloaded ? (
            <>
              <Check className="w-5 h-5" strokeWidth={2.5} />
              Downloaded!
            </>
          ) : (
            <>
              <Download className="w-5 h-5" strokeWidth={2.5} />
              Download Signed PDF
            </>
          )}
        </button>

        {error && (
          <p style={{ color: '#e8222c', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 4, marginBottom: 28 }}>
          Your signed PDF is stored securely on our server.
        </p>

        <div style={{ width: '100%', height: 1, background: '#f3f4f6', marginBottom: 24 }} />

        {/* ── NAVIGATION ACTIONS ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%' }}>
          <Link to="/dashboard"
            style={{
              flex: 1, height: 42, borderRadius: 10, border: '1.5px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontSize: 14, fontWeight: 600, color: '#374151', textDecoration: 'none',
              background: '#fff', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='#f9fafb'}
            onMouseLeave={e => e.currentTarget.style.background='#fff'}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <Link to="/"
            style={{
              flex: 1, height: 42, borderRadius: 10, border: '1.5px solid #e8222c33',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 600, color: '#e8222c', textDecoration: 'none',
              background: '#fff8f8', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background='#fef2f2'}
            onMouseLeave={e => e.currentTarget.style.background='#fff8f8'}
          >
            Sign Another PDF
          </Link>
        </div>
      </div>

      {/* Inline Animations */}
      <style>{`
        @keyframes pop {
          0%   { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
