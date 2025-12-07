const express = require("express");
const router = express.Router();
const { body, param, validationResult, query } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');
const { authLimiter } = require('../middleware/rateLimiters');

const { 
    obtenerUsuarios, 
    obtenerTecnicosPorCiudad,
    obtenerUsuariosPorCiudad,
    obtenerAdministradores,
    obtenerUsuarioPorNombre, 
    obtenerUsuarioPorIdentidad, 
    obtenerUsuarioPorId, 
    crearUsuario, 
    actualizarUsuario, 
    actualizarPassword,
    eliminarUsuario,
    obtenerEstadisticasUsuarios,
    obtenerGraficaCrecimientoUsuarios
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
router.get("/", validarErrores, authMiddleware, apiLimiter, obtenerUsuarios);

//Obtener Usuario por ID
router.get("/id/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ], 
    validarErrores, authMiddleware, apiLimiter, obtenerUsuarioPorId);

//Obtener todos los Tecnicos por ciudad
router.get("/tecnicos", [
    query("id_ciudad").optional().isInt().withMessage("El ID de la ciudad debe ser un número entero")
  ],
  validarErrores, authMiddleware, apiLimiter, obtenerTecnicosPorCiudad);
  
//Obtener todos los Usuarios por ciudad
router.get("/usuarios", [
    query("id_ciudad").optional().isInt().withMessage("El ID de la ciudad debe ser un número entero")
  ],
  validarErrores, authMiddleware, apiLimiter, obtenerUsuariosPorCiudad);

// Obtener datos para Gráfico de crecimiento de usuarios
router.get("/grafica/crecimiento-usuarios", [
    query('fechaActual').optional().isISO8601().withMessage('La fecha debe tener un formato válido (YYYY-MM-DD)')
], validarErrores, authMiddleware, apiLimiter, obtenerGraficaCrecimientoUsuarios);

//Obtener todos los Administradores
router.get("/administradores", validarErrores, authMiddleware, apiLimiter, obtenerAdministradores);

// Obtener estadísticas de usuarios
router.get("/estadisticas", validarErrores, authMiddleware, apiLimiter, obtenerEstadisticasUsuarios);

//Obtener Usuario por nombre
router.get("/:nombre", 
    [
        param("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres")
    ], 
    validarErrores, authMiddleware, apiLimiter, obtenerUsuarioPorNombre);

//Obtener Usuario por identidad
router.get("/identidad/:identidad", 
    [   
        param("identidad").isString().withMessage("La identidad debe ser una cadena de caracteres")
    ], 
    validarErrores, authMiddleware, apiLimiter, obtenerUsuarioPorIdentidad);

//Crear Usuario
router.post("/", 
    [
        body("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres"), 
        body("identidad").isString().withMessage("La identidad debe ser una cadena de caracteres"), 
        body("email").isString().withMessage("El email debe ser una cadena de caracteres"), 
        body("telefono").isString().withMessage("El telefono debe ser una cadena de caracteres"), 
        body("id_ciudad").isInt().withMessage("El id_ciudad debe ser un numero entero"),
        body("password_hash").isString().withMessage("El password_hash debe ser una cadena de caracteres"),
        body("es_tecnico").isBoolean().withMessage("El es_tecnico debe ser un booleano")
    ], 
    validarErrores, authLimiter, crearUsuario);

// En UsuarioRoute.js
router.put("/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres"), 
        body("nombre").optional().isString().withMessage("El nombre debe ser una cadena de caracteres"), 
        body("identidad").optional().isString().withMessage("La identidad debe ser una cadena de caracteres"), 
        body("email").optional().isString().withMessage("El email debe ser una cadena de caracteres"), 
        body("telefono").optional().isString().withMessage("El telefono debe ser una cadena de caracteres"), 
        body("password_hash").optional().isString().withMessage("El password_hash debe ser una cadena de caracteres"),
        body("id_ciudad").optional().isInt().withMessage("El id_ciudad debe ser un numero entero"),
        body("id_rol").optional().isInt().withMessage("El id_rol debe ser un número entero"),
        body("estado").optional().isString().withMessage("El estado debe ser una cadena de caracteres")
    ], 
    validarErrores, authMiddleware, apiLimiter, actualizarUsuario );

//Actualizar Contraseña
router.put("/cambio-clave/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres"), 
        body("newPassword").isString().withMessage("La nueva contraseña debe ser una cadena de caracteres")
    ], 
    validarErrores, authLimiter, actualizarPassword);

//Eliminar Usuario
router.delete("/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ], 
    validarErrores, authMiddleware, apiLimiter, eliminarUsuario);

module.exports = router;

