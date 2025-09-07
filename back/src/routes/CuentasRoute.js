const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware");  
const { 
    obtenerCuentas, 
    obtenerCuentaPorId, 
    crearCuenta, 
    actualizarCuenta, 
    eliminarCuenta 
} = require("../controllers/CuentasController");

// Middleware de autenticación
router.use(authMiddleware);
// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }; 
  

//Obtener todas las cuentas
router.get("/", [ 
], validarErrores, obtenerCuentas);

//Obtener cuenta por id     
router.get("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, obtenerCuentaPorId);

//Crear cuenta
router.post("/", [
    body("banco").isString().withMessage("El banco debe ser una cadena de caracteres"),
    body("beneficiario").optional().isInt().withMessage("El beneficiario debe ser un numero entero"),
    body("num_cuenta").isString().withMessage("El num_cuenta debe ser una cadena de caracteres"),
    body("tipo").isString().withMessage("El tipo debe ser una cadena de caracteres")
], validarErrores, crearCuenta);

//Actualizar cuenta
router.put("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero"),
    body("banco").optional().isString().withMessage("El banco debe ser una cadena de caracteres"),
    body("beneficiario").optional().isInt().withMessage("El beneficiario debe ser un numero entero"),
    body("num_cuenta").optional().isString().withMessage("El num_cuenta debe ser una cadena de caracteres"),
    body("tipo").optional().isString().withMessage("El tipo debe ser una cadena de caracteres")
], validarErrores, actualizarCuenta);

//Eliminar cuenta
router.delete("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, eliminarCuenta);

module.exports = router;
