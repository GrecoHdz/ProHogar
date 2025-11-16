const { Op, Sequelize } = require('sequelize');
const Cotizacion = require("../models/cotizacionModel"); 
const Referido = require("../models/referidosModel");

// Obtener todas las cotizaciones con información relacionada
const getAllCotizaciones = async (req, res) => {
    try {
        // Obtener parámetros de paginación
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 10); // Máximo 10 por rendimiento
        const offset = parseInt(req.query.offset) || 0;
        const { estado, search, month } = req.query;

        // Construir condiciones de búsqueda
        const whereCondition = {
            id_cuenta: { [Op.ne]: null },  // Solo cotizaciones con id_cuenta no nulo
            estado: { [Op.in]: ['rechazado', 'pagado', 'confirmado'] },  // Excluir cotizaciones pendientes
        };
        const andConditions = [];

        // Filtro por estado
        if (estado) {
            whereCondition.estado = estado;
        }

        // Filtro por término de búsqueda
        if (search) {
            andConditions.push({
                [Op.or]: [
                    { num_comprobante: { [Op.like]: `%${search}%` } },
                    { '$solicitud.descripcion$': { [Op.like]: `%${search}%` } },
                    { '$solicitud.cliente.nombre$': { [Op.like]: `%${search}%` } },
                    { '$solicitud.cliente.telefono$': { [Op.like]: `%${search}%` }}
                ]
            });
        }

        // Filtro por mes
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('fecha')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('fecha')), monthNum)
            );
        }

        // Combinar condiciones
        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        // Obtener el conteo total
        const total = await Cotizacion.count({ 
            where: whereCondition,
            distinct: true,
            col: 'id_cotizacion'
        });

        // Obtener estadísticas y cotizaciones en paralelo
        const [stats, cotizaciones] = await Promise.all([
            // Obtener estadísticas por estado
            Cotizacion.findAll({
                attributes: [
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'confirmado' THEN 1 END)"), 'aprobados'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'rechazado' THEN 1 END)"), 'rechazados'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'pagado' THEN 1 END)"), 'pendientes'],
                    [Sequelize.literal("SUM(CASE WHEN estado = 'confirmado' THEN (monto_manodeobra - COALESCE(descuento_membresia, 0) - COALESCE(credito_usado, 0)) ELSE 0 END)"), 'total']
                ],
                where: whereCondition,
                raw: true
            }),

            // Obtener cotizaciones con paginación
            Cotizacion.findAll({
                where: whereCondition,
                include: [
                    {
                        model: require('../models/solicitudServicioModel'),
                        as: 'solicitud',
                        attributes: ['id_solicitud', 'descripcion', 'direccion_precisa', 'colonia', 'estado'],
                        include: [
                            {
                                model: require('../models/usuariosModel'),
                                as: 'cliente',
                                attributes: ['id_usuario', 'nombre', 'telefono', 'email']
                            },
                            {
                                model: require('../models/serviciosModel'),
                                as: 'servicio',
                                attributes: ['id_servicio', 'nombre']
                            },
                            {
                                model: require('../models/ciudadesModel'),
                                as: 'ciudad',
                                attributes: ['id_ciudad', 'nombre_ciudad']
                            }
                        ]
                    },
                    {
                        model: require('../models/cuentasModel'),
                        as: 'cuenta',
                        attributes: ['id_cuenta', 'banco', 'beneficiario', 'num_cuenta', 'tipo']
                    }
                ],
                order: [['fecha', 'DESC']],
                limit,
                offset,
                raw: true,
                nest: true
            })
        ]);

        // Procesar estadísticas
        const statsData = stats[0] || { aprobados: 0, rechazados: 0, pendientes: 0, total: 0 };
        const monthlyStats = {
            aprobados: parseInt(statsData.aprobados) || 0,
            rechazados: parseInt(statsData.rechazados) || 0,
            pendientes: parseInt(statsData.pendientes) || 0,
            total: parseFloat(statsData.total) || 0
        };

        // Formatear respuesta
        const cotizacionesFormateadas = cotizaciones.map(({ 
            id_cotizacion,
            id_solicitud,
            id_cuenta,
            monto_manodeobra,
            monto_materiales,
            descuento_membresia,
            credito_usado,
            comentario,
            fecha,
            estado,
            num_comprobante,
            solicitud,
            cuenta
        }) => ({
            id_cotizacion,
            id_solicitud,
            id_cuenta,
            monto_manodeobra,
            monto_materiales,
            descuento_membresia: descuento_membresia || 0,
            credito_usado: credito_usado || 0,
            monto_total: monto_manodeobra - (descuento_membresia || 0) - (credito_usado || 0),
            comentario,
            fecha,
            estado,
            num_comprobante,
            solicitud: solicitud ? {
                id_solicitud: solicitud.id_solicitud,
                descripcion: solicitud.descripcion,
                direccion_precisa: solicitud.direccion_precisa,
                colonia: solicitud.colonia,
                estado: solicitud.estado,
                cliente: solicitud.cliente ? {
                    id_usuario: solicitud.cliente.id_usuario,
                    nombre: solicitud.cliente.nombre,
                    telefono: solicitud.cliente.telefono,
                    email: solicitud.cliente.email
                } : null,
                servicio: solicitud.servicio ? {
                    id_servicio: solicitud.servicio.id_servicio,
                    nombre: solicitud.servicio.nombre
                } : null,
                ciudad: solicitud.ciudad ? {
                    id_ciudad: solicitud.ciudad.id_ciudad,
                    nombre: solicitud.ciudad.nombre_ciudad
                } : null
            } : null,
            cuenta: cuenta ? {
                id_cuenta: cuenta.id_cuenta,
                banco: cuenta.banco,
                beneficiario: cuenta.beneficiario,
                num_cuenta: cuenta.num_cuenta,
                tipo: cuenta.tipo
            } : null
        }));

        // Enviar respuesta
        res.json({
            success: true,
            data: cotizacionesFormateadas,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            estadisticas: monthlyStats
        });
    } catch (error) {
        console.error('Error al obtener las cotizaciones:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener las cotizaciones',
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
        res.status(500).json({ error: 'Error al obtener las cotizaciones' });
    }
};

//Obtener todas las cotizaciones de una solicitud
const getCotizacionPorSolicitud = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.findAll({ where: { id_solicitud: req.params.id_solicitud } });
        res.json(cotizacion);
    } catch (error) {
        console.error('Error al obtener la cotizacion:', error);
        res.status(500).json({ error: 'Error al obtener la cotizacion' });
    }
};

//Obtener ultima cotizacion de solicitud especifica
const getUltimaCotizacionPorSolicitud = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.findOne({
            where: { id_solicitud: req.params.id_solicitud },
            order: [['id_cotizacion','DESC']]
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
        res.status(500).json({ error: 'Error al crear la cotizacion' });
    }
};

//Actualizar cotizacion
const updateCotizacion = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.update(req.body, { where: { id_cotizacion: req.params.id } });
        res.json(cotizacion);
    } catch (error) {
        console.error('Error al actualizar la cotizacion:', error);
        res.status(500).json({ error: 'Error al actualizar la cotizacion' });
    }
};

//Eliminar cotizacion
const deleteCotizacion = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.destroy({ where: { id_cotizacion: req.params.id } });
        res.json(cotizacion);
    } catch (error) {
        console.error('Error al eliminar la cotizacion:', error);
        res.status(500).json({ error: 'Error al eliminar la cotizacion' });
    }
};

module.exports = {
    getAllCotizaciones,
    getCotizacionesPorUsuario,
    getUltimaCotizacionPorSolicitud,
    getCotizacionPorSolicitud,
    createCotizacion,
    updateCotizacion,
    deleteCotizacion
};
