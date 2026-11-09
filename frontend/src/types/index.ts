export type Language = 'odia' | 'hindi' | 'english';

export type AnimalType = 'cow' | 'buffalo' | 'goat' | 'sheep' | 'other';

export type UrgencyLevel = 'urgent' | 'review' | 'info_needed';

export type CaseStatus = 
  | 'new'
  | 'under_review'
  | 'assigned'
  | 'referral_suggested'
  | 'follow_up'
  | 'resolved'
  | 'closed';

export interface SymptomItem {
  value: string;
  source_text?: string;
  confidence: number;
  confirmed_by_farmer: boolean;
}

export interface SymptomExtraction {
  animal_type: string;
  animal_identifier?: string;
  language: string;
  symptoms_reported: SymptomItem[];
  symptom_duration?: string;
  milk_production_change?: string;
  eating_or_drinking_change?: string;
  other_observations: string[];
  unknown_fields: string[];
  requires_human_review: boolean;
  provider?: string;
  is_demo?: boolean;
}

export interface CaseStatusHistory {
  id: string;
  previous_status?: string;
  new_status: string;
  reason?: string;
  changed_by: string;
  created_at: string;
}

export interface CaseRecord {
  id: string;
  public_reference: string;
  animal_type: AnimalType;
  animal_identifier?: string;
  animal_age_group?: string;
  is_milking?: boolean;
  language: Language | string;
  transcript?: string;
  audio_object_key?: string;
  audio_consent: boolean;
  symptom_extraction_json?: SymptomExtraction;
  urgency_level: UrgencyLevel;
  urgency_reasons_json?: string[];
  district?: string;
  block?: string;
  village?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
  farmer_name?: string;
  farmer_phone?: string;
  contact_consent: boolean;
  status: CaseStatus;
  input_mode: 'voice' | 'upload' | 'text';
  processing_source: string;
  is_demo_record: boolean;
  created_at: string;
  updated_at: string;
  status_history?: CaseStatusHistory[];
}

export interface VeterinaryServiceRecord {
  id: string;
  name: string;
  service_type: string;
  address: string;
  district: string;
  phone?: string;
  latitude: number;
  longitude: number;
  availability_status: string;
  verification_status: string;
  data_source: string;
  is_demo_record: boolean;
}

export interface AnalyticsSummary {
  total_cases: number;
  new_cases: number;
  urgent_cases: number;
  under_review_cases: number;
  resolved_cases: number;
  by_animal: Record<string, number>;
  by_district: Record<string, number>;
  by_urgency: Record<string, number>;
  by_language: Record<string, number>;
  data_source_label: string;
}

export interface FarmerReportDraft {
  _draft_version?: number;
  animal_type: AnimalType;
  animal_identifier: string;
  animal_age_group: string;
  is_milking: boolean;
  language: Language;
  transcript: string;
  audio_object_key: string;
  audio_blob_url?: string;
  /** Original-language transcript from STT (before any translation/enforcement). */
  original_transcript?: string;
  /** Language actually detected in the spoken audio. */
  transcript_language?: string;
  /** Whether the transcript was translated/enforced into the selected language. */
  language_translated?: boolean;
  /** App language the transcript was enforced into (re-checked when the farmer switches language). */
  enforced_language?: string;
  /** English translation of the transcript, generated for the operator. */
  english_operator_transcript?: string;
  /** All original recording keys (supports re-record / Record More). */
  original_audio_keys?: string[];
  /** All original-language transcripts (parallel to original_audio_keys). */
  original_transcripts?: string[];
  /** Localized summary in the farmer's selected language. */
  localized_summary?: string;
  /** Localized recommended actions in the farmer's selected language. */
  localized_recommendations?: string;
  /** Whether the farmer explicitly confirmed the understood report. */
  farmer_confirmed?: boolean;
  /** Confirmation status: pending | confirmed | rejected. */
  confirmation_status?: 'pending' | 'confirmed' | 'rejected';
  /** How many times the farmer chose "Record More" / re-recorded. */
  record_more_count?: number;
  /** Whether the case has been submitted (prevents duplicate submission). */
  case_submitted?: boolean;
  audio_consent: boolean;
  symptom_extraction?: SymptomExtraction;
  urgency_level: UrgencyLevel;
  urgency_reasons: string[];
  immediate_actions: string[];
  district: string;
  block: string;
  village: string;
  landmark: string;
  latitude?: number;
  longitude?: number;
  farmer_name: string;
  farmer_phone: string;
  contact_consent: boolean;
  input_mode: 'voice' | 'upload' | 'text';
}
