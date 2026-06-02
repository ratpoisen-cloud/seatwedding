import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

export const subscribeToWedding = (weddingId: string, callback: (data: any) => void) => {
  let initialSnapshot = true;

  return onSnapshot(doc(db, "weddings", weddingId), (snapshot) => {
    if (snapshot.metadata.hasPendingWrites && !initialSnapshot) return;

    if (snapshot.exists()) {
      callback(snapshot.data());
    } else {
      callback(null);
    }

    initialSnapshot = false;
  }, (error) => {
    console.error("Firebase sync error:", error);
  });
};

export const saveWeddingData = async (weddingId: string, data: any) => {
  try {
    await setDoc(doc(db, "weddings", weddingId), data, { merge: true });
  } catch (error) {
    console.error("Firebase save error:", error);
    throw error;
  }
};
