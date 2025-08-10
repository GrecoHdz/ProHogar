const Usuario = require("../models/usuariosModel");
const { Op } = require('sequelize');


//Obtener todos los Usuarios
const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll();
        res.json(usuarios);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
};  

//Obtener Usuario por nombre (búsqueda por aproximación)
const obtenerUsuarioPorNombre = async (req, res) => {
    const { nombre } = req.params;
    
    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: "Se requiere un término de búsqueda" });
    }
    
    try {
        const usuarios = await Usuario.findAll({ 
            where: { 
                nombre: {
                    [Op.like]: `%${nombre}%`
                }
            },
            order: [['nombre', 'ASC']] // Ordenar por nombre
        });
        
        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({ 
                mensaje: "No se encontraron usuarios que coincidan con la búsqueda",
                terminoBuscado: nombre
            });
        }
        
        res.json(usuarios);
    } catch (error) {
        console.error("Error al buscar usuarios por nombre:", error);
        res.status(500).json({ 
            error: "Error al buscar usuarios",
            detalle: error.message 
        });
    }
};

//Obtener Usuario por identidad
const obtenerUsuarioPorIdentidad = async (req, res) => {
    const { identidad } = req.params;
    
    if (!identidad) {
        return res.status(400).json({ error: "Se requiere el parámetro de identidad" });
    }
    
    try {
        const usuario = await Usuario.findOne({ where: { identidad } });
        
        if (!usuario) {
            return res.status(404).json({ 
                mensaje: "No se encontró ningún usuario con la identidad proporcionada",
                identidadBuscada: identidad
            });
        }
        
        res.json(usuario);
    } catch (error) {
        console.error("Error al obtener usuario por identidad:", error);
        res.status(500).json({ 
            error: "Error al obtener usuario por identidad",
            detalle: error.message 
        });
    }
};

//Crear Usuario
const crearUsuario = async (req, res) => {
    const { 
        nombre, 
        identidad, 
        email, 
        telefono, 
        password_hash 
    } = req.body;
    try {
        const usuario = await Usuario.create({ nombre, identidad, email, telefono, password_hash });
        res.json({
            status: 201,
            message: "Usuario creado exitosamente",
            usuario
        });
    } catch (error) {
        console.error("Error al crear usuario:", error);
        res.status(500).json({ error: "Error al crear usuario" });
    }
};

//Actualizar Usuario
const actualizarUsuario = async (req, res) => {
    const { id } = req.params; // Cambiado de id_usuario a id para que coincida con la ruta
    const { 
        nombre, 
        identidad, 
        email, 
        telefono, 
        password_hash 
    } = req.body;
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del usuario" });
    }
    
    try {
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ 
                error: "Usuario no encontrado",
                idBuscado: id
            });
        }
        
        // Actualizar solo los campos que se proporcionaron en el body
        if (nombre) usuario.nombre = nombre;
        if (identidad) usuario.identidad = identidad;
        if (email) usuario.email = email;
        if (telefono) usuario.telefono = telefono;
        if (password_hash) usuario.password_hash = password_hash;
        
        await usuario.save();
        
        res.json({
            status: 200,
            message: "Usuario actualizado exitosamente",
            usuario
        });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ 
            error: "Error al actualizar usuario",
            detalle: error.message 
        });
    }
};

//Eliminar Usuario
const eliminarUsuario = async (req, res) => {
    const { id } = req.params; // Cambiado de id_usuario a id para que coincida con la ruta
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del usuario" });
    }
    
    try {
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({ 
                error: "Usuario no encontrado",
                idBuscado: id
            });
        }
        
        await usuario.destroy();
        
        res.json({
            status: 200,
            message: "Usuario eliminado exitosamente",
            idEliminado: id
        });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ 
            error: "Error al eliminar usuario",
            detalle: error.message 
        });
    }
};

module.exports = {
    obtenerUsuarios,
    obtenerUsuarioPorNombre,
    obtenerUsuarioPorIdentidad,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
};
