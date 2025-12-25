const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');

const {
    obtenerCorrelativos,
    obtenerCorrelativoActivo,
    crearCorrelativo,
    actualizarCorrelativo,
    eliminarCorrelativo
} = require("../controllers/facturaCorrelativoController");

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// Obtener todos los correlativos con paginación
router.get("/", 
    [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('estado').optional().isIn(['ACTIVO', 'AGOTADO', 'VENCIDO'])
    ],
validarErrores,
authMiddleware,  
apiLimiter, 
obtenerCorrelativos
);

// Obtener el correlativo activo actual
router.get("/activo",
    authMiddleware,
    apiLimiter,
    obtenerCorrelativoActivo
);

// Crear un nuevo correlativo (solo administradores)
router.post("/",
    [
        body('prefijo')
            .notEmpty().withMessage('El prefijo es requerido')
            .matches(/^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}-[a-zA-Z0-9]{2}-$/).withMessage('El prefijo debe tener el formato xxx-xxx-xx-'),
        body('cai')
            .notEmpty().withMessage('El CAI es requerido')
            .isLength({ min: 14, max: 37 }).withMessage('El CAI debe tener máximo 37 caracteres'),
        body('rango_inicio')
            .isInt({ min: 1 }).withMessage('El rango inicial debe ser un número positivo'),
        body('rango_fin')
            .isInt({ min: 1 }).withMessage('El rango final debe ser un número positivo')
            .custom((value, { req }) => {
                if (parseInt(value) <= parseInt(req.body.rango_inicio)) {
                    throw new Error('El rango final debe ser mayor al rango inicial');
                }
                return true;
            }),
        body('fecha_autorizacion')
            .isISO8601().withMessage('Fecha de autorización inválida')
            .toDate(),
        body('fecha_vencimiento')
            .isISO8601().withMessage('Fecha de vencimiento inválida')
            .toDate()
            .custom((value, { req }) => {
                const fechaAutorizacion = new Date(req.body.fecha_autorizacion);
                const fechaVencimiento = new Date(value);
                console.log('Fecha autorización:', fechaAutorizacion);
                console.log('Fecha vencimiento:', fechaVencimiento);
                console.log('Comparación:', fechaVencimiento <= fechaAutorizacion);
                if (fechaVencimiento <= fechaAutorizacion) {
                    throw new Error('La fecha de vencimiento debe ser posterior a la fecha de autorización');
                }
                return true;
            })
    ],
    validarErrores,
    authMiddleware, 
    apiLimiter,
    crearCorrelativo
);

// Actualizar un correlativo (solo administradores)
router.put("/:id",
    [
        param('id').isInt().withMessage('ID de correlativo inválido'),
        body('estado').optional().isIn(['ACTIVO', 'INACTIVO', 'AGOTADO', 'VENCIDO']),
        body('prefijo').optional().matches(/^[a-zA-Z0-9]{3}-[a-zA-Z0-9]{3}-[a-zA-Z0-9]{2}-$/).withMessage('El prefijo debe tener el formato xxx-xxx-xx-')
    ],
    validarErrores,
    authMiddleware, 
    apiLimiter,
    actualizarCorrelativo
);

// Eliminar un correlativo (solo administradores)
router.delete("/:id",
    [
        param('id').isInt().withMessage('ID de correlativo inválido')
    ],
    validarErrores,
    authMiddleware, 
    apiLimiter,
    eliminarCorrelativo
);

module.exports = router;
