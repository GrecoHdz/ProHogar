const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    obtenerMembresias, 
    obtenerHistorialMembresias,
    obtenerMembresiaActual,
    crearMembresia, 
    actualizarMembresia, 
    eliminarMembresia,
    obtenerProgresoMembresia 
} = require("../controllers/MembresiaController");

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


// Obtener progreso de la membresía actual del usuario
router.get('/progreso/:id_usuario', obtenerProgresoMembresia);

// Obtener todas las membresias (solo para administradores)
router.get("/", obtenerMembresias);

// Obtener membresia actual de un usuario
router.get("/:id", 
  [
    param("id").isInt().withMessage("El ID debe ser un número entero")
  ], 
  validarErrores, 
  obtenerMembresiaActual
);

// Obtener historial de membresias de un usuario
router.get("/historial/:id", 
  [
    param("id").isInt().withMessage("El ID debe ser un número entero")
  ], 
  validarErrores, 
  obtenerHistorialMembresias
);

// Crear membresia
router.post("/", 
  [
    body("id_usuario").isInt().withMessage("El id_usuario debe ser un número entero"),
    body("id_cuenta").optional().isInt().withMessage("El id_cuenta debe ser un número entero"),
    body("num_comprobante").optional().isString().withMessage("El num_comprobante debe ser una cadena de caracteres")
  ], 
  validarErrores, 
  crearMembresia
);

// Actualizar membresia (solo administradores)
router.put("/:id", 
  [
    param("id").isInt().withMessage("El ID debe ser un número entero"),   
    body("estado").optional().isString().withMessage("El estado debe ser una cadena de caracteres")
  ], 
  validarErrores, 
  actualizarMembresia
);

// Eliminar membresia (solo administradores)
router.delete("/:id", 
  [
    param("id").isInt().withMessage("El ID debe ser un número entero")
  ], 
  validarErrores, 
  eliminarMembresia
);

module.exports = router;

