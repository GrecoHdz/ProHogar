/**
 * WhatsApp Business Cloud API (Meta)
 * Envía mensajes directamente desde el servidor, sin depender del dispositivo del admin.
 *
 * Documentación: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 *
 * Variables de entorno requeridas en .env:
 *   WHATSAPP_TOKEN      — Token de acceso permanente (System User Token) de Meta for Developers
 *   WHATSAPP_PHONE_ID   — Phone Number ID del número de WhatsApp Business
 */

const https = require("https");

/**
 * Envía un mensaje de texto vía WhatsApp Business Cloud API.
 *
 * @param {string} toPhone  Número destino en formato internacional (ej. "50499887766")
 * @param {string} message  Texto del mensaje (soporta formato *negrita*, _cursiva_, etc.)
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
const sendWhatsAppBusinessMessage = async (toPhone, message) => {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneNumberId) {
    console.warn(
      "⚠️  WhatsApp Business no configurado. Agrega WHATSAPP_TOKEN y WHATSAPP_PHONE_ID al .env"
    );
    return { success: false, error: "WhatsApp Business no configurado" };
  }

  // Limpiar el número y asegurar prefijo 504 (Honduras) si son 8 dígitos
  const cleanPhone = toPhone.toString().replace(/\D/g, "");
  const finalPhone =
    cleanPhone.length === 8 ? `504${cleanPhone}` : cleanPhone;

  const body = JSON.stringify({
    messaging_product: "whatsapp",
    to: finalPhone,
    type: "text",
    text: {
      preview_url: false,
      body: message,
    },
  });

  return new Promise((resolve) => {
    const options = {
      hostname: "graph.facebook.com",
      port: 443,
      path: `/v20.0/${phoneNumberId}/messages`,
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`✅ WhatsApp enviado a +${finalPhone}`);
            resolve({ success: true, data: parsed });
          } else {
            console.error(`❌ Error WhatsApp API (${res.statusCode}):`, parsed);
            resolve({
              success: false,
              error: parsed?.error?.message || "Error de la API de WhatsApp",
              details: parsed,
            });
          }
        } catch (e) {
          console.error("❌ Error parseando respuesta WhatsApp:", e.message);
          resolve({ success: false, error: "Respuesta inválida de la API" });
        }
      });
    });

    req.on("error", (err) => {
      console.error("❌ Error de red WhatsApp:", err.message);
      resolve({ success: false, error: err.message });
    });

    req.write(body);
    req.end();
  });
};

module.exports = { sendWhatsAppBusinessMessage };
