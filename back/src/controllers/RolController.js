const Rol = require("../models/rolesModel");
const { Op } = require('sequelize');

// Obtener todos los roles
const obtenerRoles = async (req, res) => {
    try {
        const roles = await Rol.findAll({
            where: {
                nombre_rol: {
                    [Op.ne]: 'sa' // Excluir el rol 'sa'
                }
            },
            order: [['nombre_rol', 'ASC']]
        });
        res.json(roles);
    } catch (error) {
        console.error("Error al obtener roles:", error);
        res.status(500).json({ 
            error: "Error al obtener roles",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener rol por nombre (búsqueda aproximada)
const obtenerRolPorNombre = async (req, res) => {
    const { nombre } = req.params;
    
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: "Se requiere un término de búsqueda" });
    }
    
    try {
        const roles = await Rol.findAll({ 
            where: { 
                nombre_rol: {
                    [Op.like]: `%${nombre}%`
                }
            },
            order: [['nombre_rol', 'ASC']]
        });
        
        if (roles.length === 0) {
            return res.status(404).json({ mensaje: "No se encontraron roles con ese nombre" });
        }
        
        res.json(roles);
    } catch (error) {
        console.error("Error al buscar roles:", error);
        res.status(500).json({ 
            error: "Error al buscar roles",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener rol por ID
const obtenerRolPorId = async (req, res) => {
    const { id } = req.params;
    
    try {
        const rol = await Rol.findByPk(id);
        
        if (!rol) {
            return res.status(404).json({ mensaje: "Rol no encontrado" });
        }
        
        res.json(rol);
    } catch (error) {
        console.error("Error al obtener el rol:", error);
        res.status(500).json({ 
            error: "Error al obtener el rol",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Crear un nuevo rol
const crearRol = async (req, res) => {
    const { nombre_rol } = req.body;
    
    if (!nombre_rol || nombre_rol.trim() === '') {
        return res.status(400).json({ error: "El nombre del rol es requerido" });
    }
    
    try {
        const rolExistente = await Rol.findOne({ where: { nombre_rol } });
        
        if (rolExistente) {
            return res.status(400).json({ error: "Ya existe un rol con ese nombre" });
        }
        
        const nuevoRol = await Rol.create({ nombre_rol });
        res.status(201).json(nuevoRol);
    } catch (error) {
        console.error("Error al crear el rol:", error);
        res.status(500).json({ 
            error: "Error al crear el rol",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Actualizar un rol
const actualizarRol = async (req, res) => {
    const { id } = req.params;
    const { nombre_rol } = req.body;
    
    if (!nombre_rol || nombre_rol.trim() === '') {
        return res.status(400).json({ error: "El nombre del rol es requerido" });
    }
    
    try {
        const rol = await Rol.findByPk(id);
        
        if (!rol) {
            return res.status(404).json({ mensaje: "Rol no encontrado" });
        }
        
        // Verificar si ya existe otro rol con el mismo nombre
        const rolExistente = await Rol.findOne({ 
            where: { 
                nombre_rol,
                id_rol: { [Op.ne]: id } // Excluir el rol actual de la búsqueda
            } 
        });
        
        if (rolExistente) {
            return res.status(400).json({ error: "Ya existe otro rol con ese nombre" });
        }
        
        rol.nombre_rol = nombre_rol;
        await rol.save();
        
        res.json(rol);
    } catch (error) {
        console.error("Error al actualizar el rol:", error);
        res.status(500).json({ 
            error: "Error al actualizar el rol",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Eliminar un rol
const eliminarRol = async (req, res) => {
    const { id } = req.params;
    
    try {
        const rol = await Rol.findByPk(id);
        
        if (!rol) {
            return res.status(404).json({ mensaje: "Rol no encontrado" });
        }
        
        await rol.destroy();
        
        res.json({ mensaje: "Rol eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar el rol:", error);
        
        // Verificar si el error es por restricción de clave foránea
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ 
                error: "No se puede eliminar el rol porque está siendo utilizado por otros registros",
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
        
        res.status(500).json({ 
            error: "Error al eliminar el rol",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerRoles,
    obtenerRolPorNombre,
    obtenerRolPorId,
    crearRol,
    actualizarRol,
    eliminarRol
};
