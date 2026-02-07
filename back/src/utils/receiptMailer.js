const transporter = require('../config/mailer');

const sendReceiptEmail = async (userEmail, facturaData, empresaConfig) => {
    const {
        numero_factura_correlativo,
        fecha_emision,
        nombre_cliente,
        rtn_cliente,
        total,
        subtotal,
        id_membresia,
        id_pagovisita,
        id_cotizacion
    } = facturaData;

    const {
        nombre: empresaNombre,
        rtn: empresaRTN,
        email: empresaEmail,
        telefono: empresaTelefono,
        cai: empresaCAI,
        rango_autorizado: empresaRango,
        fecha_limite: empresaFechaLimite
    } = empresaConfig;

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('es-HN');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount);
    };

    let concepto = "Pago de Servicio Profesional";
    if (id_membresia) {
        concepto = "Servicio de acceso y uso de plataforma tecnológica MiSeguro, correspondiente a membresía de beneficios y gestión de servicios.";
    } else if (id_pagovisita) {
        concepto = "Servicio de intermediación tecnológica, coordinación y gestión de visita técnica para evaluación y diagnóstico de servicio solicitado a través de la plataforma MiSeguro.";
    } else if (id_cotizacion) {
        concepto = "Servicio de intermediación tecnológica, coordinación y gestión de pagos por servicios técnicos prestados por técnicos independientes a través de la plataforma MiSeguro.";
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Recibo por Honorarios</title>
        <style>
            body { font-family: Arial, sans-serif; color: #333; line-height: 1.4; margin: 0; padding: 20px; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 4px; border: 1px solid #ddd; }
            .content { padding: 30px; }
            .header-info h2 { font-size: 10px; color: #999; margin: 0 0 5px 0; letter-spacing: 1px; text-transform: uppercase; }
            .header-info p { margin: 0; font-family: monospace; font-weight: bold; font-size: 14px; }
            .header-info span { font-size: 10px; color: #666; }
            .empresa-info h1 { font-size: 18px; margin: 0; color: #000; }
            .empresa-info p { margin: 0; font-size: 10px; color: #666; }
            .body-card { background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .section-label { font-size: 10px; font-weight: bold; color: #999; text-transform: uppercase; margin-bottom: 5px; display: block; }
            .section-content { font-size: 16px; font-weight: 500; margin-bottom: 20px; color: #000; }
            .amount { font-size: 20px; font-weight: bold; color: #000; margin-bottom: 20px; }
            .concept { font-size: 12px; color: #555; }
            .details-section { margin-top: 30px; font-size: 11px; }
            .details-header { font-weight: bold; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase; color: #999; font-size: 10px; }
            .footer { text-align: center; font-size: 10px; color: #999; margin-top: 30px; padding: 20px; border-top: 1px solid #ddd; background: #fcfcfc; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="content">
                <!-- Header with Table for Compatibility -->
                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-bottom: 2px solid #ddd; padding-bottom: 15px;">
                    <tr>
                        <td valign="top" class="header-info" align="left">
                            <h2>RECIBO POR HONORARIOS</h2>
                            <p>N° ${numero_factura_correlativo}</p>
                            <span>Fecha: ${formatDate(fecha_emision)}</span>
                        </td>
                        <td valign="top" class="empresa-info" align="right">
                            <h1>${empresaNombre}</h1>
                            <p>RTN: ${empresaRTN}</p>
                            <p>${empresaEmail}</p>
                            <p>${empresaTelefono}</p>
                        </td>
                    </tr>
                </table>

                <div class="body-card">
                    <span class="section-label">RECIBÍ DE</span>
                    <div class="section-content">
                        ${nombre_cliente}
                        ${rtn_cliente ? `<br><span style="font-size: 11px; color: #666">RTN: ${rtn_cliente}</span>` : ''}
                    </div>

                    <span class="section-label">LA SUMA DE</span>
                    <div class="amount">${formatCurrency(total)}</div>

                    <span class="section-label">POR CONCEPTO DE</span>
                    <div class="concept">${concepto}</div>
                </div>

                <div class="details-section">
                    <div class="details-header">DETALLE DE PAGO</div>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 11px;">
                        <tr>
                            <td align="left">Subtotal</td>
                            <td align="right" style="font-weight: 500;">${formatCurrency(subtotal)}</td>
                        </tr>
                        <tr>
                            <td colspan="2" style="padding-top: 10px;">
                                <table width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #ddd; padding-top: 8px;">
                                    <tr>
                                        <td align="left" style="font-size: 12px; font-weight: bold;">TOTAL</td>
                                        <td align="right" style="font-size: 14px; font-weight: bold; color: #000;">${formatCurrency(total)}</td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </div>

                <div class="details-section" style="margin-top: 25px;">
                    <div class="details-header">DATOS FISCALES DEL COMPROBANTE</div>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 10px; color: #555;">
                        <tr>
                            <td style="padding-bottom: 5px;"><strong>CAI:</strong> ${empresaCAI}</td>
                        </tr>
                        <tr>
                            <td style="padding-bottom: 5px;"><strong>Rango Autorizado:</strong> ${empresaRango}</td>
                        </tr>
                        <tr>
                            <td><strong>Fecha Límite de Emisión:</strong> ${empresaFechaLimite}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="footer">
                <p style="margin-bottom: 5px;">Este documento es un comprobante de pago por honorarios profesionales emitido electrónicamente.</p>
                <p style="margin: 0;">© 2026 ${empresaNombre}. Todos los derechos reservados.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: '"' + empresaNombre + '" <' + process.env.EMAIL_USER + '>',
        to: userEmail,
        subject: 'Recibo por Honorarios N° ' + numero_factura_correlativo,
        html: htmlContent
    };

    return await transporter.sendMail(mailOptions);
};

module.exports = { sendReceiptEmail };
