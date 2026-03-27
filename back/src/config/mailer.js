// mailer.js - Ahora usando Resend en lugar de Nodemailer para evitar bloqueos de puertos en Railway
const { Resend } = require('resend');
require('dotenv').config();

// 🟢 Validación de la API KEY de Resend
if (!process.env.RESEND_API_KEY) {
    console.error('⚠️ [MAILER] Error: RESEND_API_KEY no está configurada en las variables de entorno.');
}

// Inicializar Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Función universal para enviar correos
 * @param {Object} options - Opciones del correo (to, subject, html)
 */
const sendEmail = async ({ to, subject, html }) => {
    try {
        const { data, error } = await resend.emails.send({
            from: 'MiSeguro <onboarding@resend.dev>', // Por ahora usamos el dominio de prueba, puedes cambiarlo después
            to: [to],
            subject: subject,
            html: html,
        });

        if (error) {
            console.error('❌ Error de Resend:', error);
            throw new Error(error.message);
        }

        console.log('✅ Correo enviado exitosamente vía Resend:', data.id);
        return data;
    } catch (err) {
        console.error('💥 Error crítico al enviar correo:', err);
        throw err;
    }
};

module.exports = { sendEmail };
