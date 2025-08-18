const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Usuario = require('../models/usuariosModel');
const Rol = require('../models/rolesModel');
const RefreshToken = require('../models/refreshTokenModel');

// Generar un token de acceso
const generateAccessToken = (user) => {
  return jwt.sign({ 
    id: user.id_usuario, 
    identidad: user.identidad,
    rol: user.id_rol 
  }, process.env.JWT_SECRET, { expiresIn: '15m' }); // Token de acceso corto (15 minutos)
};

// Generar un refresh token
const generateRefreshToken = async (user) => {
  // Crear un token aleatorio
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Expira en 7 días

  // Guardar el refresh token en la base de datos
  await RefreshToken.create({
    token: refreshToken,
    usuario_id: user.id_usuario,
    expires_at: expiresAt
  });

  return refreshToken;
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
      path: '/auth/refresh-token' // Solo enviar en solicitudes a /auth/refresh-token
    });

    // 2. Cookie con información básica del usuario (accesible desde JavaScript)
    res.cookie('userData', JSON.stringify(userForCookie), {
      httpOnly: false, // Accesible desde JavaScript
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 1 día
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
  // Obtener el refresh token de las cookies
  const refreshToken = req.cookies.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ 
      success: false,
      message: 'No se encontró el token de actualización' 
    });
  }

  if (!refreshToken) {
    return res.status(401).json({ 
      success: false,
      message: 'Sesión expirada o inválida. Por favor, inicie sesión nuevamente.' 
    });
  }

  try {
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
      ]
    });

    if (!storedToken) {
      return res.status(403).json({ message: 'Refresh token inválido' });
    }

    // Verificar si el token ha expirado
    if (new Date() > storedToken.expires_at) {
      // Eliminar el token expirado
      await storedToken.destroy();
      return res.status(403).json({ message: 'Refresh token expirado' });
    }

    // Generar un nuevo token de acceso
    const user = storedToken.usuario;
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user);

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
      path: '/auth/refresh-token'
    });

    // 2. Actualizar cookie con información del usuario
    res.cookie('userData', JSON.stringify(userForCookie), {
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

    // Eliminar el refresh token antiguo
    await storedToken.destroy();

    res.json({
      success: true,
      message: 'Token actualizado correctamente',
      token: newAccessToken,
      user: userForCookie
    });

  } catch (error) {
    console.error('Error al refrescar el token:', error);
    res.status(500).json({ message: 'Error al refrescar el token' });
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
  res.clearCookie('userData', { ...cookieOptions, httpOnly: false });
  
  // Limpiar cookies en la raíz por si acaso
  res.clearCookie('refreshToken', { ...cookieOptions, path: '/' });
  res.clearCookie('token', { ...cookieOptions, path: '/', httpOnly: false });
  res.clearCookie('userData', { ...cookieOptions, path: '/', httpOnly: false });
  
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

    // Crear respuesta con información segura del usuario
    const userData = {
      id: user.id_usuario,
      identidad: user.identidad,
      nombre: user.nombre,
      email: user.email,
      role: rol ? rol.nombre_rol.toLowerCase() : 'usuario',
      rol_nombre: rol ? rol.nombre_rol : 'Usuario'
    };

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