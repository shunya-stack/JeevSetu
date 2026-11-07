import React, { useState } from 'react';
import { ArrowLeft, Search, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCaseDetailAPI } from '../lib/api';
import { CaseRecord } from '../types';

export const TrackCasePage: React.FC = () => {
  const [reference, setReference] = useState('');
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedReference = reference.trim().toUpperCase();
    if (!normalizedReference) {
      setErrorMessage('Enter the case reference number to continue.');
      setCaseRecord(null);
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    try {
      setCaseRecord(await getCaseDetailAPI(normalizedReference));
    } catch {
      setCaseRecord(null);
      setErrorMessage('We could not find that case reference. Check the number and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] px-4 py-8 pb-24 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#647168] hover:text-[#17251D]">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="space-y-6 rounded-3xl border border-[#E2E7DF] bg-white p-6 shadow-sm sm:p-8">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E2EEE5] text-[#174B35]">
              <Search className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#17251D]">Track your case</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[#647168]">
              Enter the reference number you received after submitting an animal health report.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3">
            <label htmlFor="case-reference" className="block text-sm font-semibold text-[#17251D]">
              Case reference number
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                id="case-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="e.g. JS-2026-8941"
                className="min-h-12 min-w-0 flex-1 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] px-4 text-sm uppercase outline-none transition focus:border-[#174B35] focus:bg-white focus:ring-2 focus:ring-[#174B35]/20"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="min-h-12 rounded-xl bg-[#174B35] px-5 text-sm font-semibold text-white transition hover:bg-[#103D2A] disabled:cursor-wait disabled:opacity-60"
              >
                {isSearching ? 'Searching...' : 'Track case'}
              </button>
            </div>
          </form>

          {errorMessage && (
            <p role="alert" className="rounded-xl border border-[#B83A35]/30 bg-[#FCE9E7] p-3 text-sm text-[#B83A35]">
              {errorMessage}
            </p>
          )}

          {caseRecord && (
            <section aria-live="polite" className="space-y-4 rounded-2xl border border-[#E2E7DF] bg-[#F7F7F0] p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#647168]">Case reference</p>
                  <p className="mt-1 font-mono text-lg font-bold text-[#174B35]">{caseRecord.public_reference}</p>
                </div>
                <span className="rounded-full bg-[#E2EEE5] px-3 py-1 text-xs font-bold capitalize text-[#174B35]">
                  {caseRecord.status.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-start gap-2 rounded-xl border border-[#D89A32]/40 bg-[#FFF2D9] p-3 text-xs leading-relaxed text-[#A85C12]">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Case updates are based on veterinary team review. This service does not replace a veterinarian.</span>
              </div>
            </section>
          )}

          <p className="text-center text-xs text-[#647168]">
            Need immediate help? Call the veterinary helpline at <a className="font-bold text-[#E11D25]" href="tel:1962">1962</a>.
          </p>
        </div>
      </div>
    </div>
  );
};
