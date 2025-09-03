const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
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

//Obtener todas las Ciudades
router.get("/", validarErrores, obtenerCiudades);

//Obtener una Ciudad por nombre
router.get("/:nombre", validarErrores, obtenerCiudadPorNombre);

//Crear una Ciudad
router.post("/", validarErrores, crearCiudad);

//Actualizar una Ciudad
router.put("/:id", validarErrores, actualizarCiudad);

//Eliminar una Ciudad
router.delete("/:id", validarErrores, eliminarCiudad);

module.exports = router;
