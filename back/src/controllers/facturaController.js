const { Sequelize, Op } = require("sequelize");
const Factura = require("../models/facturaModel");
const FacturaRelacion = require("../models/facturaRelacionModel");
const FacturaCorrelativo = require("../models/facturaCorrelativoModel");
const Usuario = require("../models/usuariosModel");
const Config = require("../models/configModel");
const { sequelize } = require("../config/database");
const { obtenerSiguienteCorrelativo, obtenerCorrelativoPorCAI } = require("./facturaCorrelativoController");
const { sendReceiptEmail } = require("../utils/receiptMailer");


const obtenerEstadoCorrelativo = async (req, res) => {
    try {
        const correlativo = await FacturaCorrelativo.findOne({
            where: { estado: 'ACTIVO' },
            order: [['id', 'DESC']],
            raw: true
        });

        res.json({
            status: 'success',
            data: correlativo
        });

    } catch (error) {
        console.error("Error al obtener correlativo:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener correlativo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obtenerFacturaDetalle = async (req, res) => {
    try {
        const factura = await Factura.findByPk(req.params.id, { raw: true });

        if (!factura) {
            return res.status(404).json({
                status: 'not_found',
                message: 'Factura no encontrada'
            });
        }

        const relaciones = await FacturaRelacion.findAll({
            where: { id_factura: factura.id_factura },
            raw: true
        });

        res.json({
            status: 'success',
            factura,
            relaciones
        });

    } catch (error) {
        console.error("Error al obtener detalle de factura:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener detalle de factura',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obtenerFacturas = async (req, res) => {
    try {
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 10);
        const offset = parseInt(req.query.offset) || 0;
        const searchTerm = req.query.search || '';
        const tipo = req.query.tipo;
        const estado = req.query.estado;
        const month = req.query.month; // YYYY-MM

        const whereCondition = {};
        const andConditions = [];

        if (searchTerm) {
            andConditions.push({
                [Op.or]: [
                    { numero_factura_correlativo: { [Op.like]: `%${searchTerm}%` } },
                    { nombre_cliente: { [Op.like]: `%${searchTerm}%` } },
                    { rtn_cliente: { [Op.like]: `%${searchTerm}%` } }
                ]
            });
        }

        if (tipo) {
            whereCondition.tipo_factura = tipo;
        }

        if (estado) {
            whereCondition.estado = estado;
        }

        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('fecha_emision')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('fecha_emision')), monthNum)
            );
        }

        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        const total = await Factura.count({ where: whereCondition });

        const [facturas, stats] = await Promise.all([
            Factura.findAll({
                where: whereCondition,
                order: [['fecha_emision', 'DESC']],
                limit,
                offset,
                raw: true
            }),

            Factura.findAll({
                attributes: [
                    [Sequelize.literal("COUNT(*)"), 'total_facturas'],
                    [Sequelize.literal("SUM(subtotal)"), 'subtotal'],
                    [Sequelize.literal("SUM(isv)"), 'isv'],
                    [Sequelize.literal("SUM(total)"), 'total']
                ],
                where: whereCondition,
                raw: true
            })
        ]);

        const statsData = stats[0] || {};

        res.json({
            success: true,
            data: facturas,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            estadisticas: {
                subtotal: parseFloat(statsData.subtotal) || 0,
                isv: parseFloat(statsData.isv) || 0,
                total: parseFloat(statsData.total) || 0
            }
        });

    } catch (error) {
        console.error("Error al obtener facturas:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener facturas",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const crearFactura = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const correlativo = await FacturaCorrelativo.findOne({
            where: { estado: 'ACTIVO' },
            lock: transaction.LOCK.UPDATE,
            transaction
        });

        if (!correlativo) {
            await transaction.rollback();
            return res.status(200).json({
                status: 'error_config',
                message: 'No hay correlativo SAR activo'
            });
        }

        if (correlativo.correlativo_actual >= correlativo.rango_fin) {
            await transaction.rollback();
            return res.status(200).json({
                status: 'error_config',
                message: 'Rango de facturación agotado'
            });
        }

        const nuevoCorrelativo = correlativo.correlativo_actual + 1;
        const correlativoFormateado = `${correlativo.prefijo}${nuevoCorrelativo.toString().padStart(8, '0')}`;

        // Preparar datos de factura con valores por defecto para CONSUMIDOR_FINAL
        const facturaData = {
            ...req.body,
            numero_factura_correlativo: correlativoFormateado,
            cai: correlativo.cai,
            fecha_emision: obtenerFechaActualServidor()
        };

        // Si es CONSUMIDOR_FINAL, establecer valores por defecto
        if (req.body.tipo_factura === 'CONSUMIDOR_FINAL') {
            facturaData.rtn_cliente = 'CF';
            facturaData.nombre_cliente = 'CONSUMIDOR FINAL';
        }

        const factura = await Factura.create(facturaData, { transaction });

        // Extraer IDs de relación explícitamente
        const id_pagovisita = req.body.id_pagovisita || null;
        const id_cotizacion = req.body.id_cotizacion || null;
        const id_membresia = req.body.id_membresia || null;
        const id_pago_paquete = req.body.id_pago_paquete || null;

        const relacion = await FacturaRelacion.create({
            id_factura: factura.id_factura,
            id_pagovisita,
            id_cotizacion,
            id_membresia,
            id_pago_paquete
        }, { transaction });

        await FacturaCorrelativo.update(
            { correlativo_actual: nuevoCorrelativo },
            { where: { id: correlativo.id }, transaction }
        );

        await transaction.commit();

        // Enviar correo si es factura con RTN
        if (req.body.tipo_factura === 'CON_RTN' && (req.body.id_usuario || req.body.email)) {
            try {
                // Obtener datos del usuario para el correo
                let userEmail = req.body.email;
                if (!userEmail && req.body.id_usuario) {
                    const user = await Usuario.findByPk(req.body.id_usuario, { attributes: ['email'] });
                    userEmail = user?.email;
                }

                if (userEmail) {
                    // Obtener configuración de la empresa
                    const configs = await Config.findAll({
                        where: {
                            tipo_config: {
                                [Op.in]: ['empresa_nombre', 'rtn', 'correo_empresa', 'numero_empresa']
                            }
                        }
                    });

                    const empresaConfig = {
                        nombre: configs.find(c => c.tipo_config === 'empresa_nombre')?.valor || 'HogarSeguro',
                        rtn: configs.find(c => c.tipo_config === 'rtn')?.valor || '',
                        email: configs.find(c => c.tipo_config === 'correo_empresa')?.valor || '',
                        telefono: configs.find(c => c.tipo_config === 'numero_empresa')?.valor || ''
                    };

                    // Obtener info del correlativo para el CAI
                    const caiInfo = await obtenerCorrelativoPorCAI(correlativo.cai);
                    empresaConfig.cai = correlativo.cai;
                    empresaConfig.rango_autorizado = caiInfo.rango_autorizado;
                    empresaConfig.fecha_limite = caiInfo.fecha_limite_emision;

                    // Preparar datos para el correo
                    const facturaParaEmail = {
                        ...factura.get({ plain: true }),
                        id_pagovisita: req.body.id_pagovisita,
                        id_cotizacion: req.body.id_cotizacion,
                        id_membresia: req.body.id_membresia
                    };

                    await sendReceiptEmail(userEmail, facturaParaEmail, empresaConfig);
                }
            } catch (emailError) {
                console.error("❌ Error al enviar email de factura:", emailError);
            }
        }

        res.json({
            status: 'success',
            data: factura
        });

    } catch (error) {
        await transaction.rollback();
        console.error("Error al crear factura:", error);
        res.status(500).json({
            status: 'error',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

const enviarFacturaPorEmail = async (req, res) => {
    try {
        const { id } = req.params;

        // Get the invoice with relations
        const factura = await Factura.findByPk(id, {
            include: [
                {
                    model: FacturaRelacion,
                    as: 'relaciones'
                }
            ]
        });

        if (!factura) {
            return res.status(404).json({
                status: 'not_found',
                message: 'Factura no encontrada'
            });
        }

        // Get user email from the invoice
        let userEmail = null;
        if (factura.relaciones && factura.relaciones.length > 0) {
            const relacion = factura.relaciones[0];

            // Depending on your relations, you might need to include the user model
            // and adjust this query to get the user's email
            const user = await Usuario.findOne({
                where: { id_usuario: factura.id_usuario } // Adjust this based on your schema
            });

            if (user && user.correo) {
                userEmail = user.correo;
            }
        }

        if (!userEmail) {
            return res.status(400).json({
                status: 'error',
                message: 'No se pudo determinar el correo del destinatario'
            });
        }

        // Generate PDF (you'll need to implement this)
        const pdfBuffer = await generarPDFFactura(factura);

        // Send email (you'll need to implement this)
        await enviarEmailConFactura(userEmail, factura, pdfBuffer);

        res.json({
            status: 'success',
            message: 'Factura enviada por correo electrónico'
        });

    } catch (error) {
        console.error('Error al enviar factura por email:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al enviar factura por correo electrónico',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


const anularFactura = async (req, res) => {
    try {
        const [updated] = await Factura.update(
            { estado: 'ANULADA' },
            { where: { id_factura: req.params.id } }
        );

        if (!updated) {
            throw new Error('No se pudo anular la factura');
        }

        const factura = await Factura.findByPk(req.params.id);
        res.json({
            status: 'success',
            data: factura
        });

    } catch (error) {
        console.error("Error al anular factura:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al anular factura',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obtenerPendientesFacturacion = async (req, res) => {
    try {
        const month = req.query.month; // YYYY-MM
        if (!month) {
            return res.status(400).json({ status: 'error', message: 'El mes es requerido (YYYY-MM)' });
        }

        const [year, monthNum] = month.split('-').map(Number);

        // Modelos necesarios
        const Membresia = require("../models/membresiaModel");
        const PagoVisita = require("../models/pagoVisitaModel");
        const Cotizacion = require("../models/cotizacionModel");
        const SolicitudServicio = require("../models/solicitudServicioModel");
        const Servicio = require("../models/serviciosModel");
        const PagoPaquete = require("../models/pagoPaqueteModel");
        const Paquete = require("../models/paquetesModel");
        const PaqueteUsuario = require("../models/paquetesUsuariosModel");

        // Obtener el porcentaje de comisión para paquetes
        const configComision = await Config.findOne({
            where: { tipo_config: 'comision_por_paquete' }
        });
        const porcentajeComision = configComision ? parseFloat(configComision.valor) : 10;

        // Consulta de Membresías pendientes
        const membresias = await Membresia.findAll({
            where: {
                estado: {
                    [Op.in]: ['activa', 'vencida']
                },
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('Membresia.fecha')), year),
                    Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('Membresia.fecha')), monthNum)
                ]
            },
            include: [
                { model: Usuario, as: 'usuario', attributes: ['nombre', 'telefono'] },
                { model: FacturaRelacion, as: 'facturaRelacion', include: [{ model: Factura, as: 'factura' }] }
            ],
            nest: true
        });

        // Consulta de Pagos de Visita pendientes
        const visitas = await PagoVisita.findAll({
            where: {
                estado: 'aprobado',
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('PagoVisita.fecha')), year),
                    Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('PagoVisita.fecha')), monthNum)
                ]
            },
            include: [
                { model: Usuario, as: 'usuario', attributes: ['nombre', 'telefono'] },
                {
                    model: SolicitudServicio, as: 'solicitud',
                    include: [{ model: Servicio, as: 'servicio', attributes: ['nombre'] }]
                },
                { model: FacturaRelacion, as: 'facturaRelacion', include: [{ model: Factura, as: 'factura' }] }
            ],
            nest: true
        });

        // Consulta de Cotizaciones (Servicios) pendientes
        const cotizaciones = await Cotizacion.findAll({
            where: {
                estado: 'confirmado',
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('fecha')), year),
                    Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('fecha')), monthNum)
                ]
            },
            include: [
                {
                    model: SolicitudServicio, as: 'solicitud',
                    include: [
                        { model: Usuario, as: 'cliente', attributes: ['nombre', 'telefono'] },
                        { model: Servicio, as: 'servicio', attributes: ['nombre'] }
                    ]
                },
                { model: FacturaRelacion, as: 'facturaRelacion', include: [{ model: Factura, as: 'factura' }] }
            ],
            nest: true
        });

        // Consulta de Pagos de Paquetes pendientes
        const pagosPaquetes = await PagoPaquete.findAll({
            where: {
                estado: 'aprobado',
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('PagoPaquete.fecha')), year),
                    Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('PagoPaquete.fecha')), monthNum)
                ]
            },
            include: [
                { model: Usuario, as: 'usuario', attributes: ['nombre', 'telefono'] },
                {
                    model: PaqueteUsuario, as: 'paqueteUsuario',
                    include: [{ model: Paquete, attributes: ['nombre'] }]
                },
                { model: FacturaRelacion, as: 'facturaRelacion', include: [{ model: Factura, as: 'factura' }] }
            ],
            nest: true
        });

        // Filtrar y unificar
        const normalize = (items, type) => {
            return items
                .filter(item => !item.facturaRelacion?.factura)
                .map(item => {
                    const raw = item.toJSON ? item.toJSON() : item;

                    // Si es un paquete, el monto a facturar es solo la comisión de la app
                    if (type === 'packages') {
                        raw.monto_total_paquete = raw.monto; // Guardamos el original por si acaso
                        raw.monto = (parseFloat(raw.monto) * porcentajeComision) / 100;
                    }

                    return {
                        ...raw,
                        billingType: type,
                        id_local: `${type}-${raw.id_membresia || raw.id_pagovisita || raw.id_cotizacion || raw.id_pago_paquete}`
                    };
                });
        };

        const result = [
            ...normalize(membresias, 'membership'),
            ...normalize(visitas, 'visits'),
            ...normalize(cotizaciones, 'services'),
            ...normalize(pagosPaquetes, 'packages')
        ];

        res.json({
            status: 'success',
            data: result
        });

    } catch (error) {
        console.error("Error al obtener pendientes de facturación:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener pendientes de facturación',
            details: error.message
        });
    }
};

// Función para obtener la fecha actual del servidor
const obtenerFechaActualServidor = () => {
    const ahora = new Date();
    // Obtener la fecha y hora local del servidor
    const offset = ahora.getTimezoneOffset();
    const fechaLocal = new Date(ahora.getTime() - (offset * 60000));

    return new Date(
        fechaLocal.getFullYear(),
        fechaLocal.getMonth(),
        fechaLocal.getDate(),
        fechaLocal.getHours(),
        fechaLocal.getMinutes(),
        fechaLocal.getSeconds(),
        fechaLocal.getMilliseconds()
    );
};

module.exports = {
    obtenerFacturas,
    obtenerFacturaDetalle,
    crearFactura,
    anularFactura,
    obtenerEstadoCorrelativo,
    obtenerPendientesFacturacion,
    obtenerFechaActualServidor,
    enviarFacturaPorEmail
};
