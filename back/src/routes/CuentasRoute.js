const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware");  
const { apiLimiter } = require('../middleware/rateLimiters'); 
const { 
    obtenertodaslasCuentas,
    obtenerCuentas, 
    obtenerCuentaPorId, 
    crearCuenta, 
    actualizarCuenta, 
    eliminarCuenta 
} = require("../controllers/CuentasController");

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
  

//Obtener todas las cuentas
router.get("/todas", [ 
], validarErrores, obtenertodaslasCuentas);


//Obtener todas las cuentas activas
router.get("/", [ 
], validarErrores, obtenerCuentas);

//Obtener cuenta por id     
router.get("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, obtenerCuentaPorId);

//Crear cuenta
router.post("/", [
    body("banco").isString().withMessage("El banco debe ser una cadena de caracteres"),
    body("beneficiario").optional().isString().withMessage("El beneficiario debe ser una cadena de caracteres"),
    body("num_cuenta").isString().withMessage("El num_cuenta debe ser una cadena de caracteres"),
    body("tipo").isString().withMessage("El tipo debe ser una cadena de caracteres"),
    body("activo").isBoolean().withMessage("El tipo debe ser una cadena de caracteres")
], validarErrores, crearCuenta);

//Actualizar cuenta
router.put("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero"),
    body("banco").optional().isString().withMessage("El banco debe ser una cadena de caracteres"),
    body("beneficiario").optional().isString().withMessage("El beneficiario debe ser una cadena de caracteres"),
    body("num_cuenta").optional().isString().withMessage("El num_cuenta debe ser una cadena de caracteres"),
    body("tipo").optional().isString().withMessage("El tipo debe ser una cadena de caracteres"),
    body("activo").optional().isBoolean().withMessage("El tipo debe ser una cadena de caracteres")
], validarErrores, actualizarCuenta);

//Eliminar cuenta
router.delete("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, eliminarCuenta);

module.exports = router;
