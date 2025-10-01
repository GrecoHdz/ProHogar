const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");   
const { authMiddleware } = require("../middleware/authMiddleware");  
const { 
    getAllCalificaciones, 
    getCalificacionesPorUsuario, 
    getCalificacionesPorSolicitud, 
    getPromedioCalificacionesPorUsuario,
    crearCalificacion, 
    eliminarCalificacion 
} = require("../controllers/CalificacionesController");

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
  
//Obtener todas las calificaciones
router.get("/", [
], validarErrores, getAllCalificaciones);

//Obtener calificaciones por usuario
router.get("/usuario/:id_usuario", [
    param("id_usuario").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, getCalificacionesPorUsuario);

//Obtener promedio de calificaciones por usuario
router.get("/promedio/:id_usuario", [
    param("id_usuario").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, getPromedioCalificacionesPorUsuario);

//Obtener calificaciones por solicitud
router.get("/solicitud/:id_solicitud", [
    param("id_solicitud").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, getCalificacionesPorSolicitud);

//Crear calificacion
router.post("/", [
    body("id_solicitud").isInt().withMessage("El ID de la solicitud debe ser un numero entero"),
    body("id_usuario_calificado").isInt().withMessage("El ID del usuario calificado debe ser un numero entero"),
    body("id_usuario_calificador").isInt().withMessage("El ID del usuario calificador debe ser un numero entero"),
    body("calificacion").isInt().withMessage("La calificacion debe ser un numero entero"),
    body("comentario").isString().withMessage("El comentario debe ser una cadena de texto")
], validarErrores, crearCalificacion);

//Eliminar calificacion
router.delete("/:id", [
    param("id").isInt().withMessage("El ID debe ser un numero entero")
], validarErrores, eliminarCalificacion);

module.exports = router;