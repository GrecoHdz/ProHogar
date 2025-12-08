const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');

const { 
    obtenerServiciosPorTecnico,
    asignarServicioATecnico,
    eliminarAsignacionServicio
} = require("../controllers/TecnicoServicioController");

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

// Obtener servicios de un técnico específico
router.get("/:id_tecnico", [
    param("id_tecnico").isInt({ min: 1 }).withMessage("El ID del técnico debe ser un número entero positivo")
], validarErrores, authMiddleware, obtenerServiciosPorTecnico);

// Asignar un servicio a un técnico
router.post("/", [
    body("id_tecnico").isInt({ min: 1 }).withMessage("El ID del técnico debe ser un número entero positivo"),
    body("id_servicio").isInt({ min: 1 }).withMessage("El ID del servicio debe ser un número entero positivo")
], validarErrores, authMiddleware, asignarServicioATecnico);

// Eliminar asignación de servicio a técnico
router.delete("/:id_tecnico_servicio", [
    param("id_tecnico_servicio").isInt({ min: 1 }).withMessage("El ID del técnico debe ser un número entero positivo")
], validarErrores, authMiddleware, eliminarAsignacionServicio);

module.exports = router;
