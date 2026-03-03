export async function sendResetCode(email, code, nomComplet) {
  console.log('📧 Appel API serverless...');
  console.log('Email:', email);
  console.log('Code:', code);
  
  try {
    const response = await fetch('/api/send-reset-code', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, nomComplet })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur API:', data);
      return { success: false, error: data.error };
    }

    console.log('✅ Email envoyé !');
    return { success: true };
  } catch (error) {
    console.error('❌ Exception:', error);
    return { success: false, error: error.message };
  }
}

export function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}