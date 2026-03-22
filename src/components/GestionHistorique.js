import React, { useState } from 'react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

const GestionHistorique = ({ demandes, onResetComplete }) => {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Calculer les stats
  React.useEffect(() => {
    if (demandes && Array.isArray(demandes)) {
      const archivees = demandes.filter(d => d.statut === "traitee");
      const actives = demandes.filter(d => d.statut !== "traitee");
      
      const parMois = {};
      demandes.forEach(d => {
        const mois = d.mois || 'Inconnu';
        if (!parMois[mois]) {
          parMois[mois] = { actives: 0, archivees: 0 };
        }
        if (d.statut === "traitee") {
          parMois[mois].archivees++;
        } else {
          parMois[mois].actives++;
        }
      });

      setStats({
        total: demandes.length,
        archivees: archivees.length,
        actives: actives.length,
        parMois: parMois
      });
    }
  }, [demandes]);

  const formatMois = (moisStr) => {
    if (moisStr === 'Inconnu') return 'Inconnu';
    const [annee, mois] = moisStr.split('-');
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${moisNoms[parseInt(mois) - 1]} ${annee}`;
  };

  // Fonction helper pour formater les dates
  const formatDateForExcel = (date) => {
    if (!date) return 'N/A';
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
      return 'N/A';
    } catch (error) {
      return 'N/A';
    }
  };

  // Exporter TOUTES les demandes
  const exporterTout = () => {
    const data = demandes.map(d => ({
      'Date': formatDateForExcel(d.date),
      'Mois': d.mois || 'N/A',
      'Nom': d.nom || 'N/A',
      'Classe': d.classe || 'N/A',
      'Souches': d.nbSouches || 0,
      'Montant': (d.nbSouches || 0) * 2000,
      'Statut': d.statut || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Toutes_Demandes');
    
    const dateStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `backup_COMPLET_${dateStr}.xlsx`);
  };

  // Supprimer TOUTES les demandes (actives + archivées)
  const supprimerTout = async () => {
    if (confirmText !== 'SUPPRIMER TOUT') {
      alert(' Veuillez taper exactement "SUPPRIMER TOUT" pour confirmer');
      return;
    }

    setLoading(true);

    try {
      console.log('📥 Export automatique avant suppression...');
      exporterTout();
      
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('🗑️ Suppression COMPLÈTE de TOUTES les demandes...');
      console.log(` ${demandes.length} demandes à supprimer`);

      if (demandes.length === 0) {
        alert('ℹ️ Aucune demande à supprimer');
        setLoading(false);
        setShowConfirm(false);
        return;
      }

      let deleted = 0;
      let errors = 0;

      for (const demande of demandes) {
        try {
          if (!demande.id) {
            console.warn('⚠️ Demande sans ID, ignorée:', demande);
            errors++;
            continue;
          }

          console.log(`🗑️ Suppression ${deleted + 1}/${demandes.length} - ID: ${demande.id}`);
          
          await deleteDoc(doc(db, 'demandes', demande.id));
          deleted++;
          
          if (deleted % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error) {
          console.error(` Erreur suppression ${demande.id}:`, error);
          errors++;
        }
      }

      console.log(` Suppression COMPLÈTE terminée : ${deleted} réussies, ${errors} erreurs`);
      
      if (deleted > 0) {
        alert(` Suppression complète réussie !\n\n${deleted} demandes supprimées\n${errors} erreurs\nBackup Excel téléchargé`);
      } else {
        alert(` Aucune suppression effectuée\n${errors} erreurs`);
      }
      
      setShowConfirm(false);
      setConfirmText('');
      setLoading(false);

      if (onResetComplete && deleted > 0) {
        setTimeout(() => {
          onResetComplete();
        }, 500);
      }

    } catch (error) {
      console.error(' Erreur globale:', error);
      alert(` Erreur : ${error.message}`);
      setLoading(false);
    }
  };

  if (!stats) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        border: '2px solid #E8F4FF',
        textAlign: 'center',
        color: '#64748B'
      }}>
        Chargement des statistiques...
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      border: '2px solid #E8F4FF'
    }}>
      {/* Titre */}
      <div style={{
        fontSize: '17px',
        fontWeight: '800',
        color: '#002D6F',
        marginBottom: '16px',
        paddingBottom: '10px',
        borderBottom: '2px solid #E8F4FF'
      }}>
        🗑️ Gestion de l'historique
      </div>

      {/* Stats globales */}
      <div style={{
        background: '#F8FAFC',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        border: '2px solid #E2E8F0'
      }}>
        <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '12px', fontWeight: '600' }}>
          Toutes les demandes dans la base
        </div>
        <div style={{ fontSize: '32px', fontWeight: '900', color: '#0047AB', marginBottom: '8px' }}>
          {stats.total}
        </div>
        <div style={{ fontSize: '13px', color: '#64748B' }}>
          • {stats.actives} demande{stats.actives > 1 ? 's' : ''} active{stats.actives > 1 ? 's' : ''}<br />
          • {stats.archivees} demande{stats.archivees > 1 ? 's' : ''} archivée{stats.archivees > 1 ? 's' : ''}
        </div>
      </div>

      {/* Répartition par mois */}
      {Object.keys(stats.parMois).length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0066CC', marginBottom: '12px' }}>
            Répartition par mois
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {Object.entries(stats.parMois)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([mois, counts]) => (
                <div
                  key={mois}
                  style={{
                    background: '#F5F8FA',
                    border: '2px solid #E8F4FF',
                    borderRadius: '8px',
                    padding: '12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#002D6F' }}>
                      {formatMois(mois)}
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#0047AB' }}>
                      {counts.actives + counts.archivees}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    {counts.actives} active{counts.actives > 1 ? 's' : ''} • {counts.archivees} archivée{counts.archivees > 1 ? 's' : ''}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Boutons actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Bouton Export */}
        <button
          onClick={exporterTout}
          disabled={stats.total === 0}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #059669',
            background: '#F0FDF4',
            color: '#059669',
            fontWeight: '700',
            fontSize: '14px',
            cursor: stats.total === 0 ? 'not-allowed' : 'pointer',
            opacity: stats.total === 0 ? 0.5 : 1
          }}
        >
          📥 Exporter toutes les demandes (Excel)
        </button>

        {/* Bouton Supprimer TOUT */}
        <button
          onClick={() => setShowConfirm(true)}
          disabled={stats.total === 0}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #DC2626',
            background: '#FFF0F0',
            color: '#DC2626',
            fontWeight: '700',
            fontSize: '14px',
            cursor: stats.total === 0 ? 'not-allowed' : 'pointer',
            opacity: stats.total === 0 ? 0.5 : 1
          }}
        >
          🗑️ Supprimer TOUTES les demandes ({stats.total})
        </button>
      </div>

      {/* Modal de confirmation */}
      {showConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            margin: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{
              fontSize: '20px',
              fontWeight: '800',
              color: '#DC2626',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              ⚠️ ATTENTION : Action irréversible
            </div>

            <div style={{
              fontSize: '14px',
              color: '#555',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              Vous allez supprimer <strong>{stats.total} demandes</strong> :<br />
              • {stats.actives} demande{stats.actives > 1 ? 's' : ''} active{stats.actives > 1 ? 's' : ''}<br />
              • {stats.archivees} demande{stats.archivees > 1 ? 's' : ''} archivée{stats.archivees > 1 ? 's' : ''}
              <br /><br />
              Un fichier Excel sera automatiquement téléchargé comme sauvegarde.
              <br /><br />
              <strong style={{ color: '#DC2626' }}>Cette action supprimera TOUT l'historique et est IRRÉVERSIBLE.</strong>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: '#64748B', marginBottom: '8px', fontWeight: '600' }}>
                Pour confirmer, tapez exactement : <strong style={{ color: '#DC2626' }}>SUPPRIMER TOUT</strong>
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Tapez ici..."
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #E2E8F0',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setConfirmText('');
                }}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #E2E8F0',
                  background: 'white',
                  color: '#64748B',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={supprimerTout}
                disabled={loading || confirmText !== 'SUPPRIMER TOUT'}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  border: '2px solid #DC2626',
                  background: confirmText === 'SUPPRIMER TOUT' && !loading ? '#DC2626' : '#FEE',
                  color: confirmText === 'SUPPRIMER TOUT' && !loading ? 'white' : '#DC2626',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: (loading || confirmText !== 'SUPPRIMER TOUT') ? 'not-allowed' : 'pointer',
                  opacity: (loading || confirmText !== 'SUPPRIMER TOUT') ? 0.5 : 1
                }}
              >
                {loading ? '⏳ Suppression...' : 'Confirmer la suppression COMPLÈTE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionHistorique;