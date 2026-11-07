import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsSummaryAPI, getCasesAPI } from '../../lib/api';
import { CaseRecord, AnalyticsSummary } from '../../types';
import { LeafletMap } from '../../components/maps/LeafletMap';
import { 
  Inbox, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Search, 
  ArrowRight, 
  ChevronRight, 
  Eye, 
  MapPin,
  Calendar,
  Sparkles
} from 'lucide-react';

export const DashboardOverviewPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [recentCases, setRecentCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, cases] = await Promise.all([
          getAnalyticsSummaryAPI(),
          getCasesAPI({ limit: 10 })
        ]);
        setAnalytics(summary);
        setRecentCases(cases);
      } catch (err) {
        console.error("Dashboard data load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const filteredCases = recentCases.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.public_reference.toLowerCase().includes(q) ||
      (c.village && c.village.toLowerCase().includes(q)) ||
      (c.district && c.district.toLowerCase().includes(q)) ||
      (c.transcript && c.transcript.toLowerCase().includes(q))
    );
  });

  const mapPoints = recentCases
    .filter(c => c.latitude && c.longitude)
    .map(c => ({
      id: c.id,
      name: `${c.animal_type.toUpperCase()} (${c.public_reference})`,
      service_type: c.village ? `${c.village}, ${c.district}` : c.district,
      latitude: c.latitude!,
      longitude: c.longitude!,
      urgency: c.urgency_level,
      address: c.transcript?.slice(0, 80)
    }));

  return (
    <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251D]">
            Veterinary Operations
          </h1>
          <p className="text-xs sm:text-sm text-[#647168] mt-1">
            Review incoming livestock cases and coordinate the next step.
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#647168] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, village..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7DF] bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#174B35]"
          />
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <Link
          to="/operator/cases?status=new"
          className="bg-white p-5 rounded-3xl border border-[#E2E7DF] shadow-xs hover:border-[#174B35] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#647168]">New Cases</span>
            <div className="w-8 h-8 rounded-xl bg-[#E2EEE5] text-[#174B35] flex items-center justify-center">
              <Inbox className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#17251D] mt-3">
            {analytics?.new_cases ?? 0}
          </div>
          <span className="text-[11px] text-[#2D7D57] font-medium block mt-1">Awaiting dispatch</span>
        </Link>

        <Link
          to="/operator/cases?urgency=urgent"
          className="bg-white p-5 rounded-3xl border border-[#E2E7DF] shadow-xs hover:border-[#B83A35] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#647168]">Urgent Cases</span>
            <div className="w-8 h-8 rounded-xl bg-[#FCE9E7] text-[#B83A35] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#B83A35] mt-3">
            {analytics?.urgent_cases ?? 0}
          </div>
          <span className="text-[11px] text-[#B83A35] font-medium block mt-1">Immediate review</span>
        </Link>

        <Link
          to="/operator/cases?status=under_review"
          className="bg-white p-5 rounded-3xl border border-[#E2E7DF] shadow-xs hover:border-[#D89A32] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#647168]">Under Review</span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF2D9] text-[#A85C12] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#17251D] mt-3">
            {analytics?.under_review_cases ?? 0}
          </div>
          <span className="text-[11px] text-[#647168] font-medium block mt-1">In progress</span>
        </Link>

        <Link
          to="/operator/cases?status=resolved"
          className="bg-white p-5 rounded-3xl border border-[#E2E7DF] shadow-xs hover:border-[#174B35] transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#647168]">Resolved</span>
            <div className="w-8 h-8 rounded-xl bg-[#E2EEE5] text-[#174B35] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#17251D] mt-3">
            {analytics?.resolved_cases ?? 0}
          </div>
          <span className="text-[11px] text-[#647168] font-medium block mt-1">Cases closed</span>
        </Link>

      </div>

      {/* MAP PREVIEW & INTAKE FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Cases Queue (Table on Desktop, Cards on Mobile) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E2E7DF] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#17251D]">Incoming Queue</h2>
              <p className="text-xs text-[#647168]">Latest village reports received via speech intake</p>
            </div>
            <Link
              to="/operator/cases"
              className="text-xs font-semibold text-[#174B35] hover:underline flex items-center gap-1"
            >
              View Full Queue <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {filteredCases.length === 0 ? (
            <div className="py-12 text-center text-[#647168] text-sm">
              No cases found matching your search.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-[#E2E7DF] text-[#647168] font-semibold">
                    <th className="pb-3">Case ID</th>
                    <th className="pb-3">Animal</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Urgency</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E7DF]/60">
                  {filteredCases.map((c) => {
                    const isUrgent = c.urgency_level === 'urgent';
                    return (
                      <tr key={c.id} className="hover:bg-[#F7F7F0]/60 transition-colors">
                        <td className="py-3.5 font-bold font-mono text-[#174B35]">
                          {c.public_reference}
                        </td>
                        <td className="py-3.5 capitalize font-medium text-[#17251D]">
                          {c.animal_type}
                        </td>
                        <td className="py-3.5 text-[#647168]">
                          {c.village || 'Village'}, {c.district}
                        </td>
                        <td className="py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isUrgent ? 'bg-[#FCE9E7] text-[#B83A35]' : 'bg-[#FFF2D9] text-[#A85C12]'
                          }`}>
                            {c.urgency_level.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span className="capitalize px-2 py-0.5 rounded-md bg-[#EEF2E9] text-[#17251D] text-xs">
                            {c.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <Link
                            to={`/operator/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E2EEE5] hover:bg-[#174B35] text-[#174B35] hover:text-white font-semibold text-xs transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Review
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Geographic Incident Map Preview */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#E2E7DF] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#17251D]">Case Locations</h2>
              <p className="text-xs text-[#647168]">Odisha rural incident distribution</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EEF2E9] text-[#174B35]">
              GPS Mapped
            </span>
          </div>

          <LeafletMap
            points={mapPoints}
            className="h-[280px] w-full rounded-2xl overflow-hidden border border-[#E2E7DF]"
          />

          <div className="flex items-center justify-between text-xs text-[#647168] pt-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B83A35]"></span>
              <span>Red Flag</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#174B35]"></span>
              <span>Standard Intake</span>
            </div>
            <Link to="/operator/vets" className="text-[#174B35] font-semibold hover:underline">
              Full Map →
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
};

