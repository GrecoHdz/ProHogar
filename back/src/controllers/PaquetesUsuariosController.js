const { sequelize } = require("../config/database");
const Paquete = require("../models/paquetesModel");
const PaqueteUsuario = require("../models/paquetesUsuariosModel");
const PagoPaquete = require("../models/pagoPaqueteModel");
const Usuario = require("../models/usuariosModel");
const Cuenta = require('../models/cuentasModel');
const Config = require("../models/configModel");
const FacturaRelacion = require("../models/facturaRelacionModel");
const Factura = require("../models/facturaModel");
const { Op, Sequelize } = require("sequelize");

// Obtener todos los paquetes de un usuario
const obtenerPaquetesUsuario = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const paquetes = await PaqueteUsuario.findAll({
            where: { id_usuario },
            include: [{
                model: Paquete,
                attributes: ['nombre', 'descripcion', 'costo']
            }],
            order: [['fecha_actualizacion', 'DESC']]
        });

        // Si no hay paquetes
        if (paquetes.length === 0) {
            return res.json({
                success: false,
                data: []
            });
        }

        // Si hay paquetes
        res.json({
            success: true,
            data: paquetes
        });

    } catch (error) {
        console.error('Error al obtener paquetes del usuario:', error);
        res.status(500).json({
            success: false,
            data: [],
            error: "Error al obtener los paquetes del usuario",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener paquetes por estado (tabs del frontend)
const obtenerPaquetesPorEstado = async (req, res) => {
    try {
        let estado = req.query.estado;
        if (estado && estado.includes(',')) {
            estado = estado.split(',');
        }
        let limit = parseInt(req.query.limit) || 4;
        limit = Math.min(limit, 4); // fijo a 4
        const offset = parseInt(req.query.offset) || 0;

        if (!estado) {
            return res.status(400).json({
                success: false,
                message: 'El estado es requerido'
            });
        }

        /* ===============================
           CONTADORES DE PESTAÑAS
        ================================ */
        const search = req.query.search;
        const searchWhere = search ? { id_paquete_usuario: search } : {};

        const [
            totalUtilizando,
            totalVerificandoPago,
            totalHistorial
        ] = await Promise.all([
            PaqueteUsuario.count({ where: { ...searchWhere, estado: 'utilizando' } }),
            PaqueteUsuario.count({ where: { ...searchWhere, estado: 'verificando_pago' } }),
            PaqueteUsuario.count({
                where: { ...searchWhere, estado: ['activo', 'utilizado'] }
            })
        ]);

        /* ===============================
           INCLUDES BASE
        ================================ */
        const include = [
            {
                model: Paquete,
                attributes: ['id_paquete', 'nombre', 'descripcion', 'costo']
            },
            {
                model: Usuario,
                attributes: ['id_usuario', 'nombre', 'telefono', 'email']
            }
        ];

        // Pagos solo cuando aplica
        const estadoArray = Array.isArray(estado) ? estado : [estado];
        const shouldIncludePagos = estadoArray.some(e => ['verificando_pago', 'utilizado', 'activo'].includes(e));

        if (shouldIncludePagos) {
            include.push({
                model: PagoPaquete,
                as: 'pagos',
                required: false, // utilizado puede no tener pago (membresía)
                attributes: [
                    'id_pago_paquete',
                    'monto',
                    'num_comprobante',
                    'fecha',
                    'estado',
                    'id_cuenta'
                ],
                include: [{
                    model: Cuenta,
                    as: 'cuenta',
                    attributes: ['banco', 'num_cuenta', 'beneficiario', 'tipo']
                }]
            });
        }

        /* ===============================
           TOTAL POR ESTADO
        ================================ */
        const where = { ...searchWhere, estado };

        const total = await PaqueteUsuario.count({ where });

        /* ===============================
           DATA PAGINADA
        ================================ */
        const paquetes = await PaqueteUsuario.findAll({
            where,
            include,
            limit,
            offset,
            order: [['fecha_actualizacion', 'DESC']]
        });

        const data = paquetes.map(p => {
            const plain = p.get({ plain: true });

            // Sin pagos → membresía
            if (!plain.pagos || plain.pagos.length === 0) {
                return {
                    ...plain,
                    fecha_solicitud: plain.fecha_actualizacion,
                    origen_compra: 'membresia',
                    pagos: []
                };
            }

            return {
                ...plain,
                fecha_solicitud: plain.fecha_actualizacion,
                origen_compra: 'pago_directo',
                pagos: plain.pagos.map(pago => ({
                    ...pago,
                    cuenta: pago.cuenta
                        ? {
                            tipo: pago.cuenta.tipo,
                            beneficiario: pago.cuenta.beneficiario,
                            banco: pago.cuenta.banco,
                            numero: pago.cuenta.num_cuenta
                        }
                        : null
                }))
            };
        });

        /* ===============================
           RESPUESTA FINAL
        ================================ */
        res.json({
            success: true,
            data,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            contadores: {
                en_uso: totalUtilizando,
                pendiente_verificacion: totalVerificandoPago,
                historial: totalHistorial
            }
        });

    } catch (error) {
        console.error('Error al obtener paquetes por estado:', error);
        res.status(500).json({
            success: false,
            data: [],
            total: 0,
            page: 1,
            totalPages: 0,
            hasMore: false,
            contadores: {
                en_uso: 0,
                pendiente_verificacion: 0,
                historial: 0
            },
            error: 'Error al obtener paquetes',
            details: process.env.NODE_ENV === 'development'
                ? error.message
                : undefined
        });
    }
};

// Canjear un paquete
const canjearPaquete = async (req, res) => {
    // Iniciar transacción
    const t = await sequelize.transaction();

    try {
        const { id_usuario, id_paquete, esPagoTransferencia = false, id_cuenta, numero_comprobante } = req.body;

        if (!id_paquete) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: "El ID del paquete es requerido"
            });
        }

        // Verificar si el paquete existe
        const paquete = await Paquete.findByPk(id_paquete, { transaction: t });
        if (!paquete) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                error: "El paquete no existe"
            });
        }

        // Verificar si el usuario ya tiene el paquete activo, en uso o en proceso de verificación
        const paqueteActivo = await PaqueteUsuario.findOne({
            where: {
                id_usuario,
                id_paquete,
                estado: ['activo', 'verificando_pago', 'utilizando']
            },
            transaction: t
        });

        if (paqueteActivo) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: "Ya tienes este paquete activo, en uso o en proceso de verificación"
            });
        }

        // Si es pago con saldo, verificar crédito
        if (!esPagoTransferencia) {
            const usuario = await Usuario.findByPk(id_usuario, { transaction: t });
            if (usuario.credito < paquete.costo) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    error: "No tienes suficiente crédito para canjear este paquete"
                });
            }

            // Descontar el crédito del usuario
            usuario.credito = parseFloat(usuario.credito) - parseFloat(paquete.costo);
            await usuario.save({ transaction: t });
        } else if (!id_cuenta || !numero_comprobante) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: "Se requiere el número de cuenta y comprobante para pagos por transferencia"
            });
        }

        // Buscar si ya existe un registro (que debe estar en 'utilizado' o 'rechazado' dado el check anterior)
        let paqueteUsuario = await PaqueteUsuario.findOne({
            where: { id_usuario, id_paquete },
            transaction: t
        });

        if (paqueteUsuario) {
            // Si ya existe, lo actualizamos (resetear estado y fecha)
            paqueteUsuario.estado = esPagoTransferencia ? 'verificando_pago' : 'activo';
            paqueteUsuario.fecha_actualizacion = new Date();
            await paqueteUsuario.save({ transaction: t });
        } else {
            // Si no existe, lo creamos
            paqueteUsuario = await PaqueteUsuario.create({
                id_usuario,
                id_paquete,
                estado: esPagoTransferencia ? 'verificando_pago' : 'activo',
                fecha_actualizacion: new Date()
            }, { transaction: t });
        }

        // Si es pago por transferencia, registrar en la tabla de pagos
        if (esPagoTransferencia) {
            await PagoPaquete.create({
                id_usuario,
                id_paquete_usuario: paqueteUsuario.id_paquete_usuario,
                monto: paquete.costo,
                num_comprobante: numero_comprobante,
                id_cuenta: id_cuenta,
                estado: 'pendiente',
                fecha: new Date()
            }, { transaction: t });
        }

        await t.commit();
        return res.status(201).json({
            success: true,
            message: esPagoTransferencia
                ? 'Solicitud de pago por transferencia registrada. Por favor espera la verificación.'
                : 'Paquete canjeado exitosamente',
            data: {
                paquete: paqueteUsuario,
                nuevoSaldo: esPagoTransferencia ? undefined : (await Usuario.findByPk(id_usuario)).credito,
                requiereVerificacion: esPagoTransferencia
            }
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al canjear paquete:', error);
        return res.status(500).json({
            success: false,
            error: "Error al canjear el paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Marcar un paquete como utilizado
const marcarComoUtilizado = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id_paquete_usuario } = req.params;

        const [updated] = await PaqueteUsuario.update(
            { estado: 'utilizado' },
            {
                where: {
                    id_paquete_usuario
                },
                transaction: t
            }
        );

        if (!updated) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                error: "Paquete no encontrado o ya utilizado"
            });
        }

        await t.commit();
        res.json({
            success: true,
            message: 'Paquete marcado como utilizado exitosamente'
        });
    } catch (error) {
        await t.rollback();
        console.error('Error al actualizar estado del paquete:', error);
        res.status(500).json({
            success: false,
            error: "Error al actualizar el estado del paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los paquetes con estado 'utilizado' incluyendo nombre de usuario y paquete
const obtenerPaquetesUtilizados = async (req, res) => {
    try {
        const paquetesUtilizados = await PaqueteUsuario.findAll({
            where: {
                estado: 'utilizado'
            },
            include: [
                {
                    model: Usuario,
                    attributes: ['nombre']
                },
                {
                    model: Paquete,
                    attributes: ['nombre']
                }
            ]
        });

        return res.status(200).json({
            success: true,
            data: paquetesUtilizados,
            total: paquetesUtilizados.length
        });
    } catch (error) {
        console.error('Error al obtener paquetes utilizados:', error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener paquetes utilizados',
            error: error.message
        });
    }
};

// Rechazar el pago de un paquete
const rechazarPagoPaquete = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // ID del PagoPaquete

        const pago = await PagoPaquete.findByPk(id, { transaction: t });

        if (!pago) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                error: "Pago de paquete no encontrado"
            });
        }

        if (pago.estado !== 'pendiente') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: `No se puede rechazar el pago porque está en estado ${pago.estado}`
            });
        }

        // Actualizar estado del pago a rechazado
        pago.estado = 'rechazado';
        await pago.save({ transaction: t });

        // Buscar el paquete de usuario asociado
        const paqueteUsuario = await PaqueteUsuario.findByPk(pago.id_paquete_usuario, { transaction: t });

        if (paqueteUsuario) {
            // Actualizar estado del paquete a rechazado
            paqueteUsuario.estado = 'rechazado';
            await paqueteUsuario.save({ transaction: t });
        } else {
            console.warn(`Inconsistencia: Pago ${id} existe pero PaqueteUsuario ${pago.id_paquete_usuario} no.`);
        }

        await t.commit();

        return res.json({
            success: true,
            message: 'Pago rechazado correctamente'
        });

    } catch (error) {
        await t.rollback();
        console.error('Error al rechazar pago de paquete:', error);
        return res.status(500).json({
            success: false,
            error: "Error al rechazar el pago",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Aprobar el pago de un paquete
const aprobarPagoPaquete = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // ID del PagoPaquete

        const pago = await PagoPaquete.findByPk(id, { transaction: t });

        if (!pago) {
            await t.rollback();
            return res.status(404).json({
                success: false,
                error: "Pago de paquete no encontrado"
            });
        }

        if (pago.estado !== 'pendiente') {
            await t.rollback();
            return res.status(400).json({
                success: false,
                error: `No se puede aprobar el pago porque está en estado ${pago.estado}`
            });
        }

        // Actualizar estado del pago a aprobado
        pago.estado = 'aprobado';
        await pago.save({ transaction: t });

        // Buscar el paquete de usuario asociado
        const paqueteUsuario = await PaqueteUsuario.findByPk(pago.id_paquete_usuario, { transaction: t });

        if (paqueteUsuario) {
            // Actualizar estado del paquete a activo
            paqueteUsuario.estado = 'activo';
            await paqueteUsuario.save({ transaction: t });
        } else {
            console.warn(`Inconsistencia: Pago ${id} existe pero PaqueteUsuario ${pago.id_paquete_usuario} no.`);
        }

        await t.commit();

        return res.json({
            success: true,
            message: 'Pago aprobado correctamente'
        });

    } catch (error) {
        await t.rollback();
        console.error('Error al aprobar pago de paquete:', error);
        return res.status(500).json({
            success: false,
            error: "Error al aprobar el pago",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Activar paquete (cambiar de 'activo' a 'utilizando')
const activarPaquete = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscar el paquete del usuario
        const paqueteUsuario = await PaqueteUsuario.findByPk(id);

        if (!paqueteUsuario) {
            return res.status(404).json({
                success: false,
                message: 'Paquete no encontrado'
            });
        }

        // Verificar que el paquete esté en estado 'activo'
        if (paqueteUsuario.estado !== 'activo') {
            return res.status(400).json({
                success: false,
                message: `El paquete no puede ser activado. Estado actual: ${paqueteUsuario.estado}`
            });
        }

        // Cambiar estado a 'utilizando'
        paqueteUsuario.estado = 'utilizando';
        paqueteUsuario.fecha_actualizacion = new Date();
        await paqueteUsuario.save();

        return res.json({
            success: true,
            message: 'Paquete activado correctamente',
            data: paqueteUsuario
        });

    } catch (error) {
        console.error('Error al activar paquete:', error);
        return res.status(500).json({
            success: false,
            error: "Error al activar el paquete",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los pagos de paquetes (para reportes)
const obtenerPagosPaquetes = async (req, res) => {
    try {
        const { month, estado } = req.query;
        const whereCondition = {};

        if (estado) {
            whereCondition.estado = estado;
        } else {
            whereCondition.estado = 'aprobado';
        }

        const andConditions = [];
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('PagoPaquete.fecha')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('PagoPaquete.fecha')), monthNum)
            );
        }

        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        // Obtener el porcentaje de comisión
        const configComision = await Config.findOne({
            where: { tipo_config: 'comision_por_paquete' }
        });
        const porcentajeComision = configComision ? parseFloat(configComision.valor) : 10;

        const pagos = await PagoPaquete.findAll({
            where: whereCondition,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: ['nombre', 'telefono']
                },
                {
                    model: PaqueteUsuario,
                    as: 'paqueteUsuario',
                    include: [{
                        model: Paquete,
                        attributes: ['nombre']
                    }]
                },
                {
                    model: Cuenta,
                    as: 'cuenta',
                    attributes: ['banco', 'num_cuenta']
                },
                {
                    model: FacturaRelacion,
                    as: 'facturaRelacion',
                    include: [{
                        model: Factura,
                        as: 'factura',
                        attributes: ['numero_factura_correlativo', 'estado']
                    }]
                }
            ],
            order: [['fecha', 'DESC']]
        });

        // Calcular la comisión para cada pago
        const pagosProcesados = pagos.map(p => {
            const plain = p.get({ plain: true });
            const comisionCalculada = (parseFloat(plain.monto) * porcentajeComision) / 100;
            return {
                ...plain,
                monto_comision: comisionCalculada,
                porcentaje_aplicado: porcentajeComision
            };
        });

        const totalComisiones = pagosProcesados.reduce((sum, p) => sum + p.monto_comision, 0);

        res.json({
            success: true,
            data: pagosProcesados,
            estadisticas: {
                total: totalComisiones,
                count: pagosProcesados.length,
                porcentaje_config: porcentajeComision
            }
        });
    } catch (error) {
        console.error('Error al obtener pagos de paquetes:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener pagos de paquetes',
            error: error.message
        });
    }
};

module.exports = {
    obtenerPaquetesUsuario,
    obtenerPaquetesPorEstado,
    canjearPaquete,
    marcarComoUtilizado,
    obtenerPaquetesUtilizados,
    rechazarPagoPaquete,
    aprobarPagoPaquete,
    activarPaquete,
    obtenerPagosPaquetes
};
