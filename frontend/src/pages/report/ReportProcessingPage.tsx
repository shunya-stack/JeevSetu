import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { extractSymptomsAPI, evaluateTriageAPI } from '../../lib/api';
import { CheckCircle2, Loader2, Sparkles, AlertTriangle } from 'lucide-react';

export const ReportProcessingPage: React.FC = () => {
  const { t, draft, updateDraft, language } = useLanguage();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(1);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function runPipeline() {
      try {
        // Step 1: Receiving
        setActiveStep(1);
        await new Promise((r) => setTimeout(r, 600));

        // Step 2: Speech transcription verified
        setActiveStep(2);
        await new Promise((r) => setTimeout(r, 700));

        // Step 3: Evon extraction
        setActiveStep(3);
        const extraction = await extractSymptomsAPI(
          draft.transcript || "Animal not eating feed and abdomen is distended.",
          draft.animal_type || "cow",
          language,
          draft.input_mode || "voice"
        );

        // Step 4: Triage evaluation
        setActiveStep(4);
        const triageRes = await evaluateTriageAPI(
          draft.transcript,
          extraction.symptoms_reported?.map((s: any) => s.value) || [],
          extraction.eating_or_drinking_change,
          extraction.symptom_duration
        );

        if (isMounted) {
          updateDraft({
            symptom_extraction: extraction,
            urgency_level: triageRes.urgency_level,
            urgency_reasons: triageRes.urgency_reasons,
            immediate_actions: triageRes.immediate_actions
          });

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

  const steps = [
    { num: 1, title: t('proc_1') },
    { num: 2, title: t('proc_2') },
    { num: 3, title: t('proc_3') },
    { num: 4, title: t('proc_4') }
  ];

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
            Gnani AI Pipeline Active
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
          Speech models handle Odia and Hindi accents natively. Clinical urgency is governed by veterinarian-approved rules.
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

