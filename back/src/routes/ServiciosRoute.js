const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    obtenerServicios, 
    obtenerServicioPorId, 
    crearServicio, 
    actualizarServicio, 
    eliminarServicio 
} = require("../controllers/ServiciosController");

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

//Obtener todos los servicios
router.get("/", validarErrores, obtenerServicios);

//Obtener un servicio por ID
router.get("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
], validarErrores, obtenerServicioPorId);

//Crear un servicio
router.post("/", [
    body("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres"),
    body("descripcion").isString().withMessage("La descripción debe ser una cadena de caracteres"),
    body("estado").optional().isBoolean().withMessage("El estado debe ser un booleano")
], validarErrores, crearServicio);

//Actualizar un servicio
router.put("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
    body("nombre").optional().isString().withMessage("El nombre debe ser una cadena de caracteres"),
    body("descripcion").optional().isString().withMessage("La descripción debe ser una cadena de caracteres"),
    body("estado").optional().isBoolean().withMessage("El estado debe ser un booleano")
], validarErrores, actualizarServicio);

//Eliminar un servicio
router.delete("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, eliminarServicio);

module.exports = router;