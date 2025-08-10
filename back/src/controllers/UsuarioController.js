const Usuario = require("../models/usuariosModel");

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

//Obtener Usuario por nombre
const obtenerUsuarioPorNombre = async (req, res) => {
    const { nombre } = req.params;
    try {
        const usuario = await Usuario.findOne({ where: { nombre } });
        res.json(usuario);
    } catch (error) {
        console.error("Error al obtener usuario por nombre:", error);
        res.status(500).json({ error: "Error al obtener usuario por nombre" });
    }
};

//Obtener Usuario por identidad
const obtenerUsuarioPorIdentidad = async (req, res) => {
    const { identidad } = req.params;
    try {
        const usuario = await Usuario.findOne({ where: { identidad } });
        res.json(usuario);
    } catch (error) {
        console.error("Error al obtener usuario por identidad:", error);
        res.status(500).json({ error: "Error al obtener usuario por identidad" });
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
    const { id_usuario } = req.params;
    const { 
        nombre, 
        identidad, 
        email, 
        telefono, 
        password_hash 
    } = req.body;
    try {
        const usuario = await Usuario.findByPk(id_usuario);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        usuario.nombre = nombre;    
        usuario.identidad = identidad;
        usuario.email = email;
        usuario.telefono = telefono;
        usuario.password_hash = password_hash;
        await usuario.save();
        res.json({
            status: 200,
            message: "Usuario actualizado exitosamente",
            usuario
        });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ error: "Error al actualizar usuario" });
    }
};

//Eliminar Usuario
const eliminarUsuario = async (req, res) => {
    const { id_usuario } = req.params;
    try {
        const usuario = await Usuario.findByPk(id_usuario);
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }
        await usuario.destroy();
        res.json({
            status: 200,
            message: "Usuario eliminado exitosamente"
        });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "Error al eliminar usuario" });
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
