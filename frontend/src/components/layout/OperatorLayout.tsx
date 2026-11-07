import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  Activity, 
  Inbox, 
  MapPin, 
  BarChart3, 
  Settings, 
  Heart, 
  Menu, 
  X, 
  ChevronRight,
  LogOut,
  Sparkles
} from 'lucide-react';

export const OperatorLayout: React.FC = () => {
  const location = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/operator', icon: Activity },
    { label: 'Incoming Cases', path: '/operator/cases', icon: Inbox },
    { label: 'Veterinary Directory', path: '/operator/vets', icon: MapPin },
    { label: 'Reports & Analytics', path: '/operator/reports', icon: BarChart3 },
    { label: 'System Settings', path: '/operator/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F0] flex flex-col md:flex-row">
      
      {/* MOBILE TOP BAR */}
      <div className="md:hidden bg-[#17251D] text-white px-4 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <Link to="/operator" className="flex items-center gap-2 font-bold text-base">
          <div className="w-7 h-7 rounded-lg bg-[#2D7D57] flex items-center justify-center text-white">
            <Heart className="w-4 h-4 fill-white/20" />
          </div>
          <span>JeevSetu Console</span>
        </Link>
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="p-1.5 rounded-lg text-white hover:bg-white/10"
        >
          {mobileDrawerOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE DRAWER */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-[#17251D]/80 backdrop-blur-sm flex">
          <div className="w-72 bg-[#17251D] text-white p-5 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-bold text-lg">Menu</span>
                <button onClick={() => setMobileDrawerOpen(false)} className="text-white/60">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive ? 'bg-[#2D7D57] text-white' : 'text-white/70 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <Link
              to="/"
              className="text-xs text-white/50 hover:text-white flex items-center gap-2 pt-4 border-t border-white/10"
            >
              <LogOut className="w-4 h-4" />
              Exit to Farmer Intake
            </Link>
          </div>
          <div className="flex-1" onClick={() => setMobileDrawerOpen(false)} />
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col justify-between w-64 bg-[#17251D] text-white p-6 shrink-0 sticky top-0 h-screen border-r border-[#17251D]">
        <div className="space-y-8">
          
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-[#2D7D57] flex items-center justify-center text-white shadow-xs">
              <Heart className="w-5 h-5 fill-white/20" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block">JeevSetu</span>
              <span className="text-[10px] text-[#2D7D57] font-semibold uppercase tracking-wider block">Vet Console</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#2D7D57] text-white shadow-xs font-semibold'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Operator Session Info */}
        <div className="space-y-3 pt-4 border-t border-white/10 text-xs">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-white/80 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Operator: Dr. P. Mishra</span>
            </div>
            <span className="text-[10px] text-white/40 block mt-0.5">Khordha District ARD</span>
          </div>

          <Link
            to="/"
            className="flex items-center gap-2 text-white/50 hover:text-white text-xs pt-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Return to Farmer Flow</span>
          </Link>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        <Outlet />
      </main>

    </div>
  );
};

