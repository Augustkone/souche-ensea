import React, { useState, useEffect } from 'react';

const StatistiquesEtudiant = ({ user, demandes }) => {
  const [stats, setStats] = useState({
    moisActuel: { souches: 0, montant: 0 },
    historique: [],
    total: { souches: 0, montant: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('=== DEBUG STATS ÉTUDIANT ===');
    console.log('1. user:', user);
    console.log('2. demandes:', demandes);
    console.log('3. demandes est un tableau?', Array.isArray(demandes));
    console.log('4. nombre de demandes:', demandes?.length);
    
    if (demandes && Array.isArray(demandes)) {
      calculerStatistiques();
    } else {
      console.log(' Demandes non disponibles');
      setLoading(false);
    }
  }, [demandes, user]);

  const calculerStatistiques = () => {
    try {
      setLoading(true);

      console.log('=== CALCUL STATISTIQUES ÉTUDIANT ===');
      
      // TOUTES les demandes de l'étudiant
      const mesDemandes = demandes.filter(d => 
        d.nom === user.nom && 
        d.classe === user.classe
      );

      console.log('5. Toutes mes demandes:', mesDemandes.length);

      // UNIQUEMENT les demandes archivées (statut = "traitee")
      const mesDemandesArchivees = mesDemandes.filter(d => d.statut === "traitee");
      
      console.log('6. Demandes archivées (statut=traitee):', mesDemandesArchivees.length);
      console.log('7. Détails archivées:', mesDemandesArchivees);

      // Mois actuel au format YYYY-MM
      const maintenant = new Date();
      const moisActuel = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`;

      console.log('8. Mois actuel:', moisActuel);

      // Calculer stats par mois (UNIQUEMENT demandes archivées)
      const statsMois = {};
      let totalSouches = 0;
      let totalMontant = 0;

      mesDemandesArchivees.forEach(demande => {
        const mois = demande.mois || moisActuel;
        
        if (!statsMois[mois]) {
          statsMois[mois] = { souches: 0, montant: 0 };
        }
        
        statsMois[mois].souches += demande.nbSouches;
        statsMois[mois].montant += demande.nbSouches * 2000;
        
        totalSouches += demande.nbSouches;
        totalMontant += demande.nbSouches * 2000;
      });

      console.log('9. Stats par mois:', statsMois);

      // Trier par mois décroissant (mois récents en premier)
      const historiqueArray = Object.entries(statsMois)
        .filter(([mois]) => mois !== moisActuel)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([mois, data]) => ({
          mois,
          ...data
        }));

      const statsFinales = {
        moisActuel: statsMois[moisActuel] || { souches: 0, montant: 0 },
        historique: historiqueArray,
        total: { souches: totalSouches, montant: totalMontant }
      };

      console.log('10. Stats finales:', statsFinales);

      setStats(statsFinales);
      setLoading(false);
      
    } catch (error) {
      console.error(' Erreur calcul stats:', error);
      setLoading(false);
    }
  };

  const formatMois = (moisStr) => {
    const [annee, mois] = moisStr.split('-');
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${moisNoms[parseInt(mois) - 1]} ${annee}`;
  };

  const formatMontant = (montant) => {
    return `${montant.toLocaleString('fr-FR')} FCFA`;
  };

  // État de chargement
  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#64748B',
        background: 'white',
        borderRadius: '12px',
        marginBottom: '16px',
        border: '2px solid #E8F4FF'
      }}>
        <div>Chargement des statistiques...</div>
        <div style={{ fontSize: '12px', marginTop: '8px', color: '#94A3B8' }}>
          Vérifiez la console (F12) pour les logs de debug
        </div>
      </div>
    );
  }

  // Aucune demande archivée
  if (stats.historique.length === 0 && stats.moisActuel.souches === 0) {
    return (
      <div style={{
        background: '#F8FAFC',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '2px dashed #CBD5E1',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '14px', color: '#64748B', marginBottom: '8px', fontWeight: '600' }}>
          Aucune statistique disponible pour le moment
        </div>
        <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.6' }}>
          Vos statistiques apparaîtront ici après validation de vos demandes par le délégué
        </div>
      </div>
    );
  }

  // Afficher les statistiques
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '16px',
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
        Mes Statistiques
      </div>

      {/* Mois en cours (uniquement si des souches ce mois) */}
      {stats.moisActuel.souches > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, #0047AB, #0066CC)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          color: 'white'
        }}>
          <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '8px', fontWeight: '600' }}>
            {formatMois(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)} (mois en cours)
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: '900' }}>
                {stats.moisActuel.souches}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                souche{stats.moisActuel.souches > 1 ? 's' : ''} validée{stats.moisActuel.souches > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '22px', fontWeight: '900' }}>
                {formatMontant(stats.moisActuel.montant)}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9 }}>
                dépensés
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Historique */}
      {stats.historique.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '700',
            color: '#0066CC',
            marginBottom: '12px'
          }}>
            Historique complet
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {stats.historique.map((periode, index) => (
              <div
                key={index}
                style={{
                  background: '#F5F8FA',
                  border: '2px solid #E8F4FF',
                  borderRadius: '12px',
                  padding: '14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#002D6F',
                    marginBottom: '4px'
                  }}>
                    {formatMois(periode.mois)}
                  </div>
                  <div style={{ fontSize: '13px', color: '#0066CC' }}>
                    {periode.souches} souche{periode.souches > 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#16A34A'
                }}>
                  {formatMontant(periode.montant)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total année */}
      <div style={{
        background: '#F0FDF4',
        borderRadius: '12px',
        padding: '14px',
        border: '2px solid #DCFCE7'
      }}>
        <div style={{
          fontSize: '12px',
          color: '#16A34A',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          fontWeight: '700'
        }}>
          Total année académique 2025-2026
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#16A34A' }}>
              {stats.total.souches}
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>
              souches
            </div>
          </div>
          <div>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#16A34A' }}>
              {formatMontant(stats.total.montant)}
            </div>
            <div style={{ fontSize: '12px', color: '#555' }}>
              dépensés
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default StatistiquesEtudiant;