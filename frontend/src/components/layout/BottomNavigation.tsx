import React from 'react';
import { Home, Mic, PhoneCall, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const navigationItems = [
  { labelKey: 'bottom_home', to: '/', icon: Home },
  { labelKey: 'bottom_report', to: '/report', icon: Mic },
  { labelKey: 'bottom_track', to: '/track', icon: Search },
];

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const { t } = useLanguage();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E2E7DF] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(23,37,29,0.08)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-4">
        {navigationItems.map(({ labelKey, to, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                active ? 'text-[#F04A16]' : 'text-[#526257] hover:text-[#174B35]'
              }`}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span>{t(labelKey)}</span>
            </Link>
          );
        })}
        <a
          href="tel:1962"
          aria-label="Call veterinary helpline 1962"
          className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-[#526257] transition-colors hover:text-[#174B35]"
        >
          <PhoneCall className="h-5 w-5" strokeWidth={2} />
          <span>{t('bottom_helpline')}</span>
        </a>
      </div>
    </nav>
  );
};
