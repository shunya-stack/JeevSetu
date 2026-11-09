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
  RotateCcw,
  Languages,
} from 'lucide-react';
import { Language } from '../../types';

type ConfirmationStatus = 'idle' | 'confirmed' | 'rejected' | 'submitting';

const LANGUAGE_BUTTONS: { key: Language; labelKey: string }[] = [
  { key: 'odia', labelKey: 'lang_odia' },
  { key: 'hindi', labelKey: 'lang_hindi' },
  { key: 'english', labelKey: 'lang_english' },
];

export const ReportConfirmationPage: React.FC = () => {
  const { t, draft, updateDraft, language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  // Confirmation states
  const [confirmStatus, setConfirmStatus] = useState<ConfirmationStatus>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [translatedLanguages, setTranslatedLanguages] = useState<string[]>([]);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [translationFailed, setTranslationFailed] = useState(false);

  // Canonical English AI analysis (kept immutable; language switching
  // NEVER re-runs Evon or ASR, it only re-translates this content)
  const buildEnglishReport = (): any => {
    const ext = draft.symptom_extraction;
    if (draft.english_canonical_report) {
      return {
        ...draft.english_canonical_report,
        farmer_statement: draft.english_operator_transcript || (draft.english_canonical_report as any).farmer_statement || '',
        urgency_level: draft.symptom_extraction?.urgency_level || draft.english_canonical_report.urgency_level,
        urgency_reasons: draft.urgency_reasons?.length ? draft.urgency_reasons : (draft.english_canonical_report.urgency_reasons || []),
        immediate_actions: [],
      };
    }
    return {
      animal_type: draft.animal_type || 'cow',
      symptoms_reported: ext?.symptoms_reported || [],
      symptom_duration: ext?.symptom_duration || 'Not provided',
      eating_or_drinking_change: ext?.eating_or_drinking_change || 'Not provided',
      milk_production_change: ext?.milk_production_change || 'Not provided',
      other_observations: ext?.other_observations || [],
      case_summary: ext?.case_summary || '',
      possible_causes: ext?.possible_causes || [],
      immediate_precautions: ext?.immediate_precautions || [],
      recommendations: ext?.recommendations || [],
      follow_up_questions: ext?.follow_up_questions || [],
      farmer_statement: draft.english_operator_transcript || '',
    };
  };

  const buildTriageResult = (): any => ({
    urgency_level: draft.urgency_level || 'review',
    urgency_reasons: draft.urgency_reasons || [],
    immediate_actions: draft.immediate_actions || [],
  });

  // Generate localized content in the selected display language.
  // Cached translations render immediately (zero Bhashini calls);
  // failures show a clear error + retry — never mixed-language content.
  useEffect(() => {
    let isMounted = true;

    async function generateContent() {
      const cache = draft.localized_content_cache || {};
      const cachedEntry = cache[language];

      if (cachedEntry && Array.isArray(cachedEntry.localized_symptoms)) {
        // Cache hit — render instantly, no API call, no re-run of anything
        if (isMounted) {
          updateDraft({
            localized_summary: cachedEntry.localized_summary,
            localized_recommendations: (() => {
              const r = cachedEntry.localized_recommendations;
              return Array.isArray(r) ? r.join('\n') : (r || '');
            })(),
          });
          setIsGeneratingContent(false);
          setTranslationFailed(false);
          return;
        }
      }

      setIsGeneratingContent(true);
      setTranslationFailed(false);
      try {
        const res = await generateLocalizedContentAPI(
          buildEnglishReport(),
          buildTriageResult(),
          language
        );

        const entry = {
          localized_summary: res.localized_summary || '',
          localized_symptoms: res.localized_symptoms || [],
          localized_precautions: res.localized_precautions || [],
          localized_recommendations: res.localized_recommendations || [],
          localized_urgency_reasons: res.localized_urgency_reasons || [],
          localized_possible_causes: res.localized_possible_causes || [],
          localized_followup_questions: res.localized_followup_questions || [],
          fixed: res.fixed,
          urgency_level: res.urgency_level,
          cached: false,
        };

        if (isMounted) {
          updateDraft({
            localized_content_cache: {
              ...(draft.localized_content_cache || {}),
              [language]: entry,
            },
            localized_summary: entry.localized_summary,
            localized_recommendations: (() => {
              const r = entry.localized_recommendations;
              return Array.isArray(r) ? r.join('\n') : (r || '');
            })(),
          });
          setTranslatedLanguages(prev => [...new Set([...prev, language])]);
          setIsGeneratingContent(false);
        }
      } catch (err: any) {
        console.error("Localized content generation failed:", err);
        if (isMounted) {
          setIsGeneratingContent(false);
          setTranslationFailed(true);
        }
      }
    }

    generateContent();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const retryTranslation = () => {
    setTranslationFailed(false);
    setIsGeneratingContent(true);
    generateLocalizedContentAPI(buildEnglishReport(), buildTriageResult(), language)
      .then((res) => {
        const entry = {
          localized_summary: res.localized_summary || '',
          localized_symptoms: res.localized_symptoms || [],
          localized_precautions: res.localized_precautions || [],
          localized_recommendations: res.localized_recommendations || [],
          localized_urgency_reasons: res.localized_urgency_reasons || [],
          localized_possible_causes: res.localized_possible_causes || [],
          localized_followup_questions: res.localized_followup_questions || [],
          fixed: res.fixed,
          urgency_level: res.urgency_level,
          cached: false,
        };
        updateDraft({
          localized_content_cache: {
            ...(draft.localized_content_cache || {}),
            [language]: entry,
          },
          localized_summary: entry.localized_summary,
          localized_recommendations: (() => {
            const r = entry.localized_recommendations;
            return Array.isArray(r) ? r.join('\n') : (r || '');
          })(),
        });
        setIsGeneratingContent(false);
      })
      .catch(() => {
        setIsGeneratingContent(false);
        setTranslationFailed(true);
      });
  };

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

    // Navigate to Location & Contact after confirmation (Safety Evaluation page removed)
    navigate('/report/location');
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
        processing_source: draft.audio_object_key ? 'bhashini_asr' : 'demo',
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
      setErrorMsg(t('confirm_error'));
      setConfirmStatus('confirmed');
    }
  };

  const isUrgent = draft.urgency_level === 'urgent';
  const ext = draft.symptom_extraction;
  const symptomsList = ext?.symptoms_reported || [];
  const hasRecording = !!draft.audio_object_key;
  // Per-language translation entry driving the whole dynamic view
  const entry = draft.localized_content_cache?.[language];
  // Coerce cache-entry list fields to arrays. Legacy cache entries / drafts may
  // store them as strings, which would crash .map() / .join() downstream.
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v : typeof v === 'string' ? [v] : [];
  const symptomsArr = asArray(entry?.localized_symptoms);
  const urgencyReasonsArr = asArray(entry?.localized_urgency_reasons);
  const recommendationsArr = asArray(entry?.localized_recommendations);
  const precautionsArr = asArray(entry?.localized_precautions);
  const causesArr = asArray(entry?.localized_possible_causes);
  const followupsArr = asArray(entry?.localized_followup_questions);
  const urgencyCode = (draft.urgency_level || entry?.urgency_level || 'review') as string;
  const audioLangLabel = t(`lang_${draft.transcript_language || language}`);

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
              {t('review_subtitle')}
            </p>
          </div>

          {/* Display language switcher — swaps the whole screen at once.
              Switching never re-runs ASR or Evon; dynamic content is served
              from the Bhashini translation cache or translated on demand. */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#647168]">
              <Languages className="w-3.5 h-3.5" />
              {t('review_read_in')}
            </div>
            <div className="flex rounded-xl bg-[#EEF2E9] p-1 border border-[#E2E7DF]">
              {LANGUAGE_BUTTONS.map((btn) => (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setLanguage(btn.key)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    language === btn.key
                      ? 'bg-white text-[#174B35] shadow-xs'
                      : 'text-[#647168] hover:text-[#17251D]'
                  }`}
                >
                  {t(btn.labelKey)}
                </button>
              ))}
            </div>
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
              {t('confirm_submitting')}
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
                {audioLangLabel}
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
                  {t('review_play_note')}
                </p>
              </div>
            ) : (
              <div className="bg-[#FCE9E7] rounded-2xl p-3.5 border border-[#B83A35]/30 text-[#B83A35] text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{t('review_no_recording')}</span>
              </div>
            )}
          </div>

          {/* C. Farmer's description — exactly what the farmer said, in the
              language they spoke. Never re-translated. */}
          <div className="space-y-2 border-t border-[#E2E7DF] pt-4">
            <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
              <Speaker className="w-3.5 h-3.5 text-[#174B35]" />
              {t('review_farmer_desc_label')}
            </label>
            <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
              <p className="text-xs sm:text-sm text-[#17251D] leading-relaxed italic">
                "{(draft.original_transcript || draft.transcript) || t('review_summary_na')}"
              </p>
            </div>
          </div>

          {/* D. AI case summary — a natural-language paragraph built ONLY from
              what the farmer reported. Translated via Bhashini. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-[#174B35]" />
                {t('review_summary_label')}
              </label>
              <span className="text-[11px] font-semibold text-[#174B35] bg-[#E2EEE5] px-2 py-0.5 rounded-md">
                {t('review_ai_tag')}
              </span>
            </div>

            {isGeneratingContent && (
              <div className="bg-[#F7F7F0] rounded-xl p-3.5 border border-[#E2E7DF]">
                <p className="text-[11px] text-[#647168] italic flex items-center gap-2">
                  <Speaker className="w-3 h-3 animate-spin" />
                  {t('review_translating')}
                </p>
              </div>
            )}

            {!isGeneratingContent && translationFailed && (
              <div className="bg-[#FCE9E7] rounded-xl p-3.5 border border-[#B83A35]/40 space-y-2">
                <p className="text-[11px] text-[#B83A35] font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {t('review_translate_failed')}
                </p>
                <button
                  type="button"
                  onClick={retryTranslation}
                  className="w-full rounded-lg bg-[#B83A35] py-2 text-[11px] font-semibold text-white hover:bg-[#8F2D28] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('review_retry_translation')}
                </button>
              </div>
            )}

            {!isGeneratingContent && !translationFailed && (
              <div className="bg-[#E2EEE5] rounded-xl p-3.5 border border-[#174B35]/20">
                <p className="text-xs sm:text-sm text-[#17251D] leading-relaxed">
                  {entry?.localized_summary || t('review_summary_na')}
                </p>
              </div>
            )}
          </div>

          {/* E. Symptoms identified — AI-extracted, shown as chips, clearly
              separated from the farmer's own words. */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                {t('review_symptoms_label')}
              </label>
              <span className="text-[11px] font-semibold text-[#A85C12] bg-[#FFF2D9] px-2 py-0.5 rounded-md">
                {t('review_ai_extracted')}
              </span>
            </div>
            {(symptomsArr.length || 0) > 0 ? (
              <div className="flex flex-wrap gap-2">
                {symptomsArr.map((sym, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E2EEE5] text-[#174B35] text-xs font-semibold"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    {sym}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#647168] italic">{t('review_no_symptoms')}</p>
            )}
          </div>

          {/* F. Urgency — fixed classification, never altered by translation. */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
              <ShieldAlert className={`w-3.5 h-3.5 ${isUrgent ? 'text-[#B83A35]' : 'text-[#174B35]'}`} />
              {t('review_urgency_label')}
            </label>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                isUrgent ? 'bg-[#B83A35] text-white' : 'bg-[#D89A32] text-white'
              }`}>
                {t(`urgency_badge_${urgencyCode}`)}
              </span>
            </div>
            {(urgencyReasonsArr.length || 0) > 0 && (
              <ul className="list-disc pl-5 space-y-1 text-xs text-[#17251D]">
                {urgencyReasonsArr.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            )}
          </div>

          {/* G. What you should do — individual numbered action steps from the
              AI, plus fixed safety sentences that are NEVER machine-changed. */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-[#174B35]" />
              {entry?.fixed?.what_to_do || t('review_recommended_label')}
            </label>

            {(recommendationsArr.length || 0) > 0 && (
              <ol className="space-y-2.5">
                {recommendationsArr.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 bg-[#E2EEE5] rounded-xl p-3 border border-[#174B35]/20">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-[#174B35] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-xs sm:text-sm text-[#17251D] leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {(precautionsArr.length || 0) > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold text-[#17251D] uppercase tracking-wide">
                  {t('review_precautions_title')}
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-[#17251D]">
                  {precautionsArr.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {entry?.fixed?.avoid && (
              <div className="bg-[#FCE9E7] rounded-xl p-3 border border-[#B83A35]/30">
                <p className="text-[11px] text-[#B83A35] font-medium leading-relaxed">
                  {entry.fixed.avoid}
                </p>
              </div>
            )}

            {isUrgent && entry?.fixed?.vet_line && (
              <div className="bg-[#FCE9E7] rounded-xl p-3 border-2 border-[#B83A35] flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-[#B83A35] shrink-0 mt-0.5" />
                <p className="text-[11px] sm:text-xs text-[#B83A35] font-bold leading-relaxed">
                  {entry.fixed.vet_line}
                </p>
              </div>
            )}
          </div>

          {/* H. Possible causes — clearly marked as possibilities, never a
              confirmed diagnosis. */}
          {(causesArr.length || 0) > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                {t('review_causes_label')}
              </label>
              <div className="flex flex-wrap gap-2">
                {causesArr.map((cause, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-xl bg-[#FFF2D9] text-[#A85C12] text-xs font-medium">
                    {cause}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-[#647168] italic">{t('review_not_a_diagnosis')}</p>
            </div>
          )}

          {/* I. Follow-up questions — only questions needing farmer answers. */}
          {(followupsArr.length || 0) > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                {t('review_followups_label')}
              </label>
              <ol className="space-y-1.5 pl-1">
                {followupsArr.map((q, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs sm:text-sm text-[#17251D]">
                    <span className="shrink-0 font-bold text-[#174B35]">{i + 1}.</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

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
                <span>{t('btn_submit_case')}</span>
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
