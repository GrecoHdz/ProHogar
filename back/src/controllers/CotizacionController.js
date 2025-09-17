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
            order: [['id_cotizacion','DESC']],
            attributes: ['estado'] 
        });

        if (!cotizacion) {
            return res.status(404).json({
                status: "error",
                message: "No se encontró ninguna cotizacion para esta solicitud"
            });
        }

        return res.json({
            status: "success",
            estado: cotizacion.estado
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error al obtener el estado de la ultima cotizacion"
        });
    }
};

//Crear cotizacion
const createCotizacion = async (req, res) => {
    try {
        const cotizacion = await Cotizacion.create(req.body);
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
