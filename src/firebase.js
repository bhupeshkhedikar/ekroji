import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCM4hjgN-g13EqzRm-EzRzvvJyCzSsC1bc",
  authDomain: "rigvschool-c4c40.firebaseapp.com",
  projectId: "rigvschool-c4c40",
  storageBucket: "rigvschool-c4c40.firebasestorage.app",
  messagingSenderId: "154403594999",
  appId: "1:154403594999:web:18cec5eac411b69b1769f2",
  measurementId: "G-WQDQRPVM1P"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
