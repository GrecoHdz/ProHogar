const PagoVisita = require("../models/pagoVisitaModel");
const SolicitudServicio = require("../models/solicitudServicioModel");

//Obtener todos los pagos
const obtenerPagos = async (req, res) => {
    try {
        const pagos = await PagoVisita.findAll();
        res.json(pagos);
    } catch (error) {
        console.error(error);
        return null;
    }
}

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
      estado: 'pagado'
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
      message: 'Pago de visita confirmado correctamente.',
      detalles: {
        id_solicitud,
        nuevo_estado_pago: 'pagado',
        nuevo_estado_solicitud: 'pendiente_asignacion'
      }
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
      message: 'Pago de visita denegado correctamente.',
      detalles: {
        id_solicitud,
        nuevo_estado_pago: 'rechazado',
        nuevo_estado_solicitud: 'pendiente_pagovisita'
      }
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
