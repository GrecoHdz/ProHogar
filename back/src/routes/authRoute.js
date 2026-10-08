const express = require('express');
const { login, refreshToken, logout, getCurrentUser, forgotPassword, resetPassword, verifyResetToken, getCompletarPerfil, postCompletarPerfil } = require('../controllers/authController');
const { body } = require("express-validator");
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');
const router = express.Router();

// Ruta para iniciar sesión
router.post('/login',
    [
        body('identidad', 'Por favor incluye un identidad válido').isString(),
        body('password', 'La contraseña es requerida').exists()
    ],
    authLimiter,
    login);

// Ruta para refrescar el token de acceso
router.post('/refresh-token',
    [
        body('refreshToken', 'El refresh token es requerido').exists()
    ],
    refreshToken);

// Ruta para cerrar sesión
router.post('/logout', logout);

// Ruta para obtener información del usuario actual
router.get('/me',
    authMiddleware,
    getCurrentUser
);

// Ruta para solicitar restablecimiento de contraseña
router.post('/forgot-password',
    [
        body('email', 'Por favor incluye un correo electrónico válido').isEmail()
    ],
    authLimiter,
    forgotPassword
);

// Ruta para verificar token de restablecimiento
router.get('/verify-reset-token/:token', authLimiter, verifyResetToken);

// Ruta para restablecer la contraseña con token
router.post('/reset-password/:token',
    [
        body('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
    ],
    authLimiter,resetPassword
);

// --- Enlaces públicos sin autenticación para completar perfil (firma HMAC) ---
// Validar enlace y obtener nombre + si requiere password (404 silencioso si la firma no es válida)
router.get('/completar-perfil/:id/:firma',
    authLimiter,
    getCompletarPerfil
);

// Guardar password nuevo y emitir sesión iniciada (mismo mecanismo que auth.login)
router.post('/completar-perfil/:id/:firma',
    [
        body('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 })
    ],
    authLimiter,
    postCompletarPerfil
);

module.exports = router;