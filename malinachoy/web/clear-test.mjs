import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKtDAe0TmZ9ouhDth_hnC7FKAriaPQT9g",
  authDomain: "malinatest-77703.firebaseapp.com",
  projectId: "malinatest-77703",
  storageBucket: "malinatest-77703.firebasestorage.app",
  messagingSenderId: "942266038145",
  appId: "1:942266038145:web:ce264bec8e5b7c5161da80"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function clearDB() {
  try {
    const collections = ["orders", "categories", "menu_items"];
    for (const c of collections) {
      const snap = await getDocs(collection(db, c));
      let count = 0;
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
        count++;
      }
      console.log(`${c} bazasidan ${count} ta test ma'lumot o'chirildi!`);
    }
    console.log("Hamma test ma'lumotlar tozalandi!");
    process.exit(0);
  } catch (error) {
    console.error("Xatolik:", error);
    process.exit(1);
  }
}

clearDB();
