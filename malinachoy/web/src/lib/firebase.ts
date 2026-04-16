import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAKtDAe0TmZ9ouhDth_hnC7FKAriaPQT9g",
  authDomain: "malinatest-77703.firebaseapp.com",
  projectId: "malinatest-77703",
  storageBucket: "malinatest-77703.firebasestorage.app",
  messagingSenderId: "942266038145",
  appId: "1:942266038145:web:ce264bec8e5b7c5161da80",
  measurementId: "G-1GKFK2FENP"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
