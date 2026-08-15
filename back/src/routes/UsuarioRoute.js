const express = require("express");
const router = express.Router();
const { body, param, validationResult, query } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');
const { authLimiter } = require('../middleware/rateLimiters');
const { uploadProfile, uploadIdentity } = require("../config/cloudinary");

const {
    obtenerUsuarios,
    obtenerTecnicosPorCiudad,
    obtenerTecnicosYAdminsPorCiudad,
    obtenerUsuariosPorCiudad,
    obtenerAdministradores,
    obtenerUsuarioPorNombre,
    obtenerUsuarioPorIdentidad,
    obtenerUsuarioPorId,
    crearUsuario,
    actualizarUsuario,
    actualizarImagenPerfil,
    eliminarImagenPerfil,
    actualizarIdentidadFoto,
    eliminarIdentidadFoto,
    verificarPerfilTecnico,
    actualizarPassword,
    verificarRTN,
    eliminarUsuario,
    obtenerEstadisticasUsuarios,
    obtenerGraficaCrecimientoUsuarios,
    obtenerUsuariosPendientesVerificar
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

// Verificar perfil de técnico
router.get("/verificar-perfil-tecnico/:id_usuario",
    [
        param("id_usuario").isInt().withMessage("El ID del usuario debe ser un número entero")
    ],
    validarErrores,
    authMiddleware,
    verificarPerfilTecnico
);

//Obtener Usuario por ID
router.get("/id/:id",
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ],
    validarErrores, authMiddleware, apiLimiter, obtenerUsuarioPorId);

//Obtener todos los Tecnicos por ciudad
router.get("/tecnicos", [
    query("id_ciudad").optional().isInt().withMessage("El ID de la ciudad debe ser un número entero"),
    query("id_servicio").optional().isInt().withMessage("El ID del servicio debe ser un número entero")
],
    validarErrores, authMiddleware, apiLimiter, obtenerTecnicosPorCiudad);

//Obtener todos los Técnicos y Administradores por ciudad
router.get("/tecnicos-admins", [
    query("id_ciudad").optional().isInt().withMessage("El ID de la ciudad debe ser un número entero"),
    query("id_servicio").optional().isInt().withMessage("El ID del servicio debe ser un número entero"),
    query("nombre").optional().isString().withMessage("El nombre debe ser una cadena de caracteres"),
    query("estado").optional().isString().withMessage("El estado debe ser una cadena de caracteres"),
    query("limit").optional().isInt().withMessage("El límite debe ser un número entero"),
    query("offset").optional().isInt().withMessage("El offset debe ser un número entero")
],
    validarErrores, authMiddleware, apiLimiter, obtenerTecnicosYAdminsPorCiudad);

//Obtener todos los Usuarios por ciudad
router.get("/usuarios", [
    query("id_ciudad").optional().isInt().withMessage("El ID de la ciudad debe ser un número entero")
],
    validarErrores, authMiddleware, apiLimiter, obtenerUsuariosPorCiudad);

// Obtener datos para Gráfico de crecimiento de usuarios
router.get("/grafica/crecimiento-usuarios", [
    query('fechaActual').optional().isISO8601().withMessage('La fecha debe tener un formato válido (YYYY-MM-DD)')
], validarErrores, authMiddleware, apiLimiter, obtenerGraficaCrecimientoUsuarios);

//Verificar RTN por ID de usuario
router.get("/verificar-rtn/:id_usuario",
    [
        param("id_usuario").isString().withMessage("El ID del usuario debe ser una cadena de caracteres")
    ],
    validarErrores, authMiddleware, apiLimiter, verificarRTN);
//Obtener todos los Administradores
router.get("/administradores", validarErrores, authMiddleware, apiLimiter, obtenerAdministradores);

// Obtener estadísticas de usuarios
router.get("/estadisticas", validarErrores, authMiddleware, apiLimiter, obtenerEstadisticasUsuarios);

// Obtener usuarios pendientes de verificar
router.get("/pendientes-verificar", validarErrores, authMiddleware, apiLimiter, obtenerUsuariosPendientesVerificar);

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
router.post("/nuevo",
    [
        body("nombre").isString().withMessage("El nombre debe ser una cadena de caracteres"),
        body("identidad").optional({ nullable: true, checkFalsy: true }).isString().withMessage("La identidad debe ser una cadena de caracteres"),
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
    validarErrores, authMiddleware, apiLimiter, actualizarUsuario);

//Actualizar Contraseña
router.put("/cambio-clave/:id",
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres"),
        body("newPassword").optional().isString().withMessage("La nueva contraseña debe ser una cadena de caracteres")
    ],
    validarErrores, authLimiter, actualizarPassword);

// Actualizar imagen de perfil
router.post(
    '/imagen-perfil/:id',
    authMiddleware,
    uploadProfile.single('imagen'),
    actualizarImagenPerfil
);

// Eliminar imagen de perfil
router.delete(
    '/imagen-perfil/:id',
    authMiddleware,
    eliminarImagenPerfil
);

// Actualizar foto de identidad
router.post(
    '/identidad-foto/:id',
    authMiddleware,
    uploadIdentity.single('imagen'),
    actualizarIdentidadFoto
);

// Eliminar foto de identidad
router.delete(
    '/identidad-foto/:id',
    authMiddleware,
    eliminarIdentidadFoto
);

//Eliminar Usuario
router.delete("/:id",
    [
        param("id").isString().withMessage("El ID debe ser una cadena de caracteres")
    ],
    validarErrores, authMiddleware, apiLimiter, eliminarUsuario);

module.exports = router;

