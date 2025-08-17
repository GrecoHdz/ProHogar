const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/refreshTokenModel');

const authMiddleware = async (req, res, next) => {
  // Obtener el token del encabezado Authorization
  let token;
  
  // Intentar obtener el token del encabezado Authorization
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } 
  // Si no hay token en el encabezado, verificar en las cookies (útil para SSR)
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Acceso denegado. No se proporcionó un token de acceso.' 
    });
  }

  try {
    // Verificar el token de acceso
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    // Si el token expiró, verificar si hay un refresh token
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
      message: 'Token de acceso inválido'
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