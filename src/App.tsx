import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getSession } from './lib/api';
import { UserSession, GrievanceComplaint } from './types';

// Import Views
import LandingView from './components/LandingView';
import CitizenDashboardView from './components/CitizenDashboardView';
import OfficerDashboardView from './components/OfficerDashboardView';
import CollectorDashboardView from './components/CollectorDashboardView';
import GrievanceDetailView from './components/GrievanceDetailView';
import ComplaintMapModal from './components/ComplaintMapModal';

// Force i18n bundle registration
import './lib/i18n';

export default function App() {
  const { i18n } = useTranslation();
  const [session, setSession] = useState<UserSession | null>(null);
  const [selectedComplaintId, setSelectedComplaintId] = useState<string | null>(null);
  const [activeMapComplaint, setActiveMapComplaint] = useState<GrievanceComplaint | null>(null);

  const syncLocalSession = () => {
    const s = getSession();
    setSession(s);
    if (s?.user.preferredLanguage) {
      i18n.changeLanguage(s.user.preferredLanguage);
    }
  };

  useEffect(() => {
    syncLocalSession();
  }, []);

  const handleLogout = () => {
    setSession(null);
    setSelectedComplaintId(null);
    setActiveMapComplaint(null);
  };

  const handleLoginSuccess = () => {
    syncLocalSession();
  };

  // Helper method to let Notifications immediately focus-open deep dockets
  const handleOpenSelectedComplaintDetail = (id: string) => {
    setSelectedComplaintId(id);
  };

  // 1. Guest view: render Landing login/registration gateway
  if (!session) {
    return <LandingView onLoginSuccess={handleLoginSuccess} />;
  }

  // 2. Active Session view container
  return (
    <div id="prajavani-workspace" className="min-h-screen bg-slate-50">
      
      {/* If a deep detail view is triggered, overlay detail cockpit */}
      {selectedComplaintId ? (
        <div id="deep-detail-frame" className="max-w-7xl w-full mx-auto p-6">
          <GrievanceDetailView
            complaintId={selectedComplaintId}
            onBack={() => setSelectedComplaintId(null)}
            onViewMap={(comp) => setActiveMapComplaint(comp)}
          />
        </div>
      ) : (
        // Render dashboard based on administrative access designations
        session.user.role === 'citizen' ? (
          <CitizenDashboardView
            onLogout={handleLogout}
            onSelectComplaint={(id) => setSelectedComplaintId(id)}
          />
        ) : session.user.designation === 'Collector' ? (
          <CollectorDashboardView
            onLogout={handleLogout}
            onSelectComplaint={(id) => setSelectedComplaintId(id)}
            openSelectedComplaintDetail={handleOpenSelectedComplaintDetail}
          />
        ) : (
          <OfficerDashboardView
            onLogout={handleLogout}
            onSelectComplaint={(id) => setSelectedComplaintId(id)}
            openSelectedComplaintDetail={handleOpenSelectedComplaintDetail}
          />
        )
      )}

      {/* Satellite Survey Bounds Modal Overlay */}
      {activeMapComplaint && (
        <ComplaintMapModal
          complaint={activeMapComplaint}
          onClose={() => setActiveMapComplaint(null)}
          onSelectComplaint={(comp) => {
            setActiveMapComplaint(comp);
            setSelectedComplaintId(comp.id);
          }}
        />
      )}
    </div>
  );
}
