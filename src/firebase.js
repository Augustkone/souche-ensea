import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfkkIX_oUfpju3gaecsBPcPC6Aur0ROTE",
  authDomain: "souche-ensea.firebaseapp.com",
  projectId: "souche-ensea",
  storageBucket: "souche-ensea.firebasestorage.app",
  messagingSenderId: "786897721908",
  appId: "1:786897721908:web:1eb074a27243c83b2ac861"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);