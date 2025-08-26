const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/refreshtokenModel');
const Usuario = require('../models/usuariosModel');
const Rol = require('../models/rolesModel');

const authMiddleware = async (req, res, next) => {
  // Obtener el token del encabezado Authorization
  let token;
  
  // Intentar obtener el token del encabezado Authorization
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } 
  // Si no hay token en el encabezado, verificar en las cookies (útil para SSR)
  else if (req.cookies && (req.cookies.token || req.cookies.accessToken)) {
    token = req.cookies.token || req.cookies.accessToken;
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Acceso denegado. No se proporcionó un token de acceso.' 
    });
  }

  try {
    // Verificar el token de acceso
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error('Error al verificar el token JWT:', jwtError);
      return res.status(401).json({ 
        success: false,
        message: 'Token inválido o expirado',
        error: jwtError.name === 'TokenExpiredError' ? 'Token expirado' : 'Token inválido'
      });
    }
    
    // Obtener información completa del usuario de la base de datos
    let user;
    try {
      user = await Usuario.findByPk(decoded.id, {
        include: [{
          model: Rol,
          as: 'rol',
          attributes: ['id_rol', 'nombre_rol']
        }]
      });

      if (!user) {
        console.error(`Usuario con ID ${decoded.id} no encontrado en la base de datos`);
        return res.status(401).json({ 
          success: false,
          message: 'Usuario no encontrado',
          error: 'El usuario asociado al token no existe'
        });
      }
    } catch (dbError) {
      console.error('Error al buscar el usuario en la base de datos:', dbError);
      return res.status(500).json({ 
        success: false,
        message: 'Error al verificar la autenticación',
        error: 'Error de base de datos'
      });
    }

    // Adjuntar información del usuario a la solicitud
    req.user = {
      id_usuario: user.id_usuario,
      identidad: user.identidad,
      nombre: user.nombre,
      email: user.email,
      id_rol: user.id_rol,
      rol: user.rol ? user.rol.nombre_rol : 'usuario'
    };
    
    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    
    // Si el token expiró, permitir que el frontend intente refrescarlo
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Token de acceso expirado',
        expired: true
      });
    }
    
    // Para otros errores de token
    return res.status(401).json({ 
      success: false,
      message: 'Token de acceso inválido',
      error: error.message
    });
  }
};

// Middleware para verificar roles
const checkRole = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false,
        message: 'Usuario no autenticado' 
      });
    }

    // Si roles es un string, convertirlo a array
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    
    // Verificar si el usuario tiene alguno de los roles requeridos
    if (rolesArray.length > 0 && !rolesArray.includes(req.user.rol)) {
      return res.status(403).json({ 
        success: false,
        message: 'No tienes permiso para acceder a este recurso' 
      });
    }

    next();
  };
};

module.exports = { 
  authMiddleware, 
  checkRole 
};