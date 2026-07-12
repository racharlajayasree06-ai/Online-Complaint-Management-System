export interface ProfileDetails {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  aadhaar?: string;
  address: string;
  officerId?: string;
  designation?: 'VRO' | 'MRO' | 'RDO' | 'DRO' | 'Collector';
  department?: string;
  officeLocation?: string;
}

export interface UserSession {
  token: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    mobile: string;
    role: 'citizen' | 'officer';
    officerId?: string;
    designation?: 'VRO' | 'MRO' | 'RDO' | 'DRO' | 'Collector';
    preferredLanguage?: string;
    profile: ProfileDetails;
  };
}

export interface TimelineLog {
  id: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'rejected';
  note: string;
  updatedBy: string;
  updatedById: string;
  timestamp: string;
}

export interface GrievanceComplaint {
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
  history: TimelineLog[];
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

export interface SystemNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  complaintId: string;
  isRead: boolean;
  createdAt: string;
}
