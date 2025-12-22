const { Sequelize, Op } = require("sequelize");
const FacturaRelacion = require("../models/facturaRelacionModel");
const Factura = require("../models/facturaModel");

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
            message: "Error al obtener relaciones de factura"
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
            message: 'Error al obtener relación de factura'
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
            message: 'Error al crear relación de factura'
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
            message: 'Error al eliminar relación de factura'
        });
    }
};

module.exports = {
    obtenerRelacionesFactura,
    obtenerRelacionPorFactura,
    crearRelacionFactura,
    eliminarRelacionFactura
};
