// mailer.js - Implementación de Brevo (Sendinblue) para evitar bloqueos de puertos SMTP en Railway
const SibApiV3Sdk = require('sib-api-v3-sdk');
require('dotenv').config();

// 🟢 Configuración de Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];

// La variable en Railway/env debe ser BREVO_API_KEY (la que empieza con xkeysib-...)
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Función universal para enviar correos vía Brevo API (Puerto 443 HTTPS)
 * @param {Object} options - Opciones del correo (to, subject, html)
 */
const sendEmail = async ({ to, subject, html }) => {
    if (!process.env.BREVO_API_KEY) {
        console.error('⚠️ [MAILER] Error: BREVO_API_KEY no configurada.');
        throw new Error('Configuración de correo incompleta.');
    }

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    
    // IMPORTANTE: El email sender debe ser el que verificaste en Brevo
    sendSmtpEmail.sender = { 
        "name": "MiSeguro", 
        "email": process.env.EMAIL_USER || "contactomisegurohn@gmail.com" 
    };
    
    sendSmtpEmail.to = [{ "email": to }];

    try {
        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Correo enviado exitosamente vía Brevo API:', data.messageId);
        return data;
    } catch (error) {
        console.error('❌ Error enviando con Brevo:', error.response ? error.response.body : error.message);
        throw error;
    }
};

module.exports = { sendEmail };
