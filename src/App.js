import { useState, useEffect } from "react";
import { db, getConfig, verifyAdmin, verifyDelegue, getEtudiantsByClasse, getAllEtudiants, getAllDelegues } from "./firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot, updateDoc, writeBatch, getDocs, query, where } from "firebase/firestore";
import { hashCode, verifyCode } from "./utils/hash";
import * as XLSX from 'xlsx';

// ============================================================
// CONSTANTES
// ============================================================
const PRIX_SOUCHE = 2000;
const MAX_SOUCHES_PAR_MOIS = 3;

// ============================================================
// COMPOSANTS UI
// ============================================================

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{
        width: 50, height: 50, borderRadius: 12,
        background: "linear-gradient(135deg, #FF6B35, #F7C59F)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, fontWeight: 900, color: "#fff", letterSpacing: -1,
        boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)"
      }}>E</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", letterSpacing: -0.5 }}>SoucheApp</div>
        <div style={{ fontSize: 9, color: "#888", letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 1.3 }}>
          École Nationale Supérieure<br/>de la Statistique et de l'Économie Appliquée
        </div>
      </div>
    </div>
  );
}

function Badge({ children, color = "#FF6B35" }) {
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}50`,
      borderRadius: 20, padding: "4px 12px", fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5, textTransform: "uppercase"
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 24,
      boxShadow: "0 2px 20px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0",
      ...style
    }}>{children}</div>
  );
}

function Button({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const base = {
    border: "none", borderRadius: 12, padding: "14px 28px", fontSize: 14,
    fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all 0.2s", opacity: disabled ? 0.5 : 1,
    ...style
  };
  const variants = {
    primary: { background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff", boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)" },
    secondary: { background: "#f5f5f5", color: "#333" },
    danger: { background: "#ffe5e5", color: "#cc0000" },
    success: { background: "#e5f5ee", color: "#007a3d" },
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
      {label && <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{
        border: "2px solid #eee", borderRadius: 10, padding: "12px 16px",
        fontSize: 14, color: "#333", background: "#fff", fontFamily: "inherit",
        outline: "none", cursor: "pointer"
      }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ============================================================
// PAGE LOGIN
// ============================================================
function LoginPage({ onLogin }) {
  const [mode, setMode] = useState("etudiant");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);

  const [classe, setClasse] = useState("");
  const [etudiants, setEtudiants] = useState([]);
  const [selectedEtudiant, setSelectedEtudiant] = useState("");

  const [code, setCode] = useState("");

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (classe && mode === "etudiant") {
      loadEtudiants();
    }
  }, [classe]);

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
    if (!selectedEtudiant) {
      setError("Veuillez sélectionner votre nom");
      return;
    }

    const etudiant = etudiants.find(e => e.id === selectedEtudiant);
    onLogin({
      role: "etudiant",
      nom: etudiant.nomComplet,
      classe: etudiant.classe,
      etudiantId: etudiant.id
    });
  };

  const handleLoginDelegue = async () => {
    setLoading(true);
    setError("");

    try {
      const hash = await hashCode(code);
      const delegue = await verifyDelegue(hash);

      if (delegue) {
        onLogin({
          role: "delegue",
          nom: delegue.nom,
          classe: delegue.classe,
          delegueId: delegue.id
        });
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
        onLogin({
          role: "admin",
          nom: admin.nom,
          adminId: admin.id
        });
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
    <div style={{
      minHeight: "100vh", 
      background: "linear-gradient(160deg, #fff8f5 0%, #fff 60%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'Syne', sans-serif"
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <Logo />
          <p style={{ color: "#666", marginTop: 16, fontSize: 15, lineHeight: 1.6 }}>
            Système de réservation de souches<br/>de tickets de cantine
          </p>
        </div>

        <Card>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <Button
              variant={mode === "etudiant" ? "primary" : "secondary"}
              onClick={() => setMode("etudiant")}
              style={{ flex: 1, padding: "10px 16px" }}
            >
              👨‍🎓 Étudiant
            </Button>
            <Button
              variant={mode === "delegue" ? "primary" : "secondary"}
              onClick={() => setMode("delegue")}
              style={{ flex: 1, padding: "10px 16px" }}
            >
              👥 Délégué
            </Button>
            <Button
              variant={mode === "admin" ? "primary" : "secondary"}
              onClick={() => setMode("admin")}
              style={{ flex: 1, padding: "10px 16px" }}
            >
              👔 Admin
            </Button>
          </div>

          {mode === "etudiant" && config && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Select
                label="Votre classe"
                value={classe}
                onChange={setClasse}
                options={config.classes.map(c => ({ value: c, label: c }))}
              />

              {etudiants.length > 0 ? (
                <Select
                  label="Votre nom"
                  value={selectedEtudiant}
                  onChange={setSelectedEtudiant}
                  options={etudiants.map(e => ({ value: e.id, label: e.nomComplet }))}
                />
              ) : (
                <p style={{ color: "#888", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                  Aucun étudiant dans cette classe.<br/>Contactez l'administration.
                </p>
              )}

              {error && <p style={{ color: "#cc0000", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}

              <Button onClick={handleLoginEtudiant} style={{ width: "100%", marginTop: 8 }} disabled={etudiants.length === 0}>
                Se connecter →
              </Button>
            </div>
          )}

          {mode === "delegue" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Code délégué</label>
                <input
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Entrez votre code"
                  style={{
                    width: "100%", border: "2px solid #eee", borderRadius: 10,
                    padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {error && <p style={{ color: "#cc0000", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}

              <Button onClick={handleLoginDelegue} style={{ width: "100%", marginTop: 8 }} disabled={loading}>
                {loading ? "⏳ Connexion..." : "Se connecter →"}
              </Button>
            </div>
          )}

          {mode === "admin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Code administrateur</label>
                <input
                  type="password"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Entrez votre code"
                  style={{
                    width: "100%", border: "2px solid #eee", borderRadius: 10,
                    padding: "12px 16px", fontSize: 14, fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              {error && <p style={{ color: "#cc0000", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}

              <Button onClick={handleLoginAdmin} style={{ width: "100%", marginTop: 8 }} disabled={loading}>
                {loading ? "⏳ Connexion..." : "Se connecter →"}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// PAGE ÉTUDIANT
// ============================================================
function EtudiantPage({ user, demandes, onDemander, onAnnuler }) {
  const moisActuel = new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const moisActuelCode = getCurrentMois();
  
  const mesDemandesMois = demandes.filter(
    d => d.nom === user.nom && d.classe === user.classe && d.mois === moisActuelCode
  );

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
      setError(`Limite dépassée ! Vous avez déjà commandé ${totalSouchesCommandees} souche(s) ce mois. Vous ne pouvez commander que ${souchesRestantes} souche(s) supplémentaire(s).`);
      return;
    }

    setLoading(true);
    await onDemander(nbSouchesInt);
    setLoading(false);
  };

  const optionsSouches = [];
  for (let i = 1; i <= Math.min(3, souchesRestantes); i++) {
    optionsSouches.push({
      value: String(i),
      label: `${i} souche${i > 1 ? "s" : ""} (${i * 10} tickets) - ${i * PRIX_SOUCHE} FCFA`
    });
  }

  return (
    <div style={{ padding: 20, maxWidth: 520, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <Logo />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#888" }}>{user.classe}</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{user.nom}</div>
        </div>
      </div>

      <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Mois en cours</div>
        <div style={{ fontSize: 24, fontWeight: 800, textTransform: "capitalize" }}>{moisActuel}</div>
        <div style={{ marginTop: 12, fontSize: 14, opacity: 0.9 }}>
          📋 {totalDemandes} demande(s) au total
        </div>
      </Card>

      <Card style={{ marginBottom: 16, background: totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#ffe5e5" : "#e5f5ee", border: `2px solid ${totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#cc0000" : "#007a3d"}` }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#cc0000" : "#007a3d" }}>
          📊 Votre compteur ce mois
        </div>
        <div style={{ fontSize: 48, fontWeight: 900, color: totalSouchesCommandees >= MAX_SOUCHES_PAR_MOIS ? "#cc0000" : "#007a3d" }}>
          {totalSouchesCommandees} / {MAX_SOUCHES_PAR_MOIS}
        </div>
        <div style={{ fontSize: 13, color: "#555", marginTop: 8 }}>
          {peutCommander ? (
            <>Vous pouvez encore commander <strong>{souchesRestantes} souche{souchesRestantes > 1 ? "s" : ""}</strong></>
          ) : (
            <><strong>Limite atteinte !</strong> Vous ne pouvez plus commander ce mois.</>
          )}
        </div>
        <div style={{ fontSize: 11, color: "#888", marginTop: 12, fontStyle: "italic" }}>
          ℹ️ Le compteur se remet automatiquement à 0 chaque nouveau mois
        </div>
      </Card>

      <Card style={{ marginBottom: 16, background: "#fffbf5", border: "1px solid #FFD9C7" }}>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>
          📌 <strong>Règle importante :</strong> 
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
            <li>Maximum <strong>{MAX_SOUCHES_PAR_MOIS} souches par mois</strong></li>
            <li>Vous pouvez faire <strong>plusieurs demandes</strong></li>
            <li>Prix : <strong>{PRIX_SOUCHE} FCFA</strong> par souche</li>
          </ul>
        </div>
      </Card>

      {mesDemandesActives.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 14 }}>Mes demandes en attente ({mesDemandesActives.length})</div>
          {mesDemandesActives.map((d, i) => (
            <div key={d.id} style={{
              padding: 14,
              background: "#f8f8f8",
              borderRadius: 10,
              marginBottom: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>Demande #{i + 1}</div>
                <div style={{ fontSize: 13, color: "#888" }}>
                  {d.nbSouches} souche{d.nbSouches > 1 ? "s" : ""} = {d.nbSouches * PRIX_SOUCHE} FCFA
                </div>
              </div>
              <Button 
                variant="danger" 
                onClick={() => onAnnuler(d.id)} 
                style={{ padding: "8px 16px", fontSize: 12 }}
              >
                🗑️ Annuler
              </Button>
            </div>
          ))}
        </Card>
      )}

      {peutCommander ? (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>Nouvelle demande</div>
          <Select
            label="Nombre de souches"
            value={nbSouches}
            onChange={setNbSouches}
            options={optionsSouches}
          />
          
          {error && (
            <div style={{ background: "#ffe5e5", padding: 12, borderRadius: 10, marginTop: 16 }}>
              <p style={{ fontSize: 13, color: "#cc0000", margin: 0, fontWeight: 600 }}>
                ⚠️ {error}
              </p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            style={{ width: "100%", marginTop: 16 }}
            disabled={loading || optionsSouches.length === 0}
          >
            {loading ? "⏳ Enregistrement..." : "✅ Confirmer ma demande"}
          </Button>
        </Card>
      ) : (
        <Card style={{ background: "#ffe5e5", border: "2px solid #cc0000" }}>
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#cc0000", marginBottom: 8 }}>
              Limite mensuelle atteinte
            </div>
            <div style={{ fontSize: 14, color: "#555" }}>
              Vous avez déjà commandé {totalSouchesCommandees} souche(s) ce mois.<br/>
              Rendez-vous le mois prochain pour commander à nouveau.
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// PAGE DÉLÉGUÉ
// ============================================================
function DelegatePage({ user, demandes, onArchive, onDelete, onUpdatePaiement, onChangePassword }) {
  const [recherche, setRecherche] = useState("");
  const [montantsPayes, setMontantsPayes] = useState({});
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const moisActuel = getCurrentMois();

  const demandesMois = demandes.filter(d => d.mois === moisActuel && d.classe === user.classe && d.statut !== "traitee");
  const demandesFiltrees = demandesMois.filter(d => 
    d.nom.toLowerCase().includes(recherche.toLowerCase())
  );

  const totalSouches = demandesMois.reduce((sum, d) => sum + d.nbSouches, 0);
  const totalMontant = demandesMois.reduce((sum, d) => sum + (d.nbSouches * PRIX_SOUCHE), 0);
  const showNotification = demandesMois.length >= 3;

  const exportExcel = () => {
    const data = demandesFiltrees.map(d => {
      const montantDu = d.nbSouches * PRIX_SOUCHE;
      const montantPaye = d.montantPaye || 0;
      const monnaie = montantPaye - montantDu;
      return {
        "Nom": d.nom,
        "Classe": d.classe,
        "Souches": d.nbSouches,
        "Tickets": d.nbSouches * 10,
        "Montant Dû": montantDu,
        "Montant Payé": montantPaye,
        "Monnaie": monnaie
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demandes");
    XLSX.writeFile(wb, `souches_${user.classe}_${moisActuel}.xlsx`);
  };

  const handleMontantChange = (demandeId, value) => {
    setMontantsPayes(prev => ({ ...prev, [demandeId]: value }));
  };

  const handleSavePaiement = async (demande) => {
    const montant = parseInt(montantsPayes[demande.id] || 0);
    await onUpdatePaiement(demande.id, montant);
  };

  const handleArchiveClasse = async () => {
    if (window.confirm(`Archiver les ${demandesMois.length} demande(s) de votre classe ${user.classe} ?\n\nLes données seront conservées dans l'historique.`)) {
      await onArchive(user.classe);
      setShowActionMenu(false);
    }
  };

  const handleDeleteClasse = async () => {
    if (window.confirm(`⚠️ ATTENTION ! Supprimer définitivement les ${demandesMois.length} demande(s) de votre classe ${user.classe} ?\n\nCette action est IRRÉVERSIBLE. Les données ne seront PAS conservées dans l'historique.`)) {
      await onDelete(user.classe);
      setShowActionMenu(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <Logo />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {showNotification && (
            <div style={{
              background: "#cc0000", color: "#fff", borderRadius: 20,
              padding: "6px 14px", fontSize: 12, fontWeight: 700,
              animation: "pulse 2s infinite"
            }}>
              🔔 {demandesMois.length} demandes
            </div>
          )}
          <Badge color="#6B35FF">Délégué {user.classe}</Badge>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card style={{ background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Demandes</div>
          <div style={{ fontSize: 40, fontWeight: 900 }}>{demandesMois.length}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Souches</div>
          <div style={{ fontSize: 40, fontWeight: 900 }}>{totalSouches}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{totalSouches * 10} tickets</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #007a3d, #005a2d)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Montant</div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{totalMontant.toLocaleString()}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>FCFA</div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <Button onClick={exportExcel} variant="success" style={{ flex: 1 }}>📥 Exporter Excel</Button>
        <Button onClick={() => setShowChangePassword(true)} variant="secondary" style={{ flex: 1 }}>🔑 Changer code</Button>
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          user={user}
          onClose={() => setShowChangePassword(false)}
          onChangePassword={onChangePassword}
        />
      )}

      <Card style={{ marginBottom: 20 }}>
        <input
          value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="🔍 Rechercher par nom..."
          style={{
            width: "100%", border: "2px solid #eee", borderRadius: 10, padding: "12px 16px",
            fontSize: 14, fontFamily: "inherit", outline: "none", boxSizing: "border-box"
          }}
        />
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {demandesFiltrees.length === 0 ? (
          <Card style={{ textAlign: "center", color: "#888", padding: 50 }}>
            Aucune demande active pour votre classe.
          </Card>
        ) : demandesFiltrees.map((d, i) => {
          const montantDu = d.nbSouches * PRIX_SOUCHE;
          const montantPaye = d.montantPaye || 0;
          const monnaie = montantPaye - montantDu;
          const montantSaisi = montantsPayes[d.id] !== undefined ? montantsPayes[d.id] : montantPaye;

          return (
            <Card key={d.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, background: "#FF6B3520",
                    color: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 900, fontSize: 16
                  }}>{i + 1}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{d.nom}</div>
                    <div style={{ fontSize: 12, color: "#888" }}>{d.classe}</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#FF6B35" }}>{d.nbSouches}</div>
                  <div style={{ fontSize: 11, color: "#888" }}>souche{d.nbSouches > 1 ? "s" : ""}</div>
                </div>
              </div>

              <div style={{ background: "#f8f8f8", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>MONTANT DÛ</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#007a3d" }}>{montantDu.toLocaleString()} F</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>MONTANT PAYÉ</div>
                    <input
                      type="number"
                      value={montantSaisi}
                      onChange={e => handleMontantChange(d.id, e.target.value)}
                      placeholder="0"
                      style={{
                        width: "100%", border: "2px solid #007a3d", borderRadius: 10,
                        padding: "8px 12px", fontSize: 18, fontWeight: 700, color: "#007a3d",
                        outline: "none", boxSizing: "border-box"
                      }}
                    />
                  </div>
                </div>

                {montantSaisi && montantSaisi !== "" && (
                  <div style={{
                    background: monnaie > 0 ? "#e5f5ee" : monnaie < 0 ? "#ffe5e5" : "#fff",
                    borderRadius: 10, padding: 12, marginBottom: 12
                  }}>
                    <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>MONNAIE À RENDRE</div>
                    <div style={{
                      fontSize: 24, fontWeight: 900,
                      color: monnaie > 0 ? "#007a3d" : monnaie < 0 ? "#cc0000" : "#888"
                    }}>
                      {monnaie > 0 ? "+" : ""}{monnaie.toLocaleString()} FCFA
                    </div>
                  </div>
                )}

                {montantSaisi !== montantPaye && (
                  <Button
                    onClick={() => handleSavePaiement(d)}
                    variant="success"
                    style={{ width: "100%", padding: "10px 20px", fontSize: 14 }}
                  >
                    💾 Enregistrer le paiement
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {demandesMois.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <Button
            variant="success"
            onClick={() => setShowActionMenu(!showActionMenu)}
            style={{ width: "100%", background: "linear-gradient(135deg, #FF9500, #FF5E3A)", color: "#fff" }}
          >
            ⚙️ Actions sur ma classe ({demandesMois.length} demandes) {showActionMenu ? "▲" : "▼"}
          </Button>

          {showActionMenu && (
            <Card style={{ marginTop: 16, background: "#fff3e0" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#FF9500" }}>
                Choisir l'action :
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Button
                  variant="success"
                  onClick={handleArchiveClasse}
                  style={{ background: "#007a3d", color: "#fff" }}
                >
                  📦 Archiver (conserve dans l'historique)
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeleteClasse}
                >
                  🗑️ Supprimer définitivement (pas d'historique)
                </Button>
              </div>
              <p style={{ fontSize: 12, color: "#888", marginTop: 12, marginBottom: 0 }}>
                💡 <strong>Archiver</strong> : Les données sont conservées pour les statistiques<br/>
                ⚠️ <strong>Supprimer</strong> : Utile pour les tests, données perdues
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MODAL CHANGEMENT MOT DE PASSE
// ============================================================
function ChangePasswordModal({ user, onClose, onChangePassword }) {
  const [codeActuel, setCodeActuel] = useState("");
  const [nouveauCode, setNouveauCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!codeActuel || !nouveauCode || !confirmation) {
      setError("Tous les champs sont requis");
      return;
    }

    if (nouveauCode !== confirmation) {
      setError("Les nouveaux codes ne correspondent pas");
      return;
    }

    if (nouveauCode.length < 6) {
      setError("Le code doit faire au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      await onChangePassword(codeActuel, nouveauCode);
      alert("✅ Code modifié avec succès ! Reconnectez-vous avec le nouveau code.");
      window.location.reload();
    } catch (err) {
      setError(err.message || "Erreur lors de la modification");
    }

    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, padding: 20
    }}>
      <Card style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>🔑 Changer mon code</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 28, cursor: "pointer", color: "#888" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Code actuel</label>
            <input
              type="password"
              value={codeActuel}
              onChange={e => setCodeActuel(e.target.value)}
              placeholder="Entrez votre code actuel"
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10,
                padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Nouveau code</label>
            <input
              type="password"
              value={nouveauCode}
              onChange={e => setNouveauCode(e.target.value)}
              placeholder="Minimum 6 caractères"
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10,
                padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Confirmer le nouveau code</label>
            <input
              type="password"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              placeholder="Retapez le nouveau code"
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10,
                padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          {error && <p style={{ color: "#cc0000", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
              {loading ? "⏳ Modification..." : "💾 Modifier"}
            </Button>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              Annuler
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// PAGE ADMIN
// ============================================================
function AdminPage({ user, demandes, onArchiveMois, onDeleteMois, onResetCompteurs, onUpdatePaiement }) {
  const [tab, setTab] = useState("dashboard");
  const [etudiants, setEtudiants] = useState([]);
  const [delegues, setDelegues] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [etds, dels, cfg] = await Promise.all([
      getAllEtudiants(),
      getAllDelegues(),
      getConfig()
    ]);
    setEtudiants(etds);
    setDelegues(dels);
    setConfig(cfg);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <Logo />
        <Badge color="#9B35FF">Administrateur</Badge>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 24, overflowX: "auto" }}>
        <Button
          variant={tab === "dashboard" ? "primary" : "secondary"}
          onClick={() => setTab("dashboard")}
          style={{ padding: "12px 24px" }}
        >
          📊 Dashboard
        </Button>
        <Button
          variant={tab === "historique" ? "primary" : "secondary"}
          onClick={() => setTab("historique")}
          style={{ padding: "12px 24px" }}
        >
          📜 Historique
        </Button>
        <Button
          variant={tab === "etudiants" ? "primary" : "secondary"}
          onClick={() => setTab("etudiants")}
          style={{ padding: "12px 24px" }}
        >
          👨‍🎓 Étudiants
        </Button>
        <Button
          variant={tab === "delegues" ? "primary" : "secondary"}
          onClick={() => setTab("delegues")}
          style={{ padding: "12px 24px" }}
        >
          👥 Délégués
        </Button>
        <Button
          variant={tab === "export" ? "primary" : "secondary"}
          onClick={() => setTab("export")}
          style={{ padding: "12px 24px" }}
        >
          📥 Exports
        </Button>
      </div>

      {tab === "dashboard" && (
        <AdminDashboard demandes={demandes} etudiants={etudiants} delegues={delegues} config={config} onArchiveMois={onArchiveMois} onDeleteMois={onDeleteMois} onResetCompteurs={onResetCompteurs} />
      )}

      {tab === "historique" && (
        <AdminHistorique demandes={demandes} config={config} />
      )}

      {tab === "etudiants" && (
        <AdminEtudiants etudiants={etudiants} config={config} onReload={loadData} />
      )}

      {tab === "delegues" && (
        <AdminDelegues delegues={delegues} config={config} onReload={loadData} />
      )}

      {tab === "export" && (
        <AdminExports 
          demandes={demandes}
          etudiants={etudiants}
          config={config}
        />
      )}
    </div>
  );
}

// ============================================================
// ADMIN - DASHBOARD
// ============================================================
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
    return {
      classe,
      nbDemandes: demandesClasse.length,
      nbSouches: demandesClasse.reduce((sum, d) => sum + d.nbSouches, 0),
      delegue: delegue ? delegue.nom : "Non défini"
    };
  });

  const handleArchiveClasse = async (classe) => {
    const nbDemandes = demandesMoisActives.filter(d => d.classe === classe).length;
    if (window.confirm(`Archiver les ${nbDemandes} demande(s) actives de la classe ${classe} ?`)) {
      await onArchiveMois(classe, moisActuel);
      setShowActionMenu(false);
    }
  };

  const handleDeleteClasse = async (classe) => {
    const nbDemandes = demandesMoisActives.filter(d => d.classe === classe).length;
    if (window.confirm(`⚠️ Supprimer définitivement les ${nbDemandes} demande(s) de ${classe} ?`)) {
      await onDeleteMois(classe, moisActuel);
      setShowActionMenu(false);
    }
  };

  const handleArchiveAll = async () => {
    if (window.confirm(`Archiver TOUTES les ${demandesMoisActives.length} demandes actives du mois ?`)) {
      await onArchiveMois(null, moisActuel);
      setShowActionMenu(false);
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm(`⚠️ Supprimer définitivement TOUTES les ${demandesMoisActives.length} demandes ?`)) {
      await onDeleteMois(null, moisActuel);
      setShowActionMenu(false);
    }
  };

  const handleResetCompteurs = async () => {
    if (window.confirm(`🔄 Réinitialiser tous les compteurs étudiants du mois ?\n\nCela permettra à tous les étudiants de commander à nouveau jusqu'à 3 souches.\n\nUtile pour les tests.`)) {
      await onResetCompteurs();
    }
  };

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card style={{ background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Demandes actives</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{demandesMoisActives.length}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Souches</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{totalSouches}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #007a3d, #005a2d)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Montant</div>
          <div style={{ fontSize: 32, fontWeight: 900 }}>{totalMontant.toLocaleString()}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>FCFA</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #6B35FF, #9B35FF)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Étudiants</div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{etudiants.length}</div>
        </Card>
      </div>

      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20 }}>📊 Répartition par classe (mois en cours)</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {statsByClasse.map(stat => (
            <div key={stat.classe} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: 16, background: "#f8f8f8", borderRadius: 12
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{stat.classe}</div>
                <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>Délégué: {stat.delegue}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#FF6B35" }}>{stat.nbDemandes} demandes</div>
                <div style={{ fontSize: 13, color: "#888" }}>{stat.nbSouches} souches</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        <Button
          variant="secondary"
          onClick={handleResetCompteurs}
          style={{ flex: 1, background: "#6B35FF", color: "#fff" }}
        >
          🔄 Réinitialiser les compteurs (Tests)
        </Button>
      </div>

      {demandesMoisActives.length > 0 && (
        <div>
          <Button
            variant="success"
            onClick={() => setShowActionMenu(!showActionMenu)}
            style={{ width: "100%", background: "linear-gradient(135deg, #FF9500, #FF5E3A)", color: "#fff" }}
          >
            ⚙️ Actions globales {showActionMenu ? "▲" : "▼"}
          </Button>

          {showActionMenu && (
            <Card style={{ marginTop: 16, background: "#fff3e0" }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#FF9500" }}>
                Choisir l'action pour le mois en cours :
              </div>
              
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Par classe :</p>
                {classes.map(classe => {
                  const nbClasse = demandesMoisActives.filter(d => d.classe === classe).length;
                  if (nbClasse === 0) return null;
                  return (
                    <div key={classe} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                      <Button
                        variant="success"
                        onClick={() => handleArchiveClasse(classe)}
                        style={{ flex: 1, background: "#007a3d", color: "#fff", fontSize: 13 }}
                      >
                        📦 Archiver {classe} ({nbClasse})
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => handleDeleteClasse(classe)}
                        style={{ flex: 1, fontSize: 13 }}
                      >
                        🗑️ Supprimer {classe} ({nbClasse})
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div style={{ borderTop: "2px solid #ddd", paddingTop: 16 }}>
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Toutes les classes :</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <Button
                    variant="success"
                    onClick={handleArchiveAll}
                    style={{ flex: 1, background: "#007a3d", color: "#fff" }}
                  >
                    📦 Archiver tout ({demandesMoisActives.length})
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDeleteAll}
                    style={{ flex: 1 }}
                  >
                    🗑️ Supprimer tout ({demandesMoisActives.length})
                  </Button>
                </div>
              </div>

              <p style={{ fontSize: 12, color: "#888", marginTop: 12, marginBottom: 0 }}>
                💡 <strong>Archiver</strong> : Conserve les données dans l'historique<br/>
                ⚠️ <strong>Supprimer</strong> : Supprime définitivement (utile pour les tests)
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// ADMIN - HISTORIQUE
// ============================================================
function AdminHistorique({ demandes, config }) {
  const [filtreClasse, setFiltreClasse] = useState("toutes");
  const [filtreMois, setFiltreMois] = useState("tous");
  const [filtreDate, setFiltreDate] = useState("");
  const [recherche, setRecherche] = useState("");

  const classes = config ? config.classes : [];
  const moisUniques = [...new Set(demandes.map(d => d.mois))].sort().reverse();

  let demandesFiltrees = demandes;

  if (filtreClasse !== "toutes") {
    demandesFiltrees = demandesFiltrees.filter(d => d.classe === filtreClasse);
  }

  if (filtreMois !== "tous") {
    demandesFiltrees = demandesFiltrees.filter(d => d.mois === filtreMois);
  }

  if (filtreDate) {
    demandesFiltrees = demandesFiltrees.filter(d => {
      const dateD = d.date ? d.date.split('T')[0] : "";
      return dateD === filtreDate;
    });
  }

  if (recherche) {
    demandesFiltrees = demandesFiltrees.filter(d => 
      d.nom.toLowerCase().includes(recherche.toLowerCase())
    );
  }

  const totalSouches = demandesFiltrees.reduce((sum, d) => sum + d.nbSouches, 0);
  const totalMontant = demandesFiltrees.reduce((sum, d) => sum + (d.nbSouches * PRIX_SOUCHE), 0);

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20 }}>🔍 Filtres</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 6 }}>Classe</label>
            <select value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)} style={{
              width: "100%", border: "2px solid #eee", borderRadius: 10, padding: "10px 14px",
              fontSize: 14, outline: "none"
            }}>
              <option value="toutes">Toutes les classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 6 }}>Mois</label>
            <select value={filtreMois} onChange={e => setFiltreMois(e.target.value)} style={{
              width: "100%", border: "2px solid #eee", borderRadius: 10, padding: "10px 14px",
              fontSize: 14, outline: "none"
            }}>
              <option value="tous">Tous les mois</option>
              {moisUniques.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 6 }}>Date précise</label>
            <input 
              type="date" 
              value={filtreDate} 
              onChange={e => setFiltreDate(e.target.value)}
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10, padding: "10px 14px",
                fontSize: 14, outline: "none"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 6 }}>Recherche nom</label>
            <input 
              type="text" 
              value={recherche} 
              onChange={e => setRecherche(e.target.value)}
              placeholder="Nom de l'étudiant"
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10, padding: "10px 14px",
                fontSize: 14, outline: "none"
              }}
            />
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }}>
        <Card style={{ background: "#f8f8f8" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>TOTAL DEMANDES</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#FF6B35" }}>{demandesFiltrees.length}</div>
        </Card>
        <Card style={{ background: "#f8f8f8" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>TOTAL SOUCHES</div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#1a1a2e" }}>{totalSouches}</div>
        </Card>
        <Card style={{ background: "#f8f8f8" }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>MONTANT TOTAL</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: "#007a3d" }}>{totalMontant.toLocaleString()} F</div>
        </Card>
      </div>

      <Card>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20 }}>📜 Historique ({demandesFiltrees.length} demandes)</h3>
        
        {demandesFiltrees.length === 0 ? (
          <p style={{ textAlign: "center", color: "#888", padding: 40 }}>Aucune demande avec ces filtres</p>
        ) : (
          <div style={{ maxHeight: 600, overflow: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8f8f8", borderBottom: "2px solid #eee" }}>
                  <th style={{ padding: 12, textAlign: "left" }}>Date</th>
                  <th style={{ padding: 12, textAlign: "left" }}>Nom</th>
                  <th style={{ padding: 12, textAlign: "left" }}>Classe</th>
                  <th style={{ padding: 12, textAlign: "center" }}>Souches</th>
                  <th style={{ padding: 12, textAlign: "right" }}>Montant</th>
                  <th style={{ padding: 12, textAlign: "center" }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {demandesFiltrees.map((d, i) => (
                  <tr key={d.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: 12 }}>{d.date ? new Date(d.date).toLocaleDateString('fr-FR') : "-"}</td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{d.nom}</td>
                    <td style={{ padding: 12 }}>{d.classe}</td>
                    <td style={{ padding: 12, textAlign: "center", fontWeight: 700, color: "#FF6B35" }}>{d.nbSouches}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 600 }}>{(d.nbSouches * PRIX_SOUCHE).toLocaleString()} F</td>
                    <td style={{ padding: 12, textAlign: "center" }}>
                      {d.statut === "traitee" ? (
                        <span style={{ background: "#e5f5ee", color: "#007a3d", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          ✓ TRAITÉE
                        </span>
                      ) : (
                        <span style={{ background: "#fff3e0", color: "#FF9500", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
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

// ============================================================
// ADMIN - EXPORTS
// ============================================================
function AdminExports({ demandes, etudiants, config }) {
  const [filtreClasse, setFiltreClasse] = useState("toutes");
  const [filtreMois, setFiltreMois] = useState("tous");

  const classes = config ? config.classes : [];
  const moisUniques = [...new Set(demandes.map(d => d.mois))].sort().reverse();

  const exportGlobalExcel = () => {
    let data = demandes;

    if (filtreClasse !== "toutes") {
      data = data.filter(d => d.classe === filtreClasse);
    }

    if (filtreMois !== "tous") {
      data = data.filter(d => d.mois === filtreMois);
    }

    const excelData = data.map(d => ({
      "Date": d.date ? new Date(d.date).toLocaleDateString('fr-FR') : "",
      "Nom": d.nom,
      "Classe": d.classe,
      "Souches": d.nbSouches,
      "Tickets": d.nbSouches * 10,
      "Montant Dû": d.nbSouches * PRIX_SOUCHE,
      "Montant Payé": d.montantPaye || 0,
      "Monnaie": (d.montantPaye || 0) - (d.nbSouches * PRIX_SOUCHE),
      "Mois": d.mois,
      "Statut": d.statut === "traitee" ? "Traitée" : "Active"
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Demandes");
    
    const anneeScolaire = config ? config.anneeScolaire : new Date().getFullYear();
    const fileName = filtreClasse !== "toutes" 
      ? `souches_${filtreClasse}_${anneeScolaire}.xlsx`
      : `souches_annee_${anneeScolaire}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
  };

  const exportEtudiantsExcel = () => {
    const data = etudiants.map(e => ({
      "Nom": e.nom,
      "Prénom": e.prenom,
      "Nom Complet": e.nomComplet,
      "Classe": e.classe,
      "Date Ajout": e.dateAjout ? new Date(e.dateAjout).toLocaleDateString('fr-FR') : ""
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Étudiants");
    XLSX.writeFile(wb, `etudiants_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  let demandesFiltrees = demandes;
  if (filtreClasse !== "toutes") {
    demandesFiltrees = demandesFiltrees.filter(d => d.classe === filtreClasse);
  }
  if (filtreMois !== "tous") {
    demandesFiltrees = demandesFiltrees.filter(d => d.mois === filtreMois);
  }

  const totalDemandes = demandesFiltrees.length;
  const totalSouches = demandesFiltrees.reduce((sum, d) => sum + d.nbSouches, 0);
  const totalMontant = demandesFiltrees.reduce((sum, d) => sum + (d.nbSouches * PRIX_SOUCHE), 0);

  return (
    <div>
      <Card style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20 }}>🔍 Filtres pour l'export</h3>
        
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Classe</label>
            <select value={filtreClasse} onChange={e => setFiltreClasse(e.target.value)} style={{
              width: "100%", border: "2px solid #eee", borderRadius: 10, padding: "12px 16px",
              fontSize: 14, outline: "none"
            }}>
              <option value="toutes">Toutes les classes</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Mois</label>
            <select value={filtreMois} onChange={e => setFiltreMois(e.target.value)} style={{
              width: "100%", border: "2px solid #eee", borderRadius: 10, padding: "12px 16px",
              fontSize: 14, outline: "none"
            }}>
              <option value="tous">Tous les mois</option>
              {moisUniques.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <Card style={{ padding: 24, background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.9 }}>DEMANDES SÉLECTIONNÉES</div>
          <div style={{ fontSize: 42, fontWeight: 900, marginBottom: 8 }}>{totalDemandes}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16 }}>
            {totalSouches} souches • {totalMontant.toLocaleString()} FCFA
          </div>
          <Button onClick={exportGlobalExcel} variant="secondary" style={{ width: "100%", background: "#fff", color: "#FF6B35" }}>
            📥 Exporter les demandes (Excel)
          </Button>
        </Card>

        <Card style={{ padding: 24, background: "linear-gradient(135deg, #6B35FF, #9B35FF)", color: "#fff" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, opacity: 0.9 }}>TOUS LES ÉTUDIANTS</div>
          <div style={{ fontSize: 42, fontWeight: 900, marginBottom: 8 }}>{etudiants.length}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16 }}>
            Liste complète des étudiants inscrits
          </div>
          <Button onClick={exportEtudiantsExcel} variant="secondary" style={{ width: "100%", background: "#fff", color: "#6B35FF" }}>
            📥 Exporter les étudiants (Excel)
          </Button>
        </Card>
      </div>

      <Card style={{ marginTop: 20, background: "#e5f5ee", border: "2px solid #007a3d" }}>
        <h4 style={{ margin: "0 0 16px 0", fontSize: 17, color: "#007a3d" }}>✅ Fonctionnalités</h4>
        <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, lineHeight: 2, color: "#555" }}>
          <li>Export en <strong>format Excel (.xlsx)</strong></li>
          <li>Filtrage par <strong>classe</strong> et par <strong>mois</strong></li>
          <li>Inclut <strong>toutes les demandes</strong> (actives + traitées)</li>
          <li>Colonnes : Date, Nom, Classe, Souches, Montant, Statut</li>
        </ul>
      </Card>
    </div>
  );
}

// ============================================================
// ADMIN - ÉTUDIANTS (AVEC CHOIX REMPLACER/AJOUTER + EXCEL)
// ============================================================
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
      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n');
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const [nom, prenom, classe] = line.split(',');
          if (nom && nom.trim() && prenom && prenom.trim()) {
            data.push({
              nom: nom.trim().toUpperCase(),
              prenom: prenom.trim(),
              classe: classe ? classe.trim().toUpperCase() : "",
              nomComplet: `${nom.trim().toUpperCase()} ${prenom.trim()}`,
              actif: true,
              dateAjout: new Date().toISOString()
            });
          }
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length < 2) continue;
          
          const [nom, prenom, classe] = row;
          if (nom && prenom) {
            data.push({
              nom: String(nom).trim().toUpperCase(),
              prenom: String(prenom).trim(),
              classe: classe ? String(classe).trim().toUpperCase() : "",
              nomComplet: `${String(nom).trim().toUpperCase()} ${String(prenom).trim()}`,
              actif: true,
              dateAjout: new Date().toISOString()
            });
          }
        }
      } else {
        alert("Format de fichier non supporté. Utilisez CSV ou Excel (.xlsx, .xls)");
        return;
      }

      setEtudiantsPreview(data);
      setFichier(file);
    } catch (error) {
      console.error("Erreur lecture fichier:", error);
      alert("Erreur lors de la lecture du fichier");
    }
  };

  const handleImport = async () => {
    setImporting(true);
    setProgress(0);

    try {
      if (modeImport === "remplacer") {
        const allEtudiants = await getDocs(collection(db, "etudiants"));
        const deletePromises = allEtudiants.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
      }

      const BATCH_SIZE = 500;
      let compteur = 0;

      for (let i = 0; i < etudiantsPreview.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const groupe = etudiantsPreview.slice(i, i + BATCH_SIZE);

        groupe.forEach(etudiant => {
          const docRef = doc(collection(db, "etudiants"));
          batch.set(docRef, etudiant);
        });

        await batch.commit();
        compteur += groupe.length;

        const pourcentage = Math.round((compteur / etudiantsPreview.length) * 100);
        setProgress(pourcentage);
      }

      const action = modeImport === "remplacer" ? "remplacés" : "ajoutés";
      alert(`🎉 ${compteur} étudiants ${action} avec succès !`);
      setImporting(false);
      setEtudiantsPreview([]);
      setFichier(null);
      onReload();

    } catch (error) {
      console.error("Erreur import:", error);
      alert("❌ Erreur lors de l'import");
      setImporting(false);
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20 }}>📥 Importer des étudiants</h3>

        {!fichier ? (
          <div>
            <p style={{ fontSize: 13, color: "#666", marginBottom: 16 }}>
              Format accepté : <strong>CSV ou Excel (.xlsx, .xls)</strong><br/>
              Structure : <strong>Nom, Prenom, Classe</strong>
            </p>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Mode d'import</label>
              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  variant={modeImport === "remplacer" ? "primary" : "secondary"}
                  onClick={() => setModeImport("remplacer")}
                  style={{ flex: 1 }}
                >
                  🔄 Remplacer
                </Button>
                <Button
                  variant={modeImport === "ajouter" ? "primary" : "secondary"}
                  onClick={() => setModeImport("ajouter")}
                  style={{ flex: 1 }}
                >
                  ➕ Ajouter
                </Button>
              </div>
              <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
                {modeImport === "remplacer" 
                  ? "⚠️ Supprime tous les étudiants existants avant l'import" 
                  : "✅ Conserve les étudiants existants et ajoute les nouveaux"}
              </p>
            </div>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              style={{ fontSize: 14 }}
            />
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, marginBottom: 10 }}>📄 Fichier : <strong>{fichier.name}</strong></p>
            <p style={{ fontSize: 14, marginBottom: 16 }}>✅ {etudiantsPreview.length} étudiants détectés</p>
            <p style={{ fontSize: 13, color: modeImport === "remplacer" ? "#cc0000" : "#007a3d", marginBottom: 16, fontWeight: 600 }}>
              Mode : {modeImport === "remplacer" ? "🔄 REMPLACEMENT" : "➕ AJOUT"}
            </p>

            {importing ? (
              <div>
                <div style={{
                  width: "100%",
                  height: 24,
                  background: "#eee",
                  borderRadius: 12,
                  overflow: "hidden",
                  marginBottom: 12
                }}>
                  <div style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, #FF6B35, #F7C59F)",
                    transition: "width 0.3s"
                  }} />
                </div>
                <p style={{ fontSize: 14, textAlign: "center", fontWeight: 600 }}>{progress}% - Import en cours...</p>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 12 }}>
                <Button onClick={handleImport}>
                  ✅ Importer
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFichier(null);
                    setEtudiantsPreview([]);
                  }}
                >
                  ❌ Annuler
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20 }}>👨‍🎓 Liste des étudiants ({etudiants.length})</h3>
        {etudiants.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: "40px 0" }}>Aucun étudiant. Importez un fichier.</p>
        ) : (
          <div style={{ maxHeight: 450, overflow: "auto" }}>
            {etudiants.slice(0, 50).map(e => (
              <div key={e.id} style={{
                padding: 14,
                borderBottom: "1px solid #eee",
                display: "flex",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{e.nomComplet}</div>
                  <div style={{ fontSize: 13, color: "#888" }}>{e.classe}</div>
                </div>
              </div>
            ))}
            {etudiants.length > 50 && (
              <p style={{ textAlign: "center", color: "#888", marginTop: 14, fontSize: 13 }}>
                ... et {etudiants.length - 50} autres
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

// ============================================================
// ADMIN - DÉLÉGUÉS
// ============================================================
function AdminDelegues({ delegues, config, onReload }) {
  const [editingDelegue, setEditingDelegue] = useState(null);
  const [editingNom, setEditingNom] = useState(null);

  return (
    <div>
      <Card>
        <h3 style={{ margin: "0 0 20px 0", fontSize: 20 }}>👥 Gestion des Délégués</h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {delegues.map(del => (
            <div key={del.id} style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: 16,
              background: "#f8f8f8",
              borderRadius: 12
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{del.classe} - {del.nom}</div>
                <div style={{ fontSize: 13, color: "#888" }}>Délégué de classe</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Button
                  variant="secondary"
                  onClick={() => setEditingNom(del)}
                  style={{ padding: "8px 16px", fontSize: 13 }}
                >
                  ✏️ Modifier nom
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setEditingDelegue(del)}
                  style={{ padding: "8px 16px", fontSize: 13 }}
                >
                  🔑 Changer code
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {editingDelegue && (
        <ResetDelegueCodeModal
          delegue={editingDelegue}
          onClose={() => setEditingDelegue(null)}
          onSuccess={onReload}
        />
      )}

      {editingNom && (
        <EditDelegueNomModal
          delegue={editingNom}
          onClose={() => setEditingNom(null)}
          onSuccess={onReload}
        />
      )}
    </div>
  );
}

// ============================================================
// MODALS DÉLÉGUÉS
// ============================================================
function EditDelegueNomModal({ delegue, onClose, onSuccess }) {
  const [nouveauNom, setNouveauNom] = useState(delegue.nom);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!nouveauNom || !nouveauNom.trim()) {
      setError("Le nom est requis");
      return;
    }

    setLoading(true);

    try {
      await updateDoc(doc(db, "delegues", delegue.id), {
        nom: nouveauNom.trim().toUpperCase()
      });

      alert(`✅ Nom modifié pour ${delegue.classe} !`);
      onSuccess();
      onClose();
    } catch (err) {
      setError("Erreur lors de la modification");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, padding: 20
    }}>
      <Card style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>✏️ Modifier le délégué - {delegue.classe}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 28, cursor: "pointer", color: "#888" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Nom du délégué</label>
            <input
              type="text"
              value={nouveauNom}
              onChange={e => setNouveauNom(e.target.value)}
              placeholder="Ex: KONAN Jean"
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10,
                padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          {error && <p style={{ color: "#cc0000", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
              {loading ? "⏳ Modification..." : "💾 Modifier"}
            </Button>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              Annuler
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function ResetDelegueCodeModal({ delegue, onClose, onSuccess }) {
  const [nouveauCode, setNouveauCode] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (!nouveauCode || !confirmation) {
      setError("Tous les champs sont requis");
      return;
    }

    if (nouveauCode !== confirmation) {
      setError("Les codes ne correspondent pas");
      return;
    }

    if (nouveauCode.length < 6) {
      setError("Le code doit faire au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      const hash = await hashCode(nouveauCode);
      await updateDoc(doc(db, "delegues", delegue.id), {
        codeHash: hash,
        dateModification: new Date().toISOString()
      });

      alert(`✅ Code modifié pour ${delegue.classe} ! Communiquez le nouveau code au délégué.`);
      onSuccess();
      onClose();
    } catch (err) {
      setError("Erreur lors de la modification");
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center",
      justifyContent: "center", zIndex: 9999, padding: 20
    }}>
      <Card style={{ maxWidth: 440, width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>🔑 Nouveau code - {delegue.classe}</h2>
          <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 28, cursor: "pointer", color: "#888" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ fontSize: 13, color: "#666" }}>Délégué : <strong>{delegue.nom}</strong></p>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Nouveau code</label>
            <input
              type="password"
              value={nouveauCode}
              onChange={e => setNouveauCode(e.target.value)}
              placeholder="Minimum 6 caractères"
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10,
                padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: "#888", display: "block", marginBottom: 8 }}>Confirmer</label>
            <input
              type="password"
              value={confirmation}
              onChange={e => setConfirmation(e.target.value)}
              placeholder="Retapez le code"
              style={{
                width: "100%", border: "2px solid #eee", borderRadius: 10,
                padding: "12px 16px", fontSize: 14, outline: "none", boxSizing: "border-box"
              }}
            />
          </div>

          {error && <p style={{ color: "#cc0000", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Button onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
              {loading ? "⏳ Modification..." : "💾 Modifier"}
            </Button>
            <Button variant="secondary" onClick={onClose} style={{ flex: 1 }}>
              Annuler
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// UTILS
// ============================================================
function getCurrentMois() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ============================================================
// APP PRINCIPALE
// ============================================================
export default function App() {
  const [user, setUser] = useState(null);
  const [demandes, setDemandes] = useState([]);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    const q = collection(db, "demandes");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDemandes(data);
    });
    return unsubscribe;
  }, []);

  const showNotif = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDemander = async (nbSouches) => {
    const mois = getCurrentMois();

    try {
      await addDoc(collection(db, "demandes"), {
        nom: user.nom,
        classe: user.classe,
        nbSouches,
        mois,
        date: new Date().toISOString(),
        montantPaye: 0,
        statut: "active"
      });
      showNotif(`✅ Demande de ${nbSouches} souche(s) enregistrée avec succès !`);
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de l'enregistrement.", "error");
    }
  };

  const handleAnnuler = async (id) => {
    try {
      await deleteDoc(doc(db, "demandes", id));
      showNotif("Demande annulée avec succès.");
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de l'annulation.", "error");
    }
  };

  const handleUpdatePaiement = async (demandeId, montantPaye) => {
    try {
      await updateDoc(doc(db, "demandes", demandeId), { montantPaye });
      showNotif("💰 Paiement enregistré avec succès !");
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de l'enregistrement du paiement.", "error");
    }
  };

  const handleArchive = async (classe) => {
    try {
      const mois = getCurrentMois();
      const toArchive = demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee");

      await Promise.all(toArchive.map(d => 
        updateDoc(doc(db, "demandes", d.id), { 
          statut: "traitee",
          dateTraitement: new Date().toISOString()
        })
      ));

      showNotif(`Classe ${classe} archivée avec succès !`);
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de l'archivage.", "error");
    }
  };

  const handleDelete = async (classe) => {
    try {
      const mois = getCurrentMois();
      const toDelete = demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee");

      await Promise.all(toDelete.map(d => deleteDoc(doc(db, "demandes", d.id))));

      showNotif(`Classe ${classe} supprimée avec succès !`);
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de la suppression.", "error");
    }
  };

  const handleArchiveMois = async (classe, mois) => {
    try {
      const toArchive = classe
        ? demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee")
        : demandes.filter(d => d.mois === mois && d.statut !== "traitee");

      await Promise.all(toArchive.map(d => 
        updateDoc(doc(db, "demandes", d.id), { 
          statut: "traitee",
          dateTraitement: new Date().toISOString()
        })
      ));

      if (classe) {
        showNotif(`Classe ${classe} archivée avec succès !`);
      } else {
        showNotif("Toutes les classes archivées avec succès !");
      }
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de l'archivage.", "error");
    }
  };

  const handleDeleteMois = async (classe, mois) => {
    try {
      const toDelete = classe
        ? demandes.filter(d => d.mois === mois && d.classe === classe && d.statut !== "traitee")
        : demandes.filter(d => d.mois === mois && d.statut !== "traitee");

      await Promise.all(toDelete.map(d => deleteDoc(doc(db, "demandes", d.id))));

      if (classe) {
        showNotif(`Classe ${classe} supprimée avec succès !`);
      } else {
        showNotif("Toutes les classes supprimées avec succès !");
      }
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de la suppression.", "error");
    }
  };

  const handleResetCompteurs = async () => {
    try {
      const mois = getCurrentMois();
      const toDelete = demandes.filter(d => d.mois === mois);
      
      await Promise.all(toDelete.map(d => deleteDoc(doc(db, "demandes", d.id))));
      
      showNotif("🔄 Tous les compteurs ont été réinitialisés !");
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de la réinitialisation.", "error");
    }
  };

  const handleChangePassword = async (codeActuel, nouveauCode) => {
    try {
      const hashActuel = await hashCode(codeActuel);
      let delegueDoc = null;

      if (user.role === "delegue") {
        const docSnap = await getDocs(query(collection(db, "delegues"), where("classe", "==", user.classe)));
        if (!docSnap.empty) {
          delegueDoc = docSnap.docs[0];
        }
      }

      if (!delegueDoc) {
        throw new Error("Délégué non trouvé");
      }

      const data = delegueDoc.data();
      if (data.codeHash !== hashActuel) {
        throw new Error("Code actuel incorrect");
      }

      const nouveauHash = await hashCode(nouveauCode);
      await updateDoc(doc(db, "delegues", delegueDoc.id), {
        codeHash: nouveauHash,
        dateModification: new Date().toISOString()
      });

    } catch (error) {
      throw error;
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {notification && (
        <div style={{
          position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
          background: notification.type === "error" ? "#cc0000" : "#007a3d",
          color: "#fff", borderRadius: 14, padding: "14px 24px", fontSize: 14,
          fontWeight: 600, zIndex: 9999, boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
          fontFamily: "'Syne', sans-serif", maxWidth: "90%", textAlign: "center"
        }}>
          {notification.msg}
        </div>
      )}

      {!user ? (
        <LoginPage onLogin={setUser} />
      ) : user.role === "admin" ? (
        <AdminPage user={user} demandes={demandes} onArchiveMois={handleArchiveMois} onDeleteMois={handleDeleteMois} onResetCompteurs={handleResetCompteurs} onUpdatePaiement={handleUpdatePaiement} />
      ) : user.role === "delegue" ? (
        <DelegatePage user={user} demandes={demandes} onArchive={handleArchive} onDelete={handleDelete} onUpdatePaiement={handleUpdatePaiement} onChangePassword={handleChangePassword} />
      ) : (
        <EtudiantPage user={user} demandes={demandes} onDemander={handleDemander} onAnnuler={handleAnnuler} />
      )}

      {user && (
        <div style={{ position: "fixed", bottom: 20, right: 20 }}>
          <Button variant="secondary" onClick={() => setUser(null)} style={{ fontSize: 13, padding: "10px 20px" }}>
            Déconnexion
          </Button>
        </div>
      )}
    </>
  );
}