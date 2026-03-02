import { Resend } from 'resend';

const resend = new Resend('re_AzR1eSzy_9CDDC58Q1PZDiQi9Nwp8nRQ1');

export async function sendResetCode(email, code, nomComplet) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'SoucheApp ENSEA <onboarding@resend.dev>',
      to: email,
      subject: 'Code de réinitialisation - SoucheApp ENSEA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>🔐 Code de réinitialisation</h1>
          <p>Bonjour <strong>${nomComplet}</strong>,</p>
          <div style="background: #0047AB; color: white; font-size: 36px; font-weight: bold; text-align: center; padding: 20px; border-radius: 12px; letter-spacing: 8px;">
            ${code}
          </div>
          <p style="color: #DC2626;">⚠️ Ce code expire dans 15 minutes</p>
          <p>Si vous n'avez pas demandé ce code, ignorez cet email.</p>
        </div>
      `
    });

    if (error) {
      console.error('Erreur Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error: error.message };
  }
}

export function generateResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}