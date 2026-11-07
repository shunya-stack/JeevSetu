import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, Activity, ShieldCheck, ArrowRight } from 'lucide-react';

export const OperatorLoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleDemoLogin = () => {
    localStorage.setItem('jeevsetu_operator_auth', 'demo_authorized');
    navigate('/operator');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-10 border border-[#E2E7DF] shadow-md space-y-6 text-center">
        
        <div className="w-16 h-16 rounded-2xl bg-[#174B35] flex items-center justify-center text-white mx-auto shadow-sm">
          <Heart className="w-8 h-8 fill-white/20" />
        </div>

        <div>
          <h1 className="text-2xl font-extrabold text-[#17251D]">
            Veterinary Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#647168] mt-1.5">
            JeevSetu Field & Dispensary Case Coordination Portal
          </p>
        </div>

        <div className="rounded-2xl bg-[#FFF2D9] p-4 border border-[#D89A32]/40 text-left text-xs text-[#A85C12] space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#A85C12]" />
            Hackathon MVP Access
          </p>
          <p>
            No hardcoded production credentials required. Click below to enter the live veterinary operations dashboard with preloaded demo records.
          </p>
        </div>

        <button
          onClick={handleDemoLogin}
          className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
        >
          <span>Enter Operator Console</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="pt-2">
          <Link to="/" className="text-xs text-[#647168] hover:text-[#17251D] hover:underline">
            ← Return to Public Homepage
          </Link>
        </div>

      </div>
    </div>
  );
};

