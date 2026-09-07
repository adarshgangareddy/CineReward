importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDFkJuXSCJvPNDxtApPj-ZjQBaIaKRkMY4",
  authDomain: "cinireward-b4588.firebaseapp.com",
  projectId: "cinireward-b4588",
  storageBucket: "cinireward-b4588.firebasestorage.app",
  messagingSenderId: "150678390792",
  appId: "1:150678390792:web:430b32b80067b1e690a9bd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/vite.svg' // Using default vite icon for now if we don't have a specific logo.png
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
