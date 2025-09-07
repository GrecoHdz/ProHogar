const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { 
    obtenerUsuarios, 
    obtenerUsuarioPorNombre, 
    obtenerUsuarioPorIdentidad, 
    obtenerUsuarioPorId,
    crearUsuario, 
    actualizarUsuario, 
    actualizarPassword,
    eliminarUsuario 
} = require("../controllers/UsuarioController");

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
//Obtener todos los Usuarios
router.get("/", validarErrores, obtenerUsuarios);

//Obtener Usuario por ID
router.get("/id/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    obtenerUsuarioPorId);

//Obtener Usuario por nombre
router.get("/:nombre", 
    [
        param("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    obtenerUsuarioPorNombre);

//Obtener Usuario por identidad
router.get("/identidad/:identidad", 
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
        body("id_ciudad").isInt().withMessage("El id_ciudad debe ser un numero entero"),
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
        body("id_ciudad").optional().isInt().withMessage("El id_ciudad debe ser un numero entero"),
        body("activo").optional().isBoolean().withMessage("El activo debe ser un booleano")
    ], 
    validarErrores, 
    actualizarUsuario);

//Actualizar Contraseña
router.put("/cambio-clave/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres"), 
        body("currentPassword").isString().withMessage("La contraseña actual debe ser una cadena de caracteres"), 
        body("newPassword").isString().withMessage("La nueva contraseña debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    actualizarPassword);

//Eliminar Usuario
router.delete("/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    eliminarUsuario);

module.exports = router;

