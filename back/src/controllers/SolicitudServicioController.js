const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicio = require("../models/serviciosModel");

//Obtener todas las solicitudes de servicios
const obtenerSolicitudesServicios = async (req, res) => {
    try {
        const solicitudes = await SolicitudServicio.findAll({
            include: [{
                model: Servicio,
                as: 'servicio',
                attributes: ['id_servicio', 'nombre']
            }]
        });
        
        // Formatear la respuesta para incluir el objeto servicio
        const solicitudesFormateadas = solicitudes.map(solicitud => {
            const { servicio, id_servicio, ...datosSolicitud } = solicitud.toJSON();
            return {
                ...datosSolicitud,
                servicio: servicio || null
            };
        });
        
        res.json(solicitudesFormateadas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las solicitudes de servicios" });
    }
};

//Obtener todas las solicitudes de servicios por servicio
const obtenerSolicitudServicioPorServicio = async (req, res) => {
    try {
        const solicitudes = await SolicitudServicio.findAll({
            where: {
                id_servicio: req.params.id
            }
        });
        res.json(solicitudes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las solicitudes de servicios por servicio" });
    }
};

//Obtener todas las solicitudes de servicios por usuario
const obtenerSolicitudServicioPorUsuario = async (req, res) => {
    try {
        const solicitudes = await SolicitudServicio.findAll({
            where: {
                id_usuario: req.params.id
            }
        });
        res.json(solicitudes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las solicitudes de servicios por usuario" });
    }
};

//Crear una solicitud de servicio
const crearSolicitudServicio = async (req, res) => {
    try {
        const solicitud = await SolicitudServicio.create(req.body);
        res.json(solicitud);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la solicitud de servicio" });
    }
};

//Actualizar una solicitud de servicio
const actualizarSolicitudServicio = async (req, res) => {
    try {
        const solicitud = await SolicitudServicio.findByPk(req.params.id);
        if (!solicitud) {
            return res.status(404).json({ error: "Solicitud de servicio no encontrada" });
        }
        await solicitud.update(req.body);
        res.json(solicitud);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al actualizar la solicitud de servicio" });
    }
};

//Eliminar una solicitud de servicio
const eliminarSolicitudServicio = async (req, res) => {
    try {
        const solicitud = await SolicitudServicio.findByPk(req.params.id);
        if (!solicitud) {
            return res.status(404).json({ error: "Solicitud de servicio no encontrada" });
        }
        await solicitud.destroy();
        res.json({ message: "Solicitud de servicio eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar la solicitud de servicio" });
    }
};

module.exports = {
    obtenerSolicitudesServicios,
    obtenerSolicitudServicioPorServicio,
    obtenerSolicitudServicioPorUsuario,
    crearSolicitudServicio,
    actualizarSolicitudServicio,
    eliminarSolicitudServicio
};
