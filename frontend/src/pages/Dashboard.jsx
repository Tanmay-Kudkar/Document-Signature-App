import React, { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  fetchDocumentFile,
  getDocument,
  listDocuments,
} from '../lib/documents';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const formatDate = (value) => {
  if (!value) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatBytes = (value) => {
  if (!value && value !== 0) {
    return 'Unknown size';
  }

  if (value < 1024) {
    return `${value} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let size = value / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex > 0 ? 1 : 2)} ${units[unitIndex]}`;
};

export default function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const previewPanelRef = useRef(null);
  const token = localStorage.getItem('token');

  const [documents, setDocuments] = useState([]);
  const [documentsError, setDocumentsError] = useState('');
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);
  const [selectedDocumentId, setSelectedDocumentId] = useState(location.state?.uploadedDocumentId || null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);
  const [documentError, setDocumentError] = useState('');
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(640);
  const [previewScale, setPreviewScale] = useState(1);
  const [previewError, setPreviewError] = useState('');
  const [isOpeningFile, setIsOpeningFile] = useState(false);

  useEffect(() => {
    if (!previewPanelRef.current || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(([entry]) => {
      const nextWidth = Math.max(280, Math.floor(entry.contentRect.width - 32));
      setPageWidth(Math.min(nextWidth, 720));
    });

    observer.observe(previewPanelRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadDocuments = async () => {
      if (!token) {
        setDocuments([]);
        setDocumentsError('Login to view your uploaded documents.');
        setIsLoadingDocuments(false);
        return;
      }

      try {
        setIsLoadingDocuments(true);
        setDocumentsError('');
        const nextDocuments = await listDocuments();

        if (!isMounted) {
          return;
        }

        setDocuments(nextDocuments);

        setSelectedDocumentId((currentSelectedId) => {
          const preferredId = location.state?.uploadedDocumentId;
          const existingId = currentSelectedId && nextDocuments.some((document) => document.id === currentSelectedId)
            ? currentSelectedId
            : null;

          if (preferredId && nextDocuments.some((document) => document.id === preferredId)) {
            return preferredId;
          }

          return existingId || nextDocuments[0]?.id || null;
        });

        if (location.state?.uploadedDocumentId || location.state?.refreshDocuments) {
          navigate('/dashboard', { replace: true });
        }
      } catch (error) {
        if (isMounted) {
          console.error(error);
          setDocumentsError(error.message || 'Unable to load documents.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDocuments(false);
        }
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, [location.state, navigate, token]);

  useEffect(() => {
    let isMounted = true;

    const loadDocumentDetails = async () => {
      if (!selectedDocumentId) {
        setSelectedDocument(null);
        setDocumentError('');
        return;
      }

      try {
        setIsLoadingDocument(true);
        setDocumentError('');
        setPreviewError('');
        setNumPages(0);
        setCurrentPage(1);
        const document = await getDocument(selectedDocumentId);

        if (isMounted) {
          setSelectedDocument(document);
        }
      } catch (error) {
        if (isMounted) {
          console.error(error);
          setSelectedDocument(null);
          setDocumentError(error.message || 'Unable to load this document.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingDocument(false);
        }
      }
    };

    loadDocumentDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedDocumentId]);

  const handlePdfLoaded = ({ numPages: loadedPages }) => {
    setNumPages(loadedPages);
    setCurrentPage(1);
    setPreviewError('');
  };

  const handlePreviewAction = async (mode) => {
    if (!selectedDocumentId) {
      return;
    }

    try {
      setIsOpeningFile(true);
      const blob = await fetchDocumentFile(selectedDocumentId, mode === 'download');
      const blobUrl = URL.createObjectURL(blob);

      if (mode === 'download') {
        const link = window.document.createElement('a');
        link.href = blobUrl;
        link.download = selectedDocument?.originalName || 'document.pdf';
        link.click();
      } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      }

      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      console.error(error);
      alert(error.message || 'Unable to open the document right now.');
    } finally {
      setIsOpeningFile(false);
    }
  };

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < numPages;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(229,50,45,0.12),_transparent_30%),linear-gradient(180deg,_#fff8f7_0%,_#f6f7fb_45%,_#eef2ff_100%)] text-slate-900">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#e5322d]">Day 4 Workspace</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Document Library</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Review uploaded PDFs, open them in a secure preview, and move page by page without leaving the dashboard.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Upload another PDF
            </Link>
            <button
              type="button"
              onClick={() => navigate('/dashboard', { replace: true, state: { refreshDocuments: true } })}
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Refresh list
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Uploaded files</h2>
                <p className="text-sm text-slate-500">{documents.length} document{documents.length === 1 ? '' : 's'} available</p>
              </div>
            </div>

            {!token ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
                {documentsError}
                <div className="mt-4">
                  <Link to="/login" className="font-semibold text-[#e5322d] hover:underline">
                    Go to login
                  </Link>
                </div>
              </div>
            ) : isLoadingDocuments ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-24 animate-pulse rounded-3xl bg-slate-100" />
                ))}
              </div>
            ) : documentsError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {documentsError}
              </div>
            ) : documents.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm font-medium text-slate-600">No PDFs uploaded yet.</p>
                <p className="mt-2 text-sm text-slate-500">Upload a file from the home screen to start building your library.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((document) => {
                  const isSelected = document.id === selectedDocumentId;

                  return (
                    <button
                      key={document.id}
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      className={`w-full rounded-[24px] border p-4 text-left transition ${
                        isSelected
                          ? 'border-[#e5322d] bg-[#fff5f4] shadow-[0_12px_30px_rgba(229,50,45,0.12)]'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isSelected ? 'bg-[#e5322d] text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                            <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Zm0 2.5L17.5 8H14V4.5ZM18 20H6V4H12v6h6v10Z" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="truncate text-sm font-bold text-slate-900">{document.originalName}</p>
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                              {document.status}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-slate-500">Uploaded {formatDate(document.uploadDate)}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatBytes(document.fileSize)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.07)] backdrop-blur">
            {isLoadingDocument ? (
              <div className="flex min-h-[640px] animate-pulse flex-col gap-4">
                <div className="h-16 rounded-3xl bg-slate-100" />
                <div className="flex-1 rounded-[28px] bg-slate-100" />
              </div>
            ) : documentError ? (
              <div className="flex min-h-[480px] items-center justify-center rounded-[28px] border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
                {documentError}
              </div>
            ) : !selectedDocument ? (
              <div className="flex min-h-[480px] items-center justify-center rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                Select a document to preview it here.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="rounded-[24px] bg-slate-950 p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.24)]">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-200">Active preview</p>
                      <h2 className="mt-2 truncate text-2xl font-black">{selectedDocument.originalName}</h2>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-300">
                        <span>{formatBytes(selectedDocument.fileSize)}</span>
                        <span>{formatDate(selectedDocument.uploadDate)}</span>
                        <span className="capitalize">{selectedDocument.status}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => handlePreviewAction('open')}
                        disabled={isOpeningFile}
                        className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isOpeningFile ? 'Preparing...' : 'Open in tab'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePreviewAction('download')}
                        disabled={isOpeningFile}
                        className="rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                      disabled={!canGoPrevious}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(page + 1, numPages))}
                      disabled={!canGoNext}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-slate-600">
                    Page {numPages ? currentPage : 0} of {numPages || 0}
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewScale((scale) => Math.max(scale - 0.1, 0.8))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      Zoom -
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewScale((scale) => Math.min(scale + 0.1, 1.8))}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                    >
                      Zoom +
                    </button>
                  </div>
                </div>

                {previewError ? (
                  <div className="rounded-[24px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {previewError}
                  </div>
                ) : null}

                <div
                  ref={previewPanelRef}
                  className="flex min-h-[720px] items-start justify-center overflow-auto rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] p-4"
                >
                  <Document
                    file={{
                      url: selectedDocument.previewUrl,
                      httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
                    }}
                    loading={
                      <div className="rounded-3xl bg-white px-6 py-4 text-sm font-medium text-slate-500 shadow">
                        Loading PDF preview...
                      </div>
                    }
                    onLoadSuccess={handlePdfLoaded}
                    onLoadError={(error) => {
                      console.error(error);
                      setPreviewError('Unable to render this PDF preview.');
                    }}
                    error=""
                  >
                    <Page
                      pageNumber={currentPage}
                      renderAnnotationLayer
                      renderTextLayer
                      scale={previewScale}
                      width={pageWidth}
                    />
                  </Document>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
