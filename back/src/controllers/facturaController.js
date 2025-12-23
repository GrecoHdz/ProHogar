const { Sequelize, Op } = require("sequelize");
const Factura = require("../models/facturaModel");
const FacturaRelacion = require("../models/facturaRelacionModel");
const FacturaCorrelativo = require("../models/facturaCorrelativoModel");
const Usuario = require("../models/usuariosModel");
const Config = require("../models/configModel");
const { sequelize } = require("../config/database");


const obtenerEstadoCorrelativo = async (req, res) => {
    try {
        const correlativo = await FacturaCorrelativo.findOne({
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
            throw new Error('No hay correlativo SAR activo');
        }

        if (correlativo.correlativo_actual >= correlativo.rango_fin) {
            throw new Error('Rango de facturación agotado');
        }

        const nuevoCorrelativo = correlativo.correlativo_actual + 1;

        // Preparar datos de factura con valores por defecto para CONSUMIDOR_FINAL
        const facturaData = {
            ...req.body,
            numero_factura_correlativo: nuevoCorrelativo,
            cai: correlativo.cai,
            fecha_emision: new Date()
        };

        // Si es CONSUMIDOR_FINAL, establecer valores por defecto
        if (req.body.tipo_factura === 'CONSUMIDOR_FINAL') {
            facturaData.rtn_cliente = 'CF';
            facturaData.nombre_cliente = 'CONSUMIDOR FINAL';
        }

        const factura = await Factura.create(facturaData, { transaction });

        await FacturaRelacion.create({
            id_factura: factura.id_factura,
            id_pagovisita: req.body.id_pagovisita || null,
            id_cotizacion: req.body.id_cotizacion || null,
            id_membresia: req.body.id_membresia || null
        }, { transaction });

        await FacturaCorrelativo.update(
            { correlativo_actual: nuevoCorrelativo },
            { where: { id: correlativo.id }, transaction }
        );

        await transaction.commit();

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

module.exports = {
    obtenerFacturas,
    obtenerFacturaDetalle,
    crearFactura,
    anularFactura,
    obtenerEstadoCorrelativo
};
