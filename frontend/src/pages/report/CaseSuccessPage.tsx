import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { getCaseDetailAPI } from '../../lib/api';
import { CaseRecord } from '../../types';
import { CheckCircle, ArrowRight, Home, Activity, FileText, Phone } from 'lucide-react';

export const CaseSuccessPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { t } = useLanguage();

  const [caseData, setCaseData] = useState<CaseRecord | null>(
    (location.state as any)?.caseData || null
  );
  const [loading, setLoading] = useState(!caseData);

  useEffect(() => {
    if (!caseData && id) {
      getCaseDetailAPI(id)
        .then(setCaseData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [id, caseData]);

  return (
    <div className="min-h-screen bg-[#F7F7F0] py-10 sm:py-16">
      <div className="max-w-lg mx-auto px-4 sm:px-6">
        
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E2E7DF] shadow-md text-center space-y-6">
          
          {/* Success Check Icon */}
          <div className="w-20 h-20 rounded-full bg-[#E2EEE5] text-[#174B35] flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251D]">
              {t('success_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#647168] mt-1.5">
              Your report has been successfully forwarded to the field veterinary review team.
            </p>
          </div>

          {/* Reference Box */}
          <div className="rounded-2xl bg-[#F7F7F0] p-4 border border-[#E2E7DF] space-y-2">
            <span className="text-xs text-[#647168] uppercase font-bold tracking-wider">
              {t('success_ref')}
            </span>
            <div className="text-2xl font-black text-[#174B35] font-mono tracking-wider">
              {caseData?.public_reference || id || "JS-2026-PENDING"}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E2EEE5] text-[#174B35] text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {t('success_status')}
            </div>
          </div>

          {/* Next Steps Guidance */}
          <div className="text-left bg-[#EEF2E9]/60 rounded-2xl p-4 border border-[#E2E7DF] space-y-2 text-xs text-[#17251D]">
            <h4 className="font-bold">Next Steps:</h4>
            <ul className="list-disc pl-4 space-y-1 text-[#647168]">
              <li>A field veterinary officer will review the audio transcript and symptoms.</li>
              <li>Keep the animal clean, dry, and sheltered with water access.</li>
              <li>Do not administer unprescribed medicines or injections.</li>
            </ul>
          </div>

          {/* Action Links */}
          <div className="space-y-3 pt-2">
            <Link
              to="/report"
              className="w-full py-3.5 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <span>Report Another Concern</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/"
              className="w-full py-3.5 rounded-2xl bg-white border border-[#E2E7DF] hover:bg-[#F7F7F0] text-[#17251D] font-medium text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Home className="w-4 h-4 text-[#647168]" />
              <span>Return Home</span>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

