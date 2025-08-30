const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { 
    obtenerUsuarios, 
    obtenerUsuarioPorNombre, 
    obtenerUsuarioPorIdentidad, 
    crearUsuario, 
    actualizarUsuario, 
    eliminarUsuario 
} = require("../controllers/UsuarioController");

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errores: errors.array() });
    }
    next();
  };
  
//Obtener todos los Usuarios
router.get("/", validarErrores, obtenerUsuarios);

//Obtener Usuario por nombre
router.get("/:nombre", 
    [
        param("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    obtenerUsuarioPorNombre);

//Obtener Usuario por identidad
router.get("/id/:identidad", 
    [   
        param("identidad").isString().withMessage("La identidad debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    obtenerUsuarioPorIdentidad);

//Crear Usuario
router.post("/", 
    [
        body("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres"), 
        body("identidad").isString().withMessage("La identidad debe ser una cadena de caracteres"), 
        body("email").isString().withMessage("El email debe ser una cadena de caracteres"), 
        body("telefono").isString().withMessage("El telefono debe ser una cadena de caracteres"), 
        body("password_hash").isString().withMessage("El password_hash debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    crearUsuario);

//Actualizar Usuario
router.put("/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres"), 
        body("nombre").optional().isString().withMessage("El nombre debe ser una cadena de caracteres"), 
        body("identidad").optional().isString().withMessage("La identidad debe ser una cadena de caracteres"), 
        body("email").optional().isString().withMessage("El email debe ser una cadena de caracteres"), 
        body("telefono").optional().isString().withMessage("El telefono debe ser una cadena de caracteres"), 
        body("password_hash").optional().isString().withMessage("El password_hash debe ser una cadena de caracteres"),
        body("activo").optional().isBoolean().withMessage("El activo debe ser un booleano")
    ], 
    validarErrores, 
    actualizarUsuario);

//Eliminar Usuario
router.delete("/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    eliminarUsuario);

module.exports = router;

