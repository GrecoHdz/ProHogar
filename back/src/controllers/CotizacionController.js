const Cotizacion = require("../models/cotizacionModel"); 

//Obtener todas las cotizaciones
const getAllCotizaciones = async (req, res) => {
    try {
        const cotizaciones = await Cotizacion.findAll();
        res.json(cotizaciones);
    } catch (error) {
        console.error('Error al obtener las cotizaciones:', error);
        res.status(500).json({ error: 'Error al obtener las cotizaciones' });
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
