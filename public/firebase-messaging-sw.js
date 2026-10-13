// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyDt9KV7CoiuWFZ3QAtj4F6fHLBjj_KjFo4",
  authDomain: "l-school-management-system.firebaseapp.com",
  projectId: "l-school-management-system",
  storageBucket: "l-school-management-system.firebasestorage.app",
  messagingSenderId: "549201101776",
  appId: "1:549201101776:web:10042282b6d02331e9afd5",
  measurementId: "G-ZWHWTLLG0S"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Background absence notification payload:', payload);

  const title = payload.notification?.title || payload.data?.title || "Absent Alert: Ward Marked Absent";
  const body = payload.notification?.body || payload.data?.message || payload.data?.body || "Your child was marked absent today.";
  
  const notificationOptions = {
    body: body,
    icon: '/logo.png',
    badge: '/logo.png',
    data: payload.data || {},
    tag: 'absence-alert',
    renotify: true,
    requireInteraction: true,
  };

  return self.registration.showNotification(title, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const clickAction = event.notification.data?.link || '/parent';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes('/parent') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(clickAction);
      }
    })
  );
});
