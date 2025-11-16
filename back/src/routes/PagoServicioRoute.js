const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware"); 
const { processPayment, denyPayment, acceptPayment } = require("../controllers/PagoServicioController");

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

//Procesar pago
router.post("/procesar", [
    body("id_cotizacion").isInt().withMessage("El ID de la cotización debe ser un número entero"),
    body("id_solicitud").isInt().withMessage("El ID de la solicitud debe ser un número entero"),
    body("monto_credito").isFloat().withMessage("El monto de crédito debe ser un número entero"),
    body("id_cuenta").isInt().withMessage("El ID de la cuenta debe ser un número entero"),
    body("num_comprobante").isString().withMessage("El número de comprobante debe ser una cadena de texto"),
    body("descuento_membresia").optional().isFloat().withMessage("El descuento por membresía debe ser un número decimal"),
    body("monto_manodeobra").isFloat().withMessage("El monto de mano de obra debe ser un número decimal"),
    body("id_usuario").isInt().withMessage("El ID del usuario debe ser un número entero"),
    body("nombre").isString().withMessage("El nombre del usuario debe ser una cadena de texto"),
    validarErrores
], processPayment);

//Denegar pago
router.post("/denegar", [
    body("id_solicitud").isInt().withMessage("El ID de la solicitud debe ser un número entero"),
    body("id_usuario").isInt().withMessage("El ID del usuario debe ser un número entero"), 
    body("id_cotizacion").isInt().withMessage("El ID de la cotización debe ser un número entero"),
    validarErrores
], denyPayment);

//Aceptar pago
router.post("/aceptar", [
    body("id_solicitud").isInt().withMessage("El ID de la solicitud debe ser un número entero"),
    body("id_cotizacion").isInt().withMessage("El ID de la cotización debe ser un número entero"),
    validarErrores
], acceptPayment);

module.exports = router;
