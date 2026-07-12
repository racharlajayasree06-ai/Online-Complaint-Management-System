import { UserSession, GrievanceComplaint, SystemNotification } from '../types';

const API_BASE = '/api';

export function getSession(): UserSession | null {
  try {
    const raw = localStorage.getItem('prajavani_session');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

export function setSession(session: UserSession): void {
  localStorage.setItem('prajavani_session', JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem('prajavani_session');
}

export function getAuthHeaders(): Record<string, string> {
  const session = getSession();
  return {
    'Content-Type': 'application/json',
    ...(session ? { 'Authorization': `Bearer ${session.token}` } : {})
  };
}

export async function loginCitizen(identifier: string, password: string): Promise<UserSession> {
  const res = await fetch(`${API_BASE}/auth/login/citizen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  setSession(data);
  return data;
}

export async function loginOfficer(officerId: string, password: string): Promise<UserSession> {
  const res = await fetch(`${API_BASE}/auth/login/officer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ officerId, password })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Login failed');
  }
  const data = await res.json();
  setSession(data);
  return data;
}

export async function registerCitizen(payload: any): Promise<UserSession> {
  const res = await fetch(`${API_BASE}/auth/register/citizen`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }
  const data = await res.json();
  setSession(data);
  return data;
}

export async function registerOfficer(payload: any): Promise<UserSession> {
  const res = await fetch(`${API_BASE}/auth/register/officer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Registration failed');
  }
  const data = await res.json();
  setSession(data);
  return data;
}

export async function getComplaints(status = 'all', view = 'all', search = ''): Promise<GrievanceComplaint[]> {
  const params = new URLSearchParams({ status, view, search });
  const res = await fetch(`${API_BASE}/complaints?${params.toString()}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch complaints');
  const data = await res.json();
  return data.complaints;
}

export async function getComplaintDetail(id: string): Promise<GrievanceComplaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch grievance details');
  const data = await res.json();
  return data.complaint;
}

export async function createComplaint(payload: any): Promise<GrievanceComplaint> {
  const res = await fetch(`${API_BASE}/complaints`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to file grievance');
  }
  const data = await res.json();
  return data.complaint;
}

export async function updateComplaintStatus(id: string, status: string, note: string): Promise<GrievanceComplaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status, note })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to update grievance status');
  }
  const data = await res.json();
  return data.complaint;
}

export async function assignComplaint(id: string, assignedToId: string, note: string): Promise<GrievanceComplaint> {
  const res = await fetch(`${API_BASE}/complaints/${id}/assign`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ assignedToId, note })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to assign grievance');
  }
  const data = await res.json();
  return data.complaint;
}

export async function searchCitizens(q: string): Promise<any[]> {
  const res = await fetch(`${API_BASE}/citizens/search?q=${encodeURIComponent(q)}`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Citizen search failed');
  const data = await res.json();
  return data.citizens;
}

export async function getOfficersList(): Promise<any[]> {
  const res = await fetch(`${API_BASE}/officers`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch officers roster');
  const data = await res.json();
  return data.officers;
}

export async function getNotifications(): Promise<SystemNotification[]> {
  const res = await fetch(`${API_BASE}/notifications`, {
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  const data = await res.json();
  return data.notifications;
}

export async function markNotificationsAsRead(): Promise<void> {
  const res = await fetch(`${API_BASE}/notifications/read`, {
    method: 'POST',
    headers: getAuthHeaders()
  });
  if (!res.ok) throw new Error('Failed to clear notifications');
}

export async function updatePreferredLang(language: string): Promise<void> {
  await fetch(`${API_BASE}/user/language`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ language })
  });
}
