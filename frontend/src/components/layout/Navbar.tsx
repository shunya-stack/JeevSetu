import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Language } from '../../types';
import { Heart, Menu, X } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { language, setLanguage, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isOperatorRoute = location.pathname.startsWith('/operator');
  const isReportRoute = location.pathname.startsWith('/report');

  return (
    <header className="sticky top-0 z-50 bg-[#F7F7F0]/90 backdrop-blur-md border-b border-[#E2E7DF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">

          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#174B35] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
              <Heart className="w-5 h-5 sm:w-6 sm:h-6 fill-white/20 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl sm:text-2xl tracking-tight text-[#17251D]">
                  JeevSetu
                </span>

              </div>
              <p className="text-[11px] sm:text-xs text-[#647168] hidden sm:block">
                {t('tagline')}
              </p>
            </div>
          </Link>

          {/* Center Navigation - Desktop */}
          {!isReportRoute && !isOperatorRoute && (
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#17251D]/80">
              <a href="#how-it-works" className="hover:text-[#174B35] transition-colors">
                {t('nav_how_it_works')}
              </a>
              <a href="#about" className="hover:text-[#174B35] transition-colors">
                {t('nav_about')}
              </a>
            </nav>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">

            {/* Language Switcher */}
            <div className="flex items-center rounded-lg bg-[#EEF2E9] p-1 border border-[#E2E7DF]">
              {(['odia', 'hindi', 'english'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${language === lang
                    ? 'bg-white text-[#174B35] shadow-xs font-semibold'
                    : 'text-[#647168] hover:text-[#17251D]'
                    }`}
                  aria-label={`Switch to ${lang}`}
                >
                  {lang === 'odia' ? 'ଓଡ଼ିଆ' : lang === 'hindi' ? 'हिन्दी' : 'EN'}
                </button>
              ))}
            </div>

            {/* Primary Action Button */}
            {!isReportRoute && (
              <Link
                to="/report"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#174B35] hover:bg-[#103D2A] text-white text-sm font-medium transition-colors shadow-xs"
              >
                {t('nav_report_btn')}
              </Link>
            )}


          </div>
        </div>
      </div>



    </header>
  );
};

