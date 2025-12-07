const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware"); 
const { apiLimiter } = require('../middleware/rateLimiters');

const { 
    getAllReferidos, 
    getReferidosByUser, 
    getReferidorByUser,
    createReferido,
    getTopUsuariosConMasReferidos
} = require("../controllers/ReferidoController");

// Middleware de Limitador
router.use(apiLimiter);

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }; 
  
//Obtener todos los referidos
router.get("/", [
], validarErrores, getAllReferidos);

//Obtener referidos de un usuario
router.get("/:id_referidor", [
    param("id_referidor").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, authMiddleware, getReferidosByUser);

//Obtener referidor de un usuario
router.get("/referidor/:id_referido_usuario", [
    param("id_referido_usuario").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, authMiddleware, getReferidorByUser);

// Obtener top 5 usuarios con más referidos
router.get("/top/usuarios", authMiddleware, getTopUsuariosConMasReferidos);

//Crear referido
router.post("/", [
    body("id_referidor").isInt().withMessage("El ID debe ser un numero entero"),
    body("id_referido_usuario").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, createReferido);

module.exports = router;
