const express = require("express");
const router = express.Router();
const { param, query, body, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');

const {
    obtenerRelacionesFactura,
    obtenerRelacionPorFactura,
    crearRelacionFactura,
    eliminarRelacionFactura
} = require("../controllers/facturaRelacionController");

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};

// Obtener todas las relaciones con paginación
router.get("/",
    [
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('offset').optional().isInt({ min: 0 }).toInt()
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    obtenerRelacionesFactura
);

// Obtener relación por ID de factura
router.get("/factura/:id_factura",
    [
        param('id_factura').isInt().withMessage('El ID de factura debe ser un número entero')
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    obtenerRelacionPorFactura
);

// Crear una nueva relación de factura
router.post("/",
    [
        body('id_factura').isInt().withMessage('ID de factura es requerido'),
        body().custom((value, { req }) => {
            const { id_pagovisita, id_cotizacion, id_membresia } = req.body;
            const count = [id_pagovisita, id_cotizacion, id_membresia]
                .filter(v => v !== null && v !== undefined).length;
            
            if (count !== 1) {
                throw new Error('Debe proporcionar exactamente un tipo de pago (visita, servicio o membresía)');
            }
            return true;
        })
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    crearRelacionFactura
);

// Eliminar una relación de factura
router.delete("/:id",
    [
        param('id').isInt().withMessage('El ID debe ser un número entero')
    ],
    validarErrores,
    authMiddleware,
    apiLimiter,
    eliminarRelacionFactura
);

module.exports = router;
