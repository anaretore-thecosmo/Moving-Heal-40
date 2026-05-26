import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { Session, UserProfile } from '../types';

export interface ConsistencyStats {
  totalSessions: number;
  habitualDays: string[];
  habitualTime: string;
  consistencyScore: number; // 0 to 100
  streakCount: number;
  lastWorkoutDate: string | null;
  statusText: string;
}

// Map weekdays from Date.getDay()
const WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado'
];

/**
 * Calculates user's custom consistency metrics based on historic completed sessions
 */
export function calculateFCMConsistency(history: Session[], targetFrequency: number = 3): ConsistencyStats {
  if (!history || history.length === 0) {
    return {
      totalSessions: 0,
      habitualDays: ['Não mapeado'],
      habitualTime: '--:--',
      consistencyScore: 0,
      streakCount: 0,
      lastWorkoutDate: null,
      statusText: 'Construindo consistência'
    };
  }

  const completed = history.filter(s => s.completedAt);
  const total = completed.length;

  if (total === 0) {
    return {
      totalSessions: 0,
      habitualDays: ['Não mapeado'],
      habitualTime: '--:--',
      consistencyScore: 0,
      streakCount: 0,
      lastWorkoutDate: null,
      statusText: 'Aguardando primeiro treino'
    };
  }

  // Count weekdays occurrences
  const weekdayCounts: Record<string, number> = {};
  const hourSum: number[] = [];
  const minuteSum: number[] = [];

  completed.forEach(s => {
    try {
      const d = new Date(s.completedAt || s.startedAt);
      if (!isNaN(d.getTime())) {
        const dayName = WEEKDAYS[d.getDay()];
        weekdayCounts[dayName] = (weekdayCounts[dayName] || 0) + 1;
        hourSum.push(d.getHours());
        minuteSum.push(d.getMinutes());
      }
    } catch (e) {
      console.warn('Erro ao processar data da sessão:', e);
    }
  });

  // Sort weekdays by frequency
  const sortedDays = Object.entries(weekdayCounts)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  // Calculate average habitual hour and minute representation
  let habitualTime = '18:00'; // Default
  if (hourSum.length > 0) {
    const avgHour = Math.round(hourSum.reduce((a, b) => a + b, 0) / hourSum.length);
    const avgMin = Math.round(minuteSum.reduce((a, b) => a + b, 0) / minuteSum.length);
    habitualTime = `${avgHour.toString().padStart(2, '0')}:${avgMin.toString().padStart(2, '0')}`;
  }

  // Calculate consistency score
  // Based on sessions registered in the last 30 days compared with weekly target
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentSessions = completed.filter(s => {
    const d = new Date(s.completedAt || s.startedAt);
    return d >= thirtyDaysAgo;
  }).length;

  // Expected sessions in 4 weeks
  const expectedSessions = targetFrequency * 4;
  const scoreRaw = expectedSessions > 0 ? (recentSessions / expectedSessions) * 100 : 100;
  const consistencyScore = Math.min(100, Math.round(scoreRaw));

  // Determine user's current streak
  let streakCount = 0;
  let hasTrainedThisWeek = false;
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  completed.forEach(s => {
    const d = new Date(s.completedAt || s.startedAt);
    if (d >= oneWeekAgo) {
      hasTrainedThisWeek = true;
    }
  });

  if (hasTrainedThisWeek) {
    streakCount = Math.floor(total / targetFrequency) || 1;
  }

  // Status Badge Label
  let statusText = 'Em Calibração';
  if (consistencyScore > 80) statusText = 'Alta Consistência 🔥';
  else if (consistencyScore > 50) statusText = 'Consistência Moderada ⚡';
  else if (total > 0) statusText = 'Retomando Ritmo 🌱';

  const lastDate = completed[0]?.completedAt ? new Date(completed[0].completedAt).toLocaleDateString('pt-BR') : null;

  return {
    totalSessions: total,
    habitualDays: sortedDays.slice(0, 3),
    habitualTime,
    consistencyScore,
    streakCount,
    lastWorkoutDate: lastDate,
    statusText
  };
}

/**
 * Requests web push Notification permission and returns permission status
 */
export async function requestPushNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Este browser não suporta o recurso de Notification.');
    return 'denied';
  }
  
  // Guard for iframe permission restrictions
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Incapaz de solicitar permissão (bloqueado por iframe de preview):', err);
    return 'default';
  }
}

/**
 * Initializes and retrieves the FCM Web Push Token securely
 */
export async function getFCMToken(vapidKey?: string): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const messaging = getMessaging();
    // Default VAPID key used for Firebase public messaging
    const token = await getToken(messaging, { 
      vapidKey: vapidKey || 'BPEV-gH0sK0_z9mDk_K8z7Vw99m6x_J6FhE7Ff_z9J0K6x_0J' 
    });
    return token;
  } catch (err) {
    console.warn('FCM token initialization failed. Standard fallback applied: ', err);
    return null;
  }
}

/**
 * Saves notification configs & fcmToken in the Firestore UserProfile document
 */
export async function updateNotificationPreferences(
  userId: string,
  fcmEnabled: boolean,
  fcmToken: string | null,
  reminderMins: number,
  habitualTime: string
): Promise<void> {
  const profileRef = doc(db, 'users', userId);
  try {
    const updates: Partial<UserProfile> = {
      fcmEnabled,
      reminderMinutesBefore: reminderMins,
      habitualWorkoutTime: habitualTime,
      updatedAt: new Date().toISOString()
    };
    if (fcmToken) {
      updates.fcmToken = fcmToken;
    }
    
    await updateDoc(profileRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
  }
}

/**
 * In-App Local Notification Spawner
 */
export function triggerInAppNotification(title: string, body: string) {
  if (typeof window === 'undefined') return;

  // 1. Play beautiful success sound if supported
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, audioContext.currentTime); // D5
    osc.frequency.setValueAtTime(880, audioContext.currentTime + 0.12); // A5
    
    gain.gain.setValueAtTime(0.08, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.45);
  } catch (e) {
    console.log('Audio feedback not supported:', e);
  }

  // 2. Spawn Web Browser Notification if permission granted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'moving-heal-workout'
      });
    } catch (e) {
      console.warn('Incapaz de despachar notificação física devido à sandbox:', e);
    }
  }
}
