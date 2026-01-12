const nodemailer = require('nodemailer');

async function sendEmail() {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: "olstertecn597@gmail.com",
      pass: "bffm fuvl jltr yhdk",
    },
  });

  // 2. Definir el contenido del email
  const mailOptions = {
    from: '"Oliver Tzunun" <olstertecn597@gmail.com>',
    to: "otzunund@miumg.edu.gt",
    subject: "Asunto del correo ✔",
    text: "Hola, este es un correo de prueba desde Node.js",
    html: "<b>Hola!</b> Este correo incluye HTML.",
  };

  // 3. Enviar el correo
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Correo enviado con éxito: %s", info.messageId);
  } catch (error) {
    console.error("Error al enviar el correo:", error);
  }
}

sendEmail();
