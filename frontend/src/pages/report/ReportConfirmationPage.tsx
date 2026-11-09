import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  generateLocalizedContentAPI,
  confirmCaseAPI,
  createCaseAPI,
  API_ORIGIN,
} from '../../lib/api';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Speaker,
  ShieldAlert,
  Info,
} from 'lucide-react';

type ConfirmationStatus = 'idle' | 'confirmed' | 'rejected' | 'submitting';

export const ReportConfirmationPage: React.FC = () => {
  const { t, draft, updateDraft, language } = useLanguage();
  const navigate = useNavigate();

  // Confirmation states
  const [confirmStatus, setConfirmStatus] = useState<ConfirmationStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [localizedContentLoaded, setLocalizedContentLoaded] = useState(false);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  // Build the English operator report from available data
  const buildEnglishOperatorReport = (): any => {
    const ext = draft.symptom_extraction;
    return {
      animal_type: draft.animal_type || 'cow',
      symptoms_reported: ext?.symptoms_reported || [],
      symptom_duration: ext?.symptom_duration || 'Not provided',
      eating_or_drinking_change: ext?.eating_or_drinking_change || 'Not provided',
      milk_production_change: ext?.milk_production_change || 'Not provided',
      other_observations: ext?.other_observations || [],
      unknown_fields: ext?.unknown_fields || [],
    };
  };

  // Build triage result from available data
  const buildTriageResult = (): any => {
    return {
      urgency_level: draft.urgency_level || 'review',
      urgency_reasons: draft.urgency_reasons || [],
      immediate_actions: draft.immediate_actions || [],
    };
  };

  // Generate localized summary and recommendations in farmer's language
  useEffect(() => {
    let isMounted = true;

    async function generateContent() {
      setIsGeneratingContent(true);

      try {
        const englishReport = buildEnglishOperatorReport();
        const triageResult = buildTriageResult();

        const res = await generateLocalizedContentAPI(
          englishReport,
          triageResult,
          language
        );

        if (isMounted) {
          updateDraft({
            localized_summary: res.localized_summary || '',
            localized_recommendations: res.localized_recommendations || '',
          });
          setLocalizedContentLoaded(true);
        }
      } catch (err: any) {
        console.error("Localized content generation failed:", err);
        if (isMounted) {
          setLocalizedContentLoaded(true);
          setErrorMsg("Could not generate summary in your language. Showing English version instead.");
        }
      } finally {
        if (isMounted) {
          setIsGeneratingContent(false);
        }
      }
    }

    generateContent();

    return () => {
      isMounted = false;
    };
  }, [language]);

  // Farmer confirms the understood report
  const handleConfirm = () => {
    if (draft.case_submitted) {
      setErrorMsg(t('review_duplicate_prevention'));
      return;
    }

    setConfirmStatus('confirmed');
    updateDraft({
      farmer_confirmed: true,
      confirmation_status: 'confirmed',
    });

    // Navigate to urgency page after confirmation
    navigate('/report/urgency');
  };

  // Farmer rejects - allow re-record
  const handleReject = () => {
    setConfirmStatus('rejected');
    updateDraft({
      farmer_confirmed: false,
      confirmation_status: 'rejected',
    });
  };

  // Re-record: go back to voice page (preserves existing data)
  const handleReRecord = () => {
    updateDraft({
      record_more_count: (draft.record_more_count || 0) + 1,
      confirmation_status: 'pending',
      farmer_confirmed: false,
    });
    navigate('/report/voice');
  };

  // Submit the case after confirmation
  const handleSubmitCase = async () => {
    if (draft.case_submitted) {
      setErrorMsg(t('review_duplicate_prevention'));
      return;
    }

    setConfirmStatus('submitting');
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
        processing_source: draft.audio_object_key ? 'gnani_prisma' : 'demo',
        is_demo_record: false,
        original_audio_keys: draft.original_audio_keys || [draft.audio_object_key].filter(Boolean),
        original_transcripts: draft.original_transcripts || [draft.original_transcript || draft.transcript || ''].filter(Boolean),
        english_operator_transcript: draft.english_operator_transcript || null,
        farmer_confirmed: true,
        confirmation_status: 'confirmed',
        record_more_count: draft.record_more_count || 0,
      };

      const result = await createCaseAPI(payload);
      updateDraft({ case_submitted: true });
      navigate(`/case/${result.id}/success`, { state: { caseData: result } });
    } catch (err: any) {
      console.error("Case submission failed:", err);
      setErrorMsg("Failed to submit case. Please check server connection.");
      setConfirmStatus('confirmed');
    }
  };

  const isUrgent = draft.urgency_level === 'urgent';
  const ext = draft.symptom_extraction;
  const symptomsList = ext?.symptoms_reported || [];
  const hasRecording = !!draft.audio_object_key;

  return (
    <div className="min-h-screen bg-[#F7F7F0] py-6 sm:py-10">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        {/* Navigation & Step */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/report/voice" className="text-sm font-medium text-[#647168] hover:text-[#17251D] flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('btn_back')}
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E2EEE5] text-[#174B35]">
            {t('step_3')}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-sm space-y-6">

          {/* A. Page Heading */}
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251D]">
              {t('review_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#647168] mt-1">
              Please review your recording and the information we extracted before submitting.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#FCE9E7] border border-[#B83A35]/30 text-[#B83A35] text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Confirmation Status Banner */}
          {confirmStatus === 'confirmed' && (
            <div className="p-4 rounded-2xl bg-[#E2EEE5] border border-[#174B35] text-[#174B35] text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4" />
              {t('review_confirmed')}
            </div>
          )}
          {confirmStatus === 'rejected' && (
            <div className="p-4 rounded-2xl bg-[#FCE9E7] border border-[#B83A35] text-[#B83A35] text-xs font-semibold flex items-center gap-2">
              <X className="w-4 h-4" />
              {t('review_rejected')}
            </div>
          )}
          {confirmStatus === 'submitting' && (
            <div className="p-4 rounded-2xl bg-[#FFF2D9] border border-[#D89A32] text-[#A85C12] text-xs font-semibold flex items-center gap-2">
              <Speaker className="w-4 h-4 animate-spin" />
              Submitting case...
            </div>
          )}

          {/* B. Your Original Voice Message - ALWAYS SHOW if recording exists */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                <Speaker className="w-3.5 h-3.5 text-[#174B35]" />
                {t('review_voice_message_label')}
              </label>
              <span className="text-[11px] font-semibold text-[#174B35] bg-[#E2EEE5] px-2 py-0.5 rounded-md">
                {draft.transcript_language || language}
              </span>
            </div>

            {hasRecording ? (
              <div className="bg-[#F7F7F0] rounded-2xl p-3.5 border border-[#E2E7DF] space-y-2">
                <audio
                  src={`${API_ORIGIN}/api/audio/${draft.audio_object_key}`}
                  controls
                  className="w-full h-10"
                  preload="auto"
                />
                <p className="text-[10px] text-[#647168] italic mt-1">
                  Your original recording. Tap play to listen.
                </p>
              </div>
            ) : (
              <div className="bg-[#FCE9E7] rounded-2xl p-3.5 border border-[#B83A35]/30 text-[#B83A35] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>No recording found. Please go back and record your voice first.</span>
              </div>
            )}
          </div>

          {/* C. Summary - Localized in farmer's selected language */}
          <div className="space-y-2 border-t border-[#E2E7DF] pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#174B35]" />
                {t('review_summary_label')}
              </label>
              <span className="text-[11px] font-semibold text-[#174B35] bg-[#E2EEE5] px-2 py-0.5 rounded-md">
                {draft.language}
              </span>
            </div>

            {isGeneratingContent && (
              <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
                <p className="text-[11px] text-[#647168] italic flex items-center gap-2">
                  <Speaker className="w-3 h-3 animate-spin" />
                  Generating summary in {draft.language}...
                </p>
              </div>
            )}

            {!isGeneratingContent && draft.localized_summary && (
              <div className="bg-[#E2EEE5] rounded-xl p-3.5 border border-[#174B35]/20">
                <p className="text-xs sm:text-sm text-[#17251D] leading-relaxed">
                  {draft.localized_summary}
                </p>
              </div>
            )}

            {!isGeneratingContent && !draft.localized_summary && !localizedContentLoaded && (
              <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
                <p className="text-[11px] text-[#647168] italic">
                  Generating summary...
                </p>
              </div>
            )}

            {!isGeneratingContent && !draft.localized_summary && localizedContentLoaded && (
              <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
                <p className="text-[11px] text-[#647168] italic">
                  Summary not available.
                </p>
              </div>
            )}
          </div>

          {/* D. Recommended Response / Solution - Localized in farmer's selected language */}
          <div className="space-y-2 border-t border-[#E2E7DF] pt-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-[#174B35]" />
                {t('review_recommended_label')}
              </label>
              <span className="text-[11px] font-semibold text-[#174B35] bg-[#E2EEE5] px-2 py-0.5 rounded-md">
                {draft.language}
              </span>
            </div>

            {isGeneratingContent && (
              <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
                <p className="text-[11px] text-[#647168] italic flex items-center gap-2">
                  <Speaker className="w-3 h-3 animate-spin" />
                  Generating recommendations in {draft.language}...
                </p>
              </div>
            )}

            {!isGeneratingContent && draft.localized_recommendations && (
              <div className="bg-[#E2EEE5] rounded-xl p-3.5 border border-[#174B35]/20">
                <p className="text-xs sm:text-sm text-[#17251D] leading-relaxed">
                  {draft.localized_recommendations}
                </p>
              </div>
            )}

            {!isGeneratingContent && !draft.localized_recommendations && !localizedContentLoaded && (
              <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
                <p className="text-[11px] text-[#647168] italic">
                  Generating recommendations...
                </p>
              </div>
            )}

            {!isGeneratingContent && !draft.localized_recommendations && localizedContentLoaded && (
              <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
                <p className="text-[11px] text-[#647168] italic">
                  Recommendations not available.
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            {confirmStatus === 'idle' && !draft.case_submitted && (
              <>
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{t('review_confirm_yes')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  className="w-full py-4 rounded-2xl border border-[#E2E7DF] text-[#17251D] font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-[#FCE9E7] hover:text-[#B83A35]"
                >
                  <X className="w-4 h-4" />
                  <span>{t('review_confirm_no')}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReRecord}
                  className="w-full py-4 rounded-2xl border border-[#E2E7DF] text-[#17251D] font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-[#FCE9E7] hover:text-[#174B35]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('review_record_more')}</span>
                </button>
              </>
            )}

            {confirmStatus === 'rejected' && !draft.case_submitted && (
              <>
                <button
                  type="button"
                  onClick={handleReRecord}
                  className="w-full py-4 rounded-2xl border border-[#E2E7DF] text-[#17251D] font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all hover:bg-[#FCE9E7] hover:text-[#B83A35]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>{t('review_record_more')}</span>
                </button>
              </>
            )}

            {confirmStatus === 'confirmed' && !draft.case_submitted && (
              <button
                type="button"
                onClick={handleSubmitCase}
                className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Submit Case</span>
              </button>
            )}

            {draft.case_submitted && (
              <div className="p-4 rounded-2xl bg-[#E2EEE5] border border-[#174B35] text-[#174B35] text-xs font-semibold flex items-center gap-2">
                <Check className="w-4 h-4" />
                {t('review_case_submitted')}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
