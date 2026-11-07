import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getCasesAPI } from '../../lib/api';
import { CaseRecord } from '../../types';
import { Search, Filter, Eye, ArrowUpDown, ChevronRight, Inbox, Clock } from 'lucide-react';

export const CaseQueuePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cases, setCases] = useState<CaseRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const statusFilter = searchParams.get('status') || 'all';
  const urgencyFilter = searchParams.get('urgency') || 'all';
  const animalFilter = searchParams.get('animal') || 'all';
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    getCasesAPI({
      status: statusFilter,
      urgency: urgencyFilter,
      animal_type: animalFilter,
      search: search
    })
      .then(setCases)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [statusFilter, urgencyFilter, animalFilter, search]);

  const updateFilter = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (val === 'all') next.delete(key);
    else next.set(key, val);
    setSearchParams(next);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251D]">
            Incoming Case Queue
          </h1>
          <p className="text-xs sm:text-sm text-[#647168] mt-1">
            Prioritized intake queue for veterinary review and field coordination.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#647168] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, village..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7DF] bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#174B35]"
          />
        </div>
      </div>

      {/* Filter Tabs & Badges */}
      <div className="flex flex-wrap items-center gap-2 pt-1 pb-2">
        <span className="text-xs font-semibold text-[#647168] mr-1 flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> Filter Status:
        </span>
        {['all', 'new', 'under_review', 'assigned', 'resolved'].map((st) => (
          <button
            key={st}
            onClick={() => updateFilter('status', st)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              statusFilter === st
                ? 'bg-[#174B35] text-white shadow-xs'
                : 'bg-white border border-[#E2E7DF] text-[#647168] hover:bg-[#EEF2E9]'
            }`}
          >
            {st.replace('_', ' ')}
          </button>
        ))}

        <div className="hidden sm:block h-4 w-px bg-[#E2E7DF] mx-2" />

        <span className="text-xs font-semibold text-[#647168] mr-1">Urgency:</span>
        {['all', 'urgent', 'review'].map((urg) => (
          <button
            key={urg}
            onClick={() => updateFilter('urgency', urg)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
              urgencyFilter === urg
                ? urg === 'urgent' ? 'bg-[#B83A35] text-white shadow-xs' : 'bg-[#D89A32] text-white shadow-xs'
                : 'bg-white border border-[#E2E7DF] text-[#647168] hover:bg-[#EEF2E9]'
            }`}
          >
            {urg}
          </button>
        ))}
      </div>

      {/* Case List / Table */}
      <div className="bg-white rounded-3xl border border-[#E2E7DF] shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-[#647168] text-sm">
            Loading cases from database...
          </div>
        ) : cases.length === 0 ? (
          <div className="py-16 text-center text-[#647168] space-y-2">
            <Inbox className="w-10 h-10 mx-auto text-[#C4CEC7]" />
            <p className="font-semibold text-sm">No cases match the selected filters.</p>
            <p className="text-xs text-[#647168]">Try resetting filters or searching another keyword.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-[#F7F7F0]/80 border-b border-[#E2E7DF] text-[#647168] font-semibold">
                <tr>
                  <th className="py-3 px-4">Case Ref</th>
                  <th className="py-3 px-4">Animal</th>
                  <th className="py-3 px-4">Reported Concern</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Urgency</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E7DF]/60">
                {cases.map((c) => {
                  const isUrgent = c.urgency_level === 'urgent';
                  return (
                    <tr key={c.id} className="hover:bg-[#F7F7F0]/60 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#174B35]">
                        {c.public_reference}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#17251D] capitalize">
                        {c.animal_type}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate text-[#647168]">
                        {c.transcript || 'Voice report captured'}
                      </td>
                      <td className="py-3.5 px-4 text-[#647168]">
                        {c.village ? `${c.village}, ` : ''}{c.district}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          isUrgent ? 'bg-[#FCE9E7] text-[#B83A35]' : 'bg-[#FFF2D9] text-[#A85C12]'
                        }`}>
                          {c.urgency_level.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-md bg-[#EEF2E9] text-[#17251D] text-xs">
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/operator/cases/${c.id}`}
                          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-[#E2EEE5] hover:bg-[#174B35] text-[#174B35] hover:text-white font-semibold text-xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Detail
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

    </div>
  );
};

