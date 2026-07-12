import { useEffect, useState } from 'react';
import { Bell, CheckCircle2, AlertTriangle, MessageSquare, Info } from 'lucide-react';
import { getNotifications, markNotificationsAsRead, getSession } from '../lib/api';
import { SystemNotification } from '../types';

export function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playBeep = (delay: number, frequency: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.value = frequency;
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime + delay);
      gainNode.gain.linearRampToValueAtTime(0.08, audioCtx.currentTime + delay + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + delay + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(audioCtx.currentTime + delay);
      osc.stop(audioCtx.currentTime + delay + duration);
    };

    playBeep(0, 523.25, 0.15); // C5
    playBeep(0.12, 659.25, 0.2); // E5
  } catch (err) {
    console.error('Failed to play synthesized sound:', err);
  }
}

interface BellNotificationProps {
  onNotificationClick: (complaintId: string) => void;
}

export default function BellNotification({ onNotificationClick }: BellNotificationProps) {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const session = getSession();

  const fetchNotifs = async () => {
    if (!session) return;
    try {
      const list = await getNotifications();
      setNotifications(list);
    } catch (err) {
      console.error('Failed to pull system notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifs();

    if (!session) return;

    // Connect to real-time events stream
    const protocol = window.location.protocol;
    const host = window.location.host;
    const eventSource = new EventSource(`${protocol}//${host}/api/realtime/stream?userId=${session.user.id}`);

    eventSource.addEventListener('notification', (event: any) => {
      try {
        const notif = JSON.parse(event.data) as SystemNotification;
        setNotifications(prev => [notif, ...prev]);
        
        // Play subtle sound notification whenever a grievance is assigned/updated/notified
        playNotificationSound();

        // Simple client system notification dispatch
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(notif.title, { body: notif.message });
        }
      } catch (err) {
        console.error('Error parsing inbound SSE notification payload:', err);
      }
    });

    // Request permissions
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      eventSource.close();
    };
  }, []);

  const handleMarkRead = async () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      try {
        await markNotificationsAsRead();
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch (err) {
        console.error('Failed to mark notifications read:', err);
      }
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'resolved':
      case 'status_updated':
        return <CheckCircle2 id="notif-check" className="w-4 h-4 text-emerald-500" />;
      case 'rejected':
        return <AlertTriangle id="notif-rejected" className="w-4 h-4 text-red-500" />;
      case 'assigned':
        return <MessageSquare id="notif-msg" className="w-4 h-4 text-blue-500" />;
      default:
        return <Info id="notif-info" className="w-4 h-4 text-slate-500" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div id="bell-notification-container" className="relative">
      <button
        id="bell-button"
        onClick={handleMarkRead}
        className="relative p-2 text-slate-600 hover:text-slate-900 focus:outline-none hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            id="unread-badge"
            className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notifications-panel"
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-200 z-50 divide-y divide-slate-100 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div id="notifications-header" className="px-4 py-3 bg-slate-50 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">System Alerts</span>
            <span className="text-[10px] text-slate-500 font-medium">Auto-synced</span>
          </div>
          {notifications.length === 0 ? (
            <div id="no-notifications-view" className="p-8 text-center text-slate-400 text-xs font-medium">
              You are completely caught up! No alerts found.
            </div>
          ) : (
            notifications.map(notif => (
              <div
                id={`notif-card-${notif.id}`}
                key={notif.id}
                onClick={() => {
                  setIsOpen(false);
                  onNotificationClick(notif.complaintId);
                }}
                className={`p-3.5 flex items-start space-x-3 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-slate-50/50 border-l-2 border-brand-500' : ''}`}
              >
                <div className="mt-0.5 shrink-0">{getIcon(notif.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{notif.title}</p>
                  <p className="text-[11px] text-slate-600 leading-snug mt-0.5">{notif.message}</p>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">
                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
