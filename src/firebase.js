import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, where, doc, updateDoc, addDoc } from "firebase/firestore";
//import { hashCode } from "./utils/hash";

// Configuration Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC0cXK_GoSYzfXHvqCOBuCrQfbfWd-u1ig",
  authDomain: "souche-ensea.firebaseapp.com",
  projectId: "souche-ensea",
  storageBucket: "souche-ensea.firebasestorage.app",
  messagingSenderId: "341685742788",
  appId: "1:341685742788:web:93d5fc6d0a3cbe8e8dc99f"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ============================================================
// FONCTIONS CONFIGURATION
// ============================================================

export async function getConfig() {
  try {
    const configDoc = await getDocs(collection(db, "config"));
    if (!configDoc.empty) {
      return configDoc.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error("Erreur getConfig:", error);
    return null;
  }
}

// ============================================================
// FONCTIONS AUTHENTIFICATION
// ============================================================

export async function verifyAdmin(codeHash) {
  try {
    const snapshot = await getDocs(collection(db, "admins"));
    const admin = snapshot.docs.find(doc => doc.data().codeHash === codeHash);
    if (admin) {
      return { id: admin.id, ...admin.data() };
    }
    return null;
  } catch (error) {
    console.error("Erreur verifyAdmin:", error);
    return null;
  }
}

export async function verifyDelegue(codeHash) {
  try {
    const snapshot = await getDocs(collection(db, "delegues"));
    const delegue = snapshot.docs.find(doc => doc.data().codeHash === codeHash);
    if (delegue) {
      return { id: delegue.id, ...delegue.data() };
    }
    return null;
  } catch (error) {
    console.error("Erreur verifyDelegue:", error);
    return null;
  }
}

// ============================================================
// FONCTIONS ÉTUDIANTS
// ============================================================

export async function getEtudiantsByClasse(classe) {
  try {
    const q = query(collection(db, "etudiants"), where("classe", "==", classe));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getEtudiantsByClasse:", error);
    return [];
  }
}

export async function getAllEtudiants() {
  try {
    const snapshot = await getDocs(collection(db, "etudiants"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getAllEtudiants:", error);
    return [];
  }
}

// ============================================================
// FONCTIONS DÉLÉGUÉS
// ============================================================

export async function getAllDelegues() {
  try {
    const snapshot = await getDocs(collection(db, "delegues"));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erreur getAllDelegues:", error);
    return [];
  }
}

// ============================================================
// FONCTIONS RESET PASSWORD
// ============================================================

export async function findUserByEmail(email) {
  const emailLower = email.toLowerCase();
  
  // Cherche dans étudiants
  const etudiantsSnap = await getDocs(query(collection(db, "etudiants"), where("email", "==", emailLower)));
  if (!etudiantsSnap.empty) {
    const userData = etudiantsSnap.docs[0];
    return { type: "etudiant", user: { id: userData.id, ...userData.data() } };
  }

  // Cherche dans délégués
  const deleguesSnap = await getDocs(query(collection(db, "delegues"), where("email", "==", emailLower)));
  if (!deleguesSnap.empty) {
    const userData = deleguesSnap.docs[0];
    return { type: "delegue", user: { id: userData.id, ...userData.data() } };
  }

  // Cherche dans admins
  const adminsSnap = await getDocs(query(collection(db, "admins"), where("email", "==", emailLower)));
  if (!adminsSnap.empty) {
    const userData = adminsSnap.docs[0];
    return { type: "admin", user: { id: userData.id, ...userData.data() } };
  }

  return null;
}

export async function createResetCode(email, code, userType, userId) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 15);

  await addDoc(collection(db, "reset_codes"), {
    email: email.toLowerCase(),
    code,
    userType,
    userId,
    expiresAt: expiresAt.toISOString(),
    used: false,
    createdAt: new Date().toISOString()
  });
}

export async function verifyResetCode(email, code) {
  const snap = await getDocs(
    query(
      collection(db, "reset_codes"),
      where("email", "==", email.toLowerCase()),
      where("code", "==", code),
      where("used", "==", false)
    )
  );

  if (snap.empty) return null;

  const resetDoc = snap.docs[0];
  const data = resetDoc.data();

  // Vérifie expiration
  if (new Date(data.expiresAt) < new Date()) {
    return null;
  }

  return { id: resetDoc.id, ...data };
}

export async function markResetCodeUsed(resetCodeId) {
  await updateDoc(doc(db, "reset_codes", resetCodeId), { 
    used: true,
    usedAt: new Date().toISOString()
  });
}