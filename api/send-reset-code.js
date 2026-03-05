import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, code, nomComplet } = req.body;

  if (!email || !code || !nomComplet) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'SoucheApp ENSEA <onboarding@resend.dev>',
      to: email,
      subject: 'Code de réinitialisation - SoucheApp ENSEA',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #0047AB; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0;">🔐 SoucheApp ENSEA</h1>
          </div>
          <div style="background: white; padding: 30px;">
            <p style="font-size: 16px;">Bonjour <strong>${nomComplet}</strong>,</p>
            <p>Votre code de réinitialisation :</p>
            <div style="background: #0047AB; color: white; font-size: 36px; font-weight: bold; text-align: center; padding: 25px; border-radius: 12px; letter-spacing: 10px; margin: 30px 0;">
              ${code}
            </div>
            <p style="color: #DC2626; font-weight: bold;">⚠️ Ce code expire dans 15 minutes</p>
            <p style="color: #666; font-size: 14px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
          </div>
          <div style="background: #F5F8FA; padding: 20px; text-align: center; border-radius: 0 0 12px 12px;">
            <p style="font-size: 12px; color: #888; margin: 0;">ENSEA - Abidjan, Côte d'Ivoire</p>
          </div>
        </div>
      `
    });

    if (error) {
      console.error('Erreur Resend:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error) {
    console.error('Exception:', error);
    return res.status(500).json({ error: error.message });
  }
}