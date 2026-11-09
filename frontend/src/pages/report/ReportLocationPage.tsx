import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowLeft, ArrowRight, MapPin, Navigation, AlertCircle } from 'lucide-react';

const ODISHA_DISTRICTS = [
  { id: 'Khordha', labelKey: 'district_khordha' },
  { id: 'Cuttack', labelKey: 'district_cuttack' },
  { id: 'Puri', labelKey: 'district_puri' },
  { id: 'Mayurbhanj', labelKey: 'district_mayurbhanj' },
  { id: 'Balasore', labelKey: 'district_balasore' },
  { id: 'Bhadrak', labelKey: 'district_bhadrak' },
  { id: 'Ganjam', labelKey: 'district_ganjam' },
  { id: 'Sambalpur', labelKey: 'district_sambalpur' },
  { id: 'Bargarh', labelKey: 'district_bargarh' },
  { id: 'Angul', labelKey: 'district_angul' },
  { id: 'Dhenkanal', labelKey: 'district_dhenkanal' },
  { id: 'Jajpur', labelKey: 'district_jajpur' },
  { id: 'Kendrapara', labelKey: 'district_kendrapara' },
  { id: 'Jagatsinghpur', labelKey: 'district_jagatsinghpur' },
  { id: 'Sundargarh', labelKey: 'district_sundargarh' },
  { id: 'Bolangir', labelKey: 'district_bolangir' },
  { id: 'Koraput', labelKey: 'district_koraput' },
];

export const ReportLocationPage: React.FC = () => {
  const { t, draft, updateDraft } = useLanguage();
  const navigate = useNavigate();

  const [district, setDistrict] = useState(draft.district || 'Khordha');
  const [block, setBlock] = useState(draft.block || '');
  const [village, setVillage] = useState(draft.village || '');
  const [landmark, setLandmark] = useState(draft.landmark || '');
  const [farmerName, setFarmerName] = useState(draft.farmer_name || '');
  const [farmerPhone, setFarmerPhone] = useState(draft.farmer_phone || '');
  const [consent, setConsent] = useState(draft.contact_consent ?? true);
  const [geoLocating, setGeoLocating] = useState(false);
  const [coords, setCoords] = useState<{ lat?: number; lng?: number }>({
    lat: draft.latitude,
    lng: draft.longitude
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg(t('error_geolocation_not_supported'));
      return;
    }
    setGeoLocating(true);
    setErrorMsg(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoLocating(false);
      },
      (err) => {
        setGeoLocating(false);
        setErrorMsg(t('error_gps_failed'));
      },
      { timeout: 8000 }
    );
  };

  const handleContinue = () => {
    if (!consent) {
      setErrorMsg(t('consent_label') + ' ' + t('consent_no_sensitive'));
      return;
    }
    updateDraft({
      district,
      block,
      village,
      landmark,
      farmer_name: farmerName,
      farmer_phone: farmerPhone,
      contact_consent: consent,
      latitude: coords.lat,
      longitude: coords.lng
    });
    navigate('/report/confirm');
  };

  return (
    <div className="min-h-screen bg-[#F7F7F0] py-6 sm:py-10">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/report/review" className="text-sm font-medium text-[#647168] hover:text-[#17251D] flex items-center gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            {t('btn_back')}
          </Link>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E2EEE5] text-[#174B35]">
            {t('location_title')}
          </span>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-sm space-y-6">
          
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#17251D]">
              {t('location_title')}
            </h1>
            <p className="text-xs sm:text-sm text-[#647168] mt-1">
              {t('location_description')}
            </p>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-[#FCE9E7] border border-[#B83A35]/30 text-[#B83A35] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* District & Location Fields */}
          <div className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17251D] mb-1">
                  {t('district_label')} *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                >
                  {ODISHA_DISTRICTS.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {t(dist.labelKey)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251D] mb-1">
                  {t('block_label')} *
                </label>
                <input
                  type="text"
                  placeholder={t('block_label') + ' (e.g. Jatni / Kudiary)'}
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17251D] mb-1">
                {t('landmark_label')} *
              </label>
              <input
                type="text"
                placeholder={t('landmark_label') + ' (e.g. Near Panchayat Office / Shiv Temple)'}
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
              />
            </div>

            {/* GPS Geolocation Button */}
            <div className="p-3.5 rounded-2xl bg-[#EEF2E9] border border-[#E2E7DF] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#17251D]">
                <MapPin className="w-4 h-4 text-[#174B35]" />
                <span>
                  {coords.lat ? `GPS: ${coords.lat.toFixed(4)}, ${coords.lng?.toFixed(4)}` : t('gps_label')}
                </span>
              </div>
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={geoLocating}
                className="px-3 py-1.5 rounded-lg bg-white text-[#174B35] border border-[#E2E7DF] text-xs font-semibold hover:bg-[#E2EEE5] flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                {geoLocating ? t('gps_fetching') : t('gps_use_current')}
              </button>
            </div>

          </div>

          {/* Contact Details */}
          <div className="pt-2 border-t border-[#E2E7DF] space-y-4">
            <h3 className="text-sm font-bold text-[#17251D]">
              {t('confirm_final_review')}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#17251D] mb-1">
                  {t('farmer_name_label')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Chandra Sahoo"
                  value={farmerName}
                  onChange={(e) => setFarmerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17251D] mb-1">
                  {t('farmer_phone_label')}
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 94371XXXXX"
                  value={farmerPhone}
                  onChange={(e) => setFarmerPhone(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E2E7DF] bg-[#F7F7F0] text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#174B35]"
                />
              </div>
            </div>

            {/* Consent checkbox */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#F7F7F0] border border-[#E2E7DF]">
              <input
                type="checkbox"
                id="contact-consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded text-[#174B35] focus:ring-[#174B35] cursor-pointer"
              />
              <label htmlFor="contact-consent" className="text-xs text-[#17251D] cursor-pointer leading-relaxed">
                {t('consent_label')} {t('consent_no_sensitive')}
              </label>
            </div>

          </div>

          {/* Continue button */}
          <button
            type="button"
            onClick={handleContinue}
            className="w-full py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white font-semibold text-base flex items-center justify-center gap-2 shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <span>{t('btn_review_final_summary')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>

        </div>

      </div>
    </div>
  );
};
