import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldAlert, AlertCircle, ArrowRight, ArrowLeft, PhoneCall, CheckCircle } from 'lucide-react';

export const ReportUrgencyPage: React.FC = () => {
  const { t, draft, language } = useLanguage();
  const navigate = useNavigate();

  const isUrgent = draft.urgency_level === 'urgent';
  const isReview = draft.urgency_level === 'review';
  // Translated urgency reasons from the Bhashini cache (fall back to the
  // canonical English reasons only when no cached translation exists).
  const localizedReasons =
    draft.localized_content_cache?.[language]?.localized_urgency_reasons ||
    draft.urgency_reasons ||
    [];

  return (
    <div className="min-h-screen bg-[#F7F7F0] py-6 sm:py-10">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/report/review" className="text-sm font-medium text-[#647168] hover:text-[#17251D] flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('btn_back')}
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E2EEE5] text-[#174B35]">
            {t('urgency_safety_eval_step')}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-sm space-y-6">
          
          {/* URGENT STATE */}
          {isUrgent && (
            <div className="rounded-2xl bg-[#FCE9E7] border-2 border-[#B83A35] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#B83A35] text-white flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#B83A35]">
                    {t('urgency_flag_emergency')}
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#17251D]">
                    {t('urgency_urgent_title')}
                  </h2>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-[#17251D] space-y-2 pt-2 border-t border-[#B83A35]/20">
                <p className="font-semibold text-[#B83A35]">
                  {t('urgency_why_flagged')}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[#17251D]">
                  {localizedReasons.length > 0 ? localizedReasons.map((r, i) => (<li key={i}>{r}</li>)) : (<li>{t(isUrgent ? 'urgency_default_reason_urgent' : 'urgency_default_reason_review')}</li>)}
                </ul>
              </div>

              {/* Immediate Recommended Actions */}
              <div className="bg-white/80 rounded-xl p-3.5 border border-[#B83A35]/30">
                <h4 className="text-xs font-bold text-[#17251D] uppercase mb-1">
                  {t('urgency_instructions_label')}
                </h4>
                <p className="text-xs text-[#17251D] leading-relaxed">
                  {(draft.localized_content_cache?.[language]?.localized_recommendations as any)?.[0] || draft.immediate_actions?.[0] || t('urgency_default_action')}
                </p>
              </div>
            </div>
          )}

          {/* ROUTINE REVIEW STATE */}
          {!isUrgent && (
            <div className="rounded-2xl bg-[#FFF2D9] border border-[#D89A32] p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#D89A32] text-white flex items-center justify-center shrink-0">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#A85C12]">
                    {t('urgency_priority_label')}
                  </span>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#17251D]">
                    {t('urgency_review_title')}
                  </h2>
                </div>
              </div>

              <div className="text-xs sm:text-sm text-[#17251D] space-y-2 pt-2 border-t border-[#D89A32]/30">
                <p className="font-semibold text-[#A85C12]">{t('urgency_eval_reason')}</p>
                <ul className="list-disc pl-5 space-y-1">
                  {localizedReasons.length > 0 ? localizedReasons.map((r, i) => (<li key={i}>{r}</li>)) : (<li>{t(isUrgent ? 'urgency_default_reason_urgent' : 'urgency_default_reason_review')}</li>)}
                </ul>
              </div>
            </div>
          )}

          {/* Strict Safety Boundary Callout */}
          <div className="p-4 rounded-2xl bg-[#F7F7F0] border border-[#E2E7DF] text-xs text-[#647168] space-y-1">
            <p className="font-bold text-[#17251D]">{t('urgency_safety_notice')}</p>
            <p>
              {t('urgency_safety_body')}
            </p>
          </div>

          {/* Action button */}
          <button
            type="button"
            onClick={() => navigate('/report/location')}
            className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>{t('urgency_proceed')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

        </div>

      </div>
    </div>
  );
};

