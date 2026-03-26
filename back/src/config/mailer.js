const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true para el puerto 465, false para otros puertos
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Verificar conexión al inicio
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Error en la configuración del servidor de correos:', error);
    } else {
        console.log('🚀 Servidor de correos listo para enviar mensajes');
    }
});

module.exports = transporter;
