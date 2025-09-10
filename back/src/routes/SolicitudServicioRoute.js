const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator"); 
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    obtenerSolicitudesServicios, 
    obtenerSolicitudServicioPorServicio,
    obtenerSolicitudServicioPorUsuario,
    crearSolicitudServicio, 
    actualizarSolicitudServicio, 
    eliminarSolicitudServicio 
} = require("../controllers/SolicitudServicioController");

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

//Obtener todas las solicitudes de servicios
router.get("/", validarErrores, obtenerSolicitudesServicios);

//Obtener todas las solicitudes de servicios por servicio
router.get("/servicio/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
], validarErrores, obtenerSolicitudServicioPorServicio);

//Obtener todas las solicitudes de servicios por usuario
router.get("/usuario/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
], validarErrores, obtenerSolicitudServicioPorUsuario);

//Crear una solicitud de servicio
router.post("/", [
    body("id_usuario").isInt({ min: 1 }).withMessage("El ID del usuario debe ser un número entero positivo"),
    body("id_servicio").isInt({ min: 1 }).withMessage("El ID del servicio debe ser un número entero positivo"), 
    body("id_ciudad").isInt({ min: 1 }).withMessage("El ID de la ciudad debe ser un número entero positivo"), 
    body("colonia").isString().withMessage("La colonia debe ser una cadena de caracteres"),
    body("direccion_precisa").isString().withMessage("La dirección precisa debe ser una cadena de caracteres"),
    body("descripcion").isString().withMessage("La descripción debe ser una cadena de caracteres"),
    body("pagar_visita").isBoolean().withMessage("La visita pagada debe ser un booleano"),
    body("estado").isIn(["pendiente_pago", "pendiente_asignacion", "asignado", "en_proceso", "finalizado", "cancelado"]).withMessage("Estado no válido")
], validarErrores, crearSolicitudServicio);

//Actualizar una solicitud de servicio
router.put("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"), 
    body("id_tecnico").optional().isInt({ min: 1 }).withMessage("El ID del técnico debe ser un número entero positivo"),
    body("estado").optional().isIn(["pendiente_pago", "pendiente_asignacion", "asignado", "en_proceso", "finalizado", "cancelado"]).withMessage("Estado no válido"),
    body("comentario").optional().isString().withMessage("El comentario debe ser una cadena de caracteres")
], validarErrores, actualizarSolicitudServicio);

//Eliminar una solicitud de servicio
router.delete("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, eliminarSolicitudServicio);

module.exports = router;

