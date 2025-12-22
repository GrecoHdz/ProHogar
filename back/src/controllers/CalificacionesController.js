const Calificaciones = require("../models/calificacionesModels");
const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicios = require("../models/serviciosModel");
const Usuarios = require("../models/usuariosModel");
const Rol = require("../models/rolesModel");
const { sequelize } = require("../config/database");

//Obtener todas las calificaciones
const getAllCalificaciones = async (req, res) => {
    try {
        const calificaciones = await Calificaciones.findAll();
        res.json(calificaciones);
    } catch (error) {
        console.error("Error al obtener calificaciones:", error);
        res.status(500).json({ 
            error: "Error al obtener calificaciones",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
                    as: 'calificacionsolicitud',
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
            id_servicio: cal.calificacionsolicitud?.id_solicitud || 'Id',
            nombre_servicio: cal.calificacionsolicitud?.servicio?.nombre || 'Servicio',
            nombre_cliente: cal.calificacionsolicitud?.cliente?.nombre || 'Cliente'
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
        res.status(500).json({ 
            error: "Error al obtener calificaciones por usuario",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        res.status(500).json({ 
            error: "Error al obtener promedio de calificaciones por usuario",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        res.status(500).json({ 
            error: "Error al obtener calificaciones por solicitud",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
 
// Obtener top 5 técnicos con mejor calificación promedio 
const getTopTecnicosMejorCalificados = async (req, res) => { 
    try {
        // Obtener el ID del rol de técnico
        const rolTecnico = await Rol.findOne({
            where: { nombre_rol: 'Tecnico' },
            attributes: ['id_rol'],
            raw: true
        });

        if (!rolTecnico) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró el rol de Técnico'
            });
        }

        // Consulta SQL directa para evitar problemas de asociación múltiple
        const [results] = await sequelize.query(`
            SELECT 
                c.id_usuario_calificado,
                u.nombre,
                u.email,
                u.telefono,
                ci.nombre_ciudad as ciudad,
                ROUND(AVG(c.calificacion), 2) as promedio_calificacion,
                COUNT(c.id_calificacion) as total_calificaciones
            FROM 
                calificaciones c
            INNER JOIN 
                usuario u ON c.id_usuario_calificado = u.id_usuario
            INNER JOIN
                ciudad ci ON u.id_ciudad = ci.id_ciudad
            WHERE 
                u.id_rol = ${rolTecnico.id_rol}  -- Solo técnicos
                AND c.calificacion IS NOT NULL
                AND c.calificacion > 0  -- Solo calificaciones mayores a 0
            GROUP BY 
                c.id_usuario_calificado, u.nombre, u.email, u.telefono, ci.nombre_ciudad
            HAVING 
                COUNT(c.id_calificacion) > 0  -- Asegurar que tenga al menos una calificación
            ORDER BY 
                promedio_calificacion DESC
            LIMIT 5;
        `);

        // Verificar si hay resultados
        if (!results || results.length === 0) {
            return res.json({
                success: true,
                data: []
            });
        }

        // Formatear la respuesta
        const resultado = results.map(tecnico => ({
            nombre: tecnico.nombre || 'Técnico',
            ciudad: tecnico.ciudad || 'Sin ciudad',
            promedio_calificacion: parseFloat(tecnico.promedio_calificacion).toFixed(2),
            total_calificaciones: parseInt(tecnico.total_calificaciones)
        }));

        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error('Error al obtener los técnicos mejor calificados:', error);
        res.status(500).json({ 
            error: 'Error al obtener los técnicos mejor calificados',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        res.status(500).json({ 
            error: "Error al crear calificacion",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        res.status(500).json({ 
            error: "Error al eliminar calificacion",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllCalificaciones,
    getCalificacionesPorUsuario,
    getCalificacionesPorSolicitud,
    getPromedioCalificacionesPorUsuario,
    getTopTecnicosMejorCalificados,
    crearCalificacion,
    eliminarCalificacion
};