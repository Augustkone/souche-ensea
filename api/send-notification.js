const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const { emailDelegue, etudiant, nbSouches, classe } = req.body;

  if (!emailDelegue) {
    return res.status(200).json({ success: true, message: 'Aucun email configuré' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"SoucheApp ENSEA" <${process.env.GMAIL_USER}>`,
      to: emailDelegue,
      subject: `Nouvelle demande ${classe}`,
      text: `${etudiant} vient de demander ${nbSouches} souche(s).`
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('❌ Erreur:', error);
    return res.status(500).json({ success: false });
  }
}