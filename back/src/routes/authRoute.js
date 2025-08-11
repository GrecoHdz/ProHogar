const express = require('express');
const { login } = require('../controllers/authController');
const { body, param, validationResult } = require("express-validator");

const router = express.Router();

router.post('/login',
    [
        body('identidad', 'Por favor incluye un identidad válido').isString(),
        body('password', 'La contraseña es requerida').exists()
    ],
    login);

module.exports = router;