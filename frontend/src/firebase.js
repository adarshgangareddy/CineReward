import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Object.values(firebaseConfig).every(Boolean);

// Firebase is optional during local development; the app still works without push notifications.
export const app = hasFirebaseConfig ? initializeApp(firebaseConfig) : null;
export const messaging =
  app && typeof window !== "undefined" ? getMessaging(app) : null;
export const auth = app ? getAuth(app) : null;

export const requestForToken = async () => {
  if (!messaging) return null;
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
    console.error("[FCM] VITE_FIREBASE_VAPID_KEY is not configured");
    return null;
  }

  try {
    const currentToken = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY, // We need to generate this in Firebase Console later
    });
    if (currentToken) {
      console.log("Valid token received: ", currentToken);
      return currentToken;
    } else {
      console.log(
        "No registration token available. Request permission to generate one.",
      );
      return null;
    }
  } catch (err) {
    console.log("An error occurred while retrieving token. ", err);
    return null;
  }
};

export const onMessageListener = (callback) => {
  if (!messaging) return () => {};
  return onMessage(messaging, callback);
};
