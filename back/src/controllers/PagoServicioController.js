const Cotizacion = require("../models/cotizacionModel");   
const SolicitudServicio = require("../models/solicitudServicioModel");   
const Movimiento = require("../models/movimientosModel");   
const CreditoUsuario = require("../models/creditoUsuariosModel");
const Referido = require("../models/referidosModel");
const Config = require("../models/configModel");
const { Op } = require('sequelize');

const processPayment = async (req, res) => {
  const t = await Cotizacion.sequelize.transaction();

  try {
    const {
      id_cotizacion,
      id_solicitud,
      id_cuenta,
      num_comprobante,
      monto_manodeobra,
      descuento_membresia,
      id_usuario,
      monto_credito,
      id_referidor,
      nombre,
      comision_referido
    } = req.body; 

    console.log('🛰️ [DEBUG] Datos recibidos en /pagos/procesar:', req.body);

    // 1️⃣ Actualizar la cotización a "pagado"
    await Cotizacion.update(
      {
        id_cuenta,
        num_comprobante,
        estado: 'pagado', 
        descuento_membresia: descuento_membresia,
        credito_usado: monto_credito,
      },
      { where: { id_cotizacion }, transaction: t }
    );

    // 2️⃣ Actualizar solicitud a "verificando_pagoservicio"
    const solicitud = await SolicitudServicio.findByPk(id_solicitud, { transaction: t });
    if (!solicitud) throw new Error('Solicitud de servicio no encontrada');
    await solicitud.update({ estado: 'verificando_pagoservicio' }, { transaction: t });

    // 3️⃣ Buscar si el usuario tiene un referido
    const referido = await Referido.findOne({
      where: { id_referido_usuario: id_usuario },
      transaction: t
    });
    console.log('🛰️ [DEBUG] Referido encontrado:', referido);

    // 4️⃣ Procesar comisión por referido si existe
    if (referido && referido.id_referidor) {
      // Obtener el valor de la comisión de referido desde la configuración
      const configComision = await Config.findOne({
        where: { tipo_config: 'porcentaje_referido' },
        transaction: t
      });

      if (!configComision) {
        console.warn('⚠️ No se encontró la configuración de comisión de referido');
        return;
      }

      const pocentaje_comision = parseFloat(configComision.valor);
      const comision_referido = (pocentaje_comision * monto_manodeobra) / 100;
      console.log(`💸 [DEBUG] Procesando comisión de $${comision_referido} para referidor ${referido.id_referidor}`);

      // 3.1️⃣ Crear movimiento de comisión solo si hay monto de comisión
      if (comision_referido > 0) {
        await Movimiento.create(
          {
            id_usuario: referido.id_referidor,
            id_referido: id_usuario,
            tipo: 'ingreso_referido',
            monto: comision_referido, 
            descripcion: `Comisión por referido - ${nombre}`,
            estado: 'completado'
          },
          { transaction: t }
        );
      } else {
        console.log(`ℹ️ [INFO] No se crea movimiento de comisión - Monto de comisión es 0`);
      }

      // 3.2️⃣ Actualizar crédito del referidor
      const creditoReferidor = await CreditoUsuario.findOne({
        where: { id_usuario: referido.id_referidor },
        transaction: t
      });

      const nuevoCreditoReferidor = creditoReferidor
        ? parseInt(creditoReferidor.monto_credito) + parseInt(comision_referido)
        : parseInt(comision_referido);

      await CreditoUsuario.upsert(
        {
          id_usuario: referido.id_referidor,
          monto_credito: nuevoCreditoReferidor,
          fecha: new Date()
        },
        { transaction: t }
      );
    } else {
      console.log('⚙️ [DEBUG] No se procesó comisión (sin referidor o comision_referido no válida).');
    }

    // 4️⃣ Restar crédito del usuario si tiene
    const creditoUsuario = await CreditoUsuario.findOne({
      where: { id_usuario },
      transaction: t
    });

    if (parseInt(creditoUsuario.monto_credito) > 0) { 
        const nuevoMonto = parseInt(creditoUsuario.monto_credito) - Math.abs(parseInt(monto_credito)); 
        console.log(`💰 [DEBUG] Restando crédito ${monto_credito} del total ${creditoUsuario.monto_credito}`);
        
        // 2. Update the credit using upsert
        await CreditoUsuario.upsert(
            { 
                id_usuario,
                monto_credito: nuevoMonto,
                fecha: new Date()
            },
            { 
                where: { id_usuario },
                transaction: t,
                returning: true
            }
        ); 
        console.log(`💰 [DEBUG] Crédito del usuario ${id_usuario} actualizado de ${creditoUsuario.monto_credito} a ${nuevoMonto}`);
    }

    // ✅ Confirmar transacción
    await t.commit();
    console.log('✅ [DEBUG] Transacción completada correctamente');

    return res.status(200).json({
      success: true,
      message: 'Pago procesado correctamente.',
      detalles: {
        id_cotizacion,
        id_solicitud,
        id_usuario,
        id_referidor,
        comision_referido
      }
    });
  } catch (error) {
    // ❌ Rollback si algo falla
    await t.rollback();
    console.error('[ERROR] Error durante la transacción de pago:', error);

    return res.status(500).json({
      success: false,
      message: 'Error al procesar el pago. Se revertieron los cambios.',
      error: error.message
    });
  }
};

module.exports = { processPayment };

 
