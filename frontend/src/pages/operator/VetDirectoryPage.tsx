import React, { useEffect, useState } from 'react';
import { getVeterinaryServicesAPI } from '../../lib/api';
import { VeterinaryServiceRecord } from '../../types';
import { LeafletMap } from '../../components/maps/LeafletMap';
import { Building, Phone, MapPin, Search, Filter, Map, List } from 'lucide-react';

export const VetDirectoryPage: React.FC = () => {
  const [vets, setVets] = useState<VeterinaryServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>('both');
  const [search, setSearch] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');

  useEffect(() => {
    getVeterinaryServicesAPI()
      .then(setVets)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredVets = vets.filter(v => {
    if (selectedDistrict !== 'all' && v.district !== selectedDistrict) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        v.name.toLowerCase().includes(q) ||
        v.district.toLowerCase().includes(q) ||
        v.service_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const mapPoints = filteredVets.map(v => ({
    id: v.id,
    name: v.name,
    service_type: v.service_type,
    latitude: v.latitude,
    longitude: v.longitude,
    phone: v.phone,
    address: v.address
  }));

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#17251D]">
            Odisha Veterinary Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#647168] mt-1">
            Verified Block Veterinary Dispensaries, Hospitals & Mobile Veterinary Units.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center rounded-xl bg-white p-1 border border-[#E2E7DF]">
          <button
            onClick={() => setViewMode('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              viewMode === 'both' ? 'bg-[#174B35] text-white' : 'text-[#647168]'
            }`}
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              viewMode === 'map' ? 'bg-[#174B35] text-white' : 'text-[#647168]'
            }`}
          >
            <Map className="w-3.5 h-3.5" /> Map Only
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-[#174B35] text-white' : 'text-[#647168]'
            }`}
          >
            <List className="w-3.5 h-3.5" /> List Only
          </button>
        </div>
      </div>

      {/* Search & District Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#647168] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search facility name or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#E2E7DF] bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#174B35]"
          />
        </div>

        <select
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#174B35]"
        >
          <option value="all">All Districts (ସମସ୍ତ ଜିଲ୍ଲା)</option>
          <option value="Khordha">Khordha</option>
          <option value="Cuttack">Cuttack</option>
          <option value="Puri">Puri</option>
          <option value="Mayurbhanj">Mayurbhanj</option>
        </select>
      </div>

      {/* MAP & LIST GRID */}
      <div className={`grid gap-6 ${viewMode === 'both' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        
        {/* List of Facilities */}
        {(viewMode === 'both' || viewMode === 'list') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-6' : 'col-span-1'} space-y-4`}>
            {filteredVets.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-3xl p-5 border border-[#E2E7DF] shadow-xs space-y-3 hover:border-[#174B35] transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#174B35] bg-[#E2EEE5] px-2 py-0.5 rounded-md">
                      {v.service_type}
                    </span>
                    <h3 className="text-base font-bold text-[#17251D] mt-1.5">{v.name}</h3>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F7F7F0] text-[#17251D] shrink-0">
                    {v.availability_status}
                  </span>
                </div>

                <p className="text-xs text-[#647168] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#174B35] shrink-0" />
                  {v.address}
                </p>

                <div className="pt-2 border-t border-[#E2E7DF] flex items-center justify-between text-xs">
                  <span className="text-[#174B35] font-semibold flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" />
                    {v.phone || 'Phone upon dispatch'}
                  </span>
                  <span className="text-[10px] text-[#647168]">
                    GPS: {v.latitude.toFixed(2)}, {v.longitude.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Map View */}
        {(viewMode === 'both' || viewMode === 'map') && (
          <div className={`${viewMode === 'both' ? 'lg:col-span-6' : 'col-span-1'} bg-white rounded-3xl p-4 border border-[#E2E7DF] shadow-xs sticky top-24 h-fit`}>
            <LeafletMap
              points={mapPoints}
              className="h-[460px] w-full rounded-2xl overflow-hidden border border-[#E2E7DF]"
            />
            <div className="text-[11px] text-[#647168] text-center pt-2">
              Showing {mapPoints.length} veterinary infrastructure points across Odisha
            </div>
          </div>
        )}

      </div>

    </div>
  );
};

