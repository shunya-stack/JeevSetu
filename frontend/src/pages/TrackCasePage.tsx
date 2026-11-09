import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Search, ShieldAlert, Info, ChevronDown, MapPin, Phone, History, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCaseDetailAPI, getDeviceCaseRefs, forgetDeviceCase } from '../lib/api';
import { CaseRecord } from '../types';

const statusColor = (status: string) => {
  switch (status) {
    case 'urgent': return 'bg-[#FCE9E7] text-[#B83A35]';
    case 'under_review': return 'bg-[#FFF2D9] text-[#A85C12]';
    case 'assigned':
    case 'referral_suggested':
    case 'follow_up': return 'bg-[#E2EEE5] text-[#174B35]';
    case 'resolved':
    case 'closed': return 'bg-[#E2EEE5] text-[#2D7D57]';
    default: return 'bg-[#E2EEE5] text-[#647168]';
  }
};

const urgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'urgent': return 'bg-[#FCE9E7] text-[#B83A35] border-[#B83A35]/30';
    case 'review': return 'bg-[#FFF2D9] text-[#A85C12] border-[#A85C12]/30';
    default: return 'bg-[#E2EEE5] text-[#174B35] border-[#174B35]/20';
  }
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return iso;
  }
};

export const TrackCasePage: React.FC = () => {
  const [reference, setReference] = useState('');
  const [searchResult, setSearchResult] = useState<CaseRecord | null>(null);
  const [allCases, setAllCases] = useState<CaseRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'search'>('list');

  // Load only the cases created on this device (localStorage registry).
  // A brand-new device sees an empty history — never another user's records.
  const loadCases = useCallback(async () => {
    setIsLoadingCases(true);
    setErrorMessage(null);
    try {
      const refs = getDeviceCaseRefs();
      if (refs.length === 0) {
        setAllCases([]);
        return;
      }
      const results = await Promise.allSettled(refs.map((ref) => getCaseDetailAPI(ref)));
      const found: CaseRecord[] = [];
      const missing: string[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value) {
          found.push(r.value);
        } else {
          missing.push(refs[i]);
        }
      });
      // Drop references that no longer resolve on the server
      missing.forEach((ref) => forgetDeviceCase(ref));
      found.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
      setAllCases(found);
    } catch (err: any) {
      console.error("Failed to load cases:", err);
      setErrorMessage('Unable to load case history. Please try again later.');
    } finally {
      setIsLoadingCases(false);
    }
  }, []);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

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
    void loadCases();
  };

  const toggleDetails = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const renderCaseDetails = (c: CaseRecord) => (
    <div className="mt-3 space-y-3 rounded-xl border border-[#E2E7DF] bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold capitalize ${urgencyColor(c.urgency_level || 'info_needed')}`}>
          {c.urgency_level ? `Urgency: ${c.urgency_level}` : 'Urgency: pending'}
        </span>
        {c.is_demo_record && (
          <span className="rounded-full bg-[#FFF2D9] px-2.5 py-0.5 text-[10px] font-bold text-[#A85C12]">Demo record</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div>
          <p className="font-semibold text-[#647168] uppercase tracking-wide text-[10px]">Animal</p>
          <p className="mt-0.5 text-[#17251D] capitalize">
            {c.animal_type || '—'}{c.animal_identifier ? ` (${c.animal_identifier})` : ''}
          </p>
        </div>
        <div>
          <p className="font-semibold text-[#647168] uppercase tracking-wide text-[10px]">Submitted</p>
          <p className="mt-0.5 text-[#17251D]">{formatDate(c.created_at)}</p>
        </div>
        {(c.district || c.village) && (
          <div className="col-span-2 flex items-start gap-1.5">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#174B35]" />
            <p className="text-[#17251D]">
              {[c.village, c.block, c.district].filter(Boolean).join(', ')}
            </p>
          </div>
        )}
        {c.contact_consent && c.farmer_phone && (
          <div className="col-span-2 flex items-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 text-[#174B35]" />
            <p className="text-[#17251D]">{c.farmer_phone}</p>
          </div>
        )}
      </div>

      {c.urgency_reasons_json && c.urgency_reasons_json.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-[#B83A35]/20 bg-[#FCE9E7]/60 p-3">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B83A35]" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-[#B83A35]">Flagged reasons</p>
            <ul className="mt-1 list-disc pl-4 text-[11px] text-[#17251D] space-y-0.5">
              {c.urgency_reasons_json.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {c.status_history && c.status_history.length > 0 && (
        <div className="border-t border-[#E2E7DF] pt-3">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[#647168]">
            <History className="h-3.5 w-3.5" />
            Status history
          </p>
          <ol className="mt-2 space-y-2">
            {c.status_history.map((h) => (
              <li key={h.id} className="flex items-start justify-between gap-2 text-[11px]">
                <span className="font-semibold capitalize text-[#17251D]">{h.new_status.replace('_', ' ')}</span>
                <span className="text-[#647168] text-right">
                  {formatDate(h.created_at)}
                  {h.changed_by ? ` • by ${h.changed_by}` : ''}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );

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
                Cases you registered on this device, or search by case reference number.
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
                <p className="text-sm text-[#647168]">No cases registered on this device yet.</p>
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
                    className="rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] p-3"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDetails(c.id)}
                      aria-expanded={expandedId === c.id}
                      className="flex w-full items-center justify-between text-left cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-mono font-bold text-[#174B35]">{c.public_reference}</p>
                        <p className="text-[10px] text-[#647168] mt-0.5">
                          {c.animal_type || 'Animal'} • {c.language || 'odia'} • {formatDate(c.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${statusColor(c.status)}`}
                        >
                          {c.status.replace('_', ' ')}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-[#647168] transition-transform ${expandedId === c.id ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </button>
                    {expandedId === c.id && renderCaseDetails(c)}
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
                {renderCaseDetails(searchResult)}
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
