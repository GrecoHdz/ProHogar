const express = require("express");
const router = express.Router();
const { body, param, validationResult, query } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
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
router.get("/", validarErrores, authMiddleware, obtenerUsuarios);

//Obtener Usuario por ID
router.get("/id/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    authMiddleware, obtenerUsuarioPorId);

//Obtener todos los Tecnicos por ciudad
router.get("/tecnicos", [
    query("id_ciudad").optional().isInt().withMessage("El ID de la ciudad debe ser un número entero")
  ],
  validarErrores, authMiddleware, obtenerTecnicosPorCiudad);
  
//Obtener todos los Usuarios por ciudad
router.get("/usuarios", [
    query("id_ciudad").optional().isInt().withMessage("El ID de la ciudad debe ser un número entero")
  ],
  validarErrores, authMiddleware, obtenerUsuariosPorCiudad);

// Obtener datos para Gráfico de crecimiento de usuarios
router.get("/grafica/crecimiento-usuarios", [
    query('fechaActual').optional().isISO8601().withMessage('La fecha debe tener un formato válido (YYYY-MM-DD)')
], validarErrores, authMiddleware, obtenerGraficaCrecimientoUsuarios);

//Obtener todos los Administradores
router.get("/administradores", validarErrores, authMiddleware, obtenerAdministradores);

// Obtener estadísticas de usuarios
router.get("/estadisticas", validarErrores, obtenerEstadisticasUsuarios);

//Obtener Usuario por nombre
router.get("/:nombre", 
    [
        param("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    authMiddleware, obtenerUsuarioPorNombre);

//Obtener Usuario por identidad
router.get("/identidad/:identidad", 
    [   
        param("identidad").isString().withMessage("La identidad debe ser una cadena de caracteres")
    ], 
    validarErrores, 
    authMiddleware, obtenerUsuarioPorIdentidad);

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
        body("activo").optional().isString().withMessage("El activo debe ser un string")
    ], 
    validarErrores,authMiddleware,actualizarUsuario);

//Actualizar Contraseña
router.put("/cambio-clave/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres"), 
        body("currentPassword").isString().withMessage("La contraseña actual debe ser una cadena de caracteres"), 
        body("newPassword").isString().withMessage("La nueva contraseña debe ser una cadena de caracteres")
    ], 
    validarErrores,actualizarPassword);

//Eliminar Usuario
router.delete("/:id", 
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ], 
    validarErrores,authMiddleware,eliminarUsuario);

module.exports = router;

