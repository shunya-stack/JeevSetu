import React, { useEffect, useState } from 'react';
import { getAnalyticsSummaryAPI } from '../../lib/api';
import { AnalyticsSummary } from '../../types';
import { BarChart3, PieChart, Database, ShieldAlert, Sparkles } from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalyticsSummaryAPI()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#647168]">
        Aggregating database reports...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251D]">
          Intake Reports & Analytics
        </h1>
        <p className="text-xs sm:text-sm text-[#647168] mt-1">
          Strictly derived from persisted case records. No fabricated clinical or financial claims.
        </p>
      </div>

      {/* Data Source Label */}
      <div className="p-3.5 rounded-2xl bg-white border border-[#E2E7DF] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[#174B35] font-semibold">
          <Database className="w-4 h-4" />
          <span>Data Source: {data?.data_source_label || "Live Database Records"}</span>
        </div>
        <span className="text-[11px] text-[#647168]">Total Records: {data?.total_cases ?? 0}</span>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* By Animal Species */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#17251D] flex items-center gap-2">
            <PieChart className="w-4 h-4 text-[#174B35]" />
            Cases by Animal Species
          </h3>
          <div className="space-y-2.5">
            {Object.entries(data?.by_animal || {}).map(([animal, count]) => {
              const total = data?.total_cases || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={animal} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold capitalize">
                    <span>{animal}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#EEF2E9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#174B35] h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Urgency Level */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#17251D] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#B83A35]" />
            Triage Priority Distribution
          </h3>
          <div className="space-y-2.5">
            {Object.entries(data?.by_urgency || {}).map(([urgency, count]) => {
              const total = data?.total_cases || 1;
              const pct = Math.round((count / total) * 100);
              const color = urgency === 'urgent' ? 'bg-[#B83A35]' : 'bg-[#D89A32]';
              return (
                <div key={urgency} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold capitalize">
                    <span>{urgency}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#EEF2E9] h-2 rounded-full overflow-hidden">
                    <div className={`${color} h-full rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Language */}
        <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#17251D] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#D89A32]" />
            Language Distribution
          </h3>
          <div className="space-y-2.5">
            {Object.entries(data?.by_language || {}).map(([lang, count]) => {
              const total = data?.total_cases || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={lang} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold uppercase">
                    <span>{lang}</span>
                    <span>{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-[#EEF2E9] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#2D7D57] h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By District */}
        <div className="md:col-span-2 lg:col-span-3 bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-[#17251D]">
            Geographic Incident Intake by District
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Object.entries(data?.by_district || {}).map(([district, count]) => (
              <div key={district} className="p-4 rounded-2xl bg-[#F7F7F0] border border-[#E2E7DF] text-center">
                <span className="text-xs text-[#647168] block">{district}</span>
                <span className="text-2xl font-black text-[#174B35] block mt-1">{count}</span>
                <span className="text-[10px] text-[#647168]">cases registered</span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};

