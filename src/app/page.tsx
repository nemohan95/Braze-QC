import Link from 'next/link';
import SearchBar from '@/components/SearchBar';

export default function HomePage() {
  return (
    <section className='space-y-10'>
      <div className='rounded-2xl border border-slate-200 bg-white p-10 shadow-sm'>
        <div className='mb-8 text-center'>
          <SearchBar />
        </div>
        <div className='flex flex-col gap-6 md:flex-row md:items-center md:justify-between'>
          <div className='max-w-2xl space-y-4'>
            <span className='inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-indigo-700'>Email QC MVP</span>
            <h1 className='text-3xl font-semibold text-slate-900 md:text-4xl'>Automate QC for Braze marketing emails</h1>
            <p className='text-lg text-slate-600'>Validate copy against the approved doc, enforce entity-specific disclaimers, and catch risky links before send time.</p>
            <div className='flex flex-wrap gap-3'>
              <Link
                href='/qc/new'
                className='inline-flex items-center justify-center rounded-md bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500'
              >
                Start a New QC Run
              </Link>
              <Link
                href='/qc'
                className='inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100'
              >
                View Past Reports
              </Link>
              <Link
                href='/help'
                className='inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100'
              >
                Help & FAQ
              </Link>
            </div>
          </div>
          <div className='grid gap-3 text-sm text-slate-600'>
            <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <h3 className='text-sm font-semibold text-slate-800'>Powered by GPT-4.1</h3>
              <p className='mt-1'>Strict JSON schema ensures deterministic summaries and per-check outcomes.</p>
            </div>
            <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <h3 className='text-sm font-semibold text-slate-800'>Risk & Disclaimer Matrix</h3>
              <p className='mt-1'>Import CSV rule packs for UK, EU, ROW, and EU CY entities.</p>
            </div>
            <div className='rounded-lg border border-slate-200 bg-slate-50 p-4'>
              <h3 className='text-sm font-semibold text-slate-800'>Link Intelligence</h3>
              <p className='mt-1'>Detect dev domains, follow redirects, and capture status codes for every URL.</p>
            </div>
          </div>
        </div>
      </div>

      <div className='grid gap-6 md:grid-cols-3'>
        <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-slate-900'>Copy Doc Parity</h3>
          <p className='mt-2 text-sm text-slate-600'>Paste the copy or upload a docx file. The QC run highlights mismatched paragraphs, missing CTAs, and envelope differences.</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-slate-900'>Risk & Keyword Disclaimers</h3>
          <p className='mt-2 text-sm text-slate-600'>Entity + silo combinations trigger the right variant, while vendor keywords enforce additional language.</p>
        </div>
        <div className='rounded-xl border border-slate-200 bg-white p-6 shadow-sm'>
          <h3 className='text-lg font-semibold text-slate-900'>Exports & Sharing</h3>
          <p className='mt-2 text-sm text-slate-600'>Download CSV or PDF reports and share the Braze preview link with stakeholders.</p>
        </div>
      </div>
    </section>
  );
}
