import { CaseRecord, VeterinaryServiceRecord, AnalyticsSummary, UrgencyLevel } from '../types';

const configuredApiOrigin = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '');
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
  formData.append('file', audioBlob, 'voice_report.webm');
  formData.append('language', language);

  const res = await fetch(`${API_BASE}/audio/transcribe`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    throw new Error(`Speech transcription failed with status ${res.status}`);
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
    throw new Error(`Symptom extraction failed: ${res.statusText}`);
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
