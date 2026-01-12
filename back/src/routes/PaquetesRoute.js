const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');

const { 
    obtenerPaquetes, 
    obtenerPaquetePorId, 
    obtenerPaquetesActivos,
    crearPaquete, 
    actualizarPaquete, 
    desactivarPaquete,
    eliminarPaquete 
} = require("../controllers/PaquetesController");

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

// Obtener todos los paquetes
router.get("/", validarErrores, obtenerPaquetes, authMiddleware);

// Obtener todos los paquetes activos
router.get("/activos", validarErrores, obtenerPaquetesActivos);

// Obtener un paquete por ID
router.get("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
], validarErrores, obtenerPaquetePorId, authMiddleware);

// Crear un nuevo paquete
router.post("/", [
    body("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres"),
    body("descripcion").isString().withMessage("La descripción debe ser una cadena de caracteres"),
    body("costo").isFloat({ min: 0 }).withMessage("El costo debe ser un número positivo"),
    body("estado").optional().isBoolean().withMessage("El estado debe ser un valor booleano")
], validarErrores, crearPaquete, authMiddleware);

// Actualizar un paquete existente
router.put("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo"),
    body("nombre").optional().isString().withMessage("El nombre debe ser una cadena de caracteres"),
    body("descripcion").optional().isString().withMessage("La descripción debe ser una cadena de caracteres"),
    body("costo").optional().isFloat({ min: 0 }).withMessage("El costo debe ser un número positivo"),
    body("estado").optional().isBoolean().withMessage("El estado debe ser un valor booleano")
], validarErrores, actualizarPaquete, authMiddleware);

// Desactivar un paquete (cambiar estado a inactivo)
router.put("/desactivar/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, desactivarPaquete, authMiddleware);

// Eliminar permanentemente un paquete (solo para administradores)
router.delete("/:id", [
    param("id").isInt({ min: 1 }).withMessage("El ID debe ser un número entero positivo")
], validarErrores, eliminarPaquete, authMiddleware);

module.exports = router;
