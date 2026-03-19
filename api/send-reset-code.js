import nodemailer from 'nodemailer';

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
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  // Configuration Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD
    }
  });

  // Contenu de l'email
  const mailOptions = {
    from: `"SoucheApp ENSEA" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Code de réinitialisation - SoucheApp ENSEA',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0047AB, #0066CC); padding: 30px; text-align: center; border-radius: 12px 12px 0 0; }
          .header h1 { color: white; margin: 0; font-size: 28px; }
          .content { background: white; padding: 30px; border: 1px solid #E8F4FF; }
          .code-box { background: linear-gradient(135deg, #0047AB, #0066CC); color: white; font-size: 36px; font-weight: bold; text-align: center; padding: 25px; border-radius: 12px; letter-spacing: 10px; margin: 30px 0; }
          .warning { background: #FFF0F0; border-left: 4px solid #DC2626; padding: 15px; margin: 25px 0; border-radius: 8px; }
          .warning p { margin: 0; color: #DC2626; font-weight: 600; font-size: 14px; }
          .footer { background: #F5F8FA; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; }
          .footer p { margin: 0; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SoucheApp ENSEA</h1>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; color: #002D6F; margin-bottom: 20px;">
              Bonjour <strong>${nomComplet}</strong>,
            </p>
            
            <p style="font-size: 15px; color: #555; margin-bottom: 30px;">
              Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :
            </p>
            
            <div class="code-box">${code}</div>
            
            <div class="warning">
              <p>Ce code expire dans 15 minutes</p>
            </div>
            
            <p style="font-size: 14px; color: #888; margin-top: 30px;">
              Si vous n'avez pas demandé cette réinitialisation, ignorez cet email en toute sécurité.
            </p>
          </div>
          
          <div class="footer">
            <p>École Nationale Supérieure de la Statistique et de l'Économie Appliquée</p>
            <p>Abidjan, Côte d'Ivoire</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    console.log('Envoi email vers:', email);
    
    const info = await transporter.sendMail(mailOptions);
    
    console.log('Email envoyé avec succès !');
    console.log('Message ID:', info.messageId);
    
    return res.status(200).json({ 
      success: true, 
      messageId: info.messageId 
    });
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return res.status(500).json({ 
      error: error.message 
    });
  }
}