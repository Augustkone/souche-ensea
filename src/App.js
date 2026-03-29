import { useState, useEffect } from "react";
import { db, getConfig, verifyAdmin, verifyDelegue, getEtudiantsByClasse, getAllEtudiants, getAllDelegues, findUserByEmail, createResetCode, verifyResetCode, markResetCodeUsed } from "./firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, writeBatch, getDocs, query, where } from "firebase/firestore";
import { hashCode } from "./utils/hash";
import { sendResetCode, generateResetCode } from "./emailService";
import * as XLSX from 'xlsx';
import StatistiquesEtudiant from './components/StatistiquesEtudiant';
import StatistiquesDelegue from './components/StatistiquesDelegue';
import GestionHistorique from './components/GestionHistorique';
const PRIX_SOUCHE = 2000;
const MAX_SOUCHES_PAR_MOIS = 3;

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 55, height: 55, borderRadius: 14,
        background: "linear-gradient(135deg, #0047AB, #0066CC)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, fontWeight: 900, color: "#fff", letterSpacing: -1,
        boxShadow: "0 6px 20px rgba(0, 71, 171, 0.35)"
      }}>E</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#002D6F", letterSpacing: -0.5 }}>SoucheApp</div>
        <div style={{ fontSize: 9, color: "#0066CC", letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 1.3, fontWeight: 600 }}>
          École Nationale Supérieure<br/>de la Statistique et de l'Économie Appliquée
        </div>
      </div>
    </div>
  );
}

function Badge({ children, color = "#0047AB" }) {
  return (
    <span style={{
      background: color + "15", color, border: `2px solid ${color}`,
      borderRadius: 25, padding: "6px 16px", fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5, textTransform: "uppercase"
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 18, padding: 28,
      boxShadow: "0 4px 24px rgba(0, 71, 171, 0.08)", border: "1px solid #E8F4FF",
      ...style
    }}>{children}</div>
  );
}

function Button({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const base = {
    border: "none", borderRadius: 14, padding: "14px 28px", fontSize: 14,
    fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all 0.3s", opacity: disabled ? 0.5 : 1,
    boxShadow: variant === "primary" ? "0 4px 16px rgba(0, 71, 171, 0.25)" : "none",
    ...style
  };
  const variants = {
    primary: { background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff" },
    secondary: { background: "#F5F8FA", color: "#002D6F", border: "2px solid #E8F4FF" },
    danger: { background: "#FFF0F0", color: "#DC2626", border: "2px solid #FEE" },
    success: { background: "#F0FDF4", color: "#16A34A", border: "2px solid #DCFCE7" },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

function Select({ value, onChange, options, label }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        border: "2px solid #E8F4FF", borderRadius: 12, padding: "12px 16px",
        fontSize: 14, color: "#002D6F", background: "#fff", fontFamily: "inherit",
        outline: "none", cursor: "pointer"
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, label }) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <div>
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>{label}</label>}
      <div style={{ position: "relative" }}>
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: "100%", border: "2px solid #E8F4FF", borderRadius: 12,
            padding: "12px 50px 12px 16px", fontSize: 14, fontFamily: "inherit",
            outline: "none", boxSizing: "border-box"
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", fontSize: 20,
            color: "#0066CC", padding: "5px"
          }}
        >
          {showPassword ? "👁️" : "👁️‍🗨️"}
        </button>
      </div>
    </div>
  );
}

function ForgotPasswordModal({ onClose }) {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetData, setResetData] = useState(null);

  const handleSendCode = async () => {
    setError("");
    if (!email || !email.includes('@')) { setError("Email valide requis"); return; }
    setLoading(true);
    try {
      const userResult = await findUserByEmail(email.toLowerCase());
      if (!userResult) {
        setError("Aucun compte avec cet email");
        setLoading(false);
        return;
      }
      const resetCode = generateResetCode();
      await createResetCode(email.toLowerCase(), resetCode, userResult.type, userResult.user.id);
      const emailResult = await sendResetCode(email, resetCode, userResult.user.nomComplet || userResult.user.nom);
      if (!emailResult.success) {
        setError("Erreur lors de l'envoi de l'email");
        setLoading(false);
        return;
      }
      setResetData(userResult);
      setStep(2);
    } catch (err) {
      setError("Erreur : " + err.message);
    }
    setLoading(false);
  };

  const handleVerifyCode = async () => {
    setError("");
    if (!code || code.length !== 6) { setError("Code à 6 chiffres requis"); return; }
    setLoading(true);
    try {
      const resetCodeData = await verifyResetCode(email.toLowerCase(), code);
      if (!resetCodeData) {
        setError("Code invalide ou expiré");
        setLoading(false);
        return;
      }
      setStep(3);
    } catch (err) {
      setError("Erreur : " + err.message);
    }
    setLoading(false);
  };

  const handleResetPassword = async () => {
    setError("");
    if (!newPassword || !confirmPassword) { setError("Tous les champs requis"); return; }
    if (newPassword !== confirmPassword) { setError("Mots de passe différents"); return; }
    if (newPassword.length < 6) { setError("Minimum 6 caractères"); return; }
    setLoading(true);
    try {
      const hash = await hashCode(newPassword);
      const collectionName = resetData.type === "etudiant" ? "etudiants" : resetData.type === "delegue" ? "delegues" : "admins";
      await updateDoc(doc(db, collectionName, resetData.user.id), { codeHash: hash, dateModification: new Date().toISOString() });
      const resetCodeData = await verifyResetCode(email.toLowerCase(), code);
      await markResetCodeUsed(resetCodeData.id);
      alert(" Mot de passe réinitialisé avec succès !");
      onClose();
      window.location.reload();
    } catch (err) {
      setError("Erreur : " + err.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 45, 111, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20, backdropFilter: "blur(6px)" }}>
      <Card style={{ maxWidth: 480, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#002D6F" }}>🔐 Mot de passe oublié</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 32, cursor: "pointer", color: "#0066CC" }}>×</button>
        </div>

        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#E8F4FF", padding: 16, borderRadius: 12, border: "2px solid #0066CC" }}>
              <p style={{ fontSize: 14, color: "#002D6F", margin: 0, lineHeight: 1.6 }}>📧 Entrez votre email ENSEA</p>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 8 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="votre.email@ensea.edu.ci" style={{ width: "100%", border: "2px solid #E8F4FF", borderRadius: 12, padding: "14px 18px", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
            </div>
            {error && <div style={{ background: "#FFF0F0", padding: 12, borderRadius: 10, border: "2px solid #FEE" }}><p style={{ color: "#DC2626", fontSize: 13, margin: 0, fontWeight: 600 }}>⚠️ {error}</p></div>}
            <Button onClick={handleSendCode} disabled={loading} style={{ width: "100%", marginTop: 10 }}>{loading ? "⏳ Envoi..." : "📧 Envoyer le code"}</Button>
          </div>
        )}

        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#F0FDF4", padding: 16, borderRadius: 12, border: "2px solid #DCFCE7" }}>
              <p style={{ fontSize: 14, color: "#16A34A", margin: 0 }}>✅ Code envoyé à <strong>{email}</strong></p>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 8 }}>Code (6 chiffres)</label>
              <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" maxLength={6} style={{ width: "100%", border: "2px solid #0047AB", borderRadius: 12, padding: "16px", fontSize: 28, fontWeight: 900, textAlign: "center", outline: "none", boxSizing: "border-box", letterSpacing: "8px", color: "#0047AB" }} />
            </div>
            {error && <div style={{ background: "#FFF0F0", padding: 12, borderRadius: 10, border: "2px solid #FEE" }}><p style={{ color: "#DC2626", fontSize: 13, margin: 0, fontWeight: 600 }}>⚠️ {error}</p></div>}
            <Button onClick={handleVerifyCode} disabled={loading || code.length !== 6} style={{ width: "100%", marginTop: 10 }}>{loading ? "⏳ Vérification..." : "✅ Vérifier"}</Button>
            <Button onClick={() => setStep(1)} variant="secondary" style={{ width: "100%" }}>← Renvoyer</Button>
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ background: "#F0FDF4", padding: 16, borderRadius: 12, border: "2px solid #DCFCE7" }}>
              <p style={{ fontSize: 14, color: "#16A34A", margin: 0, fontWeight: 600 }}>✅ Code vérifié !</p>
            </div>
            <PasswordInput label="Nouveau mot de passe" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 caractères" />
            <PasswordInput label="Confirmer" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Retapez" />
            {error && <div style={{ background: "#FFF0F0", padding: 12, borderRadius: 10, border: "2px solid #FEE" }}><p style={{ color: "#DC2626", fontSize: 13, margin: 0, fontWeight: 600 }}>⚠️ {error}</p></div>}
            <Button onClick={handleResetPassword} disabled={loading} style={{ width: "100%", marginTop: 10 }}>{loading ? "⏳ Réinitialisation..." : "🔑 Réinitialiser"}</Button>
          </div>
        )}
      </Card>
    </div>
  );
}

function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("etudiant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);
  const [classe, setClasse] = useState("");
  const [etudiants, setEtudiants] = useState([]);
  const [selectedEtudiant, setSelectedEtudiant] = useState("");
  const [passwordEtudiant, setPasswordEtudiant] = useState("");
  const [code, setCode] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (classe && mode === "etudiant") {
      loadEtudiants();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classe, mode]);

  const loadConfig = async () => {
    const cfg = await getConfig();
    setConfig(cfg);
    if (cfg && cfg.classes && cfg.classes.length > 0) {
      setClasse(cfg.classes[0]);
    }
  };

  const loadEtudiants = async () => {
    const etds = await getEtudiantsByClasse(classe);
    setEtudiants(etds);
    if (etds.length > 0) {
      setSelectedEtudiant(etds[0].id);
    }
  };

  const handleLoginEtudiant = async () => {
    if (!selectedEtudiant) { setError("Veuillez sélectionner votre nom"); return; }
    if (!passwordEtudiant) { setError("Veuillez entrer votre mot de passe"); return; }
    setLoading(true);
    setError("");
    try {
      const etudiant = etudiants.find(e => e.id === selectedEtudiant);
      const hash = await hashCode(passwordEtudiant);
      if (etudiant.codeHash !== hash) {
        setError("Mot de passe incorrect");
        setLoading(false);
        return;
      }
      onLogin({ role: "etudiant", nom: etudiant.nomComplet, classe: etudiant.classe, etudiantId: etudiant.id });
    } catch (err) {
      setError("Erreur de connexion");
      console.error(err);
    }
    setLoading(false);
  };

  const handleLoginDelegue = async () => {
    setLoading(true);
    setError("");
    try {
      const hash = await hashCode(code);
      const delegue = await verifyDelegue(hash);
      if (delegue) {
        onLogin({ role: "delegue", nom: delegue.nom, classe: delegue.classe, delegueId: delegue.id });
      } else {
        setError("Code délégué incorrect");
      }
    } catch (err) {
      setError("Erreur de connexion");
      console.error(err);
    }
    setLoading(false);
  };

  const handleLoginAdmin = async () => {
    setLoading(true);
    setError("");
    try {
      const hash = await hashCode(code);
      const admin = await verifyAdmin(hash);
      if (admin) {
        onLogin({ role: "admin", nom: admin.nom, adminId: admin.id });
      } else {
        setError("Code administrateur incorrect");
      }
    } catch (err) {
      setError("Erreur de connexion");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #E8F4FF 0%, #ffffff 60%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Syne', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 460 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Logo />
          <p style={{ color: "#0066CC", marginTop: 20, fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>Système de réservation de souches<br/>de tickets de cantine</p>
        </div>

        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <Button variant={mode === "etudiant" ? "primary" : "secondary"} onClick={() => setMode("etudiant")} style={{ flex: 1, padding: "12px 16px" }}>👨‍🎓 Étudiant</Button>
            <Button variant={mode === "delegue" ? "primary" : "secondary"} onClick={() => setMode("delegue")} style={{ flex: 1, padding: "12px 16px" }}>👥 Délégué</Button>
            <Button variant={mode === "admin" ? "primary" : "secondary"} onClick={() => setMode("admin")} style={{ flex: 1, padding: "12px 16px" }}>👔 Admin</Button>
          </div>

          {mode === "etudiant" && config && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Select label="Votre classe" value={classe} onChange={setClasse} options={config.classes.map(c => ({ value: c, label: c }))} />
              {etudiants.length > 0 ? (
                <>
                  <Select label="Votre nom" value={selectedEtudiant} onChange={setSelectedEtudiant} options={etudiants.map(e => ({ value: e.id, label: e.nomComplet }))} />
                  <PasswordInput label="Mot de passe" value={passwordEtudiant} onChange={e => setPasswordEtudiant(e.target.value)} placeholder="Entrez votre mot de passe" />
                  <p style={{ fontSize: 11, color: "#0066CC", marginTop: -8, fontStyle: "italic" }}>💡 Mot de passe par défaut : <strong>ensea2025</strong></p>
                </>
              ) : <p style={{ color: "#888", fontSize: 13, textAlign: "center", padding: "20px 0" }}>Aucun étudiant dans cette classe</p>}
              {error && <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}
              <Button onClick={handleLoginEtudiant} style={{ width: "100%", marginTop: 8 }} disabled={etudiants.length === 0 || loading}>{loading ? "⏳ Connexion..." : "Se connecter →"}</Button>
              <button onClick={() => setShowForgotPassword(true)} style={{ background: "none", border: "none", color: "#0066CC", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontWeight: 600, fontFamily: "inherit" }}>🔐 Mot de passe oublié ?</button>
            </div>
          )}

          {mode === "delegue" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PasswordInput label="Code délégué" value={code} onChange={e => setCode(e.target.value)} placeholder="Entrez votre code" />
              {error && <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}
              <Button onClick={handleLoginDelegue} style={{ width: "100%", marginTop: 8 }} disabled={loading}>{loading ? "⏳ Connexion..." : "Se connecter →"}</Button>
              <button onClick={() => setShowForgotPassword(true)} style={{ background: "none", border: "none", color: "#0066CC", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontWeight: 600, fontFamily: "inherit" }}>🔐 Mot de passe oublié ?</button>
            </div>
          )}

          {mode === "admin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <PasswordInput label="Code administrateur" value={code} onChange={e => setCode(e.target.value)} placeholder="Entrez votre code" />
              {error && <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}
              <Button onClick={handleLoginAdmin} style={{ width: "100%", marginTop: 8 }} disabled={loading}>{loading ? "⏳ Connexion..." : "Se connecter →"}</Button>
              <button onClick={() => setShowForgotPassword(true)} style={{ background: "none", border: "none", color: "#0066CC", fontSize: 13, cursor: "pointer", textDecoration: "underline", fontWeight: 600, fontFamily: "inherit" }}>🔐 Mot de passe oublié ?</button>
            </div>
          )}
        </Card>
      </div>
      {showForgotPassword && <ForgotPasswordModal onClose={() => setShowForgotPassword(false)} />}
    </div>
  );
}
// ============================================================
// SUITE DU CODE (colle après LoginPage)
// ============================================================

function EtudiantPage({ user, demandes, onDemander, onAnnuler, onChangePassword }) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const moisActuel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisActuelCode = getCurrentMois();
  const mesDemandesMois = demandes.filter(d => d.nom === user.nom && d.classe === user.classe && d.mois === moisActuelCode);
  const totalSouchesCommandees = mesDemandesMois.reduce((sum, d) => sum + d.nbSouches, 0);
  const souchesRestantes = MAX_SOUCHES_PAR_MOIS - totalSouchesCommandees;
  const peutCommander = souchesRestantes > 0;
  const mesDemandesActives = mesDemandesMois.filter(d => d.statut !== "traitee");
  const [nbSouches, setNbSouches] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const totalDemandes = demandes.filter(d => d.mois === moisActuelCode && d.statut !== "traitee").length;

  const handleSubmit = async () => {
    setError("");
    const nbSouchesInt = parseInt(nbSouches);
    if (totalSouchesCommandees + nbSouchesInt > MAX_SOUCHES_PAR_MOIS) {
      setError(`Limite dépassée ! Vous avez déjà commandé ${totalSouchesCommandees} souche(s).`);
      return;
    }
    setLoading(true);
    await onDemander(nbSouchesInt);
    setLoading(false);
  };

  const optionsSouches = [];
  for (let i = 1; i <= Math.min(3, souchesRestantes); i++) {
    optionsSouches.push({ value: String(i), label: `${i} souche${i > 1 ? "s" : ""} (${i * 10} tickets) - ${i * PRIX_SOUCHE} FCFA` });
  }

  return (
    <div style={{ padding: 20, maxWidth: 540, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <Logo />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#0066CC", fontWeight: 600 }}>{user.classe}</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#002D6F" }}>{user.nom}</div>
        </div>
      </div>

      <Button onClick={() => setShowChangePassword(true)} variant="secondary" style={{ width: "100%", marginBottom: 16 }}>🔑 Changer mon mot de passe</Button>
      {showChangePassword && <ChangePasswordModal user={user} onClose={() => setShowChangePassword(false)} onChangePassword={onChangePassword} />}

      <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.9, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>Mois en cours</div>
        <div style={{ fontSize: 26, fontWeight: 800, textTransform: "capitalize" }}>{moisActuel}</div>
        <div style={{ marginTop: 14, fontSize: 14, opacity: 0.95 }}>📋 {totalDemandes} demande(s) au total</div>
      </Card>

      <Card style={{ marginBottom: 16, background: totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#FFF0F0" : "#F0FDF4", border: `2px solid ${totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#FEE" : "#DCFCE7"}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#DC2626" : "#16A34A" }}>📊 Votre compteur</div>
        <div style={{ fontSize: 52, fontWeight: 900, color: totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#DC2626" : "#16A34A" }}>{totalSouchesCommandees} / {MAX_SOUCHES_PAR_MOIS}</div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 10 }}>
          {peutCommander ? <>Vous pouvez encore commander <strong>{souchesRestantes} souche{souchesRestantes > 1 ? "s" : ""}</strong></> : <><strong>Limite atteinte !</strong></>}
        </div>
      </Card>

      <Card style={{ marginBottom: 16, background: "#F5F8FA", border: "2px solid #E8F4FF" }}>
        <div style={{ fontSize: 13, color: "#002D6F", lineHeight: 1.7 }}>📌 <strong>Règles :</strong> 
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>Maximum <strong>{MAX_SOUCHES_PAR_MOIS} souches/mois</strong></li>
            <li>Prix : <strong>{PRIX_SOUCHE} FCFA</strong> par souche</li>
          </ul>
        </div>
      </Card>
      {/* NOUVEAU : Statistiques de l'étudiant */}
      <StatistiquesEtudiant user={user} demandes={demandes} />

      {mesDemandesActives.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14, color: "#002D6F" }}>Mes demandes ({mesDemandesActives.length})</div>
          {mesDemandesActives.map((d, i) => (
            <div key={d.id} style={{ padding: 14, background: "#F5F8FA", borderRadius: 12, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center", border: "2px solid #E8F4FF" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#002D6F" }}>Demande #{i + 1}</div>
                <div style={{ fontSize: 13, color: "#0066CC" }}>{d.nbSouches} souche{d.nbSouches > 1 ? "s" : ""} = {d.nbSouches * PRIX_SOUCHE} FCFA</div>
              </div>
              <Button variant="danger" onClick={() => onAnnuler(d.id)} style={{ padding: "8px 16px", fontSize: 12 }}>🗑️ Annuler</Button>
            </div>
          ))}
        </Card>
      )}

      {peutCommander ? (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16, color: "#002D6F" }}>Nouvelle demande</div>
          <Select label="Nombre de souches" value={nbSouches} onChange={setNbSouches} options={optionsSouches} />
          {error && <div style={{ background: "#FFF0F0", padding: 12, borderRadius: 12, marginTop: 16, border: "2px solid #FEE" }}><p style={{ fontSize: 13, color: "#DC2626", margin: 0, fontWeight: 600 }}>⚠️ {error}</p></div>}
          <Button onClick={handleSubmit} style={{ width: "100%", marginTop: 16 }} disabled={loading || optionsSouches.length === 0}>{loading ? "⏳ Enregistrement..." : "✅ Confirmer"}</Button>
        </Card>
      ) : (
        <Card style={{ background: "#FFF0F0", border: "2px solid #FEE" }}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#DC2626", marginBottom: 8 }}>Limite atteinte</div>
            <div style={{ fontSize: 14, color: "#555" }}>Vous avez commandé {totalSouchesCommandees} souche(s) ce mois.</div>
          </div>
        </Card>
      )}
    </div>
  );
}

function DelegatePage({ user, demandes, onArchive, onDelete, onUpdatePaiement, onChangePassword }) {
  const [recherche, setRecherche] = useState("");
  const [montantsPayes, setMontantsPayes] = useState({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const moisActuel = getCurrentMois();
  const demandesMois = demandes.filter(d => d.mois === moisActuel && d.classe === user.classe && d.statut !== "traitee");
  const demandesFiltrees = demandesMois.filter(d => d.nom.toLowerCase().includes(recherche.toLowerCase()));
  const totalSouches = demandesMois.reduce((sum, d) => sum + d.nbSouches, 0);
  const totalMontant = demandesMois.reduce((sum, d) => sum + (d.nbSouches * PRIX_SOUCHE), 0);

  const exportExcel = () => {
    const data = demandesFiltrees.map(d => ({ "Nom": d.nom, "Classe": d.classe, "Souches": d.nbSouches, "Montant Dû": d.nbSouches * PRIX_SOUCHE, "Montant Payé": d.montantPaye || 0, "Monnaie": (d.montantPaye || 0) - (d.nbSouches * PRIX_SOUCHE) }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demandes");
    XLSX.writeFile(wb, `souches_${user.classe}_${moisActuel}.xlsx`);
  };

  const handleMontantChange = (demandeId, value) => setMontantsPayes(prev => ({ ...prev, [demandeId]: value }));
  const handleSavePaiement = async (demande) => await onUpdatePaiement(demande.id, parseInt(montantsPayes[demande.id] || 0));

  return (
    <div style={{ padding: 20, maxWidth: 850, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <Logo />
        <Badge color="#0066CC">Délégué {user.classe}</Badge>
      </div>


      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card style={{ background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>Demandes</div>
          <div style={{ fontSize: 44, fontWeight: 900 }}>{demandesMois.length}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #002D6F, #0047AB)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>Souches</div>
          <div style={{ fontSize: 44, fontWeight: 900 }}>{totalSouches}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #16A34A, #059669)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>Montant</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{totalMontant.toLocaleString()}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>FCFA</div>
        </Card>
      </div>
       <StatistiquesDelegue demandes={demandes} classe={user.classe} />

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Button onClick={exportExcel} variant="success" style={{ flex: 1 }}>📥 Excel</Button>
        <Button onClick={() => setShowChangePassword(true)} variant="secondary" style={{ flex: 1 }}>🔑 Changer code</Button>
      </div>

      {showChangePassword && <ChangePasswordModal user={user} onClose={() => setShowChangePassword(false)} onChangePassword={onChangePassword} />}

      <Card style={{ marginBottom: 20 }}>
        <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="🔍 Rechercher..." style={{ width: "100%", border: "2px solid #E8F4FF", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {demandesFiltrees.length === 0 ? (
          <Card style={{ textAlign: "center", color: "#888", padding: 50 }}>Aucune demande</Card>
        ) : demandesFiltrees.map((d, i) => {
          const montantDu = d.nbSouches * PRIX_SOUCHE;
          const montantPaye = d.montantPaye || 0;
          const monnaie = montantPaye - montantDu;
          const montantSaisi = montantsPayes[d.id] !== undefined ? montantsPayes[d.id] : montantPaye;
          return (
            <Card key={d.id}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <div style={{ width: 45, height: 45, borderRadius: 14, background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, color: "#002D6F" }}>{d.nom}</div>
                    <div style={{ fontSize: 12, color: "#0066CC", fontWeight: 600 }}>{d.classe}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "#0047AB" }}>{d.nbSouches}</div>
                  <div style={{ fontSize: 11, color: "#0066CC", fontWeight: 600 }}>souche{d.nbSouches > 1 ? "s" : ""}</div>
                </div>
              </div>
              <div style={{ background: "#F5F8FA", borderRadius: 14, padding: 18, border: "2px solid #E8F4FF" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#0066CC", marginBottom: 6, fontWeight: 700 }}>MONTANT DÛ</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: "#16A34A" }}>{montantDu.toLocaleString()} F</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#0066CC", marginBottom: 6, fontWeight: 700 }}>MONTANT PAYÉ</div>
                    <input type="number" value={montantSaisi} onChange={e => handleMontantChange(d.id, e.target.value)} style={{ width: "100%", border: "2px solid #0047AB", borderRadius: 12, padding: "10px", fontSize: 20, fontWeight: 700, color: "#0047AB", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                {montantSaisi && montantSaisi !== "" && (
                  <div style={{ background: monnaie > 0 ? "#F0FDF4" : monnaie < 0 ? "#FFF0F0" : "#fff", borderRadius: 12, padding: 14, marginBottom: 12, border: `2px solid ${monnaie > 0 ? "#DCFCE7" : monnaie < 0 ? "#FEE" : "#eee"}` }}>
                    <div style={{ fontSize: 11, color: "#0066CC", marginBottom: 6, fontWeight: 700 }}>MONNAIE</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: monnaie > 0 ? "#16A34A" : monnaie < 0 ? "#DC2626" : "#888" }}>{monnaie > 0 ? "+" : ""}{monnaie.toLocaleString()} F</div>
                  </div>
                )}
                {montantSaisi !== montantPaye && <Button onClick={() => handleSavePaiement(d)} variant="success" style={{ width: "100%" }}>💾 Enregistrer</Button>}
              </div>
            </Card>
          );
        })}
      </div>
      {demandesMois.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Button onClick={() => setShowActionMenu(!showActionMenu)} style={{ width: "100%", background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff" }}>⚙️ Actions ({demandesMois.length}) {showActionMenu ? "▲" : "▼"}</Button>
          {showActionMenu && (
            <Card style={{ marginTop: 16, background: "#E8F4FF" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Button variant="success" onClick={() => { if (window.confirm(`Archiver ${demandesMois.length} demande(s) ?`)) { onArchive(user.classe); setShowActionMenu(false); } }} style={{ background: "#16A34A", color: "#fff" }}>📦 Archiver</Button>
                <Button variant="danger" onClick={() => { if (window.confirm(`⚠️ Supprimer ${demandesMois.length} demande(s) ?`)) { onDelete(user.classe); setShowActionMenu(false); } }}>🗑️ Supprimer</Button>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function ChangePasswordModal({ user, onClose, onChangePassword }) {
  const [codeActuel, setCodeActuel] = useState("");
  const [nouveauCode, setNouveauCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!codeActuel || !nouveauCode || !confirmation) { setError("Tous les champs requis"); return; }
    if (nouveauCode !== confirmation) { setError("Les codes ne correspondent pas"); return; }
    if (nouveauCode.length < 6) { setError("Minimum 6 caractères"); return; }
    setLoading(true);
    try {
      await onChangePassword(codeActuel, nouveauCode);
      alert(" Mot de passe modifié !");
      window.location.reload();
    } catch (err) {
      setError(err.message || "Erreur");
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 45, 111, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20, backdropFilter: "blur(4px)" }}>
      <Card style={{ maxWidth: 460, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#002D6F" }}>🔑 Changer mot de passe</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 32, cursor: "pointer", color: "#0066CC" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <PasswordInput label="Mot de passe actuel" value={codeActuel} onChange={e => setCodeActuel(e.target.value)} placeholder="Actuel" />
          <PasswordInput label="Nouveau" value={nouveauCode} onChange={e => setNouveauCode(e.target.value)} placeholder="Min 6 car." />
          <PasswordInput label="Confirmer" value={confirmation} onChange={e => setConfirmation(e.target.value)} placeholder="Retapez" />
          {error && <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}
          <div style={{ display: "flex", gap: 12 }}>
            <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>{loading ? "⏳..." : "💾 Modifier"}</Button>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function AdminPage({ user, demandes, onArchiveMois, onDeleteMois, onResetCompteurs, onUpdatePaiement, onChangeAdminPassword }) {
  const [tab, setTab] = useState("dashboard");
  const [etudiants, setEtudiants] = useState([]);
  const [delegues, setDelegues] = useState([]);
  const [config, setConfig] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    const [etds, dels, cfg] = await Promise.all([getAllEtudiants(), getAllDelegues(), getConfig()]);
    setEtudiants(etds);
    setDelegues(dels);
    setConfig(cfg);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 28 }}>
        <Logo />
        <div style={{ display: "flex", gap: 12 }}>
          <Button onClick={() => setShowChangePassword(true)} variant="secondary">🔑 Changer code</Button>
          <Badge>Admin</Badge>
        </div>
      </div>

      {showChangePassword && <ChangePasswordModal user={user} onClose={() => setShowChangePassword(false)} onChangePassword={onChangeAdminPassword} />}

      <div style={{ display: "flex", gap: 10, marginBottom: 24, overflowX: "auto" }}>
        <Button variant={tab === "dashboard" ? "primary" : "secondary"} onClick={() => setTab("dashboard")}> Dashboard</Button>
        <Button variant={tab === "historique" ? "primary" : "secondary"} onClick={() => setTab("historique")}>📜 Historique</Button>
        <Button variant={tab === "etudiants" ? "primary" : "secondary"} onClick={() => setTab("etudiants")}>👨‍🎓 Étudiants</Button>
        <Button variant={tab === "delegues" ? "primary" : "secondary"} onClick={() => setTab("delegues")}>👥 Délégués</Button>
        <Button variant={tab === "export" ? "primary" : "secondary"} onClick={() => setTab("export")}>📥 Exports</Button>
      </div>

      {tab === "dashboard" && <AdminDashboard demandes={demandes} etudiants={etudiants} delegues={delegues} config={config} onArchiveMois={onArchiveMois} onDeleteMois={onDeleteMois} onResetCompteurs={onResetCompteurs} />}
      {tab === "historique" && <AdminHistorique demandes={demandes} config={config} />}
      {tab === "etudiants" && <AdminEtudiants etudiants={etudiants} config={config} onReload={loadData} />}
      {tab === "delegues" && <AdminDelegues delegues={delegues} config={config} onReload={loadData} />}
      {tab === "export" && <AdminExports demandes={demandes} etudiants={etudiants} config={config} />}
    </div>
  );
}

function AdminDashboard({ demandes, etudiants, delegues, config, onArchiveMois, onDeleteMois, onResetCompteurs }) {
  const [showActionMenu, setShowActionMenu] = useState(false);
  const moisActuel = getCurrentMois();
  const demandesMoisActives = demandes.filter(d => d.mois === moisActuel && d.statut !== "traitee");
  const totalSouches = demandesMoisActives.reduce((sum, d) => sum + d.nbSouches, 0);
  const totalMontant = demandesMoisActives.reduce((sum, d) => sum + (d.nbSouches * PRIX_SOUCHE), 0);
  const classes = config ? config.classes : [];
  const statsByClasse = classes.map(classe => {
    const demandesClasse = demandesMoisActives.filter(d => d.classe === classe);
    const delegue = delegues.find(del => del.classe === classe);
    return { classe, nbDemandes: demandesClasse.length, nbSouches: demandesClasse.reduce((sum, d) => sum + d.nbSouches, 0), delegue: delegue ? delegue.nom : "Non défini" };
  });

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card style={{ background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>Demandes</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{demandesMoisActives.length}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #002D6F, #0047AB)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>Souches</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{totalSouches}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #16A34A, #059669)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>Montant</div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{totalMontant.toLocaleString()}</div>
          <div style={{ fontSize: 11, opacity: 0.8 }}>FCFA</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #0066CC, #0088EE)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.9, textTransform: "uppercase", fontWeight: 600 }}>Étudiants</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{etudiants.length}</div>
        </Card>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#002D6F" }}> Par classe</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {statsByClasse.map(stat => (
            <div key={stat.classe} style={{ display: "flex", justifyContent: "space-between", padding: 16, background: "#F5F8FA", borderRadius: 14, border: "2px solid #E8F4FF" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#002D6F" }}>{stat.classe}</div>
                <div style={{ fontSize: 13, color: "#0066CC", marginTop: 4, fontWeight: 600 }}>Délégué: {stat.delegue}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#0047AB" }}>{stat.nbDemandes} demandes</div>
                <div style={{ fontSize: 13, color: "#0066CC", fontWeight: 600 }}>{stat.nbSouches} souches</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Button variant="secondary" onClick={onResetCompteurs} style={{ width: "100%", marginBottom: 10, background: "linear-gradient(135deg, #0066CC, #0088EE)", color: "#fff" }}>🔄 Réinitialiser compteurs</Button>

      {demandesMoisActives.length > 0 && (
        <div>
          <Button onClick={() => setShowActionMenu(!showActionMenu)} style={{ width: "100%", background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff" }}>⚙️ Actions {showActionMenu ? "▲" : "▼"}</Button>
          {showActionMenu && (
            <Card style={{ marginTop: 16, background: "#E8F4FF" }}>
              <div style={{ marginBottom: 20 }}>
                {classes.map(classe => {
                  const nb = demandesMoisActives.filter(d => d.classe === classe).length;
                  if (nb === 0) return null;
                  return (
                    <div key={classe} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <Button variant="success" onClick={() => { if (window.confirm(`Archiver ${nb} demandes ${classe} ?`)) { onArchiveMois(classe, moisActuel); setShowActionMenu(false); } }} style={{ flex: 1, background: "#16A34A", color: "#fff", fontSize: 13 }}>📦 {classe} ({nb})</Button>
                      <Button variant="danger" onClick={() => { if (window.confirm(`⚠️ Supprimer ${nb} demandes ${classe} ?`)) { onDeleteMois(classe, moisActuel); setShowActionMenu(false); } }} style={{ flex: 1, fontSize: 13 }}>🗑️ {classe} ({nb})</Button>
                    </div>
                  );
                })}
              </div>
              <div style={{ borderTop: "2px solid #0066CC", paddingTop: 16 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <Button variant="success" onClick={() => { if (window.confirm(`Archiver TOUT (${demandesMoisActives.length}) ?`)) { onArchiveMois(null, moisActuel); setShowActionMenu(false); } }} style={{ flex: 1, background: "#16A34A", color: "#fff" }}>📦 Tout ({demandesMoisActives.length})</Button>
                  <Button variant="danger" onClick={() => { if (window.confirm(`⚠️ Supprimer TOUT (${demandesMoisActives.length}) ?`)) { onDeleteMois(null, moisActuel); setShowActionMenu(false); } }} style={{ flex: 1 }}>🗑️ Tout ({demandesMoisActives.length})</Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
function AdminHistorique({ demandes, config }) {
  const [filtreClasse, setFiltreClasse] = useState("toutes");
  const [filtreMois, setFiltreMois] = useState("tous");
  
  const classes = config ? config.classes : [];
  const moisUniques = [...new Set(demandes.map(d => d.mois))].sort().reverse();
  
  // Filtrer les demandes
  let demandesFiltrees = demandes;
  if (filtreClasse !== "toutes") {
    demandesFiltrees = demandesFiltrees.filter(d => d.classe === filtreClasse);
  }
  if (filtreMois !== "tous") {
    demandesFiltrees = demandesFiltrees.filter(d => d.mois === filtreMois);
  }
  
  const totalSouches = demandesFiltrees.reduce((sum, d) => sum + d.nbSouches, 0);
  const totalMontant = demandesFiltrees.reduce((sum, d) => sum + (d.nbSouches * PRIX_SOUCHE), 0);

  // Fonction helper pour formater les dates
  const formatDate = (date) => {
    if (!date) return "-";
    
    try {
      if (date.toDate && typeof date.toDate === 'function') {
        return date.toDate().toLocaleDateString('fr-FR');
      }
      
      if (date instanceof Date) {
        return date.toLocaleDateString('fr-FR');
      }
      
      const dateObj = new Date(date);
      if (!isNaN(dateObj.getTime())) {
        return dateObj.toLocaleDateString('fr-FR');
      }
      
      return "-";
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return "-";
    }
  };

  return (
    <div>
      {/* ========================================= */}
      {/* NOUVEAU : Gestion de l'historique        */}
      {/* ========================================= */}
      <GestionHistorique 
        demandes={demandes} 
        onResetComplete={() => window.location.reload()} 
      />

      {/* ========================================= */}
      {/* EXISTANT : Filtres                       */}
      {/* ========================================= */}
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#002D6F" }}>🔍 Filtres</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 6 }}>
              Classe
            </label>
            <select 
              value={filtreClasse} 
              onChange={e => setFiltreClasse(e.target.value)} 
              style={{ 
                width: "100%", 
                border: "2px solid #E8F4FF", 
                borderRadius: 12, 
                padding: "10px 14px", 
                fontSize: 14, 
                outline: "none", 
                color: "#002D6F" 
              }}
            >
              <option value="toutes">Toutes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 6 }}>
              Mois
            </label>
            <select 
              value={filtreMois} 
              onChange={e => setFiltreMois(e.target.value)} 
              style={{ 
                width: "100%", 
                border: "2px solid #E8F4FF", 
                borderRadius: 12, 
                padding: "10px 14px", 
                fontSize: 14, 
                outline: "none", 
                color: "#002D6F" 
              }}
            >
              <option value="tous">Tous</option>
              {moisUniques.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* ========================================= */}
      {/* EXISTANT : Stats filtrées                */}
      {/* ========================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card style={{ background: "#F5F8FA", border: "2px solid #E8F4FF" }}>
          <div style={{ fontSize: 12, color: "#0066CC", marginBottom: 6, fontWeight: 700 }}>DEMANDES</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#0047AB" }}>{demandesFiltrees.length}</div>
        </Card>
        <Card style={{ background: "#F5F8FA", border: "2px solid #E8F4FF" }}>
          <div style={{ fontSize: 12, color: "#0066CC", marginBottom: 6, fontWeight: 700 }}>SOUCHES</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#002D6F" }}>{totalSouches}</div>
        </Card>
        <Card style={{ background: "#F5F8FA", border: "2px solid #E8F4FF" }}>
          <div style={{ fontSize: 12, color: "#0066CC", marginBottom: 6, fontWeight: 700 }}>MONTANT</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#16A34A" }}>{totalMontant.toLocaleString()} F</div>
        </Card>
      </div>

      {/* ========================================= */}
      {/* EXISTANT : Tableau historique            */}
      {/* ========================================= */}
      <Card>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#002D6F" }}>
          📜 Historique ({demandesFiltrees.length})
        </h3>
        {demandesFiltrees.length === 0 ? (
          <p style={{ textAlign: "center", color: "#888", padding: 40 }}>Aucune demande</p>
        ) : (
          <div style={{ maxHeight: 600, overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F5F8FA", borderBottom: "2px solid #E8F4FF" }}>
                  <th style={{ padding: 12, textAlign: "left", color: "#002D6F" }}>Date</th>
                  <th style={{ padding: 12, textAlign: "left", color: "#002D6F" }}>Nom</th>
                  <th style={{ padding: 12, textAlign: "left", color: "#002D6F" }}>Classe</th>
                  <th style={{ padding: 12, textAlign: "center", color: "#002D6F" }}>Souches</th>
                  <th style={{ padding: 12, textAlign: "right", color: "#002D6F" }}>Montant</th>
                  <th style={{ padding: 12, textAlign: "center", color: "#002D6F" }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {demandesFiltrees.map(d => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #E8F4FF" }}>
                    <td style={{ padding: 12, color: "#002D6F" }}>{formatDate(d.date)}</td>
                    <td style={{ padding: 12, fontWeight: 600, color: "#002D6F" }}>{d.nom}</td>
                    <td style={{ padding: 12, color: "#0066CC" }}>{d.classe}</td>
                    <td style={{ padding: 12, textAlign: "center", fontWeight: 700, color: "#0047AB" }}>
                      {d.nbSouches}
                    </td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "#16A34A" }}>
                      {(d.nbSouches * PRIX_SOUCHE).toLocaleString()} F
                    </td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {d.statut === "traitee" ? (
                        <span style={{ 
                          background: "#F0FDF4", 
                          color: "#16A34A", 
                          padding: "4px 10px", 
                          borderRadius: 20, 
                          fontSize: 11, 
                          fontWeight: 700, 
                          border: "2px solid #DCFCE7" 
                        }}>
                          ✅ TRAITÉE
                        </span>
                      ) : (
                        <span style={{ 
                          background: "#E8F4FF", 
                          color: "#0047AB", 
                          padding: "4px 10px", 
                          borderRadius: 20, 
                          fontSize: 11, 
                          fontWeight: 700, 
                          border: "2px solid #0066CC" 
                        }}>
                          ⏳ ACTIVE
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function AdminExports({ demandes, etudiants, config }) {
  const [filtreClasse, setFiltreClasse] = useState("toutes");
  const [filtreMois, setFiltreMois] = useState("tous");
  const classes = config ? config.classes : [];
  const moisUniques = [...new Set(demandes.map(d => d.mois))].sort().reverse();

  const exportGlobalExcel = () => {
    let data = demandes;
    if (filtreClasse !== "toutes") data = data.filter(d => d.classe === filtreClasse);
    if (filtreMois !== "tous") data = data.filter(d => d.mois === filtreMois);
    const excelData = data.map(d => ({ "Date": d.date ? new Date(d.date).toLocaleDateString('fr-FR') : "", "Nom": d.nom, "Classe": d.classe, "Souches": d.nbSouches, "Montant": d.nbSouches * PRIX_SOUCHE, "Mois": d.mois, "Statut": d.statut === "traitee" ? "Traitée" : "Active" }));
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demandes");
    XLSX.writeFile(wb, `souches_${filtreClasse}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportEtudiantsExcel = () => {
    const data = etudiants.map(e => ({ "Nom": e.nom, "Prénom": e.prenom, "Nom Complet": e.nomComplet, "Classe": e.classe, "Email": e.email || "" }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Étudiants");
    XLSX.writeFile(wb, `etudiants_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#002D6F" }}>🔍 Filtres</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 8 }}>Classe</label>
            <select value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)} style={{ width: "100%", border: "2px solid #E8F4FF", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", color: "#002D6F" }}>
              <option value="toutes">Toutes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 8 }}>Mois</label>
            <select value={filtreMois} onChange={e => setFiltreMois(e.target.value)} style={{ width: "100%", border: "2px solid #E8F4FF", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", color: "#002D6F" }}>
              <option value="tous">Tous</option>
              {moisUniques.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card style={{ padding: 24, background: "linear-gradient(135deg, #0047AB, #0066CC)", color: "#fff" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.95 }}>DEMANDES</div>
          <div style={{ fontSize: 42, fontWeight: 900, marginBottom: 8 }}>{demandes.length}</div>
          <Button onClick={exportGlobalExcel} variant="secondary" style={{ width: "100%", background: "#fff", color: "#0047AB" }}>📥 Exporter demandes</Button>
        </Card>
        <Card style={{ padding: 24, background: "linear-gradient(135deg, #0066CC, #0088EE)", color: "#fff" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.95 }}>ÉTUDIANTS</div>
          <div style={{ fontSize: 42, fontWeight: 900, marginBottom: 8 }}>{etudiants.length}</div>
          <Button onClick={exportEtudiantsExcel} variant="secondary" style={{ width: "100%", background: "#fff", color: "#0066CC" }}>📥 Exporter étudiants</Button>
        </Card>
      </div>
    </div>
  );
}

function AdminEtudiants({ etudiants, config, onReload }) {
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fichier, setFichier] = useState(null);
  const [etudiantsPreview, setEtudiantsPreview] = useState([]);
  const [modeImport, setModeImport] = useState("remplacer");

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileName = file.name.toLowerCase();
    let data = [];
    try {
      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          const [nom, prenom, classe, email] = row;
          if (nom && prenom) {
            const hash = await hashCode("ensea2025");
            data.push({ nom: String(nom).trim().toUpperCase(), prenom: String(prenom).trim(), classe: classe ? String(classe).trim().toUpperCase() : "", email: email ? String(email).trim().toLowerCase() : "", nomComplet: `${String(nom).trim().toUpperCase()} ${String(prenom).trim()}`, codeHash: hash, actif: true, dateAjout: new Date().toISOString() });
          }
        }
      }
      setEtudiantsPreview(data);
      setFichier(file);
    } catch (error) {
      alert("Erreur lecture");
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);
    try {
      if (modeImport === "remplacer") {
        const allEtudiants = await getDocs(collection(db, "etudiants"));
        await Promise.all(allEtudiants.docs.map(d => deleteDoc(d.ref)));
      }
      const BATCH_SIZE = 500;
      let compteur = 0;
      for (let i = 0; i < etudiantsPreview.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const groupe = etudiantsPreview.slice(i, i + BATCH_SIZE);
        groupe.forEach(etudiant => batch.set(doc(collection(db, "etudiants")), etudiant));
        await batch.commit();
        compteur += groupe.length;
        setProgress(Math.round((compteur / etudiantsPreview.length) * 100));
      }
      alert(`🎉 ${compteur} étudiants importés !`);
      setImporting(false);
      setEtudiantsPreview([]);
      setFichier(null);
      onReload();
    } catch (error) {
      alert("Erreur import");
      setImporting(false);
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20, color: "#002D6F" }}>📥 Import</h3>
        {!fichier ? (
          <div>
            <p style={{ fontSize: 13, color: "#0066CC", marginBottom: 16 }}>Format : <strong>Nom, Prenom, Classe, Email</strong></p>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <Button variant={modeImport === "remplacer" ? "primary" : "secondary"} onClick={() => setModeImport("remplacer")} style={{ flex: 1 }}>🔄 Remplacer</Button>
                <Button variant={modeImport === "ajouter" ? "primary" : "secondary"} onClick={() => setModeImport("ajouter")} style={{ flex: 1 }}>➕ Ajouter</Button>
              </div>
            </div>
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} />
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, marginBottom: 10, color: "#002D6F" }}>📄 {fichier.name}</p>
            <p style={{ fontSize: 14, marginBottom: 16, color: "#002D6F" }}> {etudiantsPreview.length} étudiants</p>
            {importing ? (
              <div>
                <div style={{ width: "100%", height: 24, background: "#E8F4FF", borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{ width: `${progress}%`, height: "100%", background: "linear-gradient(90deg, #0047AB, #0066CC)" }} />
                </div>
                <p style={{ fontSize: 14, textAlign: "center", fontWeight: 600, color: "#0047AB" }}>{progress}%</p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <Button onClick={handleImport}> Importer</Button>
                <Button variant="secondary" onClick={() => { setFichier(null); setEtudiantsPreview([]); }}>❌ Annuler</Button>
              </div>
            )}
          </div>
        )}
      </Card>
      <Card>
        <h3 style={{ margin: "0 0 20px 0" }}>👨‍🎓 Étudiants ({etudiants.length})</h3>
        {etudiants.length === 0 ? <p style={{ textAlign: "center", color: "#888" }}>Aucun</p> : (
          <div style={{ maxHeight: 450, overflow: "auto" }}>
            {etudiants.slice(0, 50).map(e => (
              <div key={e.id} style={{ padding: 14, borderBottom: "1px solid #E8F4FF" }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#002D6F" }}>{e.nomComplet}</div>
                <div style={{ fontSize: 13, color: "#0066CC" }}>{e.classe} • {e.email || "Pas d'email"}</div>
              </div>
            ))}
            {etudiants.length > 50 && <p style={{ textAlign: "center", color: "#0066CC", marginTop: 14 }}>... et {etudiants.length - 50} autres</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
function EditDelegueNomModal({ delegue, onClose, onSuccess }) {
  const [nom, setNom] = useState(delegue.nom || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nom || !nom.trim()) { setError("Nom requis"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, "delegues", delegue.id), { 
        nom: nom.trim().toUpperCase(),
        dateModification: new Date().toISOString()
      });
      alert(` Nom modifié pour ${delegue.classe} !`);
      onSuccess();
      onClose();
    } catch (err) {
      setError("Erreur lors de la modification");
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 45, 111, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20, backdropFilter: "blur(4px)" }}>
      <Card style={{ maxWidth: 460, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#002D6F" }}>✏️ Modifier nom - {delegue.classe}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 32, cursor: "pointer", color: "#0066CC" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 8 }}>Nom du délégué</label>
            <input 
              type="text" 
              value={nom} 
              onChange={e => setNom(e.target.value)} 
              placeholder="Ex: KONAN Jean" 
              style={{ width: "100%", border: "2px solid #E8F4FF", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }} 
            />
          </div>
          {error && <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
              {loading ? "⏳ Modification..." : "💾 Modifier"}
            </Button>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
function AdminDelegues({ delegues, config, onReload }) {
  const [editingEmail, setEditingEmail] = useState(null);
  const [editingNom, setEditingNom] = useState(null);

  return (
    <div>
      <Card>
        <h3 style={{ margin: "0 0 20px 0" }}>👥 Délégués ({delegues.length})</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {delegues.map(del => (
            <div key={del.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#F5F8FA", borderRadius: 14, border: "2px solid #E8F4FF" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#002D6F" }}>{del.classe} - {del.nom}</div>
                <div style={{ fontSize: 13, color: "#0066CC" }}>{del.email || "Pas d'email"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button variant="secondary" onClick={() => setEditingNom(del)} style={{ padding: "8px 16px", fontSize: 13 }}>✏️ Nom</Button>
                <Button variant="secondary" onClick={() => setEditingEmail(del)} style={{ padding: "8px 16px", fontSize: 13 }}>✉️ Email</Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
      {editingEmail && <EditDelegueEmailModal delegue={editingEmail} onClose={() => setEditingEmail(null)} onSuccess={onReload} />}
      {editingNom && <EditDelegueNomModal delegue={editingNom} onClose={() => setEditingNom(null)} onSuccess={onReload} />}
    </div>
  );
}

function EditDelegueEmailModal({ delegue, onClose, onSuccess }) {
  const [email, setEmail] = useState(delegue.email || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !email.includes('@')) { setError("Email valide requis"); return; }
    setLoading(true);
    try {
      await updateDoc(doc(db, "delegues", delegue.id), { email: email.toLowerCase() });
      alert(` Email modifié !`);
      onSuccess();
      onClose();
    } catch (err) {
      setError("Erreur");
    }
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0, 45, 111, 0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}>
      <Card style={{ maxWidth: 460, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 22, color: "#002D6F" }}>✉️ Email - {delegue.classe}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 32, cursor: "pointer", color: "#0066CC" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#0066CC", display: "block", marginBottom: 8 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="delegue@ensea.edu.ci" style={{ width: "100%", border: "2px solid #E8F4FF", borderRadius: 12, padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          {error && <p style={{ color: "#DC2626", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}
          <div style={{ display: "flex", gap: 12 }}>
            <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>{loading ? "⏳..." : "💾 Modifier"}</Button>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function getCurrentMois() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "demandes"), snapshot => {
      setDemandes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDemander = async (nbSouches) => {
  try {
    // Créer la demande
    await addDoc(collection(db, "demandes"), { 
      nom: user.nom, 
      classe: user.classe, 
      nbSouches, 
      mois: getCurrentMois(), 
      date: new Date().toISOString(), 
      montantPaye: 0, 
      statut: "active",
      paye: false  // ← NOUVEAU
    });
    
    showNotif(` Demande enregistrée !`);
    
    // ========================================
    // NOUVEAU : Notification au délégué
    // ========================================
    try {
      const delegueSnapshot = await getDocs(
        query(collection(db, 'delegues'), where('classe', '==', user.classe))
      );
      
      if (!delegueSnapshot.empty) {
        const emailDelegue = delegueSnapshot.docs[0].data().email;
        
        if (emailDelegue) {
          fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              emailDelegue,
              etudiant: user.nom,
              nbSouches,
              classe: user.classe
            })
          });
        }
      }
    } catch (e) {
      console.log('Notification ignorée');
    }
    
  } catch (error) {
    showNotif("Erreur", "error");
  }
};
  const handleAnnuler = async (id) => {
    try {
      await deleteDoc(doc(db, "demandes", id));
      showNotif("Demande annulée");
    } catch (error) {
      showNotif("Erreur", "error");
    }
  };

  const handleUpdatePaiement = async (demandeId, montantPaye) => {
    try {
      await updateDoc(doc(db, "demandes", demandeId), { montantPaye });
      showNotif("💰 Paiement enregistré !");
    } catch (error) {
      showNotif("Erreur", "error");
    }
  };

  const handleArchive = async (classe) => {
    try {
      const mois = getCurrentMois();
      const toArchive = demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee");
      await Promise.all(toArchive.map(d => updateDoc(doc(db, "demandes", d.id), { statut: "traitee", dateTraitement: new Date().toISOString() })));
      showNotif(`Classe ${classe} archivée !`);
    } catch (error) {
      showNotif("Erreur", "error");
    }
  };

  const handleDelete = async (classe) => {
    try {
      const mois = getCurrentMois();
      const toDelete = demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee");
      await Promise.all(toDelete.map(d => deleteDoc(doc(db, "demandes", d.id))));
      showNotif(`Classe ${classe} supprimée !`);
    } catch (error) {
      showNotif("Erreur", "error");
    }
  };

  const handleArchiveMois = async (classe, mois) => {
    try {
      const toArchive = classe ? demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee") : demandes.filter(d => d.mois === mois && d.statut !== "traitee");
      await Promise.all(toArchive.map(d => updateDoc(doc(db, "demandes", d.id), { statut: "traitee" })));
      showNotif(classe ? `${classe} archivée` : "Tout archivé");
    } catch (error) {
      showNotif("Erreur", "error");
    }
  };

  const handleDeleteMois = async (classe, mois) => {
    try {
      const toDelete = classe ? demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee") : demandes.filter(d => d.mois === mois && d.statut !== "traitee");
      await Promise.all(toDelete.map(d => deleteDoc(doc(db, "demandes", d.id))));
      showNotif(classe ? `${classe} supprimée` : "Tout supprimé");
    } catch (error) {
      showNotif("Erreur", "error");
    }
  };

  const handleResetCompteurs = async () => {
    try {
      const mois = getCurrentMois();
      await Promise.all(demandes.filter(d => d.mois === mois).map(d => deleteDoc(doc(db, "demandes", d.id))));
      showNotif("🔄 Compteurs réinitialisés");
    } catch (error) {
      showNotif("Erreur", "error");
    }
  };

  const handleChangePassword = async (codeActuel, nouveauCode) => {
    try {
      const hashActuel = await hashCode(codeActuel);
      let userDoc = null;
      if (user.role === "delegue") {
        const snap = await getDocs(query(collection(db, "delegues"), where("classe", "==", user.classe)));
        if (!snap.empty) userDoc = snap.docs[0];
      } else if (user.role === "etudiant") {
        const snap = await getDocs(collection(db, "etudiants"));
        userDoc = snap.docs.find(d => d.id === user.etudiantId);
      }
      if (!userDoc) throw new Error("Utilisateur non trouvé");
      if (userDoc.data().codeHash !== hashActuel) throw new Error("Mot de passe incorrect");
      await updateDoc(doc(db, user.role === "delegue" ? "delegues" : "etudiants", userDoc.id), { codeHash: await hashCode(nouveauCode) });
    } catch (error) {
      throw error;
    }
  };

  const handleChangeAdminPassword = async (codeActuel, nouveauCode) => {
    try {
      const hashActuel = await hashCode(codeActuel);
      const adminSnap = await getDocs(collection(db, "admins"));
      const adminDoc = adminSnap.docs.find(d => d.id === user.adminId);
      if (!adminDoc || adminDoc.data().codeHash !== hashActuel) throw new Error("Code incorrect");
      await updateDoc(doc(db, "admins", adminDoc.id), { codeHash: await hashCode(nouveauCode) });
    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&display=swap" rel="stylesheet" />
      {notification && (
        <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: notification.type === "error" ? "#DC2626" : "#16A34A", color: "#fff", borderRadius: 16, padding: "16px 28px", fontSize: 14, fontWeight: 600, zIndex: 9999, boxShadow: "0 8px 28px rgba(0, 71, 171, 0.35)" }}>
          {notification.msg}
        </div>
      )}
      {!user ? (
        <LoginPage onLogin={setUser} />
      ) : user.role === "admin" ? (
        <AdminPage user={user} demandes={demandes} onArchiveMois={handleArchiveMois} onDeleteMois={handleDeleteMois} onResetCompteurs={handleResetCompteurs} onUpdatePaiement={handleUpdatePaiement} onChangeAdminPassword={handleChangeAdminPassword} />
      ) : user.role === "delegue" ? (
        <DelegatePage user={user} demandes={demandes} onArchive={handleArchive} onDelete={handleDelete} onUpdatePaiement={handleUpdatePaiement} onChangePassword={handleChangePassword} />
      ) : (
        <EtudiantPage user={user} demandes={demandes} onDemander={handleDemander} onAnnuler={handleAnnuler} onChangePassword={handleChangePassword} />
      )}
      {user && (
        <div style={{ position: "fixed", bottom: 20, right: 20 }}>
          <Button variant="secondary" onClick={() => setUser(null)} style={{ fontSize: 13, padding: "10px 20px" }}>Déconnexion</Button>
        </div>
      )}
    </>
  );
}