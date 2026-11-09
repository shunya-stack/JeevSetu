import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { Mic, ArrowRight, CheckCircle2, ShieldAlert, HeartHandshake, PhoneCall, Stethoscope, Sparkles } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F7F0]">

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-6 pb-14 sm:pb-20 lg:py-24 border-b border-[#E2E7DF]">

        {/* Natural Landscape Background: Ivory Sky, Warm Saffron Sunrise, Green Hills */}
        <div className="absolute inset-0 pointer-events-none -z-10 bg-gradient-to-b from-[#FFFDF9] via-[#FFF5E6] to-[#F1F6EE]" />

        {/* Subtle decorative sunrise orb in the background */}
        <div className="absolute right-0 top-1/4 -translate-y-1/2 w-[350px] sm:w-[600px] h-[350px] sm:h-[600px] rounded-full bg-gradient-to-br from-[#D89A32]/20 via-[#E2EEE5]/40 to-transparent blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">

            {/* LEFT HALF: Uncluttered, text-safe space */}
            <div className="lg:col-span-7 space-y-6 text-left">

              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E2EEE5] border border-[#2D7D57]/20 text-[#174B35] text-xs sm:text-sm font-semibold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5 text-[#D89A32]" />
                {t('hero_eyebrow')}
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#17251D] leading-[1.15]">
                {t('hero_title')}
              </h1>

              {/* Supporting Text */}
              <p className="text-base sm:text-lg lg:text-xl text-[#647168] leading-relaxed max-w-2xl font-normal">
                {t('hero_desc')}
              </p>


              {/* RIGHT THIRD: Boy and Calf Village Panorama Hero Artwork */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-3xl overflow-hidden bg-gradient-to-tr from-[#174B35]/30 via-[#D89A32]/40 to-[#174B35]/20 p-1 shadow-2xl">

                  {/* Hero Image Container */}
                  <div className="relative rounded-[22px] overflow-hidden bg-[#F7F7F0] aspect-[4/3] sm:aspect-[16/11]">
                    <img
                      src="/hero-sunrise.png"
                      alt="Young Indian boy affectionately embracing a calf in a sunrise rural village"
                      className="w-full h-full object-cover object-right sm:object-center transition-transform duration-700 hover:scale-105"
                      loading="eager"
                    />
                    {/* Subtle warm vignette overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

                    {/* Emotional Caption Tag */}
                    <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 z-10 bg-white/95 backdrop-blur-md rounded-2xl p-3 sm:p-3.5 border border-white/80 shadow-md">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#E2EEE5] flex items-center justify-center text-lg shrink-0 shadow-xs">
                          ❤️
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#17251D] truncate">
                            {language === 'odia' ? 'ସୁରକ୍ଷା ଓ ଯତ୍ନର ସମ୍ପର୍କ' : language === 'hindi' ? 'स्नेह और सुरक्षा का रिश्ता' : 'A Bond of Care and Trust'}
                          </h4>
                          <p className="text-[11px] text-[#647168] truncate">
                            {language === 'odia' ? 'ପ୍ରତ୍ୟେକ ଜୀବନ ପାଇଁ ତ୍ୱରିତ ସହାୟତା' : language === 'hindi' ? 'हर बेजुबान के लिए समय पर सहायता' : 'Care that reaches every life'}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Link
                  to="/report"
                  className="inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#174B35] hover:bg-[#103D2A] text-white text-base sm:text-lg font-semibold shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <Mic className="w-4 h-4 text-white" />
                  </div>
                  {t('hero_cta_voice')}
                  <ArrowRight className="w-5 h-5 ml-1" />
                </Link>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#17251D]">
            {language === 'odia' ? 'ଏହା କିପରି ସରଳ ଭାବରେ କାମ କରେ' : language === 'hindi' ? 'यह कैसे सरलता से काम करता है' : 'How JeevSetu Works'}
          </h2>
          <p className="text-sm sm:text-base text-[#647168] mt-2">
            Built for rural livestock rearers. No typing, complex apps or registration barriers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-[#E2EEE5] text-[#174B35] flex items-center justify-center font-bold text-lg mb-6">
              1
            </div>
            <h3 className="text-lg font-bold text-[#17251D] mb-2">
              {language === 'odia' ? '୧. ପଶୁ ବିଷୟରେ କୁହନ୍ତୁ' : language === 'hindi' ? '१. पशु के लक्षण बताएं' : 'Speak in your words'}
            </h3>
            <p className="text-xs sm:text-sm text-[#647168] leading-relaxed">
              Press the mic button. Describe eating habits, duration, swelling, fever or injuries in Odia or Hindi.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-[#FFF2D9] text-[#A85C12] flex items-center justify-center font-bold text-lg mb-6">
              2
            </div>
            <h3 className="text-lg font-bold text-[#17251D] mb-2">
              {language === 'odia' ? '୨. AI ବିଶ୍ଳେଷଣ ଓ ସୁରକ୍ଷା ଯାଞ୍ଚ' : language === 'hindi' ? '२. AI विश्लेषण व सुरक्षा जांच' : 'Structured Intake & Triage'}
            </h3>
            <p className="text-xs sm:text-sm text-[#647168] leading-relaxed">
              Bhashini converts spoken audio to text and Evon v3.3 analyses symptoms. Deterministic red flags highlight emergencies.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#E2E7DF] shadow-xs relative">
            <div className="w-12 h-12 rounded-2xl bg-[#E2EEE5] text-[#174B35] flex items-center justify-center font-bold text-lg mb-6">
              3
            </div>
            <h3 className="text-lg font-bold text-[#17251D] mb-2">
              {language === 'odia' ? '୩. ପଶୁଚିକିତ୍ସକଙ୍କୁ କେସ୍ ପ୍ରେରଣ' : language === 'hindi' ? '३. पशु चिकित्सक को रेफरल' : 'Veterinary Escalation'}
            </h3>
            <p className="text-xs sm:text-sm text-[#647168] leading-relaxed">
              Case is transferred to the veterinary queue with audio, transcript, village location, and triage urgency.
            </p>
          </div>

        </div>
      </section>


    </div>
  );
};

