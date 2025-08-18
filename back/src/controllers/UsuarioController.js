const Usuario = require("../models/usuariosModel");
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Número de rondas de hashing


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
        id_rol=1,
        identidad, 
        email, 
        telefono, 
        password_hash 
    } = req.body;
    
    if (!password_hash) {
        return res.status(400).json({ error: "La contraseña es requerida" });
    }
    
    try {
        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
        
        const usuario = await Usuario.create({ 
            nombre, 
            id_rol,
            identidad, 
            email, 
            telefono, 
            password_hash: hashedPassword 
        });
        
        // No devolver la contraseña en la respuesta
        const usuarioSinPassword = usuario.toJSON();
        delete usuarioSinPassword.password_hash;
        
        res.status(201).json({
            status: 201,
            message: "Usuario creado exitosamente",
            usuario: usuarioSinPassword
        });
    } catch (error) {
        console.error("Error al crear usuario:", error);
        
        // Manejar errores de duplicado
        if (error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeUniqueConstraintError [SequelizeUniqueConstraintError]') {
            let field = '';
            let value = '';
            let message = 'Error de validación';
            
            // Verificar si es un error de restricción única estándar
            if (error.errors && error.errors[0]) {
                field = error.errors[0].path || '';
                value = error.errors[0].value || '';
                
                console.log('Error de duplicado - Campo:', field, 'Valor:', value);
                console.log('Todos los errores:', JSON.stringify(error.errors, null, 2));
                
                // Usar directamente los nombres de los campos del modelo
                if (field === 'identidad' || field === 'identidad_unique') {
                    message = `El número de identidad ${value} ya está registrado`;
                    field = 'identidad'; // Estandarizar el nombre del campo
                } else if (field === 'email' || field === 'email_unique') {
                    message = `El correo electrónico ${value} ya está en uso`;
                    field = 'email'; // Estandarizar el nombre del campo
                } else if (field === 'telefono' || field === 'telefono_unique' || field === 'idx_usuario_telefono') {
                    message = `El número de teléfono ${value} ya está registrado`;
                    field = 'telefono'; // Estandarizar el nombre del campo
                }
            }
            
            return res.status(409).json({
                status: 409,
                error: 'Error de validación',
                message: message,
                field: field,
                value: value
            });
        }
        
        // Para otros errores
        res.status(500).json({ 
            status: 500,
            error: "Error al crear usuario",
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
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
        if (password_hash) {
            // Si se proporciona una nueva contraseña, hashearla
            const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
            usuario.password_hash = hashedPassword;
        }
        
await usuario.save();
        
        // No devolver la contraseña en la respuesta
        const usuarioActualizado = usuario.toJSON();
        delete usuarioActualizado.password_hash;
        
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
