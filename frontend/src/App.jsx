import React, { useRef, useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { uploadDocument } from './lib/documents';

function App() {
  const fileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
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

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleUploadAndNavigate = async () => {
    if (!selectedFile) {
      navigate('/dashboard');
      return;
    }

    try {
      setIsUploading(true);
      const document = await uploadDocument(selectedFile);
      setSelectedFile(null);
      navigate('/dashboard', {
        state: {
          uploadedDocumentId: document.id,
          refreshDocuments: true,
        },
      });
    } catch (error) {
      console.error('Upload failed', error);
      alert(error.message || 'Upload failed. Check console for details.');
    } finally {
      setIsUploading(false);
    }
  };

  // If we are on login or signup pages, don't show the main layout
  if (location.pathname === '/login' || location.pathname === '/signup') {
    return (
      <div key={location.pathname} className="min-h-screen w-full flex flex-col font-sans text-gray-800 animate-page-fade overflow-x-hidden">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </div>
    );
  }

  return (
    <div key="landing" className="min-h-screen bg-[#f5f5fa] font-sans text-gray-800 flex flex-col w-full overflow-x-hidden relative animate-page-fade">
      <Routes>
        <Route path="/" element={
          <>
            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md shadow-sm min-h-20 w-full flex items-center px-4 md:px-8 justify-between shrink-0 sticky top-0 z-50 border-b border-gray-100">
              <div className="flex items-center gap-2 md:gap-10 min-w-0">
                <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
                  <div className="bg-[#e5322d] p-1.5 rounded-lg transition-transform group-hover:rotate-3">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM16 11V18.1L13.9 16L11.1 18.1V11H16Z" />
                    </svg>
                  </div>
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 truncate">
                     DocSign
                  </span>
                </Link>
                
                <nav className="hidden xl:flex items-center gap-8 text-[13.5px] font-bold text-gray-600">
                  <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide">Merge PDF</a>
                  <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide">Split PDF</a>
                  <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide">Compress PDF</a>
                  <div className="h-4 w-px bg-gray-200 mx-2"></div>
                  <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide flex items-center gap-1.5">
                    Convert PDF 
                    <svg className="w-3.5 h-3.5 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 7L10 11.5L14.5 7H5.5Z"/></svg>
                  </a>
                  <a href="#" className="hover:text-[#e5322d] transition-colors uppercase tracking-wide flex items-center gap-1.5">
                    All PDF Tools
                    <svg className="w-3.5 h-3.5 opacity-60" fill="currentColor" viewBox="0 0 20 20"><path d="M5.5 7L10 11.5L14.5 7H5.5Z"/></svg>
                  </a>
                </nav>
              </div>
              
              <div className="flex items-center gap-1 sm:gap-3">
                {/* Login - Icon only on mobile, text on sm+ */}
                <Link to="/login" className="flex items-center gap-1.5 text-[14px] sm:text-[15px] font-bold text-gray-600 hover:text-gray-900 transition-colors px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-50">
                  <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  <span className="hidden sm:inline">Login</span>
                </Link>

                {/* Sign up - Compact on mobile */}
                <Link to="/signup" className="bg-[#e5322d] text-white text-[12px] sm:text-[15px] px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl hover:bg-[#cc2b26] transition-all font-bold whitespace-nowrap shadow-lg shadow-red-100">
                  Sign up
                </Link>
                
                <div className="h-6 w-px bg-gray-100 mx-0.5 sm:mx-1"></div>
                
                {/* Mobile Menu Toggle */}
                <button 
                  className="xl:hidden p-2 text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all"
                  onClick={toggleMenu}
                >
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isMenuOpen ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                  </svg>
                </button>
              </div>
            </header>

            {/* Mobile Sidebar Menu */}
            {isMenuOpen && (
              <div className="fixed inset-0 z-[100] xl:hidden">
                {/* Blur/Overlay */}
                <div 
                  className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity duration-300"
                  onClick={() => setIsMenuOpen(false)}
                ></div>
                
                <div className="absolute top-0 right-0 bottom-0 w-[280px] sm:w-[320px] bg-white shadow-2xl flex flex-col animate-slide-in-right overflow-y-auto">
                  {/* Sidebar Header */}
                  <div className="p-6 flex items-center justify-between border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <svg className="w-7 h-7 text-[#e5322d]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14 2H6C4.9 2 4.01 2.9 4.01 4L4 20C4 21.1 4.89 22 5.99 22H18C19.1 22 20 21.1 20 20V8L14 2ZM18 20H6V4H13V9H18V20ZM16 11V18.1L13.9 16L11.1 18.1V11H16Z" />
                      </svg>
                      <span className="text-xl font-black text-gray-900">DocSign</span>
                    </div>
                    <button 
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Sidebar Content */}
                  <div className="flex-1 p-6 flex flex-col gap-1">
                    {/* Account Section - Visible only on mobile where buttons are hidden in header */}
                    <div className="sm:hidden mb-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 px-3">Account</p>
                      <div className="flex flex-col gap-2">
                        <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-700 hover:bg-gray-50 border border-gray-100">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          </svg>
                          Login
                        </Link>
                        <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="w-full bg-[#e5322d] text-white font-bold py-4 rounded-xl shadow-md hover:bg-[#cc2b26] transition-all text-center">
                          Sign up for Free
                        </Link>
                      </div>
                      <div className="my-6 border-t border-gray-100"></div>
                    </div>

                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">PDF Tools</p>
                    {[
                      { name: 'Merge PDF', icon: 'M4 4v16M20 4v16M4 12h16' },
                      { name: 'Split PDF', icon: 'M8 7l4 4-4 4M16 7l-4 4 4 4' },
                      { name: 'Compress PDF', icon: 'M4 8l8 4 8-4M4 16l8 4 8-4' },
                      { name: 'Convert PDF', icon: 'M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4' },
                      { name: 'All PDF Tools', icon: 'M4 6h16M4 12h16m-7 6h7' }
                    ].map((tool) => (
                      <a 
                        key={tool.name} 
                        href="#" 
                        className="flex items-center gap-4 px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-700 hover:bg-[#fdf2f2] hover:text-[#e5322d] transition-all group"
                      >
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#e5322d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tool.icon} />
                        </svg>
                        {tool.name}
                      </a>
                    ))}

                    <div className="hidden sm:block my-6 border-t border-gray-100"></div>
                    
                    <div className="hidden sm:block">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 px-3">Account</p>
                      <Link to="/login" onClick={() => setIsMenuOpen(false)} className="flex items-center gap-4 px-3 py-3.5 rounded-xl text-[15px] font-semibold text-gray-700 hover:bg-gray-50">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Login
                      </Link>
                      <div className="mt-4 px-3">
                        <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="w-full bg-[#e5322d] text-white font-bold py-4 rounded-xl shadow-lg shadow-red-100 hover:bg-[#cc2b26] transition-all text-center block">
                          Sign up for Free
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Sidebar Footer */}
                  <div className="p-6 bg-gray-50">
                    <p className="text-xs text-center text-gray-500 font-medium">
                      The most professional way to sign your documents.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Action Area */}
            <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-24 max-w-7xl mx-auto w-full">
              {selectedFile ? (
                <div className="w-full max-w-4xl bg-white shadow-xl rounded-[16px] p-6 sm:p-10 md:p-14 text-center border overflow-hidden">
                   <h2 className="text-2xl md:text-3xl font-bold text-[#33333b] mb-8 md:mb-12 px-2">
                     Who will sign this document?
                   </h2>

                   <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center items-stretch mb-8 md:mb-10 w-full max-w-3xl mx-auto">
                     {/* Card 1: Only me */}
                     <div className="flex-1 bg-[#f8f9fa] rounded-xl p-6 sm:p-8 flex flex-col items-center transition-all hover:shadow-md cursor-pointer border border-transparent hover:border-red-100 min-w-0 max-w-full">
                       {/* Illustration Mock (Single User/Doc) */}
                       <div className="h-[120px] w-[120px] md:h-[160px] md:w-[160px] bg-[#dbe8f6] rounded-[30px] flex items-center justify-center mb-6 md:mb-8 shrink-0">
                          <svg className="w-12 h-12 md:w-20 md:h-20 text-[#4a90e2]" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          </svg>
                       </div>
                       
                       <button
                         className="bg-[#e5322d] text-white text-base md:text-[17px] font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-lg mb-2 md:mb-3 hover:bg-[#cc2b26] transition w-full md:w-[85%] truncate"
                         onClick={handleUploadAndNavigate}
                         disabled={isUploading}
                       >
                         {isUploading ? 'Uploading...' : 'Only me'}
                       </button>
                       <p className="text-sm md:text-[15px] text-[#707078]">Sign this document</p>
                     </div>

                     {/* Card 2: Several people */}
                     <div className="flex-1 bg-[#f8f9fa] rounded-xl p-6 sm:p-8 flex flex-col items-center transition-all hover:shadow-md cursor-pointer border border-transparent hover:border-green-100 min-w-0 max-w-full">
                       {/* Illustration Mock (Group/Multiple) */}
                       <div className="h-[120px] w-[120px] md:h-[160px] md:w-[160px] bg-green-100 rounded-full flex items-center justify-center mb-6 md:mb-8 shrink-0">
                          <svg className="w-16 h-16 md:w-28 md:h-28 text-[#50e3c2]" viewBox="0 0 24 24" fill="currentColor">
                             <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                          </svg>
                       </div>
                       
                       <button
                         className="bg-[#e5322d] text-white text-base md:text-[17px] font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-lg mb-2 md:mb-3 hover:bg-[#cc2b26] transition w-full md:w-[85%] truncate"
                         onClick={handleUploadAndNavigate}
                         disabled={isUploading}
                       >
                         {isUploading ? 'Uploading...' : 'Several people'}
                       </button>
                       <p className="text-sm md:text-[15px] text-[#707078]">Invite others to sign</p>
                     </div>
                   </div>

                   <div className="flex flex-col items-center gap-3 mt-4">
                       <p className="text-sm md:text-[14.5px] text-[#33333b] font-medium mb-1 break-all px-4">
                         Uploaded documents: <span className="font-bold">{selectedFile.name}</span>
                       </p>
                       <button onClick={() => setSelectedFile(null)} className="flex items-center justify-center rounded-lg font-bold text-sm md:text-[14.5px] text-[#cc2b26] bg-[#fdf2f2] hover:bg-[#fce8e8] px-4 md:px-6 py-2 md:py-2.5 transition w-full sm:w-max">
                         Cancel and select a different file
                       </button>
                   </div>
                </div>
              ) : (
                <div className="w-full flex flex-col items-center">
                  <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#33333b] mb-4 text-center px-4 leading-tight">Sign PDF</h1>
                  <p className="text-base sm:text-lg md:text-[22px] text-[#47474f] mb-8 md:mb-10 text-center max-w-2xl leading-relaxed px-4">
                    Your tool to eSign documents. Sign a document yourself or send a signature request to others.
                  </p>

                  <div className="flex flex-col items-center w-full max-w-md px-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-3 w-full justify-center">
                        <button 
                          onClick={handleTriggerUpload}
                          className="bg-[#e5322d] hover:bg-[#cc2b26] text-white text-xl sm:text-2xl md:text-[28px] font-bold px-8 sm:px-12 py-4 md:py-5 rounded-[10px] shadow-lg flex items-center justify-center transition-all hover:scale-105 duration-300 w-full sm:min-w-[280px]"
                        >
                          Select PDF file
                        </button>
                        <div className="flex flex-row sm:flex-col gap-3 sm:gap-2">
                          <button className="w-12 h-12 sm:w-[42px] sm:h-[42px] bg-[#e5322d] hover:bg-[#cc2b26] text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110">
                            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM14 13V17H10V13H7L12 8L17 13H14Z"/></svg>
                          </button>
                          <button className="w-12 h-12 sm:w-[42px] sm:h-[42px] bg-[#e5322d] hover:bg-[#cc2b26] text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110">
                            <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.5 12C2.5 7.5 6 4 10.5 4C13.2 4 15.6 5.3 17 7.4L13.8 9.2C13 8.3 11.8 7.7 10.5 7.7C8.1 7.7 6.2 9.6 6.2 12C6.2 14.4 8.1 16.3 10.5 16.3C11.8 16.3 13 15.7 13.8 14.8L17 16.6C15.6 18.7 13.2 20 10.5 20C6 20 2.5 16.5 2.5 12ZM21.5 12L17.5 8V11H12.5V13H17.5V16L21.5 12Z"/></svg>
                          </button>
                        </div>
                      </div>
                      <input 
                        type="file" 
                        accept=".pdf" 
                        ref={fileInputRef} 
                        onChange={handleFileChange}
                        className="hidden" 
                      />
                      <p className="mt-8 text-sm sm:text-base md:text-[15px] text-[#47474f] hidden sm:block">or drop PDF here</p>
                  </div>
                </div>
              )}
            </main>

            {/* Footer minimal info */}
            <footer className="py-8 md:py-6 text-center text-xs sm:text-sm font-semibold text-gray-400 mt-auto">
              &copy; {new Date().getFullYear()} DocSign WebApp
            </footer>
          </>
        } />
            <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </div>
  )
}

export default App
