import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import {
  translateToEnglishAPI,
  extractSymptomsFromEnglishAPI,
  evaluateTriageAPI,
  enforceLanguageAPI,
  generateLocalizedContentAPI,
} from '../../lib/api';
import { CheckCircle2, Loader2, Sparkles, AlertTriangle } from 'lucide-react';

export const ReportProcessingPage: React.FC = () => {
  const { t, draft, updateDraft, language } = useLanguage();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(1);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Pipeline step titles
  const steps = [
    { num: 1, title: t('proc_1') },
    { num: 2, title: t('proc_2') },
    { num: 3, title: t('proc_3_translate') },
    { num: 4, title: t('proc_4') },
    { num: 5, title: t('proc_5') },
    { num: 6, title: t('proc_6') },
  ];

  // Merge symptom lists, deduplicating by value
  const mergeSymptoms = (existing: any[], newItems: any[]): any[] => {
    const merged = [...existing];
    const seen = new Set(existing.map(s => s.value?.toLowerCase().trim()).filter(Boolean));
    for (const sym of newItems) {
      const val = sym.value?.toLowerCase().trim();
      if (val && !seen.has(val)) {
        seen.add(val);
        merged.push(sym);
      }
    }
    return merged;
  };

  // Merge string lists, deduplicating
  const mergeStringLists = (existing: string[] | undefined, newItems: string[] | undefined): string[] => {
    const merged = [...(existing || [])];
    const seen = new Set(merged.map(s => s.toLowerCase().trim()));
    for (const item of newItems || []) {
      const val = item.toLowerCase().trim();
      if (val && !seen.has(val)) {
        seen.add(val);
        merged.push(item);
      }
    }
    return merged;
  };

  useEffect(() => {
    let isMounted = true;

    async function runPipeline() {
      try {
        // ── Step 1: Recording received ──────────────────────────────
        setActiveStep(1);
        await new Promise((r) => setTimeout(r, 600));

        // ── Step 2: Speech-to-text (original language transcript) ───
        setActiveStep(2);
        await new Promise((r) => setTimeout(r, 700));

        let transcriptForPipeline = draft.original_transcript || draft.transcript || "";
        let detectedLanguage = draft.transcript_language || language;

        // If we don't have an original-language transcript yet (e.g. typed text),
        // enforce the current language selection
        if (!draft.original_transcript && transcriptForPipeline) {
          const reEnforced = await enforceLanguageAPI(transcriptForPipeline, language);
          transcriptForPipeline = reEnforced.transcript;
          detectedLanguage = reEnforced.transcript_language || language;
          updateDraft({
            transcript: reEnforced.transcript,
            original_transcript: reEnforced.original_transcript || transcriptForPipeline,
            transcript_language: reEnforced.transcript_language,
            language_translated: !!reEnforced.language_translated,
            enforced_language: reEnforced.requested_language,
          });
        }

        await new Promise((r) => setTimeout(r, 700));

        // ── Step 3: Translate to English for the operator ───────────
        setActiveStep(3);
        const translation = await translateToEnglishAPI(transcriptForPipeline, detectedLanguage);

        const englishTranscript = translation.english_transcript || transcriptForPipeline;

        // Append to English operator transcript if Record More
        const existingEnglishTranscript = draft.english_operator_transcript || "";
        const mergedEnglishTranscript = existingEnglishTranscript
          ? `${existingEnglishTranscript} ${englishTranscript}`
          : englishTranscript;

        updateDraft({
          english_operator_transcript: mergedEnglishTranscript,
        });

        await new Promise((r) => setTimeout(r, 700));

        // ── Step 4: Symptom extraction from English transcript ──────
        setActiveStep(4);
        const extraction = await extractSymptomsFromEnglishAPI(
          englishTranscript,
          draft.animal_type || "cow",
          "english",
          draft.input_mode || "voice"
        );

        // Merge symptoms with existing extraction (Record More support)
        const existingExt = draft.symptom_extraction;
        const mergedExtraction = {
          ...extraction,
          animal_type: draft.animal_type || extraction.animal_type || "cow",
          language: "english",
          symptoms_reported: mergeSymptoms(
            existingExt?.symptoms_reported || [],
            extraction.symptoms_reported || []
          ),
          other_observations: mergeStringLists(
            existingExt?.other_observations,
            extraction.other_observations
          ),
          unknown_fields: mergeStringLists(
            existingExt?.unknown_fields,
            extraction.unknown_fields
          ),
          symptom_duration: extraction.symptom_duration || existingExt?.symptom_duration || 'Not provided',
          eating_or_drinking_change: extraction.eating_or_drinking_change || existingExt?.eating_or_drinking_change || 'Not provided',
          milk_production_change: extraction.milk_production_change || existingExt?.milk_production_change || 'Not provided',
        };

        // ── Step 5: Triage evaluation ───────────────────────────────
        setActiveStep(5);
        const triageRes = await evaluateTriageAPI(
          mergedEnglishTranscript,
          mergedExtraction.symptoms_reported?.map((s: any) => s.value) || [],
          mergedExtraction.eating_or_drinking_change,
          mergedExtraction.symptom_duration
        );

        if (isMounted) {
          updateDraft({
            transcript: mergedEnglishTranscript,
            symptom_extraction: mergedExtraction,
            urgency_level: triageRes.urgency_level,
            urgency_reasons: triageRes.urgency_reasons,
            immediate_actions: triageRes.immediate_actions,
          });

          // ── Step 6: Generate localized summary and recommendations ──────
          setActiveStep(6);
          try {
            const englishReport = {
              animal_type: mergedExtraction.animal_type || draft.animal_type || 'cow',
              symptoms_reported: mergedExtraction.symptoms_reported || [],
              symptom_duration: mergedExtraction.symptom_duration || 'Not provided',
              eating_or_drinking_change: mergedExtraction.eating_or_drinking_change || 'Not provided',
              milk_production_change: mergedExtraction.milk_production_change || 'Not provided',
              other_observations: mergedExtraction.other_observations || [],
              unknown_fields: mergedExtraction.unknown_fields || [],
            };
            const triageResult = {
              urgency_level: triageRes.urgency_level,
              urgency_reasons: triageRes.urgency_reasons,
              immediate_actions: triageRes.immediate_actions,
            };

            const res = await generateLocalizedContentAPI(
              englishReport,
              triageResult,
              language
            );

            updateDraft({
              localized_summary: res.localized_summary || '',
              localized_recommendations: res.localized_recommendations || '',
            });
          } catch (locErr: any) {
            console.error("Localized content generation failed:", locErr);
            // Continue without localized content
          }

          await new Promise((r) => setTimeout(r, 500));
          navigate('/report/review');
        }
      } catch (err: any) {
        console.error("Pipeline processing failed:", err);
        if (isMounted) {
          setErrorNotice(err.message || "Live processing failed. Return to the recording step and try again.");
        }
      }
    }

    runPipeline();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F7F0] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-md space-y-6 text-center">
        {/* Animated Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#E2EEE5] text-[#174B35] flex items-center justify-center mx-auto shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#174B35]" />
        </div>

        <div>
          <h2 className="text-xl font-extrabold text-[#17251D]">
            {t('processing_title')}
          </h2>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF2D9] text-[#A85C12] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-[#D89A32]" />
            Multilingual Voice Pipeline Active
          </div>
        </div>

        {/* Vertical Pipeline Steps */}
        <div className="space-y-4 text-left pt-2">
          {steps.map((s) => {
            const isDone = activeStep > s.num;
            const isCurrent = activeStep === s.num;

            return (
              <div
                key={s.num}
                className={`p-3.5 rounded-2xl border transition-all flex items-center gap-3.5 ${
                  isCurrent
                    ? 'border-[#174B35] bg-[#E2EEE5]/40 text-[#17251D] shadow-xs'
                    : isDone
                    ? 'border-[#E2E7DF] bg-[#F7F7F0] text-[#17251D]'
                    : 'border-transparent text-[#647168]/60 opacity-60'
                }`}
              >
                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-[#2D7D57] fill-[#2D7D57]/20" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-[#174B35] animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold">
                      {s.num}
                    </div>
                  )}
                </div>
                <span className="text-xs sm:text-sm font-medium">
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[11px] text-[#647168] pt-2">
          Speech is transcribed in your spoken language, translated to English
          for the veterinarian, then read back to you for confirmation.
        </p>

        {errorNotice && (
          <div role="alert" className="rounded-2xl border border-[#B83A35]/30 bg-[#FCE9E7] p-3.5 text-left text-xs text-[#B83A35]">
            {errorNotice}
          </div>
        )}

        {errorNotice && (
          <button
            type="button"
            onClick={() => navigate('/report/voice')}
            className="w-full rounded-2xl bg-[#174B35] py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#103D2A]"
          >
            Return to recording
          </button>
        )}

      </div>
    </div>
  );
};
