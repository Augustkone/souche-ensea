import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Autoriser uniquement POST
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
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="background: linear-gradient(135deg, #0047AB, #0066CC); color: white; padding: 30px; border-radius: 12px; text-align: center;">
            🔐 SoucheApp ENSEA
          </h1>
          <div style="background: white; padding: 30px;">
            <p>Bonjour <strong>${nomComplet}</strong>,</p>
            <p>Votre code de réinitialisation :</p>
            <div style="background: #0047AB; color: white; font-size: 36px; font-weight: bold; text-align: center; padding: 25px; border-radius: 12px; letter-spacing: 10px;">
              ${code}
            </div>
            <p style="color: #DC2626; margin-top: 20px;">⚠️ Ce code expire dans 15 minutes</p>
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