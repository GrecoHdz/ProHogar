const express = require('express');
const { login, refreshToken, logout } = require('../controllers/authController');
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Ruta para iniciar sesión
router.post('/login',
    [
        body('identidad', 'Por favor incluye un identidad válido').isString(),
        body('password', 'La contraseña es requerida').exists()
    ],
    login);

// Ruta para refrescar el token de acceso
router.post('/refresh-token',
    [
        body('refreshToken', 'El refresh token es requerido').exists()
    ],
    refreshToken);

// Ruta para cerrar sesión
router.post('/logout', 
    authMiddleware, // Requiere autenticación
    [
        body('refreshToken', 'El refresh token es requerido').exists()
    ],
    logout);

module.exports = router;