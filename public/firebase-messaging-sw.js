// Firebase Cloud Messaging Service Worker for web push notifications (Moving Heal +40)
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js');

// Since we serve this statically, we can initialize using a placeholder configuration or detect it.
// When deployed, the browser will receive background events here.
firebase.initializeApp({
  apiKey: "placeholder_key",
  authDomain: "moving-heal-40.firebaseapp.com",
  projectId: "moving-heal-40",
  storageBucket: "moving-heal-40.appspot.com",
  messagingSenderId: "30000000001",
  appId: "1:30000000001:web:abcdef123456"
});

const messaging = firebase.messaging();

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Recebeu mensagem em segundo plano: ', payload);
  
  const notificationTitle = payload.notification?.title || 'Lembrete de Treino - Moving Heal';
  const notificationOptions = {
    body: payload.notification?.body || 'Pronto para treinar hoje no seu horário habitual? Vamos manter a consistência!',
    icon: '/icon.png', // Fallback to icon
    badge: '/icon.png',
    data: {
      url: payload.data?.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Click action to open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
