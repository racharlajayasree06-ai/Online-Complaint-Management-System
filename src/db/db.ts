import fs from 'fs';
import path from 'path';

export interface Citizen {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  aadhaar?: string;
  address: string;
  passwordHash: string;
  preferredLanguage: string;
  createdAt: string;
}

export interface Officer {
  id: string;
  fullName: string;
  officerId: string;
  designation: 'VRO' | 'MRO' | 'RDO' | 'DRO' | 'Collector';
  department: string;
  officeLocation: string;
  email: string;
  mobile: string;
  passwordHash: string;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
  note: string;
  updatedBy: string;
  updatedById: string;
  timestamp: string;
}

export interface Complaint {
  id: string;
  complaintNo: string;
  citizenId: string;
  citizenName: string;
  citizenMobile: string;
  citizenEmail: string;
  filedBy: string;
  filedByName: string;
  filedByRole: 'citizen' | 'officer';
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
  assignedToId?: string;
  assignedToName?: string;
  assignedToDesignation?: string;
  location: string;
  history: TimelineEvent[];
  createdAt: string;
  updatedAt: string;
  district?: string;
  mandal?: string;
  village?: string;
  surveyNumber?: string;
  landIssueType?: string;
  latitude?: number;
  longitude?: number;
  documents?: { name: string; type: string; size: number; content: string }[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'created' | 'assigned' | 'status_updated' | 'resolved' | 'rejected';
  complaintId: string;
  isRead: boolean;
  createdAt: string;
}

export interface DatabaseSchema {
  citizens: Citizen[];
  officers: Officer[];
  complaints: Complaint[];
  notifications: Notification[];
}

const DB_FILE = path.join(process.cwd(), 'database.json');

export function loadDb(): DatabaseSchema {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return { citizens: [], officers: [], complaints: [], notifications: [] };
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to read database.json, returning empty structure:', err);
    return { citizens: [], officers: [], complaints: [], notifications: [] };
  }
}

export function saveDb(db: DatabaseSchema): boolean {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write database.json:', err);
    return false;
  }
}
