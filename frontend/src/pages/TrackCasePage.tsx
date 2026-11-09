import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Search, ShieldAlert, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCaseDetailAPI, getCasesAPI } from '../lib/api';
import { CaseRecord } from '../types';

export const TrackCasePage: React.FC = () => {
  const [reference, setReference] = useState('');
  const [searchResult, setSearchResult] = useState<CaseRecord | null>(null);
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'search'>('list');

  // Load all cases on mount (farmer's case history)
  useEffect(() => {
    let isMounted = true;

    async function loadCases() {
      setIsLoadingCases(true);
      setErrorMessage(null);
      try {
        const cases = await getCasesAPI({ limit: 50 });
        if (isMounted) {
          setAllCases(cases);
        }
      } catch (err: any) {
        console.error("Failed to load cases:", err);
        if (isMounted) {
          setErrorMessage('Unable to load case history. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setIsLoadingCases(false);
        }
      }
    }

    loadCases();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedReference = reference.trim().toUpperCase();
    if (!normalizedReference) {
      setErrorMessage('Enter the case reference number to continue.');
      setSearchResult(null);
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setViewMode('search');
    try {
      const record = await getCaseDetailAPI(normalizedReference);
      if (record) {
        setSearchResult(record);
        setViewMode('search');
      } else {
        setSearchResult(null);
        setErrorMessage('We could not find that case reference. Check the number and try again.');
      }
    } catch {
      setSearchResult(null);
      setErrorMessage('We could not find that case reference. Check the number and try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setErrorMessage(null);
    setSearchResult(null);
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'bg-[#FCE9E7] text-[#B83A35]';
      case 'under_review': return 'bg-[#FFF2D9] text-[#A85C12]';
      case 'assigned': return 'bg-[#E2EEE5] text-[#174B35]';
      case 'resolved': return 'bg-[#E2EEE5] text-[#2D7D57]';
      default: return 'bg-[#E2EEE5] text-[#647168]';
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] px-4 py-8 pb-24 sm:py-12">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-[#647168] hover:text-[#17251D]">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        {viewMode === 'list' ? (
          <div className="space-y-6 rounded-3xl border border-[#E2E7DF] bg-white p-6 shadow-sm sm:p-8">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E2EEE5] text-[#174B35]">
                <Info className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#17251D]">Track your case</h1>
              <p className="mt-1.5 text-sm leading-relaxed text-[#647168]">
                View your submitted cases below, or search by case reference number.
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

            {isLoadingCases && (
              <p className="text-center text-sm text-[#647168]">Loading your cases...</p>
            )}

            {!isLoadingCases && allCases.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-[#647168]">No cases registered yet.</p>
                <Link
                  to="/report"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[#174B35] hover:text-[#103D2A]"
                >
                  Register a new case
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {!isLoadingCases && allCases.length > 0 && (
              <div className="mt-6 space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#647168]">
                  Your Cases ({allCases.length})
                </h2>
                {allCases.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] p-3"
                  >
                    <div>
                      <p className="text-xs font-mono font-bold text-[#174B35]">{c.public_reference}</p>
                      <p className="text-[10px] text-[#647168] mt-0.5">
                        {c.animal_type || 'Animal'} • {c.language || 'odia'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusColor(c.status)}`}
                    >
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-center text-xs text-[#647168] mt-4">
              Need immediate help? Call the veterinary helpline at{' '}
              <a className="font-bold text-[#E11D25]" href="tel:1962">
                1962
              </a>
              .
            </p>
          </div>
        ) : (
          // Search result view
          <div className="space-y-6 rounded-3xl border border-[#E2E7DF] bg-white p-6 shadow-sm sm:p-8">
            <button
              onClick={handleBackToList}
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#647168] hover:text-[#17251D]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to case list
            </button>

            {searchResult && (
              <section aria-live="polite" className="space-y-4 rounded-2xl border border-[#E2E7DF] bg-[#F7F7F0] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#647168]">Case reference</p>
                    <p className="mt-1 font-mono text-lg font-bold text-[#174B35]">{searchResult.public_reference}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusColor(searchResult.status)}`}>
                    {searchResult.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-start gap-2 rounded-xl border border-[#D89A32]/40 bg-[#FFF2D9] p-3 text-xs leading-relaxed text-[#A85C12]">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Case updates are based on veterinary team review. This service does not replace a veterinarian.</span>
                </div>
              </section>
            )}

            {!searchResult && errorMessage && (
              <p role="alert" className="rounded-xl border border-[#B83A35]/30 bg-[#FCE9E7] p-3 text-sm text-[#B83A35]">
                {errorMessage}
              </p>
            )}

            <p className="text-center text-xs text-[#647168] mt-4">
              Need immediate help? Call the veterinary helpline at{' '}
              <a className="font-bold text-[#E11D25]" href="tel:1962">
                1962
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
