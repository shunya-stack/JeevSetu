import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { AnimalType } from '../../types';
import { ArrowRight, ArrowLeft, Check, Sparkles } from 'lucide-react';

const ANIMAL_OPTIONS: { id: AnimalType; labelKey: string; icon: string; desc: string }[] = [
  { id: 'cow', labelKey: 'animal_cow', icon: '🐄', desc: 'Cow, bull or calf' },
  { id: 'buffalo', labelKey: 'animal_buffalo', icon: '🐃', desc: 'Water buffalo' },
  { id: 'goat', labelKey: 'animal_goat', icon: '🐐', desc: 'Goat / kid' },
  { id: 'sheep', labelKey: 'animal_sheep', icon: '🐑', desc: 'Sheep / ram' },
  { id: 'other', labelKey: 'animal_other', icon: '🐾', desc: 'Other domestic animal' }
];

export const ReportAnimalPage: React.FC = () => {
  const { t, draft, updateDraft } = useLanguage();
  const navigate = useNavigate();

  const [selectedAnimal, setSelectedAnimal] = useState<AnimalType>(draft.animal_type || 'cow');
  const [animalName, setAnimalName] = useState(draft.animal_identifier || '');
  const [ageGroup, setAgeGroup] = useState(draft.animal_age_group || 'Adult');
  const [isMilking, setIsMilking] = useState(draft.is_milking || false);

  const handleContinue = () => {
    updateDraft({
      animal_type: selectedAnimal,
      animal_identifier: animalName,
      animal_age_group: ageGroup,
      is_milking: isMilking
    });
    navigate('/report/voice');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] py-6 sm:py-10">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        
        {/* Top Header & Step Progress */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="text-sm font-medium text-[#647168] hover:text-[#17251D] flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('btn_exit')}
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E2EEE5] text-[#174B35]">
            {t('step_1')}
          </span>
        </div>

        {/* Stepper bar */}
        <div className="w-full bg-[#E2E7DF] h-1.5 rounded-full overflow-hidden mb-8">
          <div className="bg-[#174B35] h-full w-1/3 transition-all duration-300 rounded-full" />
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-sm space-y-6">
          
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251D]">
              {t('animal_select_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#647168] mt-1">
              Select which livestock animal needs veterinary attention.
            </p>
          </div>

          {/* Animal Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ANIMAL_OPTIONS.map((item) => {
              const isSelected = selectedAnimal === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedAnimal(item.id)}
                  className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#174B35] bg-[#E2EEE5]/60 ring-2 ring-[#174B35]'
                      : 'border-[#E2E7DF] bg-[#F7F7F0] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{item.icon}</span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-[#174B35] text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="font-bold text-sm text-[#17251D]">{t(item.labelKey)}</h3>
                    <p className="text-[11px] text-[#647168] leading-tight mt-0.5">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional Details Accordion */}
          <div className="pt-4 border-t border-[#E2E7DF] space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#17251D] mb-1.5">
                {t('optional_name')}
              </label>
              <input
                type="text"
                placeholder="e.g. Gauri / Tag #481"
                value={animalName}
                onChange={(e) => setAnimalName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17251D] mb-1.5">
                  {t('optional_age')}
                </label>
                <select
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                >
                  <option value="Calf / Young">Calf / Young (ଛୁଆ)</option>
                  <option value="Adult">Adult (ପୂର୍ଣ୍ଣାଙ୍ଗ)</option>
                  <option value="Old">Senior / Old (ବୟସ୍କ)</option>
                </select>
              </div>

              {(selectedAnimal === 'cow' || selectedAnimal === 'buffalo') && (
                <div>
                  <label className="block text-xs font-semibold text-[#17251D] mb-1.5">
                    {t('optional_milking')}
                  </label>
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="milking"
                      checked={isMilking}
                      onChange={(e) => setIsMilking(e.target.checked)}
                      className="w-5 h-5 rounded text-[#174B35] focus:ring-[#174B35] cursor-pointer"
                    />
                    <label htmlFor="milking" className="text-xs text-[#17251D] cursor-pointer font-medium">
                      In milk (ଦୁଗ୍ଧବତୀ)
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>{t('btn_continue')}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

