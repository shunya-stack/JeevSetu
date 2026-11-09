import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, FarmerReportDraft } from '../types';
import { TRANSLATIONS } from '../lib/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  draft: FarmerReportDraft;
  updateDraft: (partial: Partial<FarmerReportDraft>) => void;
  resetDraft: () => void;
}

const DRAFT_VERSION = 2;

const DEFAULT_DRAFT: FarmerReportDraft = {
  _draft_version: DRAFT_VERSION,
  animal_type: 'cow',
  animal_identifier: '',
  animal_age_group: '',
  is_milking: false,
  language: 'odia',
  transcript: '',
  audio_object_key: '',
  audio_blob_url: '',
  audio_consent: true,
  urgency_level: 'review',
  urgency_reasons: [],
  immediate_actions: [],
  district: 'Khordha',
  block: '',
  village: '',
  landmark: '',
  farmer_name: '',
  farmer_phone: '',
  contact_consent: true,
  input_mode: 'voice'
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('jeevsetu_lang');
    return (saved as Language) || 'odia';
  });

  const [draft, setDraftState] = useState<FarmerReportDraft>(() => {
    const saved = localStorage.getItem('jeevsetu_draft');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clear stale drafts from previous versions
        if (parsed._draft_version !== DRAFT_VERSION) {
          return DEFAULT_DRAFT;
        }
        return parsed;
      } catch (e) {
        return DEFAULT_DRAFT;
      }
    }
    return DEFAULT_DRAFT;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('jeevsetu_lang', lang);
    setDraftState(prev => ({ ...prev, language: lang }));
  };

  const updateDraft = (partial: Partial<FarmerReportDraft>) => {
    setDraftState(prev => {
      const updated = { ...prev, ...partial };
      localStorage.setItem('jeevsetu_draft', JSON.stringify(updated));
      return updated;
    });
  };

  const resetDraft = () => {
    setDraftState(DEFAULT_DRAFT);
    localStorage.removeItem('jeevsetu_draft');
  };

  const t = (key: string): string => {
    const currentDict = TRANSLATIONS[language] || TRANSLATIONS.odia;
    return currentDict[key] || TRANSLATIONS.english[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, draft, updateDraft, resetDraft }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

