const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicio = require("../models/serviciosModel");
const Usuario = require("../models/usuariosModel");
const { Op } = require("sequelize"); 

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
        
        // Formatear la respuesta para incluir el objeto servicio y excluir id_usuario
        const solicitudesFormateadas = solicitudes.map(solicitud => {
            const { servicio, id_servicio, id_usuario, ...datosSolicitud } = solicitud.toJSON();
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

//Obtener todas las solicitudes de servicios por usuario con el nombre del servicio
const obtenerSolicitudServicioPorUsuario = async (req, res) => {
    try {
        const idUsuario = req.params.id;
        
        // Obtener todas las solicitudes con los datos del servicio
        const solicitudes = await SolicitudServicio.findAll({
            where: {
                id_usuario: idUsuario
            },
            include: [{
                model: Servicio,
                as: 'servicio',
                attributes: ['id_servicio', 'nombre']
            }],
            order: [['fecha_solicitud', 'DESC']],
            raw: true,
            nest: true
        });

        // Formatear la respuesta para incluir el servicio con id y nombre
        const solicitudesFormateadas = solicitudes.map(({ id_servicio, servicio, ...solicitud }) => ({
            ...solicitud,
            servicio: {
                id_servicio,
                nombre: servicio?.nombre || 'Servicio no disponible'
            }
        }));
        
        // Contar las solicitudes totales
        const totalSolicitudes = await SolicitudServicio.count({
            where: {
                id_usuario: idUsuario
            }
        });

        // Contar solicitudes finalizadas (completadas)
        const finalizadas = await SolicitudServicio.count({
            where: {
                id_usuario: idUsuario,
                estado: 'finalizado'
            }
        });

        // Contar solicitudes pendientes (cualquier estado que no sea finalizado o cancelado)
        const pendientes = await SolicitudServicio.count({
            where: {
                id_usuario: idUsuario,
                [Op.and]: [
                    { estado: { [Op.ne]: 'finalizado' } },
                    { estado: { [Op.ne]: 'cancelado' } }
                ]
            }
        });   

        res.json({
            solicitudes: solicitudesFormateadas,
            total: totalSolicitudes,
            finalizadas,
            pendientes,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las solicitudes de servicios por usuario" });
    }
};

// Obtener solicitudes de servicio asignadas a un técnico específico
const obtenerSolicitudesPorTecnico = async (req, res) => {
    try {
        const { id_tecnico } = req.params;
        
        const solicitudes = await SolicitudServicio.findAll({
            where: {
                id_tecnico: id_tecnico
            },
            include: [{
                model: Servicio,
                as: 'servicio',
                attributes: ['id_servicio', 'nombre']
            },
            {
                model: Usuario,
                as: 'Usuario',
                attributes: ['nombre','telefono'] 
            }],
            order: [['fecha_solicitud', 'DESC']] // Ordenar por fecha más reciente
        });
        
        // Formatear la respuesta para incluir el objeto servicio y excluir id_usuario
        const solicitudesFormateadas = solicitudes.map(solicitud => {
            const { servicio, id_servicio, id_usuario, ...datosSolicitud } = solicitud.toJSON();
            return {
                ...datosSolicitud,
                servicio: servicio || null
            };
        });
         // Contar las solicitudes totales
         const totalSolicitudes = await SolicitudServicio.count({
            where: {
                id_tecnico: id_tecnico
            }
        });

        // Contar solicitudes finalizadas (completadas) y pendientes de pago
        const finalizadas = await SolicitudServicio.count({
            where: {
                id_tecnico: id_tecnico,
                [Op.or]: [
                    { estado: 'finalizado' },
                    { estado: 'pendiente_pagoservicio' }
                ]
            }
        });

        // Contar solicitudes activas (ni finalizadas ni canceladas)
        const activas = await SolicitudServicio.count({
            where: {
                id_tecnico: id_tecnico,
                [Op.and]: [
                    { estado: { [Op.ne]: 'finalizado' } },
                    { estado: { [Op.ne]: 'cancelado' } },
                    { estado: { [Op.ne]: 'pendiente_pagoservicio' } },
                    { estado: { [Op.ne]: 'pendiente_asignacion' } } 
                ]
            }
        });

        res.json({
            solicitudes: solicitudesFormateadas,
            total: totalSolicitudes,
            finalizadas,
            activas,
        });
    } catch (error) {
        console.error('Error al obtener las solicitudes del técnico:', error);
        res.status(500).json({ error: 'Error al obtener las solicitudes del técnico' });
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
        
        // Si se está cancelando la solicitud
        if (req.body.estado === 'cancelado') {
            // Agregar comentario
            await solicitud.update({ 
                comentario: req.body.comentario,
                estado: 'cancelado'
            });
        } else {
            // Actualización normal
            await solicitud.update(req.body);
        }
        
        res.json(solicitud);
    } catch (error) {
        console.error('Error al actualizar la solicitud de servicio:', error);
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
    obtenerSolicitudesPorTecnico,
    obtenerSolicitudesServicios,
    obtenerSolicitudServicioPorServicio,
    obtenerSolicitudServicioPorUsuario,
    crearSolicitudServicio,
    actualizarSolicitudServicio,
    eliminarSolicitudServicio
};
