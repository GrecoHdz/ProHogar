// authController.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { sequelize } = require('../config/database');
const Usuario = require('../models/usuariosModel');
const Rol = require('../models/rolesModel');
const RefreshToken = require('../models/refreshtokenModel');
const Ciudad = require('../models/ciudadesModel');

// Generar un token de acceso
const generateAccessToken = (user) => {
  return jwt.sign(
    { 
      id: user.id_usuario, 
      identidad: user.identidad, 
      rol: user.id_rol,
      estado: user.estado, // Incluir estado en el token
      role: (user.rol && user.rol.nombre_rol) || 'usuario' // Incluir el rol en el token
    },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
};

// Generar un token de actualización (refresh token)
const generateRefreshToken = async (usuario, transaction = null) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const options = transaction ? { transaction } : {};
  await RefreshToken.create(
    {
      token: token,
      usuario_id: usuario.id_usuario,
      expires_at: expiresAt,
    },
    options
  );

  return token;
};

// Función auxiliar para limpiar cookies
const clearAllAuthCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/',
  };

  res.clearCookie('refreshToken', cookieOptions);
  res.clearCookie('token', { ...cookieOptions, httpOnly: false });
  res.clearCookie('user', { ...cookieOptions, httpOnly: false });
};

// LOGIN
const login = async (req, res) => {
  const { identidad, password } = req.body;

  try {
    const user = await Usuario.findOne({
      where: { identidad },
      include: [{ model: Rol, as: 'rol', attributes: ['id_rol', 'nombre_rol'] }],
    });

    if (!user) {
      return res.status(400).json({ message: 'Credenciales Incorrectas.' });
    } 

    // Verificar la contraseña hasheada
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Credenciales Incorrectas.' });
    }

    const t = await sequelize.transaction();
    
    try {
      // Eliminar cualquier refresh token existente para este usuario
      await RefreshToken.destroy({ 
        where: { usuario_id: user.id_usuario },
        transaction: t 
      });

      const accessToken = generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user, t);

      // Crear objeto de usuario limpio
      const userData = user.get({ plain: true });
      delete userData.password_hash;

      userData.role = user.rol && user.rol.nombre_rol;

      // Crear objeto con solo los datos necesarios para el frontend
      const userForCookie = {
        id_usuario: userData.id_usuario,
        nombre: userData.nombre,
        role: (user.rol && user.rol.nombre_rol) || 'usuario',
        id_ciudad: userData.id_ciudad || 1
      };

      // Cookie HTTP-Only para el refresh token
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      // Cookie accesible desde JS con el access token
      res.cookie('token', accessToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
        path: '/',
      });

      // Cookie con datos del usuario
      res.cookie('user', JSON.stringify(userForCookie), {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      await t.commit();
      
      res.status(200).json({
        success: true,
        token: accessToken,
        user: userForCookie,
      });
    } catch (error) {
      await t.rollback();
      console.error('Error en el login:', error);
      res.status(500).json({ 
        success: false,
        message: 'Error en el servidor durante el inicio de sesión' 
      });
    }
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error en el servidor' 
    });
  }
};

// REFRESH TOKEN
const refreshToken = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const refreshToken = req.cookies.refreshToken;
    const accessToken = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    // Si no hay refresh token pero hay access token, intentar regenerar el refresh token
    if (!refreshToken && accessToken) {
      try {
        const decoded = jwt.verify(accessToken, process.env.JWT_SECRET, { ignoreExpiration: true });
        
        // Buscar al usuario
        const user = await Usuario.findByPk(decoded.id, {
          include: [
            { model: Rol, as: 'rol', attributes: ['id_rol', 'nombre_rol'] },
            { model: Ciudad, as: 'ciudad', attributes: ['id_ciudad', 'nombre_ciudad'] }
          ]
        }); 

        // Eliminar cualquier refresh token existente para este usuario
        await RefreshToken.destroy({
          where: { usuario_id: user.id_usuario },
          transaction: t
        });

        // Generar nuevos tokens
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = await generateRefreshToken(user, t);

        // Preparar datos del usuario
        const userData = user.get({ plain: true });
        delete userData.password_hash;
        userData.role = user.rol?.nombre_rol?.toLowerCase() || 'usuario';

        const userForCookie = {
          id_usuario: userData.id_usuario,
          nombre: userData.nombre,
          role: (user.rol && user.rol.nombre_rol) || 'usuario',
          id_ciudad: userData.id_ciudad || 1
        };

        // Establecer cookies
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          path: '/',
        };

        res.cookie('refreshToken', newRefreshToken, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        });

        res.cookie('token', newAccessToken, {
          ...cookieOptions,
          httpOnly: false,
          maxAge: 15 * 60 * 1000, // 15 minutos
        });

        res.cookie('user', JSON.stringify(userForCookie), {
          ...cookieOptions,
          httpOnly: false,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 días
        });

        await t.commit();
        return res.json({
          success: true,
          message: 'Sesión renovada exitosamente',
          token: newAccessToken,
          user: userForCookie,
        });
      } catch (error) {
        console.error('Error al regenerar tokens:', error);
        clearAllAuthCookies(res);
        await t.rollback();
        return res.status(401).json({
          success: false,
          message: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
        });
      }
    }
    
    if (!refreshToken) {
      clearAllAuthCookies(res);
      await t.rollback();
      return res.status(401).json({
        success: false,
        message: 'No se encontró el token de actualización. Por favor, inicie sesión nuevamente.',
      });
    }

    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: { exclude: ['password_hash'] },
          include: [
            { model: Rol, as: 'rol', attributes: ['id_rol', 'nombre_rol'] },
            { model: Ciudad, as: 'ciudad', attributes: ['id_ciudad', 'nombre_ciudad'] }
          ],
        },
      ],
      transaction: t,
    });

    if (!storedToken) {
      clearAllAuthCookies(res);
      await t.rollback();
      return res.status(403).json({
        success: false,
        message: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
      });
    }

    // 🔹 VERIFICAR EXPIRACIÓN DEL REFRESH TOKEN
    if (new Date() > storedToken.expires_at) {
      await storedToken.destroy({ transaction: t });
      clearAllAuthCookies(res);
      await t.rollback();
      return res.status(403).json({ 
        success: false, 
        message: 'Sesión expirada. Por favor, inicie sesión nuevamente.' 
      });
    }

    const user = storedToken.usuario; 

    const newAccessToken = generateAccessToken(user);

    // Destruir el refresh token antiguo y crear uno nuevo
    await storedToken.destroy({ transaction: t });
    const newRefreshToken = await generateRefreshToken(user, t);

    const userData = user.get({ plain: true });
    delete userData.password_hash;

    userData.role = user.rol && user.rol.nombre_rol
      ? user.rol.nombre_rol.toLowerCase()
      : 'usuario';

    const userForCookie = {
      id_usuario: userData.id_usuario,
      nombre: userData.nombre,
      role: userData.role,
      id_rol: userData.id_rol,
      id_ciudad: userData.id_ciudad || 1,
      estado: userData.estado
    };

    // Establecer todas las cookies
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.cookie('token', newAccessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie('user', JSON.stringify(userForCookie), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    await t.commit();
    res.json({
      success: true,
      message: 'Token actualizado correctamente',
      token: newAccessToken,
      user: userForCookie,
    });
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }
    console.error('Error al refrescar el token:', error);
    clearAllAuthCookies(res);
    res.status(401).json({
      success: false,
      message: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
    });
  }
};

// LOGOUT
const logout = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (refreshToken) {
    try {
      await RefreshToken.destroy({ where: { token: refreshToken } });
    } catch (error) {
      console.error('Error al eliminar el refresh token:', error);
    }
  }

  clearAllAuthCookies(res);
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
};

// GET CURRENT USER
const getCurrentUser = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const user = await Usuario.findByPk(req.user.id_usuario, {
      attributes: { 
        exclude: ['password_hash', 'id_rol'] 
      },
      include: [
        { model: Rol, as: 'rol', attributes: ['nombre_rol'] },
        { model: Ciudad, as: 'ciudad', attributes: ['id_ciudad', 'nombre_ciudad'] },
      ],
      transaction: t,
    });

    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: 'Usuario no encontrado' });
    } 

    const userData = user.get({ plain: true });
    // Mantener solo el nombre_rol en el objeto rol
    if (userData.rol) {
      userData.rol = { nombre_rol: user.rol.nombre_rol };
    }

    await t.commit();
    res.status(200).json(userData);
  } catch (error) {
    await t.rollback();
    console.error('Error al obtener usuario actual:', error);
    res.status(500).json({ 
      message: 'Error del servidor al obtener información del usuario' 
    });
  }
};

module.exports = { login, refreshToken, logout, getCurrentUser };