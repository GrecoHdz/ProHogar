const TecnicoServicio = require("../models/tecnicosServiciosModel");
const Usuario = require("../models/usuariosModel");
const Servicio = require("../models/serviciosModel");

// Obtener servicios de un técnico específico
const obtenerServiciosPorTecnico = async (req, res) => {
    try {
        const { id_tecnico } = req.params;
        
        const servicios = await TecnicoServicio.findAll({
            where: { id_tecnico },
            include: [
                {
                    model: Servicio,
                    as: 'servicio',
                    attributes: ['id_servicio', 'nombre']
                }
            ]
        });
        
        // Transformar la respuesta para mostrar solo id y nombre del servicio
        const serviciosFormateados = servicios.map(item => ({
            id_tecnico_servicio: item.id_tecnico_servicio,
            id_servicio: item.servicio.id_servicio,
            nombre: item.servicio.nombre
        }));
        
        res.json({
            success: true,
            data: serviciosFormateados
        });
    } catch (error) {
        console.error("Error al obtener servicios del técnico:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener los servicios del técnico" 
        });
    }
};

// Asignar un servicio a un técnico
const asignarServicioATecnico = async (req, res) => {
    try {
        const { id_tecnico, id_servicio } = req.body;
        
        // Verificar si el técnico existe y es realmente técnico
        const tecnico = await Usuario.findOne({
            where: { 
                id_usuario: id_tecnico,
                estado: 'activo'
            },
            include: [
                {
                    model: require("../models/rolesModel"),
                    as: 'rol',
                    where: { nombre_rol: 'tecnico' }
                }
            ]
        });
        
        if (!tecnico) {
            return res.status(404).json({ 
                success: false,
                error: "Técnico no encontrado o no está activo" 
            });
        }
        
        // Verificar si el servicio existe y está activo
        const servicio = await Servicio.findOne({
            where: { 
                id_servicio: id_servicio,
                estado: true
            }
        });
        
        if (!servicio) {
            return res.status(404).json({ 
                success: false,
                error: "Servicio no encontrado o no está activo" 
            });
        }
        
        // Verificar si la relación ya existe
        const relacionExistente = await TecnicoServicio.findOne({
            where: { id_tecnico, id_servicio }
        });
        
        if (relacionExistente) {
            return res.status(400).json({ 
                success: false,
                error: "El técnico ya tiene asignado este servicio" 
            });
        }
        
        // Crear la relación
        const nuevaRelacion = await TecnicoServicio.create({
            id_tecnico,
            id_servicio
        });
        
        res.status(201).json({
            success: true,
            message: 'Servicio asignado al técnico correctamente',
            data: nuevaRelacion
        });
    } catch (error) {
        console.error("Error al asignar servicio al técnico:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al asignar el servicio al técnico" 
        });
    }
};

// Eliminar asignación de servicio a técnico
const eliminarAsignacionServicio = async (req, res) => {
    try {
        const { id_tecnico_servicio } = req.params;
        
        const relacion = await TecnicoServicio.findByPk(id_tecnico_servicio);
        
        if (!relacion) {
            return res.status(404).json({ 
                success: false,
                error: "No se encontró la asignación del servicio al técnico" 
            });
        }
        
        await relacion.destroy();
        
        res.json({
            success: true,
            message: "Asignación de servicio eliminada correctamente"
        });
    } catch (error) {
        console.error("Error al eliminar asignación de servicio:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al eliminar la asignación del servicio" 
        });
    }
};


module.exports = {
    obtenerServiciosPorTecnico,
    asignarServicioATecnico,
    eliminarAsignacionServicio
};
