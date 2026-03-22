import React, { useState, useEffect } from 'react';

const StatistiquesDelegue = ({ demandes, classe }) => {
  const [stats, setStats] = useState({
    aujourdhui: 0,
    moisActuel: 0,
    total: 0,
    parJour: [],
    parMois: []
  });
  const [affichage, setAffichage] = useState('resume');

  useEffect(() => {
    if (demandes && Array.isArray(demandes)) {
      calculerStatistiques();
    }
  }, [demandes]);

  const calculerStatistiques = () => {
    if (!demandes || !Array.isArray(demandes)) {
      console.log('⚠️ Pas de demandes disponibles');
      return;
    }

    const mesDemandesClasse = demandes.filter(d => d.classe === classe);
    
    console.log(`📊 Demandes pour ${classe}:`, mesDemandesClasse.length);
    
    const maintenant = new Date();
    const aujourdhuiStr = maintenant.toISOString().split('T')[0];
    const moisActuel = `${maintenant.getFullYear()}-${String(maintenant.getMonth() + 1).padStart(2, '0')}`;

    const statsJour = {};
    const statsMois = {};
    let demandesAujourdhui = 0;
    let demandesMoisActuel = 0;

    mesDemandesClasse.forEach(demande => {
      let dateStr = '';
      let moisStr = '';
      
      if (demande.date) {
        const date = demande.date.toDate ? demande.date.toDate() : new Date(demande.date);
        dateStr = date.toISOString().split('T')[0];
        moisStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (demande.mois) {
        moisStr = demande.mois;
        dateStr = `${demande.mois}-01`;
      }

      if (dateStr) {
        if (!statsJour[dateStr]) {
          statsJour[dateStr] = { date: dateStr, count: 0, souches: 0 };
        }
        statsJour[dateStr].count += 1;
        statsJour[dateStr].souches += demande.nbSouches;

        if (dateStr === aujourdhuiStr) {
          demandesAujourdhui += 1;
        }
      }

      if (moisStr) {
        if (!statsMois[moisStr]) {
          statsMois[moisStr] = { mois: moisStr, count: 0, souches: 0 };
        }
        statsMois[moisStr].count += 1;
        statsMois[moisStr].souches += demande.nbSouches;

        if (moisStr === moisActuel) {
          demandesMoisActuel += 1;
        }
      }
    });

    const parJour = Object.values(statsJour).sort((a, b) => b.date.localeCompare(a.date));
    const parMois = Object.values(statsMois).sort((a, b) => b.mois.localeCompare(a.mois));

    setStats({
      aujourdhui: demandesAujourdhui,
      moisActuel: demandesMoisActuel,
      total: mesDemandesClasse.length,
      parJour: parJour.slice(0, 10),
      parMois: parMois
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatMois = (moisStr) => {
    const [annee, mois] = moisStr.split('-');
    const moisNoms = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return `${moisNoms[parseInt(mois) - 1]} ${annee}`;
  };

  if (!demandes || !Array.isArray(demandes)) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
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
      marginBottom: '16px',
      border: '2px solid #E8F4FF'
    }}>
      <div style={{
        fontSize: '17px',
        fontWeight: '800',
        color: '#002D6F',
        marginBottom: '16px',
        paddingBottom: '10px',
        borderBottom: '2px solid #E8F4FF'
      }}>
        Statistiques de ma classe ({classe})
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setAffichage('resume')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: affichage === 'resume' ? '2px solid #0047AB' : '2px solid #E2E8F0',
            background: affichage === 'resume' ? '#F0F7FF' : 'white',
            color: affichage === 'resume' ? '#0047AB' : '#64748B',
            fontWeight: affichage === 'resume' ? '700' : '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Résumé
        </button>
        <button
          onClick={() => setAffichage('jours')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: affichage === 'jours' ? '2px solid #0047AB' : '2px solid #E2E8F0',
            background: affichage === 'jours' ? '#F0F7FF' : 'white',
            color: affichage === 'jours' ? '#0047AB' : '#64748B',
            fontWeight: affichage === 'jours' ? '700' : '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Par jour
        </button>
        <button
          onClick={() => setAffichage('mois')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: affichage === 'mois' ? '2px solid #0047AB' : '2px solid #E2E8F0',
            background: affichage === 'mois' ? '#F0F7FF' : 'white',
            color: affichage === 'mois' ? '#0047AB' : '#64748B',
            fontWeight: affichage === 'mois' ? '700' : '600',
            fontSize: '13px',
            cursor: 'pointer'
          }}
        >
          Par mois
        </button>
      </div>

      {affichage === 'resume' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0047AB, #0066CC)',
            borderRadius: '12px',
            padding: '16px',
            color: 'white'
          }}>
            <div style={{ fontSize: '12px', opacity: 0.9, marginBottom: '4px', fontWeight: '600' }}>
              Aujourd'hui
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900' }}>
              {stats.aujourdhui}
            </div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>
              demande{stats.aujourdhui > 1 ? 's' : ''}
            </div>
          </div>

          <div style={{
            background: '#F0FDF4',
            border: '2px solid #DCFCE7',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#16A34A', marginBottom: '4px', fontWeight: '600' }}>
              Ce mois
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#16A34A' }}>
              {stats.moisActuel}
            </div>
            <div style={{ fontSize: '13px', color: '#16A34A' }}>
              demande{stats.moisActuel > 1 ? 's' : ''}
            </div>
          </div>

          <div style={{
            background: '#F5F8FA',
            border: '2px solid #E8F4FF',
            borderRadius: '12px',
            padding: '16px'
          }}>
            <div style={{ fontSize: '12px', color: '#0066CC', marginBottom: '4px', fontWeight: '600' }}>
              Total toutes périodes
            </div>
            <div style={{ fontSize: '32px', fontWeight: '900', color: '#0047AB' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              demande{stats.total > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {affichage === 'jours' && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0066CC', marginBottom: '12px' }}>
            10 derniers jours
          </div>
          {stats.parJour.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.parJour.map((jour, index) => (
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
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#002D6F', marginBottom: '4px' }}>
                      {formatDate(jour.date)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0066CC' }}>
                      {jour.souches} souche{jour.souches > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#0047AB' }}>
                    {jour.count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>
              Aucune demande enregistrée
            </div>
          )}
        </div>
      )}

      {affichage === 'mois' && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#0066CC', marginBottom: '12px' }}>
            Historique par mois
          </div>
          {stats.parMois.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {stats.parMois.map((mois, index) => (
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
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#002D6F', marginBottom: '4px' }}>
                      {formatMois(mois.mois)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#0066CC' }}>
                      {mois.souches} souche{mois.souches > 1 ? 's' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#16A34A' }}>
                    {mois.count}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>
              Aucune demande enregistrée
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatistiquesDelegue;