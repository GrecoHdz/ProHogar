const express = require("express");
const router = express.Router();
const { body, param, validationResult } = require("express-validator");
const { authMiddleware } = require("../middleware/authMiddleware");
const { apiLimiter } = require('../middleware/rateLimiters');
const {
    obtenerPaquetesUsuario,
    obtenerPaquetesUtilizados,
    obtenerPaquetesPorEstado,
    canjearPaquete,
    marcarComoUtilizado,
    rechazarPagoPaquete,
    aprobarPagoPaquete,
    activarPaquete,
    obtenerPagosPaquetes
} = require('../controllers/PaquetesUsuariosController');

// Middleware de Limitador
router.use(apiLimiter);

// Ruta para obtener pagos de paquetes (para reportes)
router.get('/pagos',
    authMiddleware,
    obtenerPagosPaquetes
);

// Middleware para validar errores
const validarErrores = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    }
    next();
};
// Ruta para obtener por estado
router.get('/estado',
    validarErrores,
    authMiddleware,
    obtenerPaquetesPorEstado
);

// Ruta para obtener paquetes Utilizdos 
router.get('/utilizados',
    validarErrores,
    authMiddleware,
    obtenerPaquetesUtilizados
);

// Ruta para canjear un paquete
router.post('/canjear',
    [
        body('id_paquete').isInt().withMessage('El ID del paquete debe ser un número entero'),
        body('id_usuario').isInt().withMessage('El ID del usuario debe ser un número entero')
    ],
    validarErrores,
    authMiddleware,
    canjearPaquete
);

// Ruta para marcar un paquete como utilizado
router.put('/utilizado/:id_paquete_usuario',
    param('id_paquete_usuario').isInt().withMessage('El ID del paquete de usuario debe ser un número entero'),
    validarErrores,
    authMiddleware,
    marcarComoUtilizado
);

// Ruta para rechazar pago
router.put('/pagos/:id/reject',
    param('id').isInt().withMessage('El ID del pago debe ser un número entero'),
    validarErrores,
    authMiddleware,
    rechazarPagoPaquete
);

// Ruta para aprobar pago
router.put('/pagos/:id/approve',
    param('id').isInt().withMessage('El ID del pago debe ser un número entero'),
    validarErrores,
    authMiddleware,
    aprobarPagoPaquete
);

// Ruta para activar paquete (cambiar de 'activo' a 'utilizando')
router.put('/:id/activar',
    param('id').isInt().withMessage('El ID del paquete debe ser un número entero'),
    validarErrores,
    authMiddleware,
    activarPaquete
);

// Ruta para obtener los paquetes de un usuario
router.get('/:id_usuario',
    validarErrores,
    authMiddleware,
    obtenerPaquetesUsuario
);

module.exports = router;