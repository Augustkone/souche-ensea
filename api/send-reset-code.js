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

  // Contenu de l'email - Compatible TOUS clients
  const mailOptions = {
    from: `"SoucheApp ENSEA" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Code de réinitialisation - SoucheApp ENSEA',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 20px;">
              
              <!-- Container principal -->
              <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff;">
                
                <!-- Header bleu -->
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #0047AB, #0066CC); padding: 30px; border-radius: 12px 12px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">SoucheApp ENSEA</h1>
                  </td>
                </tr>
                
                <!-- Contenu -->
                <tr>
                  <td style="padding: 30px; border-left: 1px solid #E8F4FF; border-right: 1px solid #E8F4FF;">
                    
                    <!-- Salutation -->
                    <p style="font-size: 16px; color: #002D6F; margin: 0 0 20px 0;">
                      Bonjour <strong>${nomComplet}</strong>,
                    </p>
                    
                    <!-- Message -->
                    <p style="font-size: 15px; color: #555555; margin: 0 0 30px 0; line-height: 1.6;">
                      Vous avez demandé la réinitialisation de votre mot de passe. Voici votre code de vérification :
                    </p>
                    
                    <!-- CODE EN TEXTE SIMPLE (toujours visible) -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 20px 0;">
                      <tr>
                        <td align="center">
                          <p style="margin: 0; font-size: 42px; font-weight: bold; color: #0047AB; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${code}
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- CODE EN BOX BLEUE (pour Gmail - design amélioré) -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, #0047AB, #0066CC); border-radius: 12px; margin: 0 auto;">
                            <tr>
                              <td align="center" style="padding: 25px 40px;">
                                <span style="color: #ffffff; font-size: 36px; font-weight: bold; letter-spacing: 10px; font-family: Arial, sans-serif;">
                                  ${code}
                                </span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Avertissement expiration -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 25px 0; background-color: #FFF0F0; border-left: 4px solid #DC2626; border-radius: 8px;">
                      <tr>
                        <td style="padding: 15px;">
                          <p style="margin: 0; color: #DC2626; font-weight: 600; font-size: 14px;">
                            Ce code expire dans 15 minutes
                          </p>
                        </td>
                      </tr>
                    </table>
                    
                    <!-- Note sécurité -->
                    <p style="font-size: 14px; color: #888888; margin: 30px 0 0 0; line-height: 1.6;">
                      Si vous n'avez pas demandé cette réinitialisation, ignorez cet email en toute sécurité.
                    </p>
                    
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="background-color: #F5F8FA; padding: 20px; border-radius: 0 0 12px 12px;">
                    <p style="margin: 0; font-size: 12px; color: #888888; line-height: 1.6;">
                      École Nationale Supérieure de la Statistique et de l'Économie Appliquée<br/>
                      Abidjan, Côte d'Ivoire
                    </p>
                  </td>
                </tr>
                
              </table>
              
            </td>
          </tr>
        </table>
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
