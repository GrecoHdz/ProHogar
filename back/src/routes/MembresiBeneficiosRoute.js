const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    obtenerBeneficios, 
    obtenerBeneficioPorId, 
    crearBeneficio, 
    actualizarBeneficio, 
    eliminarBeneficio 
} = require("../controllers/MembresiaBeneficiosController");
 
// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  }; 

// Obtener todos los beneficios
router.get("/", validarErrores, obtenerBeneficios);

//Obtener un beneficio por id
router.get("/:id", validarErrores, obtenerBeneficioPorId, authMiddleware);

//Crear un beneficio
router.post("/", [
    body("mes_requerido").isInt().withMessage("El mes_requerido debe ser un número entero"),
    body("tipo_beneficio").isString().withMessage("El tipo_beneficio debe ser una cadena de caracteres"),
    body("descripcion").isString().withMessage("La descripcion debe ser una cadena de caracteres")
], validarErrores, crearBeneficio, authMiddleware);

//Actualizar un beneficio
router.put("/:id", [
    param("id").isInt().withMessage("El ID debe ser un número entero"),
    body("mes_requerido").optional().isInt().withMessage("El mes_requerido debe ser un número entero"),
    body("tipo_beneficio").optional().isString().withMessage("El tipo_beneficio debe ser una cadena de caracteres"),
    body("descripcion").optional().isString().withMessage("La descripcion debe ser una cadena de caracteres")
], validarErrores, actualizarBeneficio, authMiddleware);

//Eliminar un beneficio
router.delete("/:id", [
    param("id").isInt().withMessage("El ID debe ser un número entero")
], validarErrores, eliminarBeneficio, authMiddleware);

module.exports = router;