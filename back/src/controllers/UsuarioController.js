const Usuario = require("../models/usuariosModel");
const Ciudad = require("../models/ciudadesModel");
const Rol = require("../models/rolesModel");
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Número de rondas de hashing


//Obtener todos los Usuarios
const obtenerUsuarios = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({ attributes: { exclude: ['password_hash'] } });
        res.json(usuarios);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ error: "Error al obtener usuarios" });
    }
};  

//Obtener Usuario por ID
const obtenerUsuarioPorId = async (req, res) => {
    const { id } = req.params;
    
    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del usuario" });
    }
    
    try {
        const usuario = await Usuario.findByPk(id, {
            attributes: { exclude: ['password_hash'] },
            include: [
                {
                    model: Ciudad,
                    as: 'ciudad',
                    attributes: ['nombre_ciudad']
                },
                {
                    model: Rol,
                    as: 'rol',
                    attributes: ['nombre_rol']
                }
            ]
        });
        
        if (!usuario) {
            return res.status(404).json({ 
                mensaje: "No se encontró ningún usuario con el ID proporcionado",
                idBuscado: id
            });
        }
        
        res.json(usuario);
    } catch (error) {
        console.error("Error al obtener usuario por ID:", error);
        res.status(500).json({ 
            error: "Error al obtener usuario por ID",
            detalle: error.message 
        });
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
            attributes: { exclude: ['password_hash'] },
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
        id_rol = 3,
        identidad, 
        email, 
        telefono, 
        password_hash,
        id_ciudad
    } = req.body;
    
    // Validar campos requeridos
    const camposRequeridos = [
        { campo: 'nombre', mensaje: 'El nombre es requerido' },
        { campo: 'identidad', mensaje: 'El número de identidad es requerido' },
        { campo: 'email', mensaje: 'El correo electrónico es requerido' },
        { campo: 'telefono', mensaje: 'El teléfono es requerido' },
        { campo: 'password_hash', mensaje: 'La contraseña es requerida' },
        { campo: 'id_ciudad', mensaje: 'La ciudad es requerida' }
    ];
    
    // Verificar campos requeridos
    for (const { campo, mensaje } of camposRequeridos) {
        if (!req.body[campo]) {
            return res.status(400).json({
                status: 400,
                error: "Error de validación",
                message: mensaje,
                field: campo
            });
        }
    }
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            status: 400,
            error: "Error de validación",
            message: "El formato del correo electrónico no es válido",
            field: 'email'
        });
    }
    
    try {
        // Verificar si ya existe un usuario con el mismo email, teléfono o identidad
        const usuarioExistente = await Usuario.findOne({
            where: {
                [Op.or]: [
                    { email },
                    { telefono },
                    { identidad }
                ]
            }
        });
        
        if (usuarioExistente) {
            let field = 'dato';
            
            if (usuarioExistente.email === email) field = 'correo electrónico';
            else if (usuarioExistente.telefono === telefono) field = 'teléfono';
            else if (usuarioExistente.identidad === identidad) field = 'número de identidad';
            
            return res.status(400).json({
                status: 400,
                error: "Error de validación",
                message: `El ${field} ya está en uso por otro usuario`,
                field: field === 'correo electrónico' ? 'email' : 
                       field === 'teléfono' ? 'telefono' : 'identidad'
            });
        }
        
        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
        
        const usuario = await Usuario.create({ 
            nombre, 
            id_rol,
            identidad, 
            email, 
            telefono, 
            password_hash: hashedPassword,
            id_ciudad,
            activo: true // Por defecto activo al crear
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
        
        // Manejar errores de validación de Sequelize
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors?.map(err => ({
                field: err.path,
                message: err.message
            })) || [];
            
            // Si es un error de duplicación pero no se pudo manejar antes
            if (error.name === 'SequelizeUniqueConstraintError' && errors.length === 0) {
                let field = 'dato';
                const errorMessage = error.original?.message || '';
                
                if (errorMessage.includes('email')) field = 'correo electrónico';
                else if (errorMessage.includes('telefono')) field = 'teléfono';
                else if (errorMessage.includes('identidad')) field = 'número de identidad';
                
                return res.status(400).json({
                    status: 400,
                    error: "Error de validación",
                    message: `El ${field} ya está en uso por otro usuario`,
                    field: field === 'correo electrónico' ? 'email' : 
                           field === 'teléfono' ? 'telefono' : 'identidad'
                });
            }
            
            return res.status(400).json({
                status: 400,
                error: "Error de validación",
                message: "Por favor, verifica los datos ingresados",
                validationErrors: errors
            });
        }
        
        // Para otros errores
        res.status(500).json({ 
            status: 500,
            error: "Error al crear usuario",
            message: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
        id_ciudad,
        password_hash,
        activo 
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
        if (id_ciudad) usuario.id_ciudad = id_ciudad;
        if (password_hash) {
            // Si se proporciona una nueva contraseña, hashearla
            const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
            usuario.password_hash = hashedPassword;
        }
        if (activo !== undefined) usuario.activo = activo;
        
        await usuario.save();
        
        // No devolver la contraseña en la respuesta
        const usuarioActualizado = usuario.toJSON();
        delete usuarioActualizado.password_hash;
        
        res.json({
            status: 200,
            message: "Perfil actualizado exitosamente",
            usuario: usuarioActualizado
        });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        
        // Manejar errores de duplicación
        if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
            let field = 'dato';
            let value = '';
            
            // Extraer el campo duplicado del mensaje de error
            const match = error.original?.message?.match(/Duplicate entry '(.+?)' for key '(.+?)'/);
            if (match) {
                value = match[1];
                const keyName = match[2];
                
                // Mapear el nombre del índice al nombre del campo
                if (keyName.includes('telefono')) field = 'teléfono';
                else if (keyName.includes('email')) field = 'correo electrónico';
                else if (keyName.includes('identidad')) field = 'número de identidad';
                
                const message = `El ${field} "${value}" ya está en uso por otro usuario`;
                
                return res.status(400).json({ 
                    status: 400,
                    error: "Error de validación",
                    message: message,
                    field: field
                });
            }
        }
        
        // Manejar otros errores de validación de Sequelize
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(err => ({
                field: err.path,
                message: err.message
            }));
            
            return res.status(400).json({
                status: 400,
                error: "Error de validación",
                message: "Por favor, verifica los datos ingresados",
                validationErrors: errors
            });
        }
        
        // Para otros errores
        res.status(500).json({ 
            status: 500,
            error: "Error al actualizar el perfil",
            message: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
 
// Actualizar contraseña con verificación de contraseña actual
const actualizarPassword = async (req, res) => {
    console.log('Solicitud de cambio de contraseña recibida:', {
        params: req.params,
        body: {
            ...req.body,
            currentPassword: req.body.currentPassword ? '***' : 'undefined',
            newPassword: req.body.newPassword ? '***' : 'undefined'
        }
    });

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;
    
    if (!id) {
        const error = "Se requiere el ID del usuario";
        console.error('Error de validación:', error);
        return res.status(400).json({ 
            status: 400,
            error: error
        });
    }
    
    if (!currentPassword || !newPassword) {
        const error = "Se requieren tanto la contraseña actual como la nueva";
        console.error('Error de validación:', error);
        return res.status(400).json({ 
            status: 400,
            error: error
        });
    }
    
    try {
        // Buscar el usuario por id_usuario (que es la clave primaria)
        console.log('Buscando usuario con ID:', id);
        const usuario = await Usuario.findOne({
            where: { id_usuario: id },
            attributes: ['id_usuario', 'email', 'password_hash'] // Solo los campos necesarios
        });
        
        if (!usuario) {
            const error = `Usuario con ID ${id} no encontrado`;
            console.error(error);
            return res.status(404).json({ 
                status: 404,
                error: error
            });
        }
        
        // Verificar que el password_hash existe
        if (!usuario.password_hash) {
            console.error('El usuario no tiene contraseña configurada');
            return res.status(400).json({
                status: 400,
                error: 'No se puede verificar la contraseña actual'
            });
        }

        console.log('Usuario encontrado:', {
            id_usuario: usuario.id_usuario, // Usar id_usuario en lugar de id
            email: usuario.email,
            hasPassword: !!usuario.password_hash,
            passwordHashStartsWith: usuario.password_hash ? 
                (usuario.password_hash.substring(0, 10) + '...') : 
                'No tiene contraseña'
        });
        
        // Verificar la contraseña actual
        console.log('Verificando contraseña...');
        console.log('Datos de verificación:', {
            hashedPasswordInDb: usuario.password_hash,
            currentPasswordLength: currentPassword.length,
            firstFewCharsOfCurrentPassword: currentPassword.substring(0, 2) + '...',
            isPasswordValid: await bcrypt.compare(currentPassword, usuario.password_hash)
        });
        
        const isPasswordValid = await bcrypt.compare(currentPassword, usuario.password_hash);
        
        if (!isPasswordValid) {
            console.error('La contraseña actual no coincide');
            // Verificar si la contraseña en la base de datos está hasheada correctamente
            const isBcryptHash = usuario.password_hash.startsWith('$2b$');
            console.error('Detalles de la contraseña:', {
                isBcryptHash: isBcryptHash,
                hashStartsWith: isBcryptHash ? usuario.password_hash.substring(0, 10) + '...' : 'No parece un hash bcrypt'
            });
            
            return res.status(400).json({ 
                status: 400,
                error: "Contraseña actual incorrecta",
                message: "La contraseña actual proporcionada no es correcta."
            });
        }
        
        console.log('Contraseña verificada correctamente. Actualizando...');
        
        // Hashear y guardar la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        usuario.password_hash = hashedPassword;
        await usuario.save();
        
        // No devolver la contraseña en la respuesta
        const usuarioActualizado = usuario.toJSON();
        delete usuarioActualizado.password_hash;
        
        console.log('Contraseña actualizada exitosamente para el usuario:', usuarioActualizado.id);
        
        res.json({
            status: 200,
            message: "Contraseña actualizada exitosamente",
            usuario: usuarioActualizado
        });
        
    } catch (error) {
        console.error("Error al actualizar la contraseña:", error);
        
        // Detalles adicionales del error
        const errorDetails = {
            name: error.name,
            message: error.message,
            ...(error.errors && { errors: error.errors.map(e => ({
                message: e.message,
                type: e.type,
                path: e.path,
                value: e.value
            }))})
        };
        
        console.error('Detalles del error:', errorDetails);
        
        res.status(500).json({ 
            status: 500,
            error: "Error al actualizar la contraseña",
            message: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.",
            details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
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
    obtenerUsuarioPorId,
    obtenerUsuarioPorNombre,
    obtenerUsuarioPorIdentidad,
    crearUsuario,
    actualizarUsuario,
    actualizarPassword,
    eliminarUsuario
};
