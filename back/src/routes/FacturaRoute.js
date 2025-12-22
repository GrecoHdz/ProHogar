const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');

const {
    obtenerFacturas,
    obtenerFacturaDetalle,
    crearFactura,
    anularFactura,
    obtenerEstadoCorrelativo
} = require("../controllers/facturaController");

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// Obtener todas las facturas con paginación
router.get("/",
    [
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('offset').optional().isInt({ min: 0 }).toInt(),
        query('search').optional().trim(),
        query('tipo').optional().isIn(['CONSUMIDOR_FINAL', 'CON_RTN']),
        query('estado').optional().isIn(['EMITIDA', 'ANULADA']),
        query('month').optional().matches(/^\d{4}-(0[1-9]|1[0-2])$/)
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    obtenerFacturas
);

// Obtener detalle de una factura específica
router.get("/:id",
    [
        param('id').isInt().withMessage('El ID debe ser un número entero')
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    obtenerFacturaDetalle
);

// Crear una nueva factura
router.post("/",
    [
        body('tipo_factura').isIn(['CONSUMIDOR_FINAL', 'CON_RTN']).withMessage('Tipo de factura inválido'),
        body('rtn_cliente').if(body('tipo_factura').equals('CON_RTN')).notEmpty().withMessage('RTN es requerido para factura CON_RTN'),
        body('nombre_cliente').if(body('tipo_factura').equals('CON_RTN')).notEmpty().withMessage('El nombre del cliente es requerido'),
        body('subtotal').isFloat({ min: 0 }).withMessage('Subtotal debe ser un número positivo'),
        body('isv').isFloat({ min: 0 }).withMessage('ISV debe ser un número positivo'),
        body('total').isFloat({ min: 0 }).withMessage('Total debe ser un número positivo'),
        body('id_pagovisita').optional().isInt(),
        body('id_cotizacion').optional().isInt(),
        body('id_membresia').optional().isInt()
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    crearFactura
);

// Anular una factura
router.put("/:id/anular",
    [
        param('id').isInt().withMessage('El ID debe ser un número entero')
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    anularFactura
);

// Obtener estado del correlativo actual
router.get("/estado-correlativo",
    authMiddleware,
    apiLimiter,
    obtenerEstadoCorrelativo
);

module.exports = router;
