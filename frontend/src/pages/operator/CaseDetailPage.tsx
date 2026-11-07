import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getCaseDetailAPI, 
  updateCaseStatusAPI, 
  assignCaseAPI, 
  getVeterinaryServicesAPI 
} from '../../lib/api';
import { CaseRecord, VeterinaryServiceRecord } from '../../types';
import { LeafletMap } from '../../components/maps/LeafletMap';
import { 
  ArrowLeft, 
  ShieldAlert, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  Volume2, 
  MapPin, 
  Phone, 
  User, 
  Send,
  Building,
  RotateCcw
} from 'lucide-react';

const STATUS_OPTIONS = [
  'new',
  'under_review',
  'assigned',
  'referral_suggested',
  'follow_up',
  'resolved',
  'closed'
];

export const CaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [vetServices, setVetServices] = useState<VeterinaryServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [statusReason, setStatusReason] = useState<string>('');
  const [selectedVetId, setSelectedVetId] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      getCaseDetailAPI(id),
      getVeterinaryServicesAPI()
    ])
      .then(([c, vets]) => {
        setCaseRecord(c);
        setSelectedStatus(c.status);
        setVetServices(vets);
        if (vets.length > 0) setSelectedVetId(vets[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!caseRecord) return;
    setUpdating(true);
    setNotice(null);
    try {
      const updated = await updateCaseStatusAPI(
        caseRecord.id,
        selectedStatus,
        statusReason || `Status changed to ${selectedStatus}`,
        'Dr. P. Mishra (Veterinary Officer)'
      );
      setCaseRecord(updated);
      setNotice("Status updated and logged in case history.");
      setStatusReason('');
    } catch (err: any) {
      setNotice(`Failed to update status: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignVet = async () => {
    if (!caseRecord || !selectedVetId) return;
    setUpdating(true);
    setNotice(null);
    try {
      await assignCaseAPI(caseRecord.id, selectedVetId, 'Dr. P. Mishra');
      const refreshed = await getCaseDetailAPI(caseRecord.id);
      setCaseRecord(refreshed);
      setNotice("Case successfully assigned to veterinary dispensary.");
    } catch (err: any) {
      setNotice(`Failed to assign: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#647168]">
        Loading case record #{id}...
      </div>
    );
  }

  if (!caseRecord) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-base font-semibold text-[#17251D]">Case record not found.</p>
        <Link to="/operator/cases" className="text-sm text-[#174B35] font-semibold hover:underline">
          ← Return to case queue
        </Link>
      </div>
    );
  }

  const isUrgent = caseRecord.urgency_level === 'urgent';
  const extraction = caseRecord.symptom_extraction_json;

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/operator/cases"
          className="text-xs sm:text-sm font-semibold text-[#647168] hover:text-[#17251D] flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Case Queue
        </Link>

        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            isUrgent ? 'bg-[#FCE9E7] text-[#B83A35]' : 'bg-[#FFF2D9] text-[#A85C12]'
          }`}>
            {caseRecord.urgency_level.toUpperCase()}
          </span>
          <span className="capitalize px-3 py-1 rounded-full bg-[#EEF2E9] text-[#17251D] text-xs font-semibold">
            Status: {caseRecord.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Main Title Bar */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#647168] uppercase tracking-wider">
            Case Reference
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#174B35] font-mono mt-0.5">
            {caseRecord.public_reference}
          </h1>
          <p className="text-xs text-[#647168] mt-1">
            Submitted on {new Date(caseRecord.created_at).toLocaleString()} • Language: {caseRecord.language.toUpperCase()}
          </p>
        </div>

        {caseRecord.is_demo_record && (
          <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
            DEMO RECORD — SAMPLE CASE
          </div>
        )}
      </div>

      {notice && (
        <div className="p-4 rounded-2xl bg-[#E2EEE5] border border-[#2D7D57]/30 text-[#174B35] text-xs font-semibold">
          {notice}
        </div>
      )}

      {/* TWO COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Clinical Intake Evidence */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Transcript & Audio Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#17251D] flex items-center gap-2">
              <Volume2 className="w-5 h-5 text-[#174B35]" />
              Spoken Transcript & Audio
            </h3>

            {caseRecord.audio_object_key ? (
              <div className="p-3 bg-[#EEF2E9] rounded-2xl">
                <audio
                  src={`/api/audio/${caseRecord.audio_object_key}`}
                  controls
                  className="w-full h-10"
                />
              </div>
            ) : (
              <div className="text-xs text-[#647168] italic p-3 bg-[#F7F7F0] rounded-xl">
                Audio file not stored or consent restricted. Text transcript preserved below:
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#F7F7F0] border border-[#E2E7DF] text-sm text-[#17251D] leading-relaxed">
              "{caseRecord.transcript || 'No transcript available.'}"
            </div>
          </div>

          {/* Extracted Clinical Symptoms */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#17251D]">
              Structured Symptom Extraction
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F7F7F0] rounded-xl">
                <span className="text-[#647168] block">Animal Species</span>
                <span className="font-bold text-[#17251D] capitalize text-sm">{caseRecord.animal_type}</span>
              </div>
              <div className="p-3 bg-[#F7F7F0] rounded-xl">
                <span className="text-[#647168] block">Feed/Water Intake</span>
                <span className="font-bold text-[#17251D] text-sm">{extraction?.eating_or_drinking_change || 'Not provided'}</span>
              </div>
              <div className="p-3 bg-[#F7F7F0] rounded-xl">
                <span className="text-[#647168] block">Reported Duration</span>
                <span className="font-bold text-[#17251D] text-sm">{extraction?.symptom_duration || 'Not provided'}</span>
              </div>
              <div className="p-3 bg-[#F7F7F0] rounded-xl">
                <span className="text-[#647168] block">Milk Yield Change</span>
                <span className="font-bold text-[#17251D] text-sm">{extraction?.milk_production_change || 'Not provided'}</span>
              </div>
            </div>

            {/* Extracted Flags List */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-semibold text-[#647168]">Identified Clinical Signs:</span>
              <div className="space-y-1.5">
                {extraction?.symptoms_reported?.map((sym, i) => (
                  <div key={i} className="p-3 rounded-xl bg-[#E2EEE5] text-[#174B35] text-xs flex items-center justify-between">
                    <span className="font-semibold">{sym.value}</span>
                    <span className="text-[11px] opacity-75">Conf: {(sym.confidence * 100).toFixed(0)}%</span>
                  </div>
                )) || <div className="text-xs text-[#647168]">No structured symptoms parsed.</div>}
              </div>
            </div>
          </div>

          {/* Location & Farmer Contact */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#17251D] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#174B35]" />
              Location & Contact Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F7F7F0] rounded-xl space-y-1">
                <span className="text-[#647168]">Village / Landmark</span>
                <p className="font-semibold text-[#17251D]">
                  {caseRecord.village || 'Village unstated'}, {caseRecord.district}
                </p>
                {caseRecord.landmark && (
                  <p className="text-[11px] text-[#647168]">Near: {caseRecord.landmark}</p>
                )}
              </div>

              <div className="p-3 bg-[#F7F7F0] rounded-xl space-y-1">
                <span className="text-[#647168]">Farmer Contact</span>
                <p className="font-semibold text-[#17251D]">
                  {caseRecord.farmer_name || 'Farmer anonymous'}
                </p>
                {caseRecord.farmer_phone ? (
                  <p className="text-xs text-[#174B35] font-bold flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {caseRecord.farmer_phone}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#647168]">No phone provided</p>
                )}
              </div>
            </div>

            {/* Incident Map Pin */}
            {caseRecord.latitude && caseRecord.longitude && (
              <LeafletMap
                center={[caseRecord.latitude, caseRecord.longitude]}
                zoom={13}
                points={[{
                  id: caseRecord.id,
                  name: `Incident: ${caseRecord.public_reference}`,
                  latitude: caseRecord.latitude,
                  longitude: caseRecord.longitude,
                  urgency: caseRecord.urgency_level
                }]}
                className="h-[220px] w-full rounded-2xl overflow-hidden border border-[#E2E7DF]"
              />
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Operational Coordination & Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Triage Warning Reasons Card */}
          <div className={`rounded-3xl p-6 border shadow-xs space-y-3 ${
            isUrgent ? 'bg-[#FCE9E7] border-[#B83A35]' : 'bg-[#FFF2D9] border-[#D89A32]'
          }`}>
            <div className="flex items-center gap-2">
              {isUrgent ? (
                <ShieldAlert className="w-5 h-5 text-[#B83A35]" />
              ) : (
                <AlertCircle className="w-5 h-5 text-[#A85C12]" />
              )}
              <h3 className="text-sm font-bold text-[#17251D]">
                Triage Rule Triggers (Deterministic Engine)
              </h3>
            </div>

            <ul className="text-xs text-[#17251D] list-disc pl-4 space-y-1">
              {caseRecord.urgency_reasons_json?.map((r, i) => (
                <li key={i}>{r}</li>
              )) || <li>Routine non-emergency review flagged.</li>}
            </ul>
          </div>

          {/* Status Update Card */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#17251D]">Update Case Status</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#17251D] mb-1">New Status:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-xs font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st}>{st.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#17251D] mb-1">Reviewer Note / Action Taken:</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Field visit scheduled, advised clean oral fluids."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                />
              </div>

              <button
                type="button"
                disabled={updating}
                onClick={handleStatusUpdate}
                className="w-full py-3 rounded-xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                {updating ? "Updating..." : "Commit Status Change"}
              </button>
            </div>
          </div>

          {/* Veterinary Referral Assignment */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#17251D] flex items-center gap-2">
              <Building className="w-4 h-4 text-[#174B35]" />
              Assign to Local Vet Facility
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#17251D] mb-1">Select Veterinary Dispensary / MVU:</label>
                <select
                  value={selectedVetId}
                  onChange={(e) => setSelectedVetId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-xs focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                >
                  {vetServices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.district}) — {v.availability_status}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                disabled={updating}
                onClick={handleAssignVet}
                className="w-full py-3 rounded-xl bg-[#2D7D57] hover:bg-[#174B35] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Assign & Dispatch Notification
              </button>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="bg-white rounded-3xl p-6 border border-[#E2E7DF] shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#17251D] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#174B35]" />
              Status History Audit Trail
            </h3>

            <div className="space-y-3 text-xs">
              {caseRecord.status_history?.map((h) => (
                <div key={h.id} className="p-3 rounded-xl bg-[#F7F7F0] border border-[#E2E7DF] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#174B35] capitalize">
                      {h.new_status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-[#647168]">
                      {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[#647168]">{h.reason || 'Status changed'}</p>
                  <span className="text-[10px] text-[#17251D]/60 block font-medium">By: {h.changed_by}</span>
                </div>
              )) || <div className="text-[#647168]">Initial case intake record created.</div>}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

