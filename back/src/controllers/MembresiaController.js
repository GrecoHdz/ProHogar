const { Sequelize, Op } = require("sequelize");
const Membresia = require("../models/membresiaModel");
const MembresiaBeneficio = require("../models/membresiaBeneficiosModel");
const Config = require("../models/configModel");
const Usuario = require("../models/usuariosModel");
const Cuenta = require("../models/cuentasModel");

// Obtener todas las membresias con información de usuario y cuenta
const obtenerMembresias = async (req, res) => {
    try {
        // Obtener parámetros de paginación y búsqueda
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 1000); // Máximo 1000 para reportes
        const offset = parseInt(req.query.offset) || 0;
        const searchTerm = req.query.search || '';
        const estado = req.query.estado;
        const month = req.query.month; // Formato: 'YYYY-MM'

        // Construir condiciones de búsqueda
        const whereCondition = {};
        const andConditions = [];

        // Filtro por término de búsqueda
        if (searchTerm) {
            andConditions.push({
                [Op.or]: [
                    { '$usuario.nombre$': { [Op.like]: `%${searchTerm}%` } },
                    { '$usuario.telefono$': { [Op.like]: `%${searchTerm}%` } },
                    { num_transaccion: { [Op.like]: `%${searchTerm}%` } }
                ]
            });
        }

        // Filtro por estado
        if (estado) {
            whereCondition.estado = estado;
        }

        // Filtro por mes
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('Membresia.fecha')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('Membresia.fecha')), monthNum)
            );
        }

        // Combinar condiciones
        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        // Obtener total de registros
        const total = await Membresia.count({
            where: whereCondition,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: []
                }
            ]
        });

        // Obtener membresías con paginación
        const [membresias, stats] = await Promise.all([
            Membresia.findAll({
                where: whereCondition,
                attributes: { exclude: ['id_usuario', 'id_cuenta'] },
                include: [
                    {
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id_usuario', 'nombre', 'telefono']
                    },
                    {
                        model: Cuenta,
                        as: 'cuenta',
                        attributes: ['banco', 'beneficiario', 'num_cuenta', 'tipo']
                    },
                    {
                        model: require('../models/facturaRelacionModel'),
                        as: 'facturaRelacion',
                        include: [
                            {
                                model: require('../models/facturaModel'),
                                as: 'factura',
                                attributes: ['id_factura', 'numero_factura_correlativo', 'estado']
                            }
                        ]
                    }
                ],
                order: [['fecha', 'DESC']],
                limit,
                offset,
                raw: true,
                nest: true
            }),

            // Consulta de estadísticas
            Membresia.findAll({
                attributes: [
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'activa' OR estado = 'vencida' THEN 1 END)"), 'activas'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'pendiente' THEN 1 END)"), 'pendientes'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'rechazada' THEN 1 END)"), 'rechazadas'],
                    [Sequelize.literal("SUM(CASE WHEN estado IN ('activa', 'vencida') THEN monto ELSE 0 END)"), 'total']
                ],
                where: whereCondition,
                raw: true
            })
        ]);

        // Procesar estadísticas
        const statsData = stats[0] || { activas: 0, pendientes: 0, rechazadas: 0, total: 0 };
        const estadisticas = {
            aprobados: (parseInt(statsData.activas) || 0) + (parseInt(statsData.vencidas) || 0),
            rechazados: parseInt(statsData.rechazadas) || 0,
            pendientes: parseInt(statsData.pendientes) || 0,
            total: parseFloat(statsData.total) || 0
        };

        res.json({
            success: true,
            data: membresias,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            estadisticas
        });
    } catch (error) {
        console.error("Error al obtener membresías:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener membresías",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener membresía por ID
const obtenerMembresiaPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const whereCondition = {
            id_membresia: id
        };

        // Total (para que el frontend no falle)
        const total = await Membresia.count({ where: whereCondition });

        if (total === 0) {
            return res.json({
                success: false,
                data: [],
                total: 0,
                page: 1,
                totalPages: 0,
                hasMore: false,
                estadisticas: {
                    aprobados: 0,
                    rechazados: 0,
                    pendientes: 0,
                    total: 0
                }
            });
        }

        const [membresias, stats] = await Promise.all([
            Membresia.findAll({
                where: whereCondition,
                attributes: { exclude: ['id_usuario', 'id_cuenta'] },
                include: [
                    {
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id_usuario', 'nombre', 'telefono']
                    },
                    {
                        model: Cuenta,
                        as: 'cuenta',
                        attributes: ['banco', 'beneficiario', 'num_cuenta', 'tipo']
                    },
                    {
                        model: require('../models/facturaRelacionModel'),
                        as: 'facturaRelacion',
                        include: [
                            {
                                model: require('../models/facturaModel'),
                                as: 'factura',
                                attributes: ['id_factura', 'numero_factura_correlativo', 'estado']
                            }
                        ]
                    }
                ],
                order: [['fecha', 'DESC']],
                raw: true,
                nest: true
            }),

            // Estadísticas (misma lógica)
            Membresia.findAll({
                attributes: [
                    [Sequelize.literal("COUNT(CASE WHEN estado IN ('activa','vencida') THEN 1 END)"), 'activas'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'pendiente' THEN 1 END)"), 'pendientes'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'rechazada' THEN 1 END)"), 'rechazadas'],
                    [Sequelize.literal("SUM(CASE WHEN estado IN ('activa','vencida') THEN monto ELSE 0 END)"), 'total']
                ],
                where: whereCondition,
                raw: true
            })
        ]);

        const statsData = stats[0] || {};
        const estadisticas = {
            aprobados: parseInt(statsData.activas) || 0,
            rechazados: parseInt(statsData.rechazadas) || 0,
            pendientes: parseInt(statsData.pendientes) || 0,
            total: parseFloat(statsData.total) || 0
        };

        return res.json({
            success: true,
            data: membresias,
            total: 1,
            page: 1,
            totalPages: 1,
            hasMore: false,
            estadisticas
        });

    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Error al obtener la membresía',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener historial completo de membresías de un usuario
const obtenerHistorialMembresias = async (req, res) => {
    try {
        const membresias = await Membresia.findAll({
            where: { id_usuario: req.params.id },
            order: [['fecha', 'DESC']], // Ordenar por fecha descendente
            raw: true
        });

        if (!membresias || membresias.length === 0) {
            return res.status(404).json({
                status: 'not_found',
                message: 'No se encontraron membresías para este usuario'
            });
        }

        res.json({
            status: 'success',
            data: membresias,
            count: membresias.length
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener el historial de membresías',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener la membresía activa más reciente de un usuario
const obtenerMembresiaActual = async (req, res) => {
    try {
        const { id } = req.params;

        const membresia = await Membresia.findOne({
            where: { id_usuario: id },
            order: [['fecha', 'DESC']],
            raw: true
        });

        if (!membresia) {
            return res.json({
                status: 'not_found',
                data: null,
                message: 'El usuario no tiene una membresía activa.'
            });
        }

        return res.json({
            status: 'success',
            data: membresia
        });
    } catch (error) {
        return res.status(500).json({
            status: 'error',
            message: 'Error al obtener la membresía actual',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener progreso de membresía por usuario
const obtenerProgresoMembresia = async (req, res) => {
    try {

        // Obtener configuración de membresía, descuentos, beneficios y días de gracia
        const [configs, beneficios, configMembresia, configGracia] = await Promise.all([
            Config.findAll({
                where: {
                    tipo_config: {
                        [Op.or]: ['porcentaje_descuento', 'porcentaje_descuento_especial']
                    }
                },
                raw: true
            }),
            MembresiaBeneficio.findAll({
                where: {
                    tipo_beneficio: {
                        [Op.or]: ['CashBack en todos los servicios', 'CashBack Especial en todos los Servicios']
                    }
                },
                raw: true
            }),
            Config.findOne({
                where: { tipo_config: 'membresia' },
                raw: true
            }),
            Config.findOne({
                where: { tipo_config: 'reset_credito' },
                raw: true
            })
        ]);

        if (!configMembresia) {
            return res.status(500).json({
                status: 'error',
                message: 'No se encontró la configuración de membresía'
            });
        }

        const valorMembresia = configMembresia.valor;
        const diasGracia = parseInt(configGracia?.valor || '5', 10);
        const diasPorMes = 30 + diasGracia;

        // Obtener membresías del usuario
        const membresias = await Membresia.findAll({
            where: {
                id_usuario: req.params.id_usuario,
                estado: ['activa', 'vencida']
            },
            order: [['fecha', 'ASC']],
            raw: true
        });

        if (!membresias || membresias.length === 0) {
            return res.json({
                status: 'success',
                mesesProgreso: 0,
                montoTotal: 0,
                valorMembresia,
                porcentaje_descuento: '0'
            });
        }

        // Procesar fechas de membresías
        const fechasMembresias = membresias
            .filter(m => m.estado === 'activa' || m.estado === 'vencida')
            .map(m => new Date(m.fecha))
            .sort((a, b) => a - b);

        // Calcular progreso basado en la fecha actual y período de gracia
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        // Ordenar fechas de más reciente a más antigua
        const fechasOrdenadas = fechasMembresias.sort((a, b) => b - a);

        // Calcular meses consecutivos verificando gaps entre pagos
        let mesesConsecutivos = 0;

        // Verificar si el pago más reciente está vigente (dentro del período de gracia desde hoy)
        const pagoMasReciente = fechasOrdenadas[0];
        const diffDesdeHoy = Math.floor((hoy - pagoMasReciente) / (1000 * 60 * 60 * 24));

        if (diffDesdeHoy > diasPorMes) {
            return res.json({
                status: 'success',
                mesesProgreso: 0,
                montoTotal: 0,
                valorMembresia,
                porcentaje_descuento: '0'
            });
        }

        // El primer pago cuenta
        mesesConsecutivos = 1;

        // Verificar los pagos subsecuentes
        for (let i = 0; i < fechasOrdenadas.length - 1; i++) {
            const pagoActual = fechasOrdenadas[i];
            const pagoAnterior = fechasOrdenadas[i + 1];

            // Calcular diferencia en días entre este pago y el anterior
            const diffTiempo = pagoActual - pagoAnterior;
            const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

            // Si la diferencia es mayor o igual a diasPorMes días, hay un gap y se rompe la cadena
            if (diffDias >= diasPorMes) {
                break;
            }

            // Si está dentro del rango, cuenta como mes consecutivo
            mesesConsecutivos++;
        }

        if (mesesConsecutivos === 0) {
            return res.json({
                status: 'success',
                mesesProgreso: 0,
                montoTotal: 0,
                valorMembresia,
                porcentaje_descuento: '0'
            });
        }

        const montoTotal = valorMembresia * mesesConsecutivos;

        // Determinar el descuento aplicable basado en el progreso
        const configDescuentoEspecial = configs.find(c => c.tipo_config === 'porcentaje_descuento_especial');
        const configDescuentoRegular = configs.find(c => c.tipo_config === 'porcentaje_descuento');

        const beneficioEspecial = beneficios.find(b =>
            b.tipo_beneficio === 'CashBack Especial en todos los Servicios'
        );
        const beneficioRegular = beneficios.find(b =>
            b.tipo_beneficio === 'CashBack en todos los servicios'
        );

        const mesRequeridoEspecial = parseInt(beneficioEspecial?.mes_requerido || '0', 10);
        const mesRequeridoRegular = parseInt(beneficioRegular?.mes_requerido || '0', 10);

        // Determinar el descuento: prioridad al especial si ambos califican
        let porcentajeDescuento = '0';

        if (mesesConsecutivos >= mesRequeridoEspecial && mesRequeridoEspecial > 0) {
            porcentajeDescuento = configDescuentoEspecial?.valor || '0';
        } else if (mesesConsecutivos >= mesRequeridoRegular && mesRequeridoRegular > 0) {
            porcentajeDescuento = configDescuentoRegular?.valor || '0';
        }

        res.json({
            status: 'success',
            mesesProgreso: mesesConsecutivos,
            montoTotal,
            valorMembresia,
            porcentaje_descuento: porcentajeDescuento
        });

    } catch (error) {
        console.error("Error al obtener progreso de membresía:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener progreso de membresía',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crear membresia
const crearMembresia = async (req, res) => {
    try {
        const datosMembresia = {
            ...req.body,
            fecha: new Date(),  // Agregar la fecha actual
            estado: 'pendiente' // Establecer estado inicial como pendiente
        };

        const membresia = await Membresia.create(datosMembresia);
        res.json(membresia);
    } catch (error) {
        console.error("Error al crear membresía:", error);
        res.status(500).json({
            error: "Error al crear membresía",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualizar membresia
const actualizarMembresia = async (req, res) => {
    try {
        const [updated] = await Membresia.update(req.body, {
            where: {
                id_membresia: req.params.id
            }
        });

        if (updated) {
            const updatedMembresia = await Membresia.findByPk(req.params.id);
            return res.json({
                status: 'success',
                data: updatedMembresia
            });
        }

        throw new Error('No se pudo actualizar la membresía');
    } catch (error) {
        console.error("Error al actualizar membresia:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar membresía',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Eliminar membresia
const eliminarMembresia = async (req, res) => {
    try {
        const membresia = await Membresia.destroy({ where: { id: req.params.id } });
        res.json(membresia);
    } catch (error) {
        console.error("Error al eliminar membresía:", error);
        res.status(500).json({
            error: "Error al eliminar membresía",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerMembresias,
    obtenerMembresiaPorId,
    obtenerHistorialMembresias,
    obtenerMembresiaActual,
    crearMembresia,
    actualizarMembresia,
    eliminarMembresia,
    obtenerProgresoMembresia
};
