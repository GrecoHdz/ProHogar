// mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

// 🟢 Validación de variables de entorno
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('⚠️ [MAILER] Error: EMAIL_USER o EMAIL_PASS no están configurados.');
}

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Port 465 must use secure: true
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    },
    // ⏱️ Ajustes de tiempo para producción (evita timeouts prematuros)
    connectionTimeout: 15000, 
    greetingTimeout: 15000,
    socketTimeout: 20000,
    debug: true, // Muestra detalles adicionales en la consola
    logger: true // Muestra el flujo completo del protocolo SMTP
});

// Verificar conexión al inicio
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Error en el servidor de correos (Asegúrate de usar puerto 465 y SSL):', {
            message: error.message,
            code: error.code,
            command: error.command
        });
    } else {
        console.log('🚀 Servidor de correos listo para enviar mensajes (Puerto 465 SSL)');
    }
});

module.exports = transporter;
