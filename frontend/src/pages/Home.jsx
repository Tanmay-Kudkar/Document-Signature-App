import { useOutletContext } from 'react-router-dom';

export default function Home() {
  const { fileInputRef, selectedFile, isUploading, handleTriggerUpload, handleUploadAndNavigate, clearSelected } = useOutletContext();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-24 max-w-7xl mx-auto w-full">
      {selectedFile ? (
        <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl p-6 sm:p-10 md:p-14 text-center border overflow-hidden">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8 md:mb-12 px-2">Who will sign this document?</h2>

          <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-center items-stretch mb-8 md:mb-10 w-full max-w-3xl mx-auto">
            <div className="flex-1 bg-slate-50 rounded-xl p-6 sm:p-8 flex flex-col items-center transition-all hover:shadow-md cursor-pointer border border-transparent hover:border-red-100 min-w-0 max-w-full">
              <div className="h-30 w-30 md:h-40 md:w-40 bg-[#dbe8f6] rounded-2xl flex items-center justify-center mb-6 md:mb-8 shrink-0">
                <svg className="w-12 h-12 md:w-20 md:h-20 text-[#4a90e2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>

              <button className="bg-[#e5322d] text-white text-base md:text-[17px] font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-lg mb-2 md:mb-3 hover:bg-[#cc2b26] transition w-full md:w-[85%] truncate" onClick={handleUploadAndNavigate} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Only me'}
              </button>
              <p className="text-sm md:text-[15px] text-slate-600">Sign this document</p>
            </div>

            <div className="flex-1 bg-slate-50 rounded-xl p-6 sm:p-8 flex flex-col items-center transition-all hover:shadow-md cursor-pointer border border-transparent hover:border-green-100 min-w-0 max-w-full">
              <div className="h-30 w-30 md:h-40 md:w-40 bg-green-100 rounded-full flex items-center justify-center mb-6 md:mb-8 shrink-0">
                <svg className="w-16 h-16 md:w-28 md:h-28 text-[#50e3c2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>

              <button className="bg-[#e5322d] text-white text-base md:text-[17px] font-bold py-2.5 md:py-3 px-6 md:px-8 rounded-lg mb-2 md:mb-3 hover:bg-[#cc2b26] transition w-full md:w-[85%] truncate" onClick={handleUploadAndNavigate} disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Several people'}
              </button>
              <p className="text-sm md:text-[15px] text-slate-600">Invite others to sign</p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 mt-4">
            <p className="text-sm md:text-[14.5px] text-slate-900 font-medium mb-1 break-all px-4">Uploaded documents: <span className="font-bold">{selectedFile?.name}</span></p>
            <button onClick={clearSelected} className="flex items-center justify-center rounded-lg font-bold text-sm md:text-[14.5px] text-[#cc2b26] bg-[#fdf2f2] hover:bg-[#fce8e8] px-4 md:px-6 py-2 md:py-2.5 transition w-full sm:w-max">Cancel and select a different file</button>
          </div>
        </div>
      ) : (
        <div className="w-full flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 text-center px-4 leading-tight">Sign PDF</h1>
          <p className="text-base sm:text-lg md:text-[22px] text-slate-700 mb-8 md:mb-10 text-center max-w-2xl leading-relaxed px-4">Your tool to eSign documents. Sign a document yourself or send a signature request to others.</p>

          <div className="flex flex-col items-center w-full max-w-md px-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-3 w-full justify-center">
              <button onClick={handleTriggerUpload} className="bg-[#e5322d] hover:bg-[#cc2b26] text-white text-xl sm:text-2xl md:text-[28px] font-bold px-8 sm:px-12 py-4 md:py-5 rounded-lg shadow-lg flex items-center justify-center transition-all hover:scale-105 duration-300 w-full sm:min-w-[280px]">Select PDF file</button>
              <div className="flex flex-row sm:flex-col gap-3 sm:gap-2">
                <button className="w-12 h-12 sm:w-10 sm:h-10 bg-[#e5322d] hover:bg-[#cc2b26] text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110">
                  <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4C9.11 4 6.6 5.64 5.35 8.04C2.34 8.36 0 10.91 0 14C0 17.31 2.69 20 6 20H19C21.76 20 24 17.76 24 15C24 12.36 21.95 10.22 19.35 10.04ZM14 13V17H10V13H7L12 8L17 13H14Z" /></svg>
                </button>
                <button className="w-12 h-12 sm:w-10 sm:h-10 bg-[#e5322d] hover:bg-[#cc2b26] text-white rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110">
                  <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M2.5 12C2.5 7.5 6 4 10.5 4C13.2 4 15.6 5.3 17 7.4L13.8 9.2C13 8.3 11.8 7.7 10.5 7.7C8.1 7.7 6.2 9.6 6.2 12C6.2 14.4 8.1 16.3 10.5 16.3C11.8 16.3 13 15.7 13.8 14.8L17 16.6C15.6 18.7 13.2 20 10.5 20C6 20 2.5 16.5 2.5 12ZM21.5 12L17.5 8V11H12.5V13H17.5V16L21.5 12Z" /></svg>
                </button>
              </div>
            </div>
            <p className="mt-8 text-sm sm:text-base md:text-[15px] text-slate-700 hidden sm:block">or drop PDF here</p>
          </div>
        </div>
      )}

      {/* Footer minimal info */}
      <footer className="py-8 md:py-6 text-center text-xs sm:text-sm font-semibold text-gray-400 mt-auto">&copy; {new Date().getFullYear()} DocSign WebApp</footer>
    </main>
  );
}
