import { CaseRecord, VeterinaryServiceRecord, AnalyticsSummary, UrgencyLevel } from '../types';

const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
export const API_ORIGIN = configuredApiOrigin || window.location.origin;
const API_BASE = configuredApiOrigin ? `${configuredApiOrigin}/api` : '/api';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', error: String(err) };
  }
}

export async function getIntegrationStatus() {
  try {
    const res = await fetch(`${API_BASE}/integrations/status`);
    return await res.json();
  } catch (err) {
    return { provider_mode: 'demo', error: String(err) };
  }
}

export async function uploadAndTranscribeAudio(audioBlob: Blob, language: string = 'odia') {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice_report.wav');
  formData.append('language', language);

  const res = await fetch(`${API_BASE}/audio/transcribe`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Speech transcription failed with status ${res.status}${detail ? `: ${detail}` : ''}`);
  }
  return await res.json();
}

export async function enforceLanguageAPI(transcript: string, language: string) {
  const res = await fetch(`${API_BASE}/cases/enforce-language`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript, language })
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Language check failed: ${detail}`);
  }
  return await res.json();
}

export async function translateToEnglishAPI(transcript: string, sourceLanguage: string) {
  const res = await fetch(`${API_BASE}/cases/translate-to-english`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      source_language: sourceLanguage
    })
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Translation failed: ${detail}`);
  }
  return await res.json();
}

export async function extractSymptomsFromEnglishAPI(transcript: string, animalType: string, language: string, inputMode: string) {
  const res = await fetch(`${API_BASE}/cases/extract-symptoms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      animal_type: animalType,
      language,
      input_mode: inputMode
    })
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Symptom extraction failed: ${detail}`);
  }
  return await res.json();
}

export async function confirmCaseAPI(caseId: string, confirmed: boolean) {
  const res = await fetch(`${API_BASE}/cases/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      case_id: caseId,
      confirmed
    })
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Confirmation failed: ${detail}`);
  }
  return await res.json();
}

export async function extractSymptomsAPI(transcript: string, animalType: string, language: string, inputMode: string) {
  const res = await fetch(`${API_BASE}/cases/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      animal_type: animalType,
      language,
      input_mode: inputMode
    })
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Symptom extraction failed: ${detail}`);
  }
  return await res.json();
}

export async function evaluateTriageAPI(
  transcript?: string,
  symptoms: string[] = [],
  eatingChange?: string,
  duration?: string
) {
  const res = await fetch(`${API_BASE}/cases/triage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript,
      symptoms,
      eating_change: eatingChange,
      duration
    })
  });

  if (!res.ok) {
    throw new Error(`Triage evaluation failed: ${res.statusText}`);
  }
  return await res.json();
}

export async function appendRecordingAPI(
  audioBlob: Blob,
  caseId: string,
  animalType: string,
  language: string,
  inputMode: string
) {
  const formData = new FormData();
  formData.append('file', audioBlob, 'voice_report.wav');
  formData.append('case_id', caseId);
  formData.append('animal_type', animalType);
  formData.append('language', language);
  formData.append('input_mode', inputMode);

  const res = await fetch(`${API_BASE}/cases/append-recording`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Append recording failed: ${detail}`);
  }
  return await res.json();
}

export async function generateLocalizedContentAPI(
  englishReport: any,
  triageResult: any,
  targetLanguage: string
) {
  const res = await fetch(`${API_BASE}/cases/generate-localized-content`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      english_report: englishReport,
      triage_result: triageResult,
      target_language: targetLanguage
    })
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string' && body.detail) detail = body.detail;
    } catch {
      // keep statusText
    }
    throw new Error(`Localized content generation failed: ${detail}`);
  }
  return await res.json();
}

export async function createCaseAPI(caseData: any): Promise<CaseRecord> {
  const res = await fetch(`${API_BASE}/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(caseData)
  });

  if (!res.ok) {
    throw new Error(`Failed to submit case: ${res.statusText}`);
  }
  return await res.json();
}

export async function getCasesAPI(params: {
  status?: string;
  urgency?: string;
  animal_type?: string;
  district?: string;
  search?: string;
  limit?: number;
} = {}): Promise<CaseRecord[]> {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.urgency) query.append('urgency', params.urgency);
  if (params.animal_type) query.append('animal_type', params.animal_type);
  if (params.district) query.append('district', params.district);
  if (params.search) query.append('search', params.search);
  if (params.limit) query.append('limit', String(params.limit));

  const res = await fetch(`${API_BASE}/cases?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch cases: ${res.statusText}`);
  }
  return await res.json();
}

export async function getCaseDetailAPI(id: string): Promise<CaseRecord> {
  const res = await fetch(`${API_BASE}/cases/${id}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch case detail: ${res.statusText}`);
  }
  return await res.json();
}

export async function updateCaseStatusAPI(id: string, status: string, reason?: string, changedBy: string = 'Operator'): Promise<CaseRecord> {
  const res = await fetch(`${API_BASE}/cases/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status, reason, changed_by: changedBy })
  });
  if (!res.ok) {
    throw new Error(`Failed to update status: ${res.statusText}`);
  }
  return await res.json();
}

export async function assignCaseAPI(caseId: string, vetServiceId: string, operator: string = 'Operator') {
  const res = await fetch(`${API_BASE}/cases/${caseId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ veterinary_service_id: vetServiceId, assigned_operator: operator })
  });
  if (!res.ok) {
    throw new Error(`Failed to assign case: ${res.statusText}`);
  }
  return await res.json();
}

export async function getVeterinaryServicesAPI(district?: string): Promise<VeterinaryServiceRecord[]> {
  const query = new URLSearchParams();
  if (district && district !== 'all') query.append('district', district);

  const res = await fetch(`${API_BASE}/veterinary-services?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch veterinary services: ${res.statusText}`);
  }
  return await res.json();
}

export async function getAnalyticsSummaryAPI(): Promise<AnalyticsSummary> {
  const res = await fetch(`${API_BASE}/analytics/summary`);
  if (!res.ok) {
    throw new Error(`Failed to fetch analytics summary: ${res.statusText}`);
  }
  return await res.json();
}
