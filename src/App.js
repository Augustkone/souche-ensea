iimport { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, deleteDoc, doc, onSnapshot } from "firebase/firestore";

// ============================================================
// COMPOSANTS UI
// ============================================================

function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10,
        background: "linear-gradient(135deg, #FF6B35, #F7C59F)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 20, fontWeight: 900, color: "#fff", letterSpacing: -1
      }}>S</div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", letterSpacing: -0.5 }}>SoucheApp</div>
        <div style={{ fontSize: 10, color: "#888", letterSpacing: 1, textTransform: "uppercase" }}>ENSEA Cantine</div>
      </div>
    </div>
  );
}

function Badge({ children, color = "#FF6B35" }) {
  return (
    <span style={{
      background: color + "20", color, border: `1px solid ${color}50`,
      borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5, textTransform: "uppercase"
    }}>{children}</span>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 16, padding: 20,
      boxShadow: "0 2px 16px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0",
      ...style
    }}>{children}</div>
  );
}

function Button({ children, onClick, variant = "primary", style = {}, disabled = false }) {
  const base = {
    border: "none", borderRadius: 12, padding: "12px 24px", fontSize: 14,
    fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", transition: "all 0.2s", opacity: disabled ? 0.5 : 1,
    ...style
  };
  const variants = {
    primary: { background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff" },
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
        border: "2px solid #eee", borderRadius: 10, padding: "10px 14px",
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
  const [matricule, setMatricule] = useState("");
  const [nom, setNom] = useState("");
  const [classe, setClasse] = useState("ISE1");
  const [isDelegate, setIsDelegate] = useState(false);
  const [delegateCode, setDelegateCode] = useState("");
  const [error, setError] = useState("");

  const DELEGATE_CODE = "ENSEA2024";

  const handleLogin = () => {
    if (!matricule.trim() || !nom.trim()) {
      setError("Veuillez remplir tous les champs.");
      return;
    }
    if (isDelegate && delegateCode !== DELEGATE_CODE) {
      setError("Code délégué incorrect.");
      return;
    }
    onLogin({
      matricule: matricule.trim().toUpperCase(),
      nom: nom.trim().toUpperCase(),
      classe,
      role: isDelegate ? "delegate" : "etudiant"
    });
  };

  return (
    <div style={{
      minHeight: "100vh", background: "linear-gradient(160deg, #fff8f5 0%, #fff 60%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: 20, fontFamily: "'Syne', sans-serif"
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Logo />
          <p style={{ color: "#888", marginTop: 12, fontSize: 14 }}>
            Réservation de souches de tickets de cantine
          </p>
        </div>

        <Card>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Matricule</label>
              <input
                value={matricule} onChange={e => setMatricule(e.target.value)}
                placeholder="Ex: 2021001"
                style={{
                  width: "100%", border: "2px solid #eee", borderRadius: 10,
                  padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
                  outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Nom complet</label>
              <input
                value={nom} onChange={e => setNom(e.target.value)}
                placeholder="Ex: KONAN Jean"
                style={{
                  width: "100%", border: "2px solid #eee", borderRadius: 10,
                  padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
                  outline: "none", boxSizing: "border-box"
                }}
              />
            </div>
            <Select
              label="Classe"
              value={classe}
              onChange={setClasse}
              options={["ISE1", "ISE2", "ISE3", "AS1", "AS2", "AS3"].map(c => ({ value: c, label: c }))}
            />

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input type="checkbox" id="delegate" checked={isDelegate} onChange={e => setIsDelegate(e.target.checked)} />
              <label htmlFor="delegate" style={{ fontSize: 13, color: "#555", cursor: "pointer" }}>Je suis délégué</label>
            </div>

            {isDelegate && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 6 }}>Code délégué</label>
                <input
                  type="password" value={delegateCode} onChange={e => setDelegateCode(e.target.value)}
                  placeholder="Code secret"
                  style={{
                    width: "100%", border: "2px solid #eee", borderRadius: 10,
                    padding: "10px 14px", fontSize: 14, fontFamily: "inherit",
                    outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>
            )}

            {error && <p style={{ color: "#cc0000", fontSize: 13, margin: 0 }}>⚠️ {error}</p>}

            <Button onClick={handleLogin} style={{ width: "100%", marginTop: 8 }}>
              Se connecter →
            </Button>
          </div>
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
  const maDemandeActuelle = demandes.find(
    d => d.matricule === user.matricule && d.mois === getCurrentMois()
  );

  const [nbSouches, setNbSouches] = useState("1");
  const [loading, setLoading] = useState(false);

  const totalDemandes = demandes.filter(d => d.mois === getCurrentMois()).length;

  const handleSubmit = async () => {
    setLoading(true);
    await onDemander(parseInt(nbSouches));
    setLoading(false);
  };

  return (
    <div style={{ padding: 20, maxWidth: 440, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Logo />
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#888" }}>{user.classe}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{user.nom}</div>
        </div>
      </div>

      <Card style={{ marginBottom: 16, background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff" }}>
        <div style={{ fontSize: 12, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Mois en cours</div>
        <div style={{ fontSize: 22, fontWeight: 800, textTransform: "capitalize" }}>{moisActuel}</div>
        <div style={{ marginTop: 12, fontSize: 13, opacity: 0.9 }}>
          📋 {totalDemandes} demande(s) enregistrée(s)
        </div>
      </Card>

      <Card style={{ marginBottom: 16, background: "#fffbf5", border: "1px solid #FFD9C7" }}>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>
          📌 <strong>Règle :</strong> Chaque étudiant peut commander <strong>au maximum 3 souches</strong> (paquets de 10 tickets) par mois.
        </div>
      </Card>

      {maDemandeActuelle ? (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Ma demande</div>
            <Badge color="#007a3d">✓ Enregistrée</Badge>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: "#FF6B35", margin: "8px 0" }}>
            {maDemandeActuelle.nbSouches} souche{maDemandeActuelle.nbSouches > 1 ? "s" : ""}
          </div>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>
            Soit {maDemandeActuelle.nbSouches * 10} tickets de cantine
          </div>
          <Button variant="danger" onClick={() => onAnnuler(maDemandeActuelle.id)} style={{ width: "100%" }} disabled={loading}>
            Annuler ma demande
          </Button>
        </Card>
      ) : (
        <Card>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16 }}>Faire une demande</div>
          <Select
            label="Nombre de souches"
            value={nbSouches}
            onChange={setNbSouches}
            options={[
              { value: "1", label: "1 souche (10 tickets)" },
              { value: "2", label: "2 souches (20 tickets)" },
              { value: "3", label: "3 souches (30 tickets)" },
            ]}
          />
          <Button
            onClick={handleSubmit}
            style={{ width: "100%", marginTop: 16 }}
            disabled={loading}
          >
            {loading ? "⏳ Enregistrement..." : "✅ Confirmer ma demande"}
          </Button>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// PAGE DÉLÉGUÉ
// ============================================================
function DelegatePage({ user, demandes, onReset }) {
  const [recherche, setRecherche] = useState("");
  const [classeFiltre, setClasseFiltre] = useState("TOUTES");
  const moisActuel = getCurrentMois();

  const demandesMois = demandes.filter(d => d.mois === moisActuel);
  const demandesFiltrees = demandesMois.filter(d => {
    const matchRecherche = d.nom.toLowerCase().includes(recherche.toLowerCase()) ||
      d.matricule.includes(recherche);
    const matchClasse = classeFiltre === "TOUTES" || d.classe === classeFiltre;
    return matchRecherche && matchClasse;
  });

  const totalSouches = demandesMois.reduce((sum, d) => sum + d.nbSouches, 0);
  const classes = [...new Set(demandesMois.map(d => d.classe))];

  const exportCSV = () => {
    const header = "Matricule,Nom,Classe,Souches,Tickets\n";
    const rows = demandesFiltrees.map(d =>
      `${d.matricule},${d.nom},${d.classe},${d.nbSouches},${d.nbSouches * 10}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `souches_${moisActuel}.csv`;
    a.click();
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto", fontFamily: "'Syne', sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <Logo />
        <Badge color="#6B35FF">Délégué</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Card style={{ background: "linear-gradient(135deg, #FF6B35, #e55a25)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Étudiants</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{demandesMois.length}</div>
        </Card>
        <Card style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", color: "#fff" }}>
          <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Total Souches</div>
          <div style={{ fontSize: 36, fontWeight: 900 }}>{totalSouches}</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>{totalSouches * 10} tickets</div>
        </Card>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Button onClick={exportCSV} variant="success" style={{ flex: 1 }}>📥 Exporter CSV</Button>
        <Button onClick={() => window.print()} variant="secondary" style={{ flex: 1 }}>🖨️ Imprimer</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            value={recherche} onChange={e => setRecherche(e.target.value)}
            placeholder="🔍 Rechercher par nom ou matricule..."
            style={{
              border: "2px solid #eee", borderRadius: 10, padding: "10px 14px",
              fontSize: 14, fontFamily: "inherit", outline: "none"
            }}
          />
          <Select
            value={classeFiltre}
            onChange={setClasseFiltre}
            options={[
              { value: "TOUTES", label: "Toutes les classes" },
              ...classes.map(c => ({ value: c, label: c }))
            ]}
          />
        </div>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {demandesFiltrees.length === 0 ? (
          <Card style={{ textAlign: "center", color: "#888", padding: 40 }}>
            Aucune demande pour ce mois.
          </Card>
        ) : demandesFiltrees.map((d, i) => (
          <Card key={d.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: "#FF6B3520",
                color: "#FF6B35", display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, fontSize: 14
              }}>{i + 1}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{d.nom}</div>
                <div style={{ fontSize: 12, color: "#888" }}>{d.matricule} · {d.classe}</div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#FF6B35" }}>{d.nbSouches}</div>
              <div style={{ fontSize: 11, color: "#888" }}>souche{d.nbSouches > 1 ? "s" : ""}</div>
            </div>
          </Card>
        ))}
      </div>

      {demandesMois.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Button variant="danger" onClick={onReset} style={{ width: "100%" }}>
            🔄 Réinitialiser pour le prochain mois
          </Button>
        </div>
      )}
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
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDemander = async (nbSouches) => {
    const mois = getCurrentMois();
    const dejaFait = demandes.find(d => d.matricule === user.matricule && d.mois === mois);
    if (dejaFait) { 
      showNotif("Tu as déjà une demande ce mois.", "error"); 
      return; 
    }

    try {
      await addDoc(collection(db, "demandes"), {
        matricule: user.matricule,
        nom: user.nom,
        classe: user.classe,
        nbSouches,
        mois,
        date: new Date().toISOString()
      });
      showNotif(`✅ Demande de ${nbSouches} souche(s) enregistrée !`);
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de l'enregistrement.", "error");
    }
  };

  const handleAnnuler = async (id) => {
    try {
      await deleteDoc(doc(db, "demandes", id));
      showNotif("Demande annulée.", "error");
    } catch (error) {
      console.error("Erreur:", error);
      showNotif("Erreur lors de l'annulation.", "error");
    }
  };

  const handleReset = async () => {
    if (window.confirm("Réinitialiser toutes les demandes du mois ?")) {
      try {
        const mois = getCurrentMois();
        const toDelete = demandes.filter(d => d.mois === mois);
        await Promise.all(toDelete.map(d => deleteDoc(doc(db, "demandes", d.id))));
        showNotif("Données réinitialisées !");
      } catch (error) {
        console.error("Erreur:", error);
        showNotif("Erreur lors de la réinitialisation.", "error");
      }
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&display=swap" rel="stylesheet" />

      {notification && (
        <div style={{
          position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
          background: notification.type === "error" ? "#cc0000" : "#007a3d",
          color: "#fff", borderRadius: 12, padding: "12px 20px", fontSize: 14,
          fontWeight: 600, zIndex: 9999, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap"
        }}>
          {notification.msg}
        </div>
      )}

      {!user ? (
        <LoginPage onLogin={setUser} />
      ) : user.role === "delegate" ? (
        <DelegatePage user={user} demandes={demandes} onReset={handleReset} />
      ) : (
        <EtudiantPage user={user} demandes={demandes} onDemander={handleDemander} onAnnuler={handleAnnuler} />
      )}

      {user && (
        <div style={{ position: "fixed", bottom: 16, right: 16 }}>
          <Button variant="secondary" onClick={() => setUser(null)} style={{ fontSize: 12, padding: "8px 16px" }}>
            Déconnexion
          </Button>
        </div>
      )}
    </>
  );
}