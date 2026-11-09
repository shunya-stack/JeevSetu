import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { createCaseAPI } from '../../lib/api';
import { ArrowLeft, Check, ShieldAlert, AlertCircle, MapPin, User, Loader2 } from 'lucide-react';

export const ReportConfirmPage: React.FC = () => {
  const { t, draft, resetDraft, language } = useLanguage();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        animal_type: draft.animal_type || 'cow',
        animal_identifier: draft.animal_identifier || null,
        animal_age_group: draft.animal_age_group || null,
        is_milking: draft.is_milking || false,
        language: draft.language || 'odia',
        transcript: draft.transcript || '',
        audio_object_key: draft.audio_object_key || null,
        audio_consent: draft.audio_consent,
        symptom_extraction: draft.symptom_extraction || {},
        urgency_level: draft.urgency_level || 'review',
        urgency_reasons: draft.urgency_reasons || [],
        district: draft.district || 'Khordha',
        block: draft.block || null,
        village: draft.village || null,
        landmark: draft.landmark || null,
        latitude: draft.latitude || null,
        longitude: draft.longitude || null,
        farmer_name: draft.farmer_name || null,
        farmer_phone: draft.farmer_phone || null,
        contact_consent: draft.contact_consent,
        input_mode: draft.input_mode || 'voice',
        processing_source: draft.audio_object_key ? 'bhashini_asr' : 'demo',
        is_demo_record: false,
        // Multilingual voice workflow fields
        original_audio_keys: draft.original_audio_keys || [draft.audio_object_key].filter(Boolean),
        original_transcripts: draft.original_transcripts || [draft.original_transcript || draft.transcript || ''].filter(Boolean),
        english_operator_transcript: draft.english_operator_transcript || null,
        farmer_confirmed: draft.farmer_confirmed || false,
        confirmation_status: draft.confirmation_status || 'pending',
        record_more_count: draft.record_more_count || 0,
      };

      const result = await createCaseAPI(payload);
      resetDraft();
      navigate(`/case/${result.id}/success`, { state: { caseData: result } });
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMsg("{t('confirm_error')}");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isUrgent = draft.urgency_level === 'urgent';

  return (
    <div className="min-h-screen bg-[#F7F7F0] py-6 sm:py-10">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/report/location" className="text-sm font-medium text-[#647168] hover:text-[#17251D] flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('confirm_edit_location')}
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E2EEE5] text-[#174B35]">
            {t('confirm_final_review')}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-sm space-y-6">
          
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251D]">
              {t('confirm_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#647168] mt-1">
              {t('confirm_subtitle')}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#FCE9E7] border border-[#B83A35]/30 text-[#B83A35] text-xs">
              {errorMsg}
            </div>
          )}

          {/* Urgency Badge Banner */}
          <div className={`p-4 rounded-2xl flex items-center justify-between ${
            isUrgent ? 'bg-[#FCE9E7] border border-[#B83A35]' : 'bg-[#FFF2D9] border border-[#D89A32]'
          }`}>
            <div className="flex items-center gap-3">
              {isUrgent ? (
                <ShieldAlert className="w-6 h-6 text-[#B83A35]" />
              ) : (
                <AlertCircle className="w-6 h-6 text-[#A85C12]" />
              )}
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#647168]">{t('confirm_priority')}</span>
                <h4 className="text-sm font-bold text-[#17251D]">
                  {isUrgent ? t('confirm_urgent_headline') : t('confirm_review_headline')}
                </h4>
              </div>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              isUrgent ? 'bg-[#B83A35] text-white' : 'bg-[#D89A32] text-white'
            }`}>
              {t(`urgency_badge_${(draft.urgency_level || 'review').toLowerCase() === 'urgent' ? 'urgent' : 'review'}`)}
            </span>
          </div>

          {/* Details Table Card */}
          <div className="rounded-2xl bg-[#F7F7F0] p-4 border border-[#E2E7DF] space-y-3 text-xs sm:text-sm">
            <div className="flex justify-between py-1 border-b border-[#E2E7DF]">
              <span className="text-[#647168]">{t('confirm_animal')}:</span>
              <span className="font-bold text-[#17251D] capitalize">
                {t(`animal_${draft.animal_type || 'other'}`)} {draft.animal_identifier ? `(${draft.animal_identifier})` : ''}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E2E7DF]">
              <span className="text-[#647168]">{t('confirm_location')}:</span>
              <span className="font-medium text-[#17251D] text-right">
                {draft.village || t('confirm_village_unspecified')}, {draft.district}
              </span>
            </div>

            <div className="flex justify-between py-1 border-b border-[#E2E7DF]">
              <span className="text-[#647168]">{t('confirm_reported_symptoms')}:</span>
              <span className="font-medium text-[#17251D] text-right max-w-xs">
                {(draft.localized_content_cache?.[language]?.localized_symptoms as string[] | undefined)?.join(', ') || draft.symptom_extraction?.symptoms_reported?.map(s => s.value).join(', ') || t('confirm_symptoms_na')}
              </span>
            </div>

            {draft.farmer_name && (
              <div className="flex justify-between py-1 border-b border-[#E2E7DF]">
                <span className="text-[#647168]">{t('confirm_farmer')}:</span>
                <span className="font-medium text-[#17251D]">
                  {draft.farmer_name} {draft.farmer_phone ? `(${draft.farmer_phone})` : ''}
                </span>
              </div>
            )}

            <div className="py-2">
              <span className="text-[#647168] block mb-1">{t('confirm_transcript')}</span>
              <p className="p-3 bg-white rounded-xl border border-[#E2E7DF] text-xs text-[#17251D] italic leading-relaxed">
                "{draft.transcript || t('confirm_transcript_na')}"
              </p>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 space-y-3">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer disabled:bg-[#C4CEC7]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('confirm_submitting')}</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5 stroke-[3]" />
                  <span>{t('btn_submit_case')}</span>
                </>
              )}
            </button>

            <Link
              to="/report"
              className="block w-full py-3 rounded-2xl text-center text-xs font-semibold text-[#647168] hover:text-[#17251D] transition-colors"
            >
              {t('confirm_discard')}
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
};

