const { Sequelize, Op } = require("sequelize");
const FacturaRelacion = require("../models/facturaRelacionModel");
const Factura = require("../models/facturaModel");
const { obtenerCorrelativoPorCAI } = require("./facturaCorrelativoController");

const obtenerRelacionesFactura = async (req, res) => {
    try {
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 10);
        const offset = parseInt(req.query.offset) || 0;

        const total = await FacturaRelacion.count();

        const relaciones = await FacturaRelacion.findAll({
            order: [['id', 'DESC']],
            limit,
            offset,
            raw: true
        });

        res.json({
            success: true,
            data: relaciones,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total
        });

    } catch (error) {
        console.error("Error al obtener relaciones de factura:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener relaciones de factura",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obtenerRelacionPorFactura = async (req, res) => {
    try {
        const { id_factura } = req.params;

        const relacion = await FacturaRelacion.findOne({
            where: { id_factura },
            raw: true
        });

        if (!relacion) {
            return res.status(404).json({
                status: 'not_found',
                message: 'No existe relación para esta factura'
            });
        }

        res.json({
            status: 'success',
            data: relacion
        });

    } catch (error) {
        console.error("Error al obtener relación de factura:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener relación de factura',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const buscarFacturaPorPago = async (req, res) => {
    try {
        const { id_pagovisita, id_cotizacion, id_membresia } = req.query;
        
        // Validar que solo se proporcione un tipo de ID
        const ids = [id_pagovisita, id_cotizacion, id_membresia].filter(Boolean);
        if (ids.length !== 1) {
            return res.status(400).json({
                status: 'error',
                message: 'Debe proporcionar exactamente un tipo de ID (id_pagovisita, id_cotizacion o id_membresia)'
            });
        }

        // Construir cláusula WHERE
        const whereClause = {};
        if (id_pagovisita) whereClause.id_pagovisita = id_pagovisita;
        if (id_cotizacion) whereClause.id_cotizacion = id_cotizacion;
        if (id_membresia) whereClause.id_membresia = id_membresia;

        // Buscar la relación con include de factura (la más reciente)
        const relacion = await FacturaRelacion.findOne({ 
            where: whereClause,
            include: [{
                model: Factura,
                as: 'factura',
                required: true
            }],
            order: [['id', 'DESC']], // Ordenar por ID descendente para obtener la más reciente
            limit: 1
        });

        if (!relacion) {
            return res.status(404).json({
                status: 'not_found',
                message: 'No se encontró ninguna factura asociada a este pago'
            });
        }

        // Obtener información del correlativo usando el CAI de la factura
        let correlativoInfo = null;
        try {
            correlativoInfo = await obtenerCorrelativoPorCAI(relacion.factura.cai);
        } catch (error) {
            console.warn('No se encontró correlativo para el CAI:', relacion.factura.cai);
            // No es un error fatal, continuamos sin la información del correlativo
        }

        res.json({
            status: 'success',
            factura: relacion.factura,
            correlativo: correlativoInfo
        });

    } catch (error) {
        console.error('Error al buscar factura por pago:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error al buscar factura',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const crearRelacionFactura = async (req, res) => {
    try {
        const { id_factura, id_pagovisita, id_cotizacion, id_membresia } = req.body;

        const countIds = [id_pagovisita, id_cotizacion, id_membresia]
            .filter(v => v !== null && v !== undefined).length;

        if (countIds !== 1) {
            return res.status(400).json({
                status: 'error',
                message: 'Debe existir exactamente un tipo de pago relacionado'
            });
        }

        const existe = await FacturaRelacion.findOne({
            where: { id_factura }
        });

        if (existe) {
            return res.status(409).json({
                status: 'error',
                message: 'Esta factura ya tiene una relación registrada'
            });
        }

        const relacion = await FacturaRelacion.create({
            id_factura,
            id_pagovisita: id_pagovisita || null,
            id_cotizacion: id_cotizacion || null,
            id_membresia: id_membresia || null
        });

        res.json({
            status: 'success',
            data: relacion
        });

    } catch (error) {
        console.error("Error al crear relación de factura:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al crear relación de factura',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const eliminarRelacionFactura = async (req, res) => {
    try {
        const deleted = await FacturaRelacion.destroy({
            where: { id: req.params.id }
        });

        if (!deleted) {
            return res.status(404).json({
                status: 'not_found',
                message: 'Relación no encontrada'
            });
        }

        res.json({
            status: 'success',
            message: 'Relación eliminada correctamente'
        });

    } catch (error) {
        console.error("Error al eliminar relación de factura:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al eliminar relación de factura',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 

module.exports = {
    obtenerRelacionesFactura,
    obtenerRelacionPorFactura,
    crearRelacionFactura,
    eliminarRelacionFactura,
    buscarFacturaPorPago
};
