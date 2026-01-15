const nodemailer = require('nodemailer');
const { MAIL_USER, MAIL_HOST, MAIL_PASS, MAIL_PORT } = require("../config");

const transporter = nodemailer.createTransport({
  host: MAIL_HOST || "smtp.gmail.com",
  port: 465 || 587,
  secure: true,
  auth: {
    user: MAIL_USER || "",
    pass: MAIL_PASS || "bffm fuvl jltr yhdk",
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
});

async function sendNewOrderEmail({ to, subject, code, customer, items, total }) {
  // Generamos las filas de la tabla de productos
  const itemsHtml = items.map(it => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">${it.name} x${it.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">Q.${it.line_amount}</td>
    </tr>
  `).join('');

  // El link dinámico
  // const orderUrl = `http://localhost:3001/api/orders/${code}`;
  // const orderUrl = `http://localhost:5173/pedido/${code}`;
  const orderUrl = `https://www.nutrihome.store/pedido/${code}`;

  const mailOptions = {
    from: '"Mi Tienda Online" <olstertecn597@gmail.com>',
    to: to,
    subject: subject,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">Confirmación de Pedido</h1>
          <p style="margin: 5px 0 0; opacity: 0.9;">Código: ${code}</p>
        </div>
        
        <div style="padding: 20px; color: #333;">
          <p style="font-size: 16px;">Hola <strong>${customer.name}</strong>,</p>
          <p>Gracias por tu compra. Aquí tienes los detalles de tu pedido:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0;">Producto</th>
                <th style="text-align: right; padding: 12px; border-bottom: 2px solid #e2e8f0;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td style="padding: 12px; font-weight: bold; font-size: 18px;">Total</td>
                <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #2563eb;">Q.${total}</td>
              </tr>
            </tfoot>
          </table>

          <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-bottom: 25px;">
            <p style="margin: 0; font-size: 14px; color: #64748b;"><strong>Dirección de entrega:</strong></p>
            <p style="margin: 5px 0 0; color: #334155;">${customer.address}</p>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <p style="margin-bottom: 20px; font-size: 14px; color: #64748b;">Puedes ver el estado de tu pedido haciendo clic abajo:</p>
            <a href="${orderUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
               Ver mi pedido
            </a>
          </div>
        </div>

        <div style="background-color: #f8fafc; color: #94a3b8; padding: 15px; text-align: center; font-size: 12px; border-top: 1px solid #e2e8f0;">
          <p>© 2026 Mi Tienda Online. Todos los derechos reservados.</p>
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendNewOrderEmail };
