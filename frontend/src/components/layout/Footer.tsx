import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { ShieldAlert, Heart, Terminal } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#EEF2E9] border-t border-[#E2E7DF] text-[#17251D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">

        {/* Safety Callout Banner */}
        <div className="rounded-2xl bg-[#FFF2D9] border border-[#D89A32]/40 p-4 sm:p-5 mb-8 flex items-start gap-3.5">
          <ShieldAlert className="w-5 h-5 text-[#A85C12] shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-[#A85C12] leading-relaxed">
            <strong className="font-semibold">Safety Boundary: </strong>
            {t('safety_disclaimer')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#174B35] flex items-center justify-center text-white">
                <Heart className="w-4 h-4 fill-white/20 text-white" />
              </div>
              <span className="font-bold text-lg text-[#17251D]">JeevSetu</span>
            </div>
            <p className="text-xs sm:text-sm text-[#647168] max-w-sm">
              Voice-first livestock health intake, safety-bounded triage and referral infrastructure for rural cattle keepers.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white border border-[#E2E7DF] text-[11px] text-[#647168]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              AI Stack (Bhashini ASR/NMT/TTS + Evon v3.3 Reasoning)
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#17251D] mb-3">About JeevSetu</h4>
            <ul className="space-y-2 text-xs sm:text-sm text-[#647168]">
              <li><a href="#how-it-works" className="hover:text-[#174B35]">How It Works</a></li>
              <li><a href="#about" className="hover:text-[#174B35]">About the Initiative</a></li>
              <li><Link to="/report" className="hover:text-[#174B35]">Report Animal Health</Link></li>
              <li><span className="text-[#647168]/70">Odisha Rural Pilot</span></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-[#E2E7DF] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#647168]">
          <p>© 2026 JeevSetu. Care that reaches every life.</p>

        </div>
      </div>
    </footer>
  );
};

