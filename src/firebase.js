import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

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

// ============================================================
// HELPERS POUR LIRE LES DONNÉES
// ============================================================

// Récupérer la configuration
export const getConfig = async () => {
  const docRef = doc(db, "config", "settings");
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};

// Vérifier un admin
export const verifyAdmin = async (codeHash) => {
  const adminsRef = collection(db, "admins");
  const snapshot = await getDocs(adminsRef);
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.codeHash === codeHash) {
      return { id: docSnap.id, ...data };
    }
  }
  
  return null;
};

// Vérifier un délégué
export const verifyDelegue = async (codeHash) => {
  const deleguesRef = collection(db, "delegues");
  const snapshot = await getDocs(deleguesRef);
  
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (data.codeHash === codeHash) {
      return { id: docSnap.id, ...data };
    }
  }
  
  return null;
};

// Récupérer les étudiants d'une classe
export const getEtudiantsByClasse = async (classe) => {
  const etudiantsRef = collection(db, "etudiants");
  const q = query(etudiantsRef, where("classe", "==", classe), where("actif", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.nomComplet.localeCompare(b.nomComplet));
};

// Récupérer tous les étudiants
export const getAllEtudiants = async () => {
  const etudiantsRef = collection(db, "etudiants");
  const q = query(etudiantsRef, where("actif", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.nomComplet.localeCompare(b.nomComplet));
};

// Récupérer tous les délégués
export const getAllDelegues = async () => {
  const deleguesRef = collection(db, "delegues");
  const snapshot = await getDocs(deleguesRef);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.classe.localeCompare(b.classe));
};

