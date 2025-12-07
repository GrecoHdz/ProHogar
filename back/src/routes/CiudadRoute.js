const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');
const { 
    obtenerCiudades, 
    obtenerCiudadPorNombre,  
    crearCiudad, 
    actualizarCiudad, 
    eliminarCiudad 
} = require("../controllers/CiudadController"); 

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

// Obtener todas las Ciudades (sin autenticación)
router.get("/", obtenerCiudades);

// Obtener una Ciudad por nombre (requiere autenticación)
router.get("/:nombre", authMiddleware, obtenerCiudadPorNombre);

// Crear una Ciudad (requiere autenticación)
router.post("/", 
  authMiddleware,
  body("nombre_ciudad").notEmpty().withMessage("El nombre de la ciudad es requerido"),
  validarErrores, 
  crearCiudad
);

// Actualizar una Ciudad (requiere autenticación)
router.put("/:id", 
  authMiddleware,
  param("id").isInt().withMessage("El ID debe ser un número entero"),
  body("nombre_ciudad").notEmpty().withMessage("El nombre de la ciudad es requerido"),
  validarErrores, 
  actualizarCiudad
);

// Eliminar una Ciudad (requiere autenticación)
router.delete("/:id", 
  authMiddleware,
  param("id").isInt().withMessage("El ID debe ser un número entero"),
  validarErrores, 
  eliminarCiudad
);

module.exports = router;
