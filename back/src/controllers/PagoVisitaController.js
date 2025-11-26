const { Sequelize, Op } = require("sequelize");
const PagoVisita = require("../models/pagoVisitaModel");
const SolicitudServicio = require("../models/solicitudServicioModel");
const Usuario = require("../models/usuariosModel");
const Cuenta = require("../models/cuentasModel");
const Servicio = require("../models/serviciosModel");
const Ciudad = require("../models/ciudadesModel");

// Obtener todos los pagos con información relacionada
const obtenerPagos = async (req, res) => {
    try {
        // Obtener parámetros de paginación
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 10); // Máximo 10 por rendimiento
        const offset = parseInt(req.query.offset) || 0;
        const month = req.query.month; // Formato esperado: 'YYYY-MM'

        // Construcción de condiciones
        const whereCondition = {};
        const whereClauses = [];
        
        // Filtro por mes (año y mes)
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            whereClauses.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('PagoVisita.fecha')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('PagoVisita.fecha')), monthNum)
            );
        }
        
        // Filtro por estado
        if (req.query.estado) {
            whereClauses.push({ estado: req.query.estado });
        }
        
        // Combinar condiciones con AND
        if (whereClauses.length > 0) {
            whereCondition[Op.and] = whereClauses;
        }

        // Obtener el conteo total
        const total = await PagoVisita.count({ where: whereCondition });

        // Obtener estadísticas mensuales
        const [pagos, stats] = await Promise.all([
            // Consulta de pagos paginados
            PagoVisita.findAll({
                where: whereCondition,
                include: [
                    {
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['id_usuario', 'nombre', 'telefono', 'email']
                    },
                    {
                        model: SolicitudServicio,
                        as: 'solicitud',
                        include: [
                            {
                                model: Servicio,
                                as: 'servicio',
                                attributes: ['id_servicio', 'nombre']
                            },
                            {
                                model: Usuario,
                                as: 'tecnico',
                                attributes: ['id_usuario', 'nombre']
                            },
                            {
                                model: Ciudad,
                                as: 'ciudad',
                                attributes: ['id_ciudad', 'nombre_ciudad']
                            }
                        ],
                        attributes: [
                            'id_solicitud',
                            'fecha_solicitud',
                            'descripcion',
                            'direccion_precisa',
                            'colonia',
                            'estado'
                        ]
                    },
                    {
                        model: Cuenta,
                        as: 'cuenta',
                        attributes: ['id_cuenta', 'banco', 'beneficiario', 'num_cuenta', 'tipo']
                    }
                ],
                order: [['fecha', 'DESC']],
                limit,
                offset,
                raw: true,
                nest: true
            }),
            
            // Consulta de estadísticas
            PagoVisita.findAll({
                attributes: [
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'aprobado' THEN 1 END)"), 'aprobados'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'rechazado' THEN 1 END)"), 'rechazados'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'pendiente' THEN 1 END)"), 'pendientes'],
                    [Sequelize.literal("SUM(CASE WHEN estado = 'aprobado' THEN monto ELSE 0 END)"), 'total']
                ],
                where: whereCondition,
                raw: true
            })
        ]);
        
        // Procesar estadísticas
        const statsData = stats[0] || { aprobados: 0, rechazados: 0, pendientes: 0, total: 0 };
        const monthlyStats = {
            aprobados: statsData.aprobados || 0,
            rechazados: statsData.rechazados || 0,
            pendientes: statsData.pendientes || 0,
            total: statsData.total || 0
        };

        // Formatear respuesta
        const pagosFormateados = pagos.map(({ 
            id_usuario, 
            id_solicitud, 
            id_cuenta, 
            usuario, 
            solicitud, 
            cuenta, 
            ...pago 
        }) => ({
            ...pago,
            cliente: usuario ? {
                id_usuario: usuario.id_usuario,
                nombre: usuario.nombre,
                telefono: usuario.telefono,
                email: usuario.email
            } : null,
            solicitud: solicitud ? {
                id_solicitud: solicitud.id_solicitud,
                fecha_solicitud: solicitud.fecha_solicitud,
                descripcion: solicitud.descripcion,
                direccion_precisa: solicitud.direccion_precisa,
                colonia: solicitud.colonia,
                estado: solicitud.estado,
                servicio: solicitud.servicio ? {
                    id_servicio: solicitud.servicio.id_servicio,
                    nombre: solicitud.servicio.nombre
                } : null,
                tecnico: solicitud.tecnico ? {
                    id_tecnico: solicitud.tecnico.id_usuario,
                    nombre: solicitud.tecnico.nombre
                } : null,
                ciudad: solicitud.ciudad ? {
                    id_ciudad: solicitud.ciudad.id_ciudad,
                    nombre: solicitud.ciudad.nombre
                } : null
            } : null,
            cuenta: cuenta ? {
                id_cuenta: cuenta.id_cuenta,
                banco: cuenta.banco,
                beneficiario: cuenta.beneficiario,
                num_cuenta: cuenta.num_cuenta,
                tipo: cuenta.tipo
            } : null
        }));
        
        // Enviar respuesta
        res.json({
            success: true,
            data: pagosFormateados,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            estadisticas: monthlyStats
        });
    } catch (error) {
        console.error("Error al obtener pagos de visita:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener pagos de visita",
            details: error.message 
        });
    }
};

//Obtener un pago por id
const obtenerPagoPorId = async (req, res) => {
    try {
        const pago = await PagoVisita.findByPk(id);
        res.json(pago);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Obtener pagos por usuario
const obtenerPagosPorUsuario = async (req, res) => {
    try {
        const pagos = await PagoVisita.findAll({ where: { id_usuario: req.params.id } });
        res.json(pagos);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Obtener ultimo pago de solicitud espefica
const obtenerUltimoPagoPorSolicitud = async (req, res) => {
    try {
        const pago = await PagoVisita.findOne({
            where: { id_solicitud: req.params.id_solicitud },
            order: [['id_pagovisita','DESC']],
            attributes: ['estado']  
        });

        if (!pago) {
            return res.json({
              status: "not_found",
              data: { estado: "pendiente" }
            });
          } 

        return res.json({
            status: "success",
            data: { estado: pago.estado }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            status: "error",
            message: "Error al obtener el estado del último pago"
        });
    }
}; 

//Crear un pago
const crearPago = async (req, res) => {
    const t = await PagoVisita.sequelize.transaction();
    
    try {
        const { id_solicitud } = req.body;

        // Verificar si ya existe un pago para esta solicitud
        const pagoExistente = await PagoVisita.findOne({
            where: { id_solicitud },
            transaction: t
        });

        // Si existe un pago previo, eliminarlo
        if (pagoExistente) {
            console.log(`♻️ [DEBUG] Eliminando pago existente para la solicitud ${id_solicitud}:`, pagoExistente.id_pagovisita);
            await pagoExistente.destroy({ transaction: t });
        }

        // Crear el nuevo pago
        const newPago = await PagoVisita.create(req.body, { transaction: t });
        
        // Confirmar la transacción
        await t.commit();
        
        res.status(201).json({
            success: true,
            message: pagoExistente 
                ? 'Pago actualizado correctamente (reemplazado el anterior)' 
                : 'Pago creado correctamente',
            data: newPago,
            pago_anterior_eliminado: !!pagoExistente
        });

    } catch (error) {
        // Hacer rollback en caso de error
        await t.rollback();
        console.error('[ERROR] Error al crear/actualizar pago:', error);
        
        res.status(500).json({
            success: false,
            message: 'Error al procesar el pago',
            error: error.message
        });
    }
}

//Actualizar un pago
const actualizarPago = async (req, res) => {
    try {
        const updatedPago = await PagoVisita.update(req.body, { where: { id_pagovisita: req.params.id } });
        res.json(updatedPago);
    } catch (error) {
        console.error(error);
        return null;
    }
}

//Eliminar un pago
const eliminarPago = async (req, res) => {
    try {
        const pago = await PagoVisita.destroy({ where: { id_pagovisita: req.params.id } });
        res.json(pago);
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Confirma un pago de visita y actualiza el estado de la solicitud 
const confirmarPagoVisita = async (req, res) => {
  const t = await PagoVisita.sequelize.transaction();

  try {
    const { id_solicitud } = req.body;

    console.log('🛰️ [DEBUG] Datos recibidos en /pagovisita/confirmar:', req.body);

    // 1️⃣ Buscar el pago de visita por id_solicitud
    const pagoVisita = await PagoVisita.findOne({ 
      where: { id_solicitud },
      transaction: t 
    });
    
    if (!pagoVisita) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No se encontró un pago de visita para la solicitud especificada'
      });
    }

    // 2️⃣ Actualizar estados
    await pagoVisita.update({ 
      estado: 'aprobado'
    }, { transaction: t });
    
    await SolicitudServicio.update(
      { 
        estado: 'pendiente_asignacion'
      },
      { 
        where: { id_solicitud },
        transaction: t 
      }
    );

    console.log(`✅ [DEBUG] Pago de visita para la solicitud ${id_solicitud} confirmado y actualizado a 'pendiente_asignacion'.`);

    // ✅ Confirmar transacción
    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Pago de visita confirmado correctamente.'
    });
  } catch (error) {
    await t.rollback();
    console.error('[ERROR] Error al confirmar pago de visita:', error);

    return res.status(500).json({
      success: false,
      message: 'Error al confirmar el pago de visita. Se revertieron los cambios.',
      error: error.message
    });
  }
};

// Denegar un pago de visita y actualiza el estado de la solicitud 
const denegarPagoVisita = async (req, res) => {
  const t = await PagoVisita.sequelize.transaction();

  try {
    const { id_solicitud } = req.body;

    console.log('🛰️ [DEBUG] Datos recibidos en /pagovisita/denegar:', req.body);

    // 1️⃣ Buscar el pago de visita por id_solicitud
    const pagoVisita = await PagoVisita.findOne({ 
      where: { id_solicitud },
      transaction: t 
    });
    
    if (!pagoVisita) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: 'No se encontró un pago de visita para la solicitud especificada'
      });
    }

    // 2️⃣ Actualizar estados
    await pagoVisita.update({ 
      estado: 'rechazado'
    }, { transaction: t });
    
    await SolicitudServicio.update(
      { 
        estado: 'pendiente_pagovisita'
      }, 
      { 
        where: { id_solicitud },
        transaction: t 
      }
    );

    console.log(`✅ [DEBUG] Pago de visita para la solicitud ${id_solicitud} denegado y actualizado a 'pendiente_pagovisita'.`);

    // ✅ Confirmar transacción
    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Pago de visita denegado correctamente.'
    });
  } catch (error) {
    await t.rollback();
    console.error('[ERROR] Error al denegar pago de visita:', error);

    return res.status(500).json({
      success: false,
      message: 'Error al denegar el pago de visita. Se revertieron los cambios.',
      error: error.message
    });
  }
};


module.exports = {
    obtenerPagos,
    obtenerPagoPorId,
    obtenerUltimoPagoPorSolicitud,
    confirmarPagoVisita,
    denegarPagoVisita,
    obtenerPagosPorUsuario,
    crearPago,
    actualizarPago,
    eliminarPago
}
