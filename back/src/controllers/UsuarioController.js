
const Usuario = require("../models/usuariosModel");
const Ciudad = require("../models/ciudadesModel");
const Rol = require("../models/rolesModel");
const CreditoUsuario = require('../models/creditoUsuariosModel');
const Movimiento = require('../models/movimientosModel');
const Calificaciones = require("../models/calificacionesModels");
const { Op, fn, col, literal } = require('sequelize');
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Número de rondas de hashing
const Referido = require('../models/referidosModel');


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
 
//Obtener stats de usuarios para admin
const obtenerEstadisticasUsuarios = async (req, res) => {
    try {
        // Obtener total de usuarios
        const totalUsuarios = await Usuario.count();
        
        // Obtener total de referidos
        const totalReferidos = await Referido.count();
        
        // Obtener suma total de créditos
        const totalCreditos = await CreditoUsuario.sum('monto_credito') || 0;
        
        res.json({
            success: true,
            data: {
                totalUsuarios,
                totalReferidos,
                totalCreditos
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas de usuarios',
            details: error.message
        });
    }
};
 
// Obtener todos los técnicos de una ciudad (con filtros)
const obtenerTecnicosPorCiudad = async (req, res) => {
    const { id_ciudad, nombre, estado, limit = 10, offset = 0 } = req.query;
  
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
  
      // 🧩 Condición base con filtros opcionales
      const whereCondition = { id_rol: rolTecnico.id_rol };
  
      if (id_ciudad) whereCondition.id_ciudad = id_ciudad;
      if (estado) whereCondition.estado = estado;
      if (nombre) {
        whereCondition.nombre = { [Op.like]: `%${nombre}%` };
      }
  
      // 🔎 Consultar técnicos filtrados
      const tecnicos = await Usuario.findAll({
        attributes: [
          "id_usuario",
          "nombre",
          "identidad",
          "email",
          "telefono",
          "estado",
          "id_ciudad"
        ],
        where: whereCondition,
        include: [
          { model: Ciudad, as: "ciudad", attributes: ["nombre_ciudad"] },
          { model: Rol, as: "rol", attributes: ["nombre_rol"] }
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [["nombre", "ASC"]]
      });
  
      if (!tecnicos.length) {
        return res.status(200).json({
          success: true,
          total: 0,
          tecnicos: []
        });
      }
  
      // Obtener IDs de los técnicos
      const tecnicosIds = tecnicos.map(t => t.id_usuario);
  
      // 📊 Obtener promedios de calificaciones y créditos
      const [calificaciones, creditos] = await Promise.all([
        Calificaciones.findAll({
          attributes: [
            "id_usuario_calificado",
            [fn("AVG", col("calificacion")), "promedio"]
          ],
          where: {
            id_usuario_calificado: { [Op.in]: tecnicosIds }
          },
          group: ["id_usuario_calificado"]
        }),
        CreditoUsuario.findAll({
          where: {
            id_usuario: { [Op.in]: tecnicosIds }
          },
          attributes: ['id_usuario', 'monto_credito']
        })
      ]);
  
      // Crear mapas de datos
      const mapaPromedios = {};
      calificaciones.forEach(c => {
        mapaPromedios[c.id_usuario_calificado] = parseFloat(c.get("promedio"));
      });
  
      const mapaCreditos = {};
      creditos.forEach(c => {
        mapaCreditos[c.id_usuario] = parseFloat(c.monto_credito) || 0;
      });
  
      // 💰 Calcular saldo total real por técnico (ingresos - retiros + crédito)
      const saldosTotales = {};
      await Promise.all(
        tecnicosIds.map(async (id_usuario) => {
          const [ingresos, retiros] = await Promise.all([
            Movimiento.sum('monto', {
              where: {
                id_usuario,
                estado: 'completado',
                tipo: { [Op.in]: ['ingreso', 'ingreso_referido'] }
              }
            }),
            Movimiento.sum('monto', {
              where: {
                id_usuario,
                estado: 'completado',
                tipo: 'retiro'
              }
            })
          ]);
  
          const saldoMovimientos = (ingresos || 0) - (retiros || 0);
          const saldoCredito = mapaCreditos[id_usuario] || 0;
          saldosTotales[id_usuario] = parseFloat(saldoMovimientos + saldoCredito);
        })
      );
  
      // 🧮 Armar respuesta final
      const tecnicosConDatos = tecnicos.map(t => {
        const data = t.toJSON();
        const { id_ciudad, ...rest } = data;
        return {
          ...rest,
          ciudad: { id_ciudad, ...data.ciudad },
          promedio_calificacion: mapaPromedios[data.id_usuario] ?? 0,
          saldo_total: saldosTotales[data.id_usuario] ?? 0
        };
      });
  
      // 📦 Total general
      const total = await Usuario.count({ where: whereCondition });
  
      return res.json({
        success: true,
        total,
        tecnicos: tecnicosConDatos
      });
  
    } catch (error) {
      console.error("Error al obtener técnicos:", error);
      return res.status(500).json({
        success: false,
        error: "Error al obtener técnicos",
        detalle: error.message
      });
    }
}; 
 
// Obtener todos los usuarios de una ciudad (con filtros)
const obtenerUsuariosPorCiudad = async (req, res) => {
    const { id_ciudad, nombre, estado, limit = 10, offset = 0 } = req.query;
  
    try {
      // Rol dinámico de usuario
      const rolUsuario = await Rol.findOne({
        where: { nombre_rol: 'Usuario' },
        attributes: ['id_rol'],
        raw: true
      });
  
      if (!rolUsuario) {
        return res.status(404).json({
          success: false,
          error: 'No se encontró el rol de Usuario'
        });
      }
  
      // 🧩 Filtros dinámicos (en SQL)
      let filtrosSQL = `WHERE u.id_rol = :rolId`;
      if (id_ciudad) filtrosSQL += ` AND u.id_ciudad = :ciudadId`;
      if (estado) filtrosSQL += ` AND u.estado = :estado`;
      if (nombre) filtrosSQL += ` AND u.nombre LIKE :nombre`;
  
      // 🧾 Consulta principal con filtros
      let query = `
        SELECT 
            u.id_usuario,
            u.nombre,
            u.identidad,
            u.email,
            u.telefono,
            u.estado,
            u.id_ciudad,
            c.nombre_ciudad,
            r.nombre_rol,
            COUNT(ref.id_referido) AS total_referidos,
            COALESCE(cu.monto_credito, 0) AS monto_credito
        FROM usuario u
        LEFT JOIN ciudad c ON u.id_ciudad = c.id_ciudad
        LEFT JOIN roles r ON u.id_rol = r.id_rol
        LEFT JOIN referido ref ON u.id_usuario = ref.id_referidor
        LEFT JOIN credito cu ON u.id_usuario = cu.id_usuario
        ${filtrosSQL}
        GROUP BY u.id_usuario, c.nombre_ciudad, r.nombre_rol, cu.monto_credito
        ORDER BY u.nombre ASC
        LIMIT :limit OFFSET :offset
      `;
  
      // Parámetros seguros
      const replacements = {
        rolId: rolUsuario.id_rol,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
      if (id_ciudad) replacements.ciudadId = id_ciudad;
      if (estado) replacements.estado = estado;
      if (nombre) replacements.nombre = `%${nombre}%`;
  
      // Ejecutar consulta
      const [usuariosConReferidos] = await Usuario.sequelize.query(query, { replacements });
  
      if (!usuariosConReferidos.length) {
        return res.status(200).json({
          total: 0,
          usuarios: []
        });
      }
  
      // 📦 Total (sin limit)
      const totalUsuarios = await Usuario.count({
        where: {
          id_rol: rolUsuario.id_rol,
          ...(id_ciudad && { id_ciudad }),
          ...(estado && { estado }),
          ...(nombre && { nombre: { [Op.like]: `%${nombre}%` } })
        }
      });
  
      // 🧮 Formatear respuesta
      const usuariosFormateados = usuariosConReferidos.map(usuario => ({
        id_usuario: usuario.id_usuario,
        nombre: usuario.nombre,
        identidad: usuario.identidad,
        email: usuario.email,
        telefono: usuario.telefono,
        estado: usuario.estado,
        credito: { monto: parseFloat(usuario.monto_credito) || 0 },
        ciudad: {
          id_ciudad: usuario.id_ciudad,
          nombre_ciudad: usuario.nombre_ciudad
        },
        rol: { nombre_rol: usuario.nombre_rol },
        total_referidos: parseInt(usuario.total_referidos) || 0
      }));
  
      return res.json({
        total: totalUsuarios,
        usuarios: usuariosFormateados
      });
  
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      return res.status(500).json({
        error: "Error al obtener usuarios",
        detalle: error.message
      });
    }
};

//Obtener todos los administradores
const obtenerAdministradores = async (req, res) => {
    const { nombre, estado, id_ciudad, limit = 10, offset = 0 } = req.query;

    try {
        // Obtener el ID del rol de administrador
        const rolAdmin = await Rol.findOne({
            where: { nombre_rol: 'Admin' },
            attributes: ['id_rol'],
            raw: true
        });

        if (!rolAdmin) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró el rol de Administrador'
            });
        }

        // Construir condiciones de búsqueda
        const whereCondition = { id_rol: rolAdmin.id_rol };
        if (estado) whereCondition.estado = estado;
        if (nombre) whereCondition.nombre = { [Op.like]: `%${nombre}%` };
        if (id_ciudad) whereCondition.id_ciudad = id_ciudad;

        // Consultar administradores
        const administradores = await Usuario.findAll({
            attributes: [
                "id_usuario",
          "nombre",
          "identidad",
          "email",
          "telefono",
          "estado",
          "id_ciudad"
            ],
            where: whereCondition,
            include: [
                { 
                    model: Ciudad, 
                    as: "ciudad", 
                    attributes: ["id_ciudad", "nombre_ciudad"] 
                },
                { 
                    model: Rol, 
                    as: "rol", 
                    attributes: ["nombre_rol"] 
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [["nombre", "ASC"]]
        });

        // Obtener total de administradores
        const total = await Usuario.count({ where: whereCondition });

        // Formatear respuesta
        const administradoresFormateados = administradores.map(admin => {
            const adminData = admin.get({ plain: true });
            return {
                ...adminData,
                ciudad: adminData.ciudad || null,
                rol: adminData.rol
            };
        });

        return res.json({
            success: true,
            total,
            administradores: administradoresFormateados
        });

    } catch (error) {
        console.error("Error al obtener administradores:", error);
        return res.status(500).json({
            success: false,
            error: "Error al obtener administradores",
            detalle: error.message
        });
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
    // Obtener el ID del rol de Cliente por defecto
    let rolCliente;
    try {
        rolCliente = await Rol.findOne({
            where: { nombre_rol: 'Cliente' },
            attributes: ['id_rol'],
            raw: true
        });

        if (!rolCliente) {
            return res.status(500).json({
                success: false,
                error: 'No se pudo determinar el rol por defecto (Cliente)'
            });
        }
    } catch (error) {
        console.error("Error al obtener el rol de Cliente:", error);
        return res.status(500).json({
            success: false,
            error: 'Error al obtener el rol por defecto',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }

    const { 
        nombre, 
        id_rol = rolCliente.id_rol, // Usar el ID del rol de Cliente por defecto
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
            id_ciudad
        });
        
        // No devolver la contraseña en la respuesta
        const usuarioSinPassword = usuario.toJSON();
        delete usuarioSinPassword.password_hash;
        
        res.status(201).json({
            status: 201,
            message: "Usuario creado exitosamente",
            id_usuario: usuario.id_usuario
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
    const { id } = req.params;  
    const { 
        nombre, 
        identidad, 
        email, 
        telefono, 
        id_ciudad,
        password_hash,
        activo,
        estado 
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
        if (estado) usuario.estado = estado;
        
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
    obtenerTecnicosPorCiudad,
    obtenerUsuariosPorCiudad,
    obtenerAdministradores,
    obtenerEstadisticasUsuarios,
    obtenerUsuarioPorId,
    obtenerUsuarioPorNombre,
    obtenerUsuarioPorIdentidad,
    crearUsuario,
    actualizarUsuario,
    actualizarPassword,
    eliminarUsuario
};

