// ==========================================
// VERSION TEMPORAIRE : POPUP
// ==========================================
// Cette version affiche le code dans une popup
// pour permettre aux utilisateurs de tester
// le système de réinitialisation de mot de passe
// en attendant la configuration complète de l'envoi d'emails.

export async function sendResetCode(email, code, nomComplet) {
  console.log('Génération du code pour:', email);
  console.log('Code:', code);
  
  // Affiche le code dans une popup claire et professionnelle
  alert(
    'CODE DE RÉINITIALISATION\n\n' +
    'Utilisateur : ' + nomComplet + '\n' +
    'Email : ' + email + '\n\n' +
    'Votre code : ' + code + '\n\n' +
    'Veuillez noter ce code et l\'entrer dans l\'étape suivante.\n' +
    'Ce code expire dans 15 minutes.\n\n' +
    'Note : En production, ce code sera envoyé directement par email.'
  );
  
  return { success: true };
}

export function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}


// ==========================================
// VERSION PRODUCTION (À ACTIVER PLUS TARD)
// ==========================================
// Décommenter ce code quand la fonction serverless
// et Resend seront correctement configurés sur Vercel.
//
// export async function sendResetCode(email, code, nomComplet) {
//   console.log('Appel fonction serverless...');
//   
//   try {
//     const response = await fetch('/api/send-reset-code', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({ email, code, nomComplet })
//     });
//
//     const data = await response.json();
//
//     if (!response.ok) {
//       console.error('Erreur:', data);
//       return { success: false, error: data.error };
//     }
//
//     console.log('Email envoyé avec succès');
//     return { success: true };
//   } catch (error) {
//     console.error('Exception:', error);
//     return { success: false, error: error.message };
//   }
// }
//
// export function generateResetCode() {
//   return Math.floor(100000 + Math.random() * 900000).toString();
// }