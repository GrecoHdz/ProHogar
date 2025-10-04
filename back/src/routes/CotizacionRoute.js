const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware");     
const { 
    getAllCotizaciones,
    getCotizacionesPorUsuario,
    getCotizacionPorSolicitud,
    getUltimaCotizacionPorSolicitud,
    createCotizacion,
    updateCotizacion,
    deleteCotizacion 
} = require("../controllers/CotizacionController");

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

//Obtener todas las cotizaciones
router.get("/", [
    validarErrores
], getAllCotizaciones);

//Obtener cotizaciones por usuario
router.get("/usuario/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero"),
    validarErrores
], getCotizacionesPorUsuario);

//Obtener todas las cotizaciones de una solicitud
router.get("/cotizaciones/:id_solicitud", [
    param("id_solicitud").isInt().withMessage("El ID debe ser un numero entero"),
    validarErrores
], getCotizacionPorSolicitud);

//Obtener ultima cotizacion de solicitud especifica
router.get("/solicitud/:id_solicitud", [
    param("id_solicitud").isInt().withMessage("El ID debe ser un numero entero"),
    validarErrores
], getUltimaCotizacionPorSolicitud);

//Crear Cotizacion 
router.post("/", [ 
    body("id_solicitud").isInt({ min: 1 }).withMessage("El ID de la solicitud debe ser un número entero positivo"), 
    body("monto_manodeobra").isFloat({ min: 1 }).withMessage("El monto de mano de obra debe ser un número entero positivo"),
    body("monto_materiales").isFloat({ min: 0 }).withMessage("El monto de materiales debe ser un número entero positivo"),
    body("comentario").isString().withMessage("El comentario debe ser una cadena de caracteres"),
    body("fecha").isISO8601().withMessage("La fecha debe tener un formato válido (ISO 8601)"),
], validarErrores, createCotizacion);

//Actualizar cotizacion
router.put("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
    body("id_cuenta").optional().isInt({ min: 1 }).withMessage("El ID de la cuenta debe ser un número entero positivo"),
    body("num_comprobante").optional().isString().withMessage("El número de comprobante debe ser una cadena de caracteres"),
    body("monto_manodeobra").optional().isFloat({ min: 1 }).withMessage("El monto de mano de obra debe ser un número entero positivo"),
    body("monto_materiales").optional().isFloat({ min: 1 }).withMessage("El monto de materiales debe ser un número entero positivo"),
    body("descuento_membresia").optional().isFloat({ min: 0 }).withMessage("El descuento de membresia debe ser un número entero positivo"),
    body("credito_usado").optional().isFloat({ min: 0 }).withMessage("El crédito usado debe ser un número entero positivo"),
    body("comentario").optional().isString().withMessage("El comentario debe ser una cadena de caracteres"), 
    body("estado").optional().isIn(["pendiente", "aceptado", "rechazado", "pagado", "confirmado"]).withMessage("El estado debe ser 'pendiente', 'aceptado', 'rechazado', 'pagado' o 'pago_confirmado'")
], validarErrores, updateCotizacion);

//Eliminar cotizacion
router.delete("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, deleteCotizacion);

module.exports = router;
