const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    obtenerCiudades, 
    obtenerCiudadPorNombre,  
    crearCiudad, 
    actualizarCiudad, 
    eliminarCiudad 
} = require("../controllers/CiudadController");

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
}; 

// Obtener todas las Ciudades (sin autenticación)
router.get("/", validarErrores, obtenerCiudades);

// Obtener una Ciudad por nombre (requiere autenticación)
router.get("/:nombre", authMiddleware, validarErrores, obtenerCiudadPorNombre);

// Crear una Ciudad (requiere autenticación)
router.post("/", authMiddleware, validarErrores, crearCiudad);

// Actualizar una Ciudad (requiere autenticación)
router.put("/:id", authMiddleware, validarErrores, actualizarCiudad);

// Eliminar una Ciudad (requiere autenticación)
router.delete("/:id", authMiddleware, validarErrores, eliminarCiudad);

module.exports = router;
