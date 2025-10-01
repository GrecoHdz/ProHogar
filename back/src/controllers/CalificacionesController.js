const Calificaciones = require("../models/calificacionesModels");
const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicios = require("../models/serviciosModel");
const Usuarios = require("../models/usuariosModel");
const { Op } = require("sequelize");

//Obtener todas las calificaciones
const getAllCalificaciones = async (req, res) => {
    try {
        const calificaciones = await Calificaciones.findAll();
        res.json(calificaciones);
    } catch (error) {
        console.error("Error al obtener calificaciones:", error);
        res.status(500).json({ error: "Error al obtener calificaciones" });
    }
};

//Obtener calificaciones por usuario  
const getCalificacionesPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const page = parseInt(req.query.page) || 1; // Página actual, por defecto 1
        const limit = parseInt(req.query.limit) || 3; // Límite por página, por defecto 3
        const offset = (page - 1) * limit; // Cálculo del offset

        const { count, rows: calificaciones } = await Calificaciones.findAndCountAll({ 
            where: { id_usuario_calificado: id_usuario },
            include: [
                {
                    model: SolicitudServicio,
                    as: 'solicitud',
                    attributes: ['id_solicitud'],
                    include: [
                        {
                            model: Servicios,
                            as: 'servicio',
                            attributes: ['nombre']
                        },
                        {
                            model: Usuarios,
                            as: 'cliente',
                            attributes: ['nombre']
                        }
                    ]
                }
            ],
            attributes: ['id_calificacion', 'calificacion', 'comentario', 'fecha'],
            limit: limit,
            offset: offset,
            order: [['fecha', 'DESC']] // Ordenar por fecha descendente
        });

        // Calcular el total de páginas
        const totalPages = Math.ceil(count / limit);

        // Formatear la respuesta según el formato solicitado
        const calificacionesFormateadas = calificaciones.map(cal => ({
            calificacion: cal.calificacion,
            comentario: cal.comentario || '',
            fecha: cal.fecha,
            nombre_servicio: cal.solicitud?.servicio?.nombre || 'Servicio',
            nombre_cliente: cal.solicitud?.cliente?.nombre || 'Cliente'
        }));
        
        res.json({
            data: calificacionesFormateadas,
            pagination: {
                totalItems: count,
                totalPages: totalPages,
                currentPage: page,
                itemsPerPage: limit,
                hasNextPage: page < totalPages
            }
        });
    } catch (error) {
        console.error("Error al obtener calificaciones por usuario:", error);
        res.status(500).json({ error: "Error al obtener calificaciones por usuario" });
    }
};

//Obtener promedio de calificaciones por usuario
const getPromedioCalificacionesPorUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const calificaciones = await Calificaciones.findAll({ where: { id_usuario_calificado: id_usuario } });
        const sumaCalificaciones = calificaciones.reduce((total, calificacion) => total + calificacion.calificacion, 0);
        const promedio = sumaCalificaciones / calificaciones.length;
        res.json(promedio);
    } catch (error) {
        console.error("Error al obtener promedio de calificaciones por usuario:", error);
        res.status(500).json({ error: "Error al obtener promedio de calificaciones por usuario" });
    }
};

//Obtener calificaciones por solicitud 
const getCalificacionesPorSolicitud = async (req, res) => {
    try {
        const { id_solicitud } = req.params;
        const calificaciones = await Calificaciones.findAll({ where: { id_solicitud: id_solicitud } });
        res.json(calificaciones);
    } catch (error) {
        console.error("Error al obtener calificaciones por solicitud:", error);
        res.status(500).json({ error: "Error al obtener calificaciones por solicitud" });
    }
};

//Crear calificacion 
const crearCalificacion = async (req, res) => {
    try {
        const { id_solicitud, id_usuario_calificado, id_usuario_calificador, calificacion, comentario } = req.body;
        const nuevaCalificacion = await Calificaciones.create({ id_solicitud, id_usuario_calificado, id_usuario_calificador, calificacion, comentario });
        res.json(nuevaCalificacion);
    } catch (error) {
        console.error("Error al crear calificacion:", error);
        res.status(500).json({ error: "Error al crear calificacion" });
    }
};

//Eliminar calificacion
const eliminarCalificacion = async (req, res) => {
    try {
        const { id } = req.params;
        await Calificaciones.destroy({ where: { id } });
        res.json({ message: "Calificacion eliminada exitosamente" });
    } catch (error) {
        console.error("Error al eliminar calificacion:", error);
        res.status(500).json({ error: "Error al eliminar calificacion" });
    }
};

module.exports = {
    getAllCalificaciones,
    getCalificacionesPorUsuario,
    getCalificacionesPorSolicitud,
    getPromedioCalificacionesPorUsuario,
    crearCalificacion,
    eliminarCalificacion
};