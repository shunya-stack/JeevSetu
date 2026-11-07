import React, { useEffect, useState } from 'react';
import { getIntegrationStatus } from '../../lib/api';
import { Settings, ShieldCheck, Database, Cpu, Lock, Info } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getIntegrationStatus()
      .then(setStatus)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251D]">
          System Settings & Integrations
        </h1>
        <p className="text-xs sm:text-sm text-[#647168] mt-1">
          Verify connected AI engines, safety parameters and compliance rules.
        </p>
      </div>

      {/* Integration Status Card */}
      <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#17251D] flex items-center gap-2">
          <Cpu className="w-5 h-5 text-[#174B35]" />
          Gnani AI Provider Stack
        </h2>

        <div className="space-y-3 text-xs sm:text-sm">
          
          <div className="p-3.5 rounded-2xl bg-[#F7F7F0] border border-[#E2E7DF] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#17251D] block">Gnani Prisma (Speech-to-Text)</span>
              <span className="text-xs text-[#647168]">
                Model: {status?.gnani?.prisma_model || 'prisma-v3.0'} • Endpoint: /stt/v3
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              status?.gnani?.prisma_status === 'live'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {status?.gnani?.prisma_status === 'live' ? 'LIVE CONNECTED' : 'DEMO ADAPTER'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F7F0] border border-[#E2E7DF] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#17251D] block">Gnani Evon (Reasoning & Extraction)</span>
              <span className="text-xs text-[#647168]">
                Model: {status?.gnani?.evon_model || 'gnani-evon-v3.3-30B-A3B'}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              status?.gnani?.evon_status === 'live'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {status?.gnani?.evon_status === 'live' ? 'LIVE CONNECTED' : 'DEMO ADAPTER'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#F7F7F0] border border-[#E2E7DF] flex items-center justify-between">
            <div>
              <span className="font-bold text-[#17251D] block">Gnani Timbre (Text-to-Speech)</span>
              <span className="text-xs text-[#647168]">
                Model: {status?.gnani?.timbre_model || 'timbre-v3.0'}
              </span>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
              status?.gnani?.timbre_status === 'live'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {status?.gnani?.timbre_status === 'live' ? 'LIVE CONNECTED' : 'DEMO ADAPTER'}
            </span>
          </div>

        </div>

        <p className="text-[11px] text-[#647168]">
          API keys are guarded server-side and never exposed to the browser client.
        </p>
      </div>

      {/* Safety Ruleset Status */}
      <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#17251D] flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#2D7D57]" />
          Triage Ruleset Version & Boundaries
        </h2>

        <div className="p-4 rounded-2xl bg-[#EEF2E9] border border-[#E2E7DF] space-y-2 text-xs text-[#17251D]">
          <div className="flex justify-between font-semibold">
            <span>Ruleset Engine:</span>
            <span className="font-mono">{status?.safety_engine?.version || 'demo-v1.0'}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Clinical Diagnosis Autonomy:</span>
            <span className="text-[#B83A35] font-bold">STRICTLY DISABLED (Safety Boundary)</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Medication / Dosage Emission:</span>
            <span className="text-[#B83A35] font-bold">HARD-PROHIBITED</span>
          </div>
        </div>
      </div>

      {/* Privacy & Retention */}
      <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-2 text-xs text-[#647168]">
        <h3 className="font-bold text-sm text-[#17251D] flex items-center gap-1.5">
          <Lock className="w-4 h-4 text-[#174B35]" />
          Privacy & Data Retention Compliance
        </h3>
        <p>
          Recorded audio files are retained strictly for clinical case verification with farmer consent. Aadhaar and sensitive personal identification are neither requested nor stored.
        </p>
      </div>

    </div>
  );
};

