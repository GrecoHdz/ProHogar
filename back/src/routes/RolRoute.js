const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');

const { 
    obtenerRoles, 
    obtenerRolPorNombre, 
    obtenerRolPorId,
    crearRol, 
    actualizarRol, 
    eliminarRol 
} = require("../controllers/RolController");

// Middleware de autenticación
router.use(authMiddleware);

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

// Obtener todos los roles
router.get("/", obtenerRoles);

// Buscar roles por nombre
router.get(
    "/buscar/:nombre",
    [
        param("nombre")
            .trim()
            .notEmpty()
            .withMessage("El término de búsqueda es requerido")
            .isLength({ min: 2 })
            .withMessage("El término de búsqueda debe tener al menos 2 caracteres")
    ],
    validarErrores,
    obtenerRolPorNombre
);

// Obtener rol por ID
router.get(
    "/:id",
    [
        param("id")
            .isInt({ min: 1 })
            .withMessage("El ID debe ser un número entero positivo")
    ],
    validarErrores,
    obtenerRolPorId
);

// Crear un nuevo rol
router.post(
    "/",
    [
        body("nombre_rol")
            .trim()
            .notEmpty()
            .withMessage("El nombre del rol es requerido")
            .isLength({ min: 3, max: 50 })
            .withMessage("El nombre del rol debe tener entre 3 y 50 caracteres")
    ],
    validarErrores,
    crearRol
);

// Actualizar un rol existente
router.put(
    "/:id",
    [
        param("id")
            .isInt({ min: 1 })
            .withMessage("El ID debe ser un número entero positivo"),
        body("nombre_rol")
            .trim()
            .notEmpty()
            .withMessage("El nombre del rol es requerido")
            .isLength({ min: 3, max: 50 })
            .withMessage("El nombre del rol debe tener entre 3 y 50 caracteres")
    ],
    validarErrores,
    actualizarRol
);

// Eliminar un rol
router.delete(
    "/:id",
    [
        param("id")
            .isInt({ min: 1 })
            .withMessage("El ID debe ser un número entero positivo")
    ],
    validarErrores,
    eliminarRol
);

module.exports = router;
