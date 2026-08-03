import nodemailer from 'nodemailer';

// Configuramos Nodemailer para usar Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER, // Tu correo normal de Gmail
    pass: process.env.SMTP_PASS, // Tu "Contraseña de Aplicación" de Google (16 letras)
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
          background-color: #faf9f5; 
          color: #333333; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          padding: 40px 20px; 
          text-align: center; 
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .header h1 { 
          color: #56212f; 
          font-size: 24px; 
          margin: 0; 
          font-weight: 700;
        }
        .message { 
          font-size: 14px; 
          line-height: 1.6; 
          color: #4a4a4a; 
          margin-bottom: 30px; 
          margin-top: 20px; 
        }
        .message strong { 
          color: #1a1a1a; 
        }
        .pin-box { 
          background-color: rgba(86, 33, 47, 0.05); 
          border: 1px dashed #56212f; 
          border-radius: 8px; 
          padding: 24px; 
          margin: 0 auto 25px auto; 
          max-width: 300px; 
        }
        .pin { 
          font-size: 36px; 
          font-weight: 800; 
          color: #56212f; 
          letter-spacing: 16px; 
          margin: 0; 
          margin-right: -16px; /* Compensate for the last letter spacing to keep it centered */
        }
        .timer { 
          font-size: 12px; 
          color: #888888; 
          margin-bottom: 25px;
        }
        .footer {
          font-size: 11px;
          color: #999999;
          margin-top: 30px;
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
          Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ No se han configurado credenciales SMTP. Simulación de envío:');
    console.warn(`[SIMULATED EMAIL TO ${to}] PIN: ${pin}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: '"Cursos SEIEM" <' + process.env.SMTP_USER + '>',
      to,
      subject: 'Tu código de recuperación - SEIEM',
      html: htmlContent,
    });
    console.log('Correo enviado correctamente a cualquier parte del mundo:', info.messageId);
  } catch (error) {
    console.error('Error enviando el correo: ', error);
    throw new Error('Error al enviar el correo electrónico.');
  }
};

export const sendPasswordChangePinEmail = async (to: string, username: string, pin: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Solicitud de Cambio de Contraseña</title>
      <style>
        body { 
          margin: 0; 
          padding: 0; 
          background-color: #faf9f5; 
          color: #333333; 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
        }
        .container { 
          max-width: 600px; 
          margin: 40px auto; 
          padding: 40px 20px; 
          text-align: center; 
          background-color: #ffffff;
          border-radius: 16px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.03);
        }
        .header h1 { 
          color: #56212f; 
          font-size: 24px; 
          margin: 0; 
          font-weight: 700;
        }
        .message { 
          font-size: 14px; 
          line-height: 1.6; 
          color: #4a4a4a; 
          margin-bottom: 30px; 
          margin-top: 20px; 
        }
        .message strong { 
          color: #1a1a1a; 
        }
        .pin-box { 
          background-color: rgba(86, 33, 47, 0.05); 
          border: 1px dashed #56212f; 
          border-radius: 8px; 
          padding: 24px; 
          margin: 0 auto 25px auto; 
          max-width: 300px; 
        }
        .pin { 
          font-size: 36px; 
          font-weight: 800; 
          color: #56212f; 
          letter-spacing: 16px; 
          margin: 0; 
          margin-right: -16px; /* Compensate for the last letter spacing to keep it centered */
        }
        .timer { 
          font-size: 12px; 
          color: #888888; 
          margin-bottom: 25px;
        }
        .footer {
          font-size: 11px;
          color: #999999;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Solicitud de Cambio de Contraseña</h1>
        </div>
        
        <div class="message">
          Hola <strong>${username}</strong>, se ha solicitado un PIN para cambiar tu contraseña desde tu perfil.<br><br>
          Ingresa el siguiente código de seguridad para confirmar el cambio:
        </div>
        
        <div class="pin-box">
          <p class="pin">${pin}</p>
        </div>
        
        <div class="timer">
          ⏳ Este código caduca en 10 minutos.
        </div>

        <div class="footer">
          Si no solicitaste este cambio, ignora este correo. Tu cuenta sigue estando segura.
        </div>
      </div>
    </body>
    </html>
  `;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ No se han configurado credenciales SMTP. Simulación de envío:');
    console.warn(`[SIMULATED EMAIL TO ${to}] PIN: ${pin}`);
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: '"Cursos SEIEM" <' + process.env.SMTP_USER + '>',
      to,
      subject: 'Solicitud de Cambio de Contraseña - SEIEM',
      html: htmlContent,
    });
    console.log('Correo enviado correctamente a cualquier parte del mundo:', info.messageId);
  } catch (error) {
    console.error('Error enviando el correo: ', error);
    throw new Error('Error al enviar el correo electrónico.');
  }
};
