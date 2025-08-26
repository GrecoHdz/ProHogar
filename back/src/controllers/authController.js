const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const Usuario = require('../models/usuariosModel');
const Rol = require('../models/rolesModel');
const RefreshToken = require('../models/refreshtokenModel');

// Generar un token de acceso
const generateAccessToken = (user) => {
  return jwt.sign({ 
    id: user.id_usuario, 
    identidad: user.identidad,
    rol: user.id_rol 
  }, process.env.JWT_SECRET, { expiresIn: '15m' }); // Token de acceso corto (15 minutos)
};

// Generar un token de actualización (refresh token)
const generateRefreshToken = async (usuario, transaction = null) => {
    const token = crypto.randomBytes(40).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días
    
    const options = transaction ? { transaction } : {};
    
    await RefreshToken.create({
        token: token,
        usuario_id: usuario.id_usuario,
        expires_at: expiresAt
    }, options);
    
    return token;
};

const login = async (req, res) => {
  const { identidad, password } = req.body;

  try {
    const user = await Usuario.findOne({ where: { identidad: identidad } });

    if (!user) {
      return res.status(400).json({ message: 'Credenciales Incorrectas.' });
    }
    
    // Verificar la contraseña hasheada
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Credenciales Incorrectas.' });
    }

    // Eliminar cualquier refresh token existente para este usuario
    await RefreshToken.destroy({
      where: { usuario_id: user.id_usuario }
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user);

    // Incluir el rol en la consulta del usuario
    const rol = await Rol.findByPk(user.id_rol, {
      attributes: ['id_rol', 'nombre_rol']
    });

    // Crear una copia del objeto usuario sin el password_hash
    const userData = user.get({ plain: true });
    delete userData.password_hash;

    // Agregar el nombre del rol al objeto de usuario
    if (rol) {
      userData.role = rol.nombre_rol.toLowerCase();
      userData.rol_nombre = rol.nombre_rol;
    } else {
      userData.role = 'usuario';
      userData.rol_nombre = 'Usuario';
    }

    // Crear objeto con datos seguros del usuario para la cookie
    const userForCookie = {
      id: userData.id_usuario,
      identidad: userData.identidad,
      nombre: userData.nombre,
      email: userData.email,
      role: userData.role,
      rol_nombre: userData.rol_nombre
    };

    // Configurar cookies seguras
    // 1. Cookie HTTP-Only para el refresh token (no accesible desde JavaScript)
    res.cookie('refreshToken', refreshToken, {
      ...req.cookieConfig,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/' // Disponible en todas las rutas
    });

    // 2. Única cookie con información del usuario (accesible desde JavaScript)
    // Duración extendida a 7 días (igual que el refresh token)
    res.cookie('user', JSON.stringify(userForCookie), {
      httpOnly: false, // Accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días (igual que el refresh token)
      path: '/'
    });

    // 3. Cookie con el token de acceso (accesible desde JavaScript)
    res.cookie('token', accessToken, {
      httpOnly: false, // Accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutos (igual que la expiración del token)
      path: '/'
    });

    // Enviar respuesta exitosa
    res.status(200).json({
      success: true,
      message: 'Inicio de sesión exitoso',
      user: userForCookie,
      token: accessToken
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Endpoint para refrescar el token de acceso
const refreshToken = async (req, res) => {
  const t = await sequelize.transaction();
  
  try {
    // Obtener el refresh token de las cookies
    const refreshToken = req.cookies.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({ 
        success: false,
        message: 'No se encontró el token de actualización. Por favor, inicie sesión nuevamente.'
      });
    }

    // Buscar el refresh token en la base de datos
    const storedToken = await RefreshToken.findOne({ 
      where: { token: refreshToken },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          include: [{
            model: Rol,
            as: 'rol',
            attributes: ['id_rol', 'nombre_rol']
          }]
        }
      ],
      transaction: t
    });

    if (!storedToken) {
      // Limpiar cookies si el token no es válido
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/'
      });
      
      return res.status(403).json({ 
        success: false,
        message: 'Sesión expirada. Por favor, inicie sesión nuevamente.' 
      });
    }

    // Verificar si el token ha expirado
    if (new Date() > storedToken.expires_at) {
      await storedToken.destroy({ transaction: t });
      await t.rollback();
      return res.status(403).json({ 
        success: false,
        message: 'Refresh token expirado' 
      });
    }

    // Generar un nuevo token de acceso
    const user = storedToken.usuario;
    const newAccessToken = generateAccessToken(user);
    
    // Eliminar el token antiguo ANTES de crear uno nuevo
    await storedToken.destroy({ transaction: t });
    
    // Generar nuevo refresh token
    const newRefreshToken = await generateRefreshToken(user, t);

    // Preparar datos del usuario para la respuesta
    const userData = user.get({ plain: true });
    delete userData.password_hash;
    
    if (user.rol) {
      userData.role = user.rol.nombre_rol.toLowerCase();
      userData.rol_nombre = user.rol.nombre_rol;
    } else {
      userData.role = 'usuario';
      userData.rol_nombre = 'Usuario';
    }

    // Crear objeto con datos seguros del usuario para la cookie
    const userForCookie = {
      id: userData.id_usuario,
      identidad: userData.identidad,
      nombre: userData.nombre,
      email: userData.email,
      role: userData.role,
      rol_nombre: userData.rol_nombre
    };

    // Actualizar cookies
    // 1. Cookie HTTP-Only para el nuevo refresh token
    res.cookie('refreshToken', newRefreshToken, {
      ...req.cookieConfig,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/' // <-- importante: mismo path que en login
    });

    // 2. Actualizar cookie con información del usuario
    res.cookie('user', JSON.stringify(userForCookie), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 día
      path: '/'
    });

    // 3. Cookie con el nuevo token de acceso
    res.cookie('token', newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutos
      path: '/'
    });

    // Confirmar la transacción
    await t.commit();

    res.json({
      success: true,
      message: 'Token actualizado correctamente',
      token: newAccessToken,
      user: userForCookie
    });

  } catch (error) {
    // Hacer rollback en caso de error
    if (t && !t.finished) {
      await t.rollback();
    }
    
    console.error('Error al refrescar el token:', error);
    
    // Limpiar cookies en caso de error
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };
    
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('token', { ...cookieOptions, httpOnly: false });
    
    const errorMessage = error.name === 'SequelizeUniqueConstraintError'
      ? 'Error de unicidad en la base de datos. Intente nuevamente.'
      : 'Sesión expirada. Por favor, inicie sesión nuevamente.';
    
    res.status(401).json({ 
      success: false, 
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Endpoint para cerrar sesión
const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  
  if (refreshToken) {
    try {
      // Eliminar el refresh token de la base de datos
      await RefreshToken.destroy({ where: { token: refreshToken } });
    } catch (error) {
      console.error('Error al eliminar el refresh token:', error);
    }
  }

  // Limpiar todas las cookies relacionadas con la autenticación
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };

  // Limpiar todas las cookies de autenticación
  res.clearCookie('refreshToken', { ...cookieOptions, path: '/auth/refresh-token' });
  res.clearCookie('token', { ...cookieOptions, httpOnly: false });
  res.clearCookie('user', { ...cookieOptions, httpOnly: false });
  
  // Limpiar cookies en la raíz por si acaso
  res.clearCookie('refreshToken', { ...cookieOptions, path: '/' });
  res.clearCookie('token', { ...cookieOptions, path: '/', httpOnly: false });
  res.clearCookie('user', { ...cookieOptions, path: '/', httpOnly: false });
  
  res.json({ 
    success: true,
    message: 'Sesión cerrada correctamente' 
  });
};

// Obtener información del usuario actual
const getCurrentUser = async (req, res) => {
  try {
    // El middleware authMiddleware ya adjuntó el usuario a req.user
    const user = req.user;
    
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Obtener información del rol
    const rol = await Rol.findByPk(user.id_rol, {
      attributes: ['id_rol', 'nombre_rol']
    });

    // Buscar el refresh token actual del usuario
    let refreshToken = await RefreshToken.findOne({
      where: { usuario_id: user.id_usuario }
    });

    // Crear respuesta con información segura del usuario
    const userData = {
      id_usuario: user.id_usuario, 
      identidad: user.identidad,
      nombre: user.nombre,
      email: user.email,
      role: rol ? rol.nombre_rol.toLowerCase() : 'usuario',
      rol_nombre: rol ? rol.nombre_rol : 'Usuario'
    };

    // Siempre generamos un nuevo refresh token para mantener la sesión activa
    console.log('🔄 Generando nuevo refresh token...');
    
    // Si existe un refresh token previo, lo eliminamos
    if (refreshToken) {
      console.log('🗑️ Eliminando refresh token anterior...');
      await RefreshToken.destroy({
        where: { id: refreshToken.id }
      });
    }
    
    // Generar un nuevo refresh token
    const newRefreshToken = await generateRefreshToken(user);
    
    // Incluir el nuevo refresh token en la respuesta
    userData.refreshToken = newRefreshToken;
    
    // Configuración de la cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
      path: '/'
    };
    
    // Solo establecer el dominio en producción
    if (process.env.NODE_ENV === 'production' && process.env.DOMAIN) {
      cookieOptions.domain = process.env.DOMAIN;
    }
    
    console.log('🍪 Estableciendo cookie de refresh token...');
    res.cookie('refreshToken', newRefreshToken, cookieOptions);
    console.log('✅ Nuevo refresh token generado y cookie establecida');

    res.status(200).json(userData);
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    res.status(500).json({ message: 'Error del servidor al obtener información del usuario' });
  }
};

module.exports = { 
  login, 
  refreshToken, 
  logout,
  getCurrentUser
};