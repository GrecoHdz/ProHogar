const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware");  
const { apiLimiter } = require('../middleware/rateLimiters'); 
const { 
    obtenerConfig, 
    obtenerConfigPorId, 
    obtenerValorConfig,
    crearConfig, 
    actualizarConfig, 
    eliminarConfig 
} = require("../controllers/ConfigController");

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

//Obtener todas las configuraciones
router.get("/", [ 
],validarErrores, authMiddleware, obtenerConfig);

//Obtener configuracion por id
router.get("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, authMiddleware, obtenerConfigPorId);

//Obtener valor de configuracion
router.get("/valor/:tipo_config", [
    param("tipo_config").isString().withMessage("El tipo_config debe ser una cadena de caracteres")
], validarErrores, obtenerValorConfig);

//Crear configuracion
router.post("/", [
    body("tipo_config").isString().withMessage("El tipo_config debe ser una cadena de caracteres"),
    body("valor").isInt().withMessage("El valor debe ser un numero entero")
],validarErrores, authMiddleware, crearConfig);

//Actualizar configuracion
router.put("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero"),
    body("tipo_config").optional().isString().withMessage("El tipo_config debe ser una cadena de caracteres"),
    body("valor").optional().isInt().withMessage("El valor debe ser un numero entero")
],validarErrores, authMiddleware, actualizarConfig);

//Eliminar configuracion
router.delete("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero")
],validarErrores, authMiddleware, eliminarConfig);

module.exports = router;