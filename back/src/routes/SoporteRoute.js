const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');

const { 
    obtenerSoportes, 
    obtenerSoportePorCliente, 
    crearSoporte, 
    actualizarSoporte, 
    eliminarSoporte 
} = require("../controllers/SoporteController");    

// Middleware de autenticación
router.use(authMiddleware);

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
  //Obtener todos los Soportes
  router.get("/", validarErrores, obtenerSoportes);

  //Obtener Soporte por Cliente
  router.get("/cliente/:id", validarErrores, obtenerSoportePorCliente);

  //Crear Soporte
  router.post("/", 
    [
        body("id_usuario").isInt().withMessage("El ID debe ser una cadena de caracteres"), 
        body("asunto").isString().withMessage("El ID debe ser una cadena de caracteres"), 
        body("id_solicitud").optional().isInt().withMessage("El ID debe ser una cadena de caracteres"),
        body("mensaje").isString().withMessage("La descripción debe ser una cadena de caracteres")
    ],
    validarErrores, crearSoporte);

  //Actualizar Soporte
  router.put("/:id", 
    [ 
        body("estado").optional().isBoolean().withMessage("El estado debe ser un booleano")
    ],
    validarErrores, actualizarSoporte);

  //Eliminar Soporte
  router.delete("/:id", 
    [
        param("id").isInt().withMessage("El ID debe ser una cadena de caracteres")
    ],
    validarErrores, eliminarSoporte);

  module.exports = router;

