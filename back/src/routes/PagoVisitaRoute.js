const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    obtenerPagos,
    obtenerPagoPorId,
    obtenerPagosPorUsuario,
    obtenerUltimoPagoPorSolicitud,
    crearPago,
    actualizarPago,
    eliminarPago
} = require("../controllers/PagoVisitaController");

// Middleware de autenticación
//router.use(authMiddleware); 
// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }; 

//Obtener todos los pagos
router.get("/", validarErrores, obtenerPagos);

//Obtener un pago por id
router.get("/:id", validarErrores, obtenerPagoPorId);

//Obtener pagos por usuario
router.get("/usuario/:id", validarErrores, obtenerPagosPorUsuario); 

//Obtener ultimo pago de solicitud espefica
router.get("/solicitud/:id_solicitud", [
    param("id_solicitud").isInt({ min: 1 }).withMessage("El ID de la solicitud debe ser un número entero positivo")
], validarErrores, obtenerUltimoPagoPorSolicitud);

//Crear un pago
router.post("/", [
    body("id_usuario").isInt({ min: 1 }).withMessage("El ID del usuario debe ser un número entero positivo"),
    body("id_solicitud").isInt({ min: 1 }).withMessage("El ID de la solicitud debe ser un número entero positivo"),
    body("id_cuenta").isInt({ min: 1 }).withMessage("El ID de la cuenta debe ser un número entero positivo"),
    body("monto").isInt({ min: 1 }).withMessage("El monto debe ser un número entero positivo"),
    body("num_comprobante").isString().withMessage("El número de comprobante debe ser una cadena de caracteres"),
    body("fecha").isISO8601().withMessage("La fecha debe tener un formato válido (ISO 8601)")
], validarErrores, crearPago);

//Actualizar un pago
router.put("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
    body("estado").isIn(["pagado", "rechazado"]).withMessage("El estado debe ser'pagado' o 'rechazado'")
], validarErrores, actualizarPago);

//Eliminar un pago
router.delete("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, eliminarPago);

module.exports = router;
