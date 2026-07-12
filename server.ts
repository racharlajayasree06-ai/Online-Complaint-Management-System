import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { loadDb, saveDb, Citizen, Officer, Complaint, Notification, TimelineEvent } from './src/db/db';

const app = express();
const PORT = 3000;

app.use(express.json());

// Load working dynamic DB with persistent backup
let db = loadDb();

// SSE Client Connections for real-time push events
interface SseClient {
  userId: string;
  res: express.Response;
}
let sseClients: SseClient[] = [];

function sendRealtimeNotification(userId: string, notification: Notification) {
  const clients = sseClients.filter(c => c.userId === userId);
  clients.forEach(client => {
    try {
      client.res.write(`event: notification\ndata: ${JSON.stringify(notification)}\n\n`);
    } catch (err) {
      console.error('Failed to dispatch notification to citizen/officer:', err);
    }
  });
}

function sendRealtimeComplaintUpdate(userId: string, complaint: Complaint) {
  const clients = sseClients.filter(c => c.userId === userId);
  clients.forEach(client => {
    try {
      client.res.write(`event: complaint_update\ndata: ${JSON.stringify(complaint)}\n\n`);
    } catch (err) {
      console.error('Failed to dispatch complaint change to client stream:', err);
    }
  });
}

// Zero-dependency token codec (Base64 encoding/decoding of a payload with an expiration)
function generateToken(user: { id: string; role: 'citizen' | 'officer'; designation?: string }) {
  const payload = {
    id: user.id,
    role: user.role,
    designation: user.designation,
    createdAt: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function verifyToken(token: string): { id: string; role: 'citizen' | 'officer'; designation?: string } | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const payload = JSON.parse(raw);
    // Expire token after 30 days
    if (Date.now() - payload.createdAt > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }
    return payload;
  } catch (err) {
    return null;
  }
}

// Authentication Middleware
const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization token required' });
    return;
  }
  const token = authHeader.split(' ')[1];
  const verified = verifyToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Session expired or invalid token' });
    return;
  }

  if (verified.role === 'citizen') {
    const citizen = db.citizens.find(c => c.id === verified.id);
    if (!citizen) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }
    (req as any).user = {
      id: citizen.id,
      role: 'citizen',
      fullName: citizen.fullName,
      profile: citizen
    };
  } else {
    const officer = db.officers.find(o => o.id === verified.id);
    if (!officer) {
      res.status(401).json({ error: 'Officer profile not found' });
      return;
    }
    (req as any).user = {
      id: officer.id,
      role: 'officer',
      fullName: officer.fullName,
      designation: officer.designation,
      profile: officer
    };
  }
  next();
};

/* --- API ROUTING INTERFACES --- */

// Real-time Event Stream Endpoint
app.get('/api/realtime/stream', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    res.status(400).send('userId is required');
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  res.write('\n');

  const newClient: SseClient = { userId, res };
  sseClients.push(newClient);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c.res !== res);
  });
});

// Citizen Registration
app.post('/api/auth/register/citizen', (req, res) => {
  const { fullName, email, mobile, aadhaar, address, password } = req.body;
  if (!fullName || !email || !mobile || !address || !password) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  const emailLower = email.toLowerCase();
  const exists = db.citizens.some(c => c.email.toLowerCase() === emailLower || c.mobile === mobile);
  if (exists) {
    res.status(400).json({ error: 'A citizen with this email or mobile already exists.' });
    return;
  }

  const newCitizen: Citizen = {
    id: `cit-${Math.random().toString(36).substring(2, 11)}`,
    fullName,
    email: emailLower,
    mobile,
    aadhaar,
    address,
    passwordHash: password, // local persistent check hashed representation
    preferredLanguage: 'en',
    createdAt: new Date().toISOString()
  };

  db.citizens.push(newCitizen);
  saveDb(db);

  const token = generateToken({ id: newCitizen.id, role: 'citizen' });
  res.status(201).json({
    token,
    user: {
      id: newCitizen.id,
      fullName: newCitizen.fullName,
      email: newCitizen.email,
      mobile: newCitizen.mobile,
      role: 'citizen',
      preferredLanguage: newCitizen.preferredLanguage,
      profile: newCitizen
    }
  });
});

// Officer Registration
app.post('/api/auth/register/officer', (req, res) => {
  const { fullName, officerId, designation, department, officeLocation, email, mobile, password } = req.body;
  if (!fullName || !officerId || !designation || !department || !officeLocation || !email || !mobile || !password) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  const allowedDesignations = ['VRO', 'MRO', 'RDO', 'DRO', 'Collector'];
  if (!allowedDesignations.includes(designation)) {
    res.status(400).json({ error: 'Invalid administrative designation.' });
    return;
  }

  const exists = db.officers.some(o => o.officerId === officerId || o.email.toLowerCase() === email.toLowerCase());
  if (exists) {
    res.status(400).json({ error: 'An officer with this ID or email already exists.' });
    return;
  }

  const newOfficer: Officer = {
    id: `off-${Math.random().toString(36).substring(2, 11)}`,
    fullName,
    officerId,
    designation: designation as any,
    department,
    officeLocation,
    email: email.toLowerCase(),
    mobile,
    passwordHash: password,
    createdAt: new Date().toISOString()
  };

  db.officers.push(newOfficer);
  saveDb(db);

  const token = generateToken({ id: newOfficer.id, role: 'officer', designation: newOfficer.designation });
  res.status(201).json({
    token,
    user: {
      id: newOfficer.id,
      fullName: newOfficer.fullName,
      officerId: newOfficer.officerId,
      designation: newOfficer.designation,
      role: 'officer',
      profile: newOfficer
    }
  });
});

// Citizen Login
app.post('/api/auth/login/citizen', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    res.status(400).json({ error: 'Identifier and password are required' });
    return;
  }

  const citizen = db.citizens.find(c => 
    (c.email.toLowerCase() === identifier.toLowerCase() || c.mobile === identifier) && 
    c.passwordHash === password
  );

  if (!citizen) {
    res.status(401).json({ error: 'Invalid email/mobile or password' });
    return;
  }

  const token = generateToken({ id: citizen.id, role: 'citizen' });
  res.json({
    token,
    user: {
      id: citizen.id,
      fullName: citizen.fullName,
      email: citizen.email,
      mobile: citizen.mobile,
      role: 'citizen',
      preferredLanguage: citizen.preferredLanguage,
      profile: citizen
    }
  });
});

// Officer Login
app.post('/api/auth/login/officer', (req, res) => {
  const { officerId, password } = req.body;
  if (!officerId || !password) {
    res.status(400).json({ error: 'Officer ID and password are required' });
    return;
  }

  const officer = db.officers.find(o => 
    o.officerId.toUpperCase() === officerId.toUpperCase() && 
    o.passwordHash === password
  );

  if (!officer) {
    res.status(401).json({ error: 'Invalid Government Officer ID or password' });
    return;
  }

  const token = generateToken({ id: officer.id, role: 'officer', designation: officer.designation });
  res.json({
    token,
    user: {
      id: officer.id,
      fullName: officer.fullName,
      officerId: officer.officerId,
      designation: officer.designation,
      role: 'officer',
      preferredLanguage: 'en',
      profile: officer
    }
  });
});

// Profile Lookup
app.get('/api/user/profile', authenticate, (req, res) => {
  res.json({ user: (req as any).user });
});

// Handle Language Update
app.post('/api/user/language', authenticate, (req, res) => {
  const authUser = (req as any).user;
  const { language } = req.body;
  if (!language) {
    res.status(400).json({ error: 'language parameter is required' });
    return;
  }

  if (authUser.role === 'citizen') {
    const citizen = db.citizens.find(c => c.id === authUser.id);
    if (citizen) {
      citizen.preferredLanguage = language;
      saveDb(db);
    }
  } else {
    const officer = db.officers.find(o => o.id === authUser.id);
    if (officer) {
      (officer as any).preferredLanguage = language;
      saveDb(db);
    }
  }
  res.json({ success: true, language });
});

// Search Citizens Registry
app.get('/api/citizens/search', authenticate, (req, res) => {
  const authUser = (req as any).user;
  if (authUser.role !== 'officer') {
    res.status(403).json({ error: 'Access denied: Officers only' });
    return;
  }

  const q = (req.query.q as string || '').toLowerCase();
  if (!q) {
    res.json({ citizens: [] });
    return;
  }

  const results = db.citizens
    .filter(c => 
      c.mobile.includes(q) || 
      c.email.toLowerCase().includes(q) || 
      c.fullName.toLowerCase().includes(q)
    )
    .map(c => ({
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      mobile: c.mobile,
      address: c.address
    }));

  res.json({ citizens: results });
});

// List Officers Roster
app.get('/api/officers', authenticate, (req, res) => {
  const results = db.officers.map(o => ({
    id: o.id,
    fullName: o.fullName,
    officerId: o.officerId,
    designation: o.designation,
    department: o.department,
    officeLocation: o.officeLocation
  }));
  res.json({ officers: results });
});

// File New Grievance
app.post('/api/complaints', authenticate, (req, res) => {
  const authUser = (req as any).user;
  
  if (authUser.role === 'citizen') {
    res.status(403).json({ error: 'Access denied: Citizens do not have permission to file complaints directly via this interface.' });
    return;
  }

  const { title, description, category, priority, location, targetCitizenId, district, mandal, village, surveyNumber, landIssueType, latitude, longitude, documents } = req.body;

  if (!title || !description || !category || !location) {
    res.status(400).json({ error: 'Missing required complaint parameters' });
    return;
  }

  const VILLAGE_COORDINATES: Record<string, { lat: number; lng: number }> = {
    "Venkatapuram": { lat: 16.2234, lng: 80.4721 },
    "Brodipet": { lat: 16.3125, lng: 80.4372 },
    "Jonnalagadda": { lat: 16.3394, lng: 80.3789 },
    "Pinapadu": { lat: 16.2558, lng: 80.6275 },
    "Nizampatnam": { lat: 15.9048, lng: 80.6725 },
    "Chinaravutla": { lat: 16.2482, lng: 80.6425 },
    "Ravipadu": { lat: 16.2167, lng: 80.1167 },
    "Nandur": { lat: 16.1524, lng: 80.5234 },
    "Gunadala": { lat: 16.5167, lng: 80.6500 },
    "Patamata": { lat: 16.4965, lng: 80.6698 },
    "Ajit Singh Nagar": { lat: 16.5367, lng: 80.6389 },
    "Bandar": { lat: 16.1764, lng: 81.1345 },
    "Chilakalapudi": { lat: 16.1894, lng: 81.1625 },
    "Kakaralamudi": { lat: 16.2825, lng: 80.8247 }
  };

  const selectedVillage = village || 'Venkatapuram';
  const coords = VILLAGE_COORDINATES[selectedVillage] || { lat: 16.3067, lng: 80.4365 };
  const finalLat = typeof latitude === 'number' ? latitude : coords.lat;
  const finalLng = typeof longitude === 'number' ? longitude : coords.lng;

  let citizenId = authUser.id;
  let citizenName = authUser.fullName;
  let citizenMobile = authUser.profile.mobile;
  let citizenEmail = authUser.profile.email;

  if (targetCitizenId) {
    const target = db.citizens.find(c => c.id === targetCitizenId);
    if (!target) {
      res.status(400).json({ error: 'Specified Target Citizen does not exist in the database' });
      return;
    }
    citizenId = target.id;
    citizenName = target.fullName;
    citizenMobile = target.mobile;
    citizenEmail = target.email;
  } else {
    // If no citizenId specified, link to public account kalyan (cit-1)
    const publicCit = db.citizens.find(c => c.id === 'cit-1') || db.citizens[0];
    citizenId = publicCit.id;
    citizenName = publicCit.fullName;
    citizenMobile = publicCit.mobile;
    citizenEmail = publicCit.email;
  }

  const randomNo = Math.floor(100000 + Math.random() * 900000);
  const complaintNo = `COMP-${randomNo}`;

  let assignedToId: string | undefined = undefined;
  let assignedToName: string | undefined = undefined;
  let assignedToDesignation: string | undefined = undefined;

  // Auto assign defaults to seed VRO (Srinivas Rao)
  const vro = db.officers.find(o => o.designation === 'VRO');
  if (vro) {
    assignedToId = vro.id;
    assignedToName = vro.fullName;
    assignedToDesignation = 'VRO';
  }

  const newLog: TimelineEvent = {
    id: `log-${Math.random().toString(36).substring(2, 11)}`,
    status: 'pending',
    note: 'Grievance registered in land revenue portal',
    updatedBy: authUser.fullName,
    updatedById: authUser.id,
    timestamp: new Date().toISOString()
  };

  const newComplaint: Complaint = {
    id: `comp-${Math.random().toString(36).substring(2, 11)}`,
    complaintNo,
    citizenId,
    citizenName,
    citizenMobile,
    citizenEmail,
    filedBy: authUser.id,
    filedByName: authUser.fullName,
    filedByRole: authUser.role,
    title,
    description,
    category,
    priority: priority || 'medium',
    status: assignedToId ? 'assigned' : 'pending',
    assignedToId,
    assignedToName,
    assignedToDesignation,
    location,
    history: [newLog],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    district: district || 'Guntur',
    mandal: mandal || 'Guntur East',
    village: selectedVillage,
    surveyNumber: surveyNumber || 'N/A',
    landIssueType: landIssueType || category,
    latitude: finalLat,
    longitude: finalLng,
    documents: documents || []
  };

  if (assignedToId) {
    const authLog: TimelineEvent = {
      id: `log-${Math.random().toString(36).substring(2, 11)}`,
      status: 'assigned',
      note: `Grievance assigned automatically to Village Revenue Officer (VRO) ${assignedToName} for active field inquiry.`,
      updatedBy: 'System Engine',
      updatedById: 'system',
      timestamp: new Date().toISOString()
    };
    newComplaint.history.push(authLog);
    newComplaint.status = 'assigned';
  }

  db.complaints.push(newComplaint);

  // Generate notifications
  const citNotification: Notification = {
    id: `not-${Math.random().toString(36).substring(2, 11)}`,
    userId: citizenId,
    title: 'Grievance Docket Registered successfully',
    message: `Your grievance regarding "${title}" has been filed safely under ID: ${complaintNo}.`,
    type: 'created',
    complaintId: newComplaint.id,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(citNotification);

  if (assignedToId) {
    const offNotification: Notification = {
      id: `not-${Math.random().toString(36).substring(2, 11)}`,
      userId: assignedToId,
      title: 'New Grievance Assignment Alert!',
      message: `Grievance of ID ${complaintNo} regarding "${title}" has been assigned to you.`,
      type: 'assigned',
      complaintId: newComplaint.id,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    db.notifications.push(offNotification);
    sendRealtimeNotification(assignedToId, offNotification);
  }

  saveDb(db);
  sendRealtimeNotification(citizenId, citNotification);

  res.status(201).json({ complaint: newComplaint });
});

// Fetch Complaints 목록
app.get('/api/complaints', authenticate, (req, res) => {
  const authUser = (req as any).user;
  const { status, view, search } = req.query;

  let list = db.complaints;

  // Filter based on role:
  if (authUser.role === 'citizen') {
    list = list.filter(c => c.citizenId === authUser.id);
  } else {
    // Officers:
    if (view === 'assigned') {
      list = list.filter(c => c.assignedToId === authUser.id);
    }
    // High level officers (DRO, Collector, RDO, MRO) can also search and see everything else
  }

  // Filter by status:
  if (status && status !== 'all') {
    list = list.filter(c => c.status === status);
  }

  // Filter by global search query (title, description, complaintNo, citizenId, surveyNumber, target name):
  if (search) {
    const q = (search as string).toLowerCase();
    list = list.filter(c => 
      c.complaintNo.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.citizenName.toLowerCase().includes(q) ||
      c.citizenId.toLowerCase().includes(q) ||
      (c.surveyNumber && c.surveyNumber.toLowerCase().includes(q))
    );
  }

  // Sort newest first
  list = [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ complaints: list });
});

// Fetch single complaint detail
app.get('/api/complaints/:id', authenticate, (req, res) => {
  const authUser = (req as any).user;
  const complaint = db.complaints.find(c => c.id === req.params.id);

  if (!complaint) {
    res.status(404).json({ error: 'Complaint not found' });
    return;
  }

  if (authUser.role === 'citizen' && complaint.citizenId !== authUser.id) {
    res.status(403).json({ error: 'Access denied: Private grievance docket' });
    return;
  }

  res.json({ complaint });
});

// Update Complaint Status (Officer)
app.patch('/api/complaints/:id/status', authenticate, (req, res) => {
  const authUser = (req as any).user;
  const { status, note } = req.body;

  if (authUser.role !== 'officer') {
    res.status(403).json({ error: 'Access denied: Registered revenue officials only.' });
    return;
  }

  const complaint = db.complaints.find(c => c.id === req.params.id);
  if (!complaint) {
    res.status(404).json({ error: 'Complaint record not found.' });
    return;
  }

  const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'rejected'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Invalid complaint state' });
    return;
  }

  const oldStatus = complaint.status;
  complaint.status = status as any;
  complaint.updatedAt = new Date().toISOString();

  const newLog: TimelineEvent = {
    id: `log-${Math.random().toString(36).substring(2, 11)}`,
    status: status as any,
    note: note || `Grievance status updated from ${oldStatus} to ${status}.`,
    updatedBy: `${authUser.fullName} (${authUser.designation})`,
    updatedById: authUser.id,
    timestamp: new Date().toISOString()
  };
  complaint.history.push(newLog);

  // Notify the citizen
  const notificationTypeMap: Record<string, 'resolved' | 'rejected' | 'status_updated'> = {
    resolved: 'resolved',
    rejected: 'rejected',
    pending: 'status_updated',
    assigned: 'status_updated',
    in_progress: 'status_updated'
  };

  const notification: Notification = {
    id: `not-${Math.random().toString(36).substring(2, 11)}`,
    userId: complaint.citizenId,
    title: `Grievance Status Refined: ${status.toUpperCase()}`,
    message: `Your land grievance of ID ${complaint.complaintNo} is currently updated to status: ${status}. Remarks: "${note || 'N/A'}"`,
    type: notificationTypeMap[status] || 'status_updated',
    complaintId: complaint.id,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(notification);

  saveDb(db);
  sendRealtimeNotification(complaint.citizenId, notification);
  sendRealtimeComplaintUpdate(complaint.citizenId, complaint);

  res.json({ complaint });
});

// Delegate Assignment to another administrative tier
app.patch('/api/complaints/:id/assign', authenticate, (req, res) => {
  const authUser = (req as any).user;
  const { assignedToId, note } = req.body;

  if (authUser.role !== 'officer') {
    res.status(403).json({ error: 'Access denied: Registered revenue officials only.' });
    return;
  }

  const complaint = db.complaints.find(c => c.id === req.params.id);
  if (!complaint) {
    res.status(404).json({ error: 'Complaint record not found.' });
    return;
  }

  const targetOfficer = db.officers.find(o => o.id === assignedToId);
  if (!targetOfficer) {
    res.status(404).json({ error: 'Target Revenue Officer not found in the official registry.' });
    return;
  }

  const oldOfficerName = complaint.assignedToName || 'Unassigned';
  complaint.assignedToId = targetOfficer.id;
  complaint.assignedToName = targetOfficer.fullName;
  complaint.assignedToDesignation = targetOfficer.designation;
  complaint.status = 'assigned';
  complaint.updatedAt = new Date().toISOString();

  const newLog: TimelineEvent = {
    id: `log-${Math.random().toString(36).substring(2, 11)}`,
    status: 'assigned',
    note: note || `Grievance delegated from ${oldOfficerName} to ${targetOfficer.fullName} (${targetOfficer.designation}).`,
    updatedBy: `${authUser.fullName} (${authUser.designation})`,
    updatedById: authUser.id,
    timestamp: new Date().toISOString()
  };
  complaint.history.push(newLog);

  // Notify incoming officer
  const offNotification: Notification = {
    id: `not-${Math.random().toString(36).substring(2, 11)}`,
    userId: targetOfficer.id,
    title: 'New Escapes / Assignments Routed to You',
    message: `Grievance Docket ID ${complaint.complaintNo} has been delegated to you by ${authUser.fullName}.`,
    type: 'assigned',
    complaintId: complaint.id,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(offNotification);

  // Notify original citizen
  const citNotification: Notification = {
    id: `not-${Math.random().toString(36).substring(2, 11)}`,
    userId: complaint.citizenId,
    title: 'Grievance Delegated onward',
    message: `Your grievance ID ${complaint.complaintNo} has been delegated to officer ${targetOfficer.fullName} (${targetOfficer.designation}) for detailed study.`,
    type: 'assigned',
    complaintId: complaint.id,
    isRead: false,
    createdAt: new Date().toISOString()
  };
  db.notifications.push(citNotification);

  saveDb(db);
  sendRealtimeNotification(targetOfficer.id, offNotification);
  sendRealtimeNotification(complaint.citizenId, citNotification);
  sendRealtimeComplaintUpdate(complaint.citizenId, complaint);

  res.json({ complaint });
});

// Fetch notifications
app.get('/api/notifications', authenticate, (req, res) => {
  const authUser = (req as any).user;
  const list = db.notifications
    .filter(n => n.userId === authUser.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ notifications: list });
});

// Clear Notifications as Read
app.post('/api/notifications/read', authenticate, (req, res) => {
  const authUser = (req as any).user;
  db.notifications.forEach(n => {
    if (n.userId === authUser.id) {
      n.isRead = true;
    }
  });
  saveDb(db);
  res.json({ success: true });
});


/* --- VITE MIDDLEWARE CONFIGURATION --- */

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
  });
}

startServer();
