import nodemailer from 'nodemailer';

// Configure the transport using environment variables
// It expects SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports (587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendPasswordResetEmail = async (to: string, username: string, pin: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperación de Acceso</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #0a0a0f;
          color: #ffffff;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          text-align: center;
        }
        .header {
          margin-bottom: 30px;
        }
        .header h1 {
          color: #00ffcc;
          font-size: 28px;
          margin: 0;
          letter-spacing: 1px;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          color: #a0a0b0;
          margin-bottom: 40px;
        }
        .message strong {
          color: #ffffff;
        }
        .pin-box {
          background-color: rgba(0, 255, 204, 0.05);
          border: 2px dashed #00ffcc;
          border-radius: 12px;
          padding: 30px;
          margin: 0 auto 30px auto;
          max-width: 400px;
        }
        .pin {
          font-size: 42px;
          font-weight: bold;
          color: #00ffcc;
          letter-spacing: 12px;
          margin: 0;
        }
        .footer {
          font-size: 12px;
          color: #606070;
          margin-top: 40px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding-top: 20px;
        }
        .timer {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: #808090;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recuperación de Acceso</h1>
        </div>
        
        <div class="message">
          Hola <strong>${username}</strong>, se ha solicitado un cambio de contraseña para tu cuenta.<br><br>
          Ingresa el siguiente PIN de seguridad en la aplicación:
        </div>
        
        <div class="pin-box">
          <p class="pin">${pin}</p>
        </div>
        
        <div class="timer">
          ⏳ Este código caduca en 10 minutos.
        </div>
        
        <div class="footer">
          Si no solicitaste este cambio, puedes ignorar este correo de forma segura. El código expirará automáticamente.
        </div>
      </div>
    </body>
    </html>
  `;

  // Define email options
  const mailOptions = {
    from: `"Plataforma SEIEM" <${process.env.SMTP_USER}>`,
    to,
    subject: 'Tu PIN de Recuperación de Contraseña',
    html: htmlContent,
  };

  // Only attempt to send if SMTP_USER is configured
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ No se han configurado credenciales SMTP. Simulación de envío:');
    console.warn(`[SIMULATED EMAIL TO ${to}] PIN: ${pin}`);
    return;
  }

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email: ', error);
    throw new Error('Error al enviar el correo electrónico.');
  }
};
