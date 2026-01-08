const nodemailer = require("nodemailer");
const { MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_TO } = require("../config");

const transporter = nodemailer.createTransport({
  host: MAIL_HOST,
  port: Number(MAIL_PORT || 587),
  secure: false,
  auth: { user: MAIL_USER, pass: MAIL_PASS },
});

async function sendNewOrderEmail({ code, customer, items, total }) {
  const lines = items
    .map((it) => `- ${it.quantity} x ${it.name} (Q${it.unit_price}) = Q${it.line_amount}`)
    .join("\n");

  const text = `
Nuevo pedido: ${code}

Cliente:
Nombre: ${customer.name}
Email: ${customer.email}
Teléfono: ${customer.phone}
Dirección: ${customer.address}

Items:
${lines}

Total: Q${total}
`.trim();

  await transporter.sendMail({
    from: MAIL_USER,
    to: MAIL_TO,
    subject: `Nuevo pedido ${code}`,
    text,
  });
}

module.exports = { sendNewOrderEmail };
