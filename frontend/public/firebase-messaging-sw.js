/* eslint-env serviceworker */
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyDI_rj1YOmN7c-JcJUk1fXz7d4jwOnkmLE",
  authDomain: "cinereward-9f394.firebaseapp.com",
  projectId: "cinereward-9f394",
  storageBucket: "cinereward-9f394.firebasestorage.app",
  messagingSenderId: "752990863623",
  appId: "1:752990863623:web:d4f92387fb4eba98e745a2",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || payload.data?.title || "CineReward Alert";
  const body = payload.notification?.body || payload.data?.body || "You have a new update in CineReward.";
  const url = payload.data?.url || (payload.data?.ticketId ? `/review/${payload.data.ticketId}` : "/dashboard");

  self.registration.showNotification(title, {
    body,
    icon: "/vite.svg",
    badge: "/vite.svg",
    data: { url },
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
