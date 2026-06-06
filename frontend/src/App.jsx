function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-20 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1 text-sm font-medium text-emerald-300">
              Document Signature App
            </span>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Secure PDF signing workflows for enterprise document handling.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Upload documents, place signatures, track status, and generate signed PDFs with a
              PostgreSQL-backed workflow built for real SaaS use cases.
            </p>
            <div className="flex flex-wrap gap-3">
              <button className="rounded-xl bg-emerald-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-emerald-300">
                Open Dashboard
              </button>
              <button className="rounded-xl border border-white/15 px-5 py-3 font-medium text-white transition hover:border-white/30 hover:bg-white/5">
                View API Status
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Workflow
                </p>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                  Live
                </span>
              </div>
              <div className="space-y-3">
                {[
                  'Upload PDF document',
                  'Place signature field',
                  'Send secure signing link',
                  'Generate final signed PDF',
                ].map((step, index) => (
                  <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-slate-950">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-200">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
