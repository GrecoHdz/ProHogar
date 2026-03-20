const { Op, Sequelize } = require('sequelize');
const Cotizacion = require("../models/cotizacionModel");
const Referido = require("../models/referidosModel");

// Obtener todas las cotizaciones con información relacionada
const getAllCotizaciones = async (req, res) => {
    try {
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 1000); // Máximo 1000 para reportes
        const offset = parseInt(req.query.offset) || 0;
        const { estado, search, month } = req.query;

        const whereCondition = {
            estado: { [Op.in]: ['rechazado', 'pagado', 'confirmado'] },
        };
        // Solo filtrar por id_cuenta cuando viene del panel de pagos (no para reportes)
        // Los pagos en efectivo tienen id_cuenta = null y deben aparecer en reportes
        if (req.query.soloCuentas === 'true') {
            whereCondition.id_cuenta = { [Op.ne]: null };
        }
        const andConditions = [];

        if (estado) {
            whereCondition.estado = estado;
        }

        if (search) {
            andConditions.push({
                [Op.or]: [
                    { num_comprobante: { [Op.like]: `%${search}%` } },
                    { '$solicitud.descripcion$': { [Op.like]: `%${search}%` } },
                    { '$solicitud.cliente.nombre$': { [Op.like]: `%${search}%` } },
                    { '$solicitud.cliente.telefono$': { [Op.like]: `%${search}%` } }
                ]
            });
        }

        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('fecha')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('fecha')), monthNum)
            );
        }

        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        const total = await Cotizacion.count({
            where: whereCondition,
            distinct: true,
            col: 'id_cotizacion'
        });

        const [stats, cotizaciones] = await Promise.all([
            Cotizacion.findAll({
                attributes: [
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'confirmado' THEN 1 END)"), 'aprobados'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'rechazado' THEN 1 END)"), 'rechazados'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'pagado' THEN 1 END)"), 'pendientes'],
                    [Sequelize.literal("SUM(CASE WHEN estado = 'confirmado' THEN COALESCE(monto_comision_app, 0) ELSE 0 END)"), 'total']
                ],
                where: whereCondition,
                raw: true
            }),
            Cotizacion.findAll({
                where: whereCondition,
                include: [
                    {
                        model: require('../models/solicitudServicioModel'),
                        as: 'solicitud',
                        attributes: ['id_solicitud', 'descripcion', 'direccion_precisa', 'colonia', 'estado'],
                        include: [
                            { model: require('../models/usuariosModel'), as: 'cliente', attributes: ['id_usuario', 'nombre', 'telefono'] },
                            { model: require('../models/usuariosModel'), as: 'tecnico', attributes: ['id_usuario', 'nombre', 'telefono'] },
                            { model: require('../models/serviciosModel'), as: 'servicio', attributes: ['id_servicio', 'nombre'] },
                            { model: require('../models/ciudadesModel'), as: 'ciudad', attributes: ['id_ciudad', 'nombre_ciudad'] }
                        ]
                    },
                    {
                        model: require('../models/cuentasModel'),
                        as: 'cuenta',
                        attributes: ['id_cuenta', 'banco', 'beneficiario', 'num_cuenta', 'tipo']
                    },
                    {
                        model: require('../models/facturaRelacionModel'),
                        as: 'facturaRelacion',
                        include: [
                            {
                                model: require('../models/facturaModel'),
                                as: 'factura',
                                attributes: ['id_factura', 'numero_factura_correlativo', 'estado']
                            }
                        ]
                    }
                ],
                order: [['fecha', 'DESC']],
                limit,
                offset,
                raw: true,
                nest: true
            })
        ]);

        const statsData = stats[0] || {};
        const monthlyStats = {
            aprobados: parseInt(statsData.aprobados) || 0,
            rechazados: parseInt(statsData.rechazados) || 0,
            pendientes: parseInt(statsData.pendientes) || 0,
            total: parseFloat(statsData.total) || 0
        };

        const cotizacionesFormateadas = cotizaciones.map(c => ({
            id_cotizacion: c.id_cotizacion,
            id_solicitud: c.id_solicitud,
            id_cuenta: c.id_cuenta,
            monto_manodeobra: c.monto_manodeobra,
            monto_materiales: c.monto_materiales,
            descuento_membresia: c.descuento_membresia || 0,
            credito_usado: c.credito_usado || 0,
            monto_total: c.monto_manodeobra - (c.descuento_membresia || 0) - (c.credito_usado || 0),
            monto_comision_app: c.monto_comision_app, // Incluido para reportes
            comentario: c.comentario,
            fecha: c.fecha,
            estado: c.estado,
            num_comprobante: c.num_comprobante,
            solicitud: c.solicitud,
            cuenta: c.cuenta,
            facturaRelacion: c.facturaRelacion
        }));

        const response = {
            success: true,
            data: cotizacionesFormateadas,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            estadisticas: monthlyStats
        };

        res.json(response);

    } catch (error) {
        console.error('Error al obtener las cotizaciones:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las cotizaciones',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener cotización por ID
const getCotizacionPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const whereCondition = {
            id_cotizacion: id,
            id_cuenta: { [Op.ne]: null },
            estado: { [Op.in]: ['rechazado', 'pagado', 'confirmado'] }
        };

        const total = await Cotizacion.count({
            where: whereCondition,
            distinct: true,
            col: 'id_cotizacion'
        });

        if (total === 0) {
            return res.json({
                success: false,
                data: [],
                total: 0,
                page: 1,
                totalPages: 0,
                hasMore: false,
                estadisticas: {
                    aprobados: 0,
                    rechazados: 0,
                    pendientes: 0,
                    total: 0
                }
            });
        }

        const stats = await Cotizacion.findAll({
            attributes: [
                [Sequelize.literal("COUNT(CASE WHEN estado = 'confirmado' THEN 1 END)"), 'aprobados'],
                [Sequelize.literal("COUNT(CASE WHEN estado = 'rechazado' THEN 1 END)"), 'rechazados'],
                [Sequelize.literal("COUNT(CASE WHEN estado = 'pagado' THEN 1 END)"), 'pendientes'],
                [Sequelize.literal("SUM(CASE WHEN estado = 'confirmado' THEN (monto_manodeobra - COALESCE(descuento_membresia, 0) - COALESCE(credito_usado, 0)) ELSE 0 END)"), 'total']
            ],
            where: whereCondition,
            raw: true
        });

        const cotizaciones = await Cotizacion.findAll({
            where: whereCondition,
            include: [
                {
                    model: require('../models/solicitudServicioModel'),
                    as: 'solicitud',
                    attributes: ['id_solicitud', 'descripcion', 'direccion_precisa', 'colonia', 'estado'],
                    include: [
                        { model: require('../models/usuariosModel'), as: 'cliente', attributes: ['id_usuario', 'nombre', 'telefono'] },
                        { model: require('../models/usuariosModel'), as: 'tecnico', attributes: ['id_usuario', 'nombre', 'telefono'] },
                        { model: require('../models/serviciosModel'), as: 'servicio', attributes: ['id_servicio', 'nombre'] },
                        { model: require('../models/ciudadesModel'), as: 'ciudad', attributes: ['id_ciudad', 'nombre_ciudad'] }
                    ]
                },
                {
                    model: require('../models/cuentasModel'),
                    as: 'cuenta',
                    attributes: ['id_cuenta', 'banco', 'beneficiario', 'num_cuenta', 'tipo']
                },
                {
                    model: require('../models/facturaRelacionModel'),
                    as: 'facturaRelacion',
                    include: [
                        {
                            model: require('../models/facturaModel'),
                            as: 'factura',
                            attributes: ['id_factura', 'numero_factura_correlativo', 'estado']
                        }
                    ]
                }
            ],
            order: [['fecha', 'DESC']],
            raw: true,
            nest: true
        });

        const cotizacionesFormateadas = cotizaciones.map(c => ({
            id_cotizacion: c.id_cotizacion,
            id_solicitud: c.id_solicitud,
            id_cuenta: c.id_cuenta,
            monto_manodeobra: c.monto_manodeobra,
            monto_materiales: c.monto_materiales,
            descuento_membresia: c.descuento_membresia || 0,
            credito_usado: c.credito_usado || 0,
            monto_total: c.monto_manodeobra - (c.descuento_membresia || 0) - (c.credito_usado || 0),
            comentario: c.comentario,
            fecha: c.fecha,
            estado: c.estado,
            num_comprobante: c.num_comprobante,
            solicitud: c.solicitud,
            cuenta: c.cuenta,
            facturaRelacion: c.facturaRelacion
        }));

        const statsData = stats[0] || {};
        const estadisticas = {
            aprobados: parseInt(statsData.aprobados) || 0,
            rechazados: parseInt(statsData.rechazados) || 0,
            pendientes: parseInt(statsData.pendientes) || 0,
            total: parseFloat(statsData.total) || 0
        };

        const response = {
            success: true,
            data: cotizacionesFormateadas,
            total,
            page: 1,
            totalPages: 1,
            hasMore: false,
            estadisticas
        };

        return res.json(response);

    } catch (error) {
        console.error('Error al obtener la cotización por ID:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al obtener la cotización',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


//Obtener cotizaciones por usuario
const getCotizacionesPorUsuario = async (req, res) => {
    try {
        const cotizaciones = await Cotizacion.findAll({ where: { id_usuario: req.params.id } });
        res.json(cotizaciones);
    } catch (error) {
        console.error('Error al obtener las cotizaciones:', error);
        res.status(500).json({
            error: 'Error al obtener las cotizaciones',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener todas las cotizaciones de una solicitud
const getCotizacionPorSolicitud = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.findAll({ where: { id_solicitud: req.params.id_solicitud } });
        res.json(cotizacion);
    } catch (error) {
        console.error('Error al obtener la cotizacion:', error);
        res.status(500).json({
            error: 'Error al obtener la cotizacion',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener ultima cotizacion de solicitud especifica
const getUltimaCotizacionPorSolicitud = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.findOne({
            where: { id_solicitud: req.params.id_solicitud },
            order: [['id_cotizacion', 'DESC']]
        });

        if (!cotizacion) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró ninguna cotización para esta solicitud"
            });
        }

        return res.json({
            status: "success",
            data: {
                id_cotizacion: cotizacion.id_cotizacion,
                monto_manodeobra: cotizacion.monto_manodeobra,
                monto_materiales: cotizacion.monto_materiales,
                comentario: cotizacion.comentario,
                estado: cotizacion.estado
            }
        });
    } catch (error) {
        console.error('Error en getUltimaCotizacionPorSolicitud:', error);
        return res.status(500).json({
            status: "error",
            message: "Error al obtener los datos de la cotización",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crear cotizacion
const createCotizacion = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.create({
            ...req.body,
            estado: 'pendiente'
        });
        res.json(cotizacion);
    } catch (error) {
        console.error('Error al crear la cotizacion:', error);
        res.status(500).json({
            error: 'Error al crear la cotizacion',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualizar cotizacion
const updateCotizacion = async (req, res) => {
    try {
        const { id } = req.params;
        const cotizacion = await Cotizacion.findByPk(id);

        if (!cotizacion) {
            return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        // Si el estado cambia a 'confirmado' y no se proporcionó monto_comision_app, calcularlo
        if (req.body.estado === 'confirmado' && !req.body.monto_comision_app) {
            try {
                const Config = require("../models/configModel");
                const configApp = await Config.findOne({
                    where: { tipo_config: 'comision_por_servicio' }
                });

                const porcentajeApp = configApp ? parseFloat(configApp.valor) || 0 : 0;
                const manoObra = parseFloat(req.body.monto_manodeobra || cotizacion.monto_manodeobra) || 0;
                const descMembresia = parseFloat(req.body.descuento_membresia || cotizacion.descuento_membresia) || 0;

                const comisionBrutaApp = Math.round(manoObra * porcentajeApp) / 100;
                req.body.monto_comision_app = Math.max(0, comisionBrutaApp - descMembresia);
            } catch (configError) {
                console.error('Error al calcular comisión de la app:', configError);
                // No bloqueamos la actualización si falla el cálculo, pero lo registramos
            }
        }

        await cotizacion.update(req.body);

        // Si se confirmó exitosamente, completar el movimiento de ingreso del técnico
        if (req.body.estado === 'confirmado') {
            try {
                const Movimiento = require("../models/movimientosModel");
                const movimiento = await Movimiento.findOne({
                    where: {
                        id_cotizacion: cotizacion.id_cotizacion,
                        tipo: 'ingreso',
                        estado: 'pendiente'
                    }
                });

                if (movimiento) {
                    await movimiento.update({ estado: 'completado' });
                    console.log(`Movimiento de ingreso ${movimiento.id_movimiento} completado para cotización confirmada`);
                }
            } catch (movimientoError) {
                console.error('Error al completar movimiento para cotización confirmada:', movimientoError);
            }
        }

        res.json({ success: true, data: cotizacion });
    } catch (error) {
        console.error('Error al actualizar la cotizacion:', error);
        res.status(500).json({
            error: 'Error al actualizar la cotizacion',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Eliminar cotizacion
const deleteCotizacion = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.destroy({ where: { id_cotizacion: req.params.id } });
        res.json(cotizacion);
    } catch (error) {
        console.error('Error al eliminar la cotizacion:', error);
        res.status(500).json({
            error: 'Error al eliminar la cotizacion',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


module.exports = {
    getAllCotizaciones,
    getCotizacionPorId,
    getCotizacionesPorUsuario,
    getUltimaCotizacionPorSolicitud,
    getCotizacionPorSolicitud,
    createCotizacion,
    updateCotizacion,
    deleteCotizacion
};
