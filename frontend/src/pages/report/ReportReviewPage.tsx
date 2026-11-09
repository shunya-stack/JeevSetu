import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, ArrowRight, Edit3, Check, AlertCircle } from 'lucide-react';

export const ReportReviewPage: React.FC = () => {
  const { t, draft, updateDraft } = useLanguage();
  const navigate = useNavigate();

  const [transcript, setTranscript] = useState(draft.transcript || '');
  const [duration, setDuration] = useState(draft.symptom_extraction?.symptom_duration || 'Not provided');
  const [eatingChange, setEatingChange] = useState(draft.symptom_extraction?.eating_or_drinking_change || 'Not provided');
  const [milkChange, setMilkChange] = useState(draft.symptom_extraction?.milk_production_change || 'Not provided');

  const handleContinue = () => {
    // Preserve modifications
    updateDraft({
      transcript,
      symptom_extraction: {
        ...(draft.symptom_extraction || {
          animal_type: draft.animal_type,
          language: draft.language,
          symptoms_reported: [],
          other_observations: [],
          unknown_fields: [],
          requires_human_review: true
        }),
        symptom_duration: duration,
        eating_or_drinking_change: eatingChange,
        milk_production_change: milkChange
      }
    });
    navigate('/report/urgency');
  };

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
          
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251D]">
              {t('review_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#647168] mt-1">
              Speech recognition can make minor mistakes. You can correct any text or symptom detail before submitting.
            </p>
          </div>

          {/* Transcript Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#17251D] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-[#174B35]" />
                {t('review_transcript_label')}
              </label>
              <span className="text-[11px] font-semibold text-[#174B35] bg-[#E2EEE5] px-2 py-0.5 rounded-md">
                {draft.language_translated ? `Auto-translated to selected language (${draft.transcript_language || 'original speech'})` : 'Bhashini Speech Output'}
              </span>
            </div>
            <textarea
              rows={4}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              className="w-full p-3.5 rounded-2xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
            />
          </div>

          {/* Structured Clinical Observations */}
          <div className="pt-2 border-t border-[#E2E7DF] space-y-4">
            <h3 className="text-sm font-bold text-[#17251D]">
              {t('review_symptoms_label')}
            </h3>

            {/* Extracted Symptoms Tag List */}
            <div className="space-y-2">
              <span className="text-xs text-[#647168]">Detected Issues:</span>
              <div className="flex flex-wrap gap-2">
                {draft.symptom_extraction?.symptoms_reported?.map((sym, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E2EEE5] text-[#174B35] text-xs font-semibold"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    {sym.value}
                  </span>
                )) || (
                  <span className="text-xs text-[#647168] italic">General health concern</span>
                )}
              </div>
            </div>

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              
              <div>
                <label className="block text-xs font-semibold text-[#17251D] mb-1">
                  Duration (କେତେ ଦିନ ହେଲା):
                </label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251D] mb-1">
                  Feed & Water Intake (ଖାଦ୍ୟ/ପାଣି):
                </label>
                <input
                  type="text"
                  value={eatingChange}
                  onChange={(e) => setEatingChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#17251D] mb-1">
                  Milk Yield Status (ଦୁଗ୍ଧ ଉତ୍ପାଦନ):
                </label>
                <input
                  type="text"
                  value={milkChange}
                  onChange={(e) => setMilkChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                />
              </div>

            </div>

          </div>

          {/* Continue Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Continue to Safety Check</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

