const Cotizacion = require("../models/cotizacionModel");
const SolicitudServicio = require("../models/solicitudServicioModel");
const Movimiento = require("../models/movimientosModel");
const CreditoUsuario = require("../models/creditoUsuariosModel");
const Referido = require("../models/referidosModel");
const Config = require("../models/configModel");
const Membresia = require("../models/membresiaModel");
const Usuario = require("../models/usuariosModel");
const Rol = require("../models/rolesModel");
const Servicio = require("../models/serviciosModel");



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

    // Validaciones básicas
    if (!id_cotizacion || !id_solicitud || !id_usuario) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });
    }

    // normalizar montos
    const montoManoDeObra = Number.isFinite(parseFloat(monto_manodeobra)) ? parseFloat(monto_manodeobra) : 0;
    const creditoUsadoInput = Number.isFinite(parseFloat(monto_credito)) ? parseFloat(monto_credito) : 0;

    // 0️⃣ Obtener cotización y solicitud y validarlas
    const cotizacion = await Cotizacion.findByPk(id_cotizacion, { transaction: t });
    if (!cotizacion) throw new Error('Cotización no encontrada');

    const solicitud = await SolicitudServicio.findByPk(id_solicitud, {
      include: [{ model: Servicio, as: 'servicio' }],
      transaction: t
    });

    if (!solicitud) throw new Error('Solicitud de servicio no encontrada');

    // Prevención: si ya está procesada
    if (cotizacion.estado === 'pagado' || cotizacion.estado === 'confirmado') {
      await t.rollback();
      return res.status(409).json({ success: false, message: `Cotización ya procesada (estado: ${cotizacion.estado}).` });
    }

    // 1️⃣ Actualizar la cotización a "pagado"
    await cotizacion.update(
      {
        id_cuenta,
        num_comprobante,
        estado: 'pagado',
        descuento_membresia,
        credito_usado: creditoUsadoInput
      },
      { transaction: t }
    );

    // 2️⃣ Actualizar solicitud a "verificando_pagoservicio"
    await solicitud.update({ estado: 'verificando_pagoservicio' }, { transaction: t });

    // 3️⃣ Buscar si el usuario tiene un referido (no obligatorio)
    const referido = await Referido.findOne({
      where: { id_referido_usuario: id_usuario },
      transaction: t
    });

    // 4️⃣ Procesar comisión por referido si existe (AHORA INCLUYE id_cotizacion)
    let movimientoReferidoCreado = null;
    if (referido && referido.id_referidor) {
      try {
        // Obtener información del referidor incluyendo su rol
        const referidor = await Usuario.findByPk(referido.id_referidor, {
          include: [{
            model: Rol,
            as: 'rol',
            required: true
          }],
          transaction: t
        });

        // Verificar si el referidor es de tipo 'usuario' para revisar progreso de membresía
        const rolReferidor = referidor?.rol?.nombre_rol || 'desconocido';
        const esUsuario = rolReferidor.toLowerCase() === 'usuario';
        console.log(`[PagoServicio] Referidor ID ${referido.id_referidor} tiene rol: ${rolReferidor}`);
        let tieneProgreso = false;

        if (esUsuario) {
          // Solo verificar progreso de membresía para referidores con rol 'usuario'
          const configGracia = await Config.findOne({
            where: { tipo_config: 'reset_credito' },
            transaction: t
          });

          const diasGracia = parseInt(configGracia?.valor || '5', 10);
          const diasPorMes = 30 + diasGracia;

          const ultimaMembresia = await Membresia.findOne({
            where: {
              id_usuario: referido.id_referidor, // Usar el ID del referidor, no del usuario
              estado: ['activa', 'vencida']
            },
            order: [['fecha', 'DESC']],
            transaction: t
          });

          if (ultimaMembresia) {
            const hoy = new Date();
            const fechaMembresia = new Date(ultimaMembresia.fecha);
            const diffTiempo = hoy - fechaMembresia;
            const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

            if (diffDias <= diasPorMes) {
              tieneProgreso = true;
            }
          }
        } else {
          // Para cualquier otro rol del referidor, se asume que tiene progreso (no se verifica membresía)
          tieneProgreso = true;
        }

        if (tieneProgreso) {
          const configComision = await Config.findOne({
            where: { tipo_config: 'porcentaje_referido' },
            transaction: t
          });

          const porcentaje_comision = configComision ? parseFloat(configComision.valor) || 0 : 0;
          const comision_referido_calc = Math.round(((porcentaje_comision * (montoManoDeObra) / 100) * 100) / 100); // 2 decimales

          if (comision_referido_calc > 0) {
            // Evitar duplicados: comprobar si ya existe un movimiento pendiente para la misma cotización
            const existeMovimiento = await Movimiento.findOne({
              where: {
                id_usuario: referido.id_referidor,
                id_referido: id_usuario,
                id_cotizacion,
                tipo: 'ingreso_referido',
                monto: comision_referido_calc,
                estado: 'pendiente'
              },
              transaction: t
            });

            if (!existeMovimiento) {
              movimientoReferidoCreado = await Movimiento.create(
                {
                  id_usuario: referido.id_referidor,
                  id_cotizacion,
                  id_referido: id_usuario,
                  tipo: 'ingreso_referido',
                  monto: comision_referido_calc,
                  descripcion: `Comisión ${nombre || ''} - ${solicitud?.servicio?.nombre || ''}`,
                  estado: 'pendiente',
                  fecha: new Date()
                },
                { transaction: t }
              );

              console.log(`[PagoServicio] Registrado ingreso_referido para usuario ID ${id_usuario} (Rol: ${rolUsuario}). Monto: ${comision_referido_calc}`);

              // Actualizar o crear crédito del referidor
              const creditoReferidor = await CreditoUsuario.findOne({
                where: { id_usuario: referido.id_referidor },
                transaction: t
              });

              const creditoAnterior = creditoReferidor ? parseFloat(creditoReferidor.monto_credito) || 0 : 0;
              const nuevoCreditoReferidor = Math.round((creditoAnterior + comision_referido_calc) * 100) / 100;

              await CreditoUsuario.upsert(
                {
                  id_usuario: referido.id_referidor,
                  monto_credito: nuevoCreditoReferidor,
                  fecha: new Date()
                },
                { transaction: t }
              );

            } else {
              console.log(`[PagoServicio] Ya existe un movimiento de comisión pendiente para esta cotización (Usuario ID: ${id_usuario}, Rol: ${rolUsuario})`);
            }
          } else {
            // No se muestra mensaje de log para mantener silencioso
          }
        }
      } catch (errComision) {
        // No se muestra mensaje de log para mantener silencioso
      }
    } else {
      // No se muestra mensaje de log para mantener silencioso
    }

    // 5️⃣ Restar crédito del usuario si tiene
    const creditoUsuario = await CreditoUsuario.findOne({
      where: { id_usuario },
      transaction: t
    });

    if (creditoUsuario && parseFloat(creditoUsuario.monto_credito) > 0 && creditoUsadoInput > 0) {
      const montoCredito = parseFloat(creditoUsuario.monto_credito) || 0;
      const montoADescontar = Math.min(montoCredito, Math.abs(creditoUsadoInput));
      const nuevoMonto = Math.round((montoCredito - montoADescontar) * 100) / 100;

      await CreditoUsuario.upsert(
        {
          id_usuario,
          monto_credito: nuevoMonto,
          fecha: new Date()
        },
        { transaction: t }
      );

    } else {
      // No se muestra mensaje de log para mantener silencioso
    }

    // 6️⃣ Registrar movimiento de cashback si aplica
    const descMembresiaInput = Number.isFinite(parseFloat(descuento_membresia)) ? parseFloat(descuento_membresia) : 0;
    if (descMembresiaInput > 0) {
      const existeMovimientoCashback = await Movimiento.findOne({
        where: {
          id_cotizacion,
          tipo: 'cashback'
        },
        transaction: t
      });

      if (!existeMovimientoCashback) {
        await Movimiento.create({
          id_usuario,
          id_cotizacion,
          tipo: 'cashback',
          monto: descMembresiaInput,
          descripcion: `Cashback por pago de servicio - ${solicitud?.servicio?.nombre || ''}`,
          estado: 'pendiente',
          fecha: new Date()
        }, { transaction: t });
      } else {
        // Si ya existe, nos aseguramos que esté en pendiente y actualizamos el monto y fecha
        await existeMovimientoCashback.update({
          estado: 'pendiente',
          monto: descMembresiaInput,
          fecha: new Date()
        }, { transaction: t });
      }
    }

    // ✅ Confirmar transacción
    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Pago procesado correctamente.',
      detalles: {
        id_cotizacion,
        id_solicitud,
        id_usuario,
        id_referidor: referido?.id_referidor || null,
        movimientoReferidoId: movimientoReferidoCreado ? movimientoReferidoCreado.id_movimiento || movimientoReferidoCreado.id : null
      }
    });
  } catch (error) {
    await t.rollback();
    // No se muestra mensaje de log para mantener silencioso

    return res.status(500).json({
      success: false,
      message: 'Error al procesar el pago. Se revertieron los cambios.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const denyPayment = async (req, res) => {

  const t = await Cotizacion.sequelize.transaction();

  try {
    const { id_cotizacion, id_solicitud, id_usuario } = req.body;

    // Validación
    if (!id_cotizacion || !id_solicitud || !id_usuario) {
      const errorMsg = 'Faltan campos requeridos.';
      // No se muestra mensaje de log para mantener silencioso
      await t.rollback();
      return res.status(400).json({ success: false, message: errorMsg });
    }

    // 1️⃣ Obtener cotización
    const cotizacion = await Cotizacion.findByPk(id_cotizacion, { transaction: t });
    if (!cotizacion) throw new Error('Cotización no encontrada');

    const monto_credito_usado = parseFloat(cotizacion.credito_usado || 0);

    // 2️⃣ Revertir cotización
    await cotizacion.update(
      {
        descuento_membresia: null,
        credito_usado: null,
        estado: 'rechazado'
      },
      { transaction: t }
    );

    // 3️⃣ Revertir estado de la solicitud
    const solicitud = await SolicitudServicio.findByPk(id_solicitud, { transaction: t });
    if (!solicitud) throw new Error('Solicitud no encontrada');
    await solicitud.update({ estado: 'pendiente_pagoservicio' }, { transaction: t });

    // 4️⃣ Devolver crédito usado
    if (monto_credito_usado > 0) {
      const creditoUsuario = await CreditoUsuario.findOne({
        where: { id_usuario },
        transaction: t
      });

      const creditoAnterior = creditoUsuario ? parseFloat(creditoUsuario.monto_credito) || 0 : 0;
      const nuevoCredito = Math.round((creditoAnterior + monto_credito_usado) * 100) / 100;

      await CreditoUsuario.upsert(
        {
          id_usuario,
          monto_credito: nuevoCredito,
          fecha: new Date()
        },
        { transaction: t }
      );
    }

    // 5️⃣ Revertir comisión de referido (si existía)
    await Movimiento.destroy({
      where: {
        id_cotizacion,
        tipo: 'cashback',
        estado: 'pendiente'
      },
      transaction: t
    });

    const referido = await Referido.findOne({
      where: { id_referido_usuario: id_usuario },
      transaction: t
    });

    if (referido && referido.id_referidor) {
      const movimientoComision = await Movimiento.findOne({
        where: {
          id_usuario: referido.id_referidor,
          id_referido: id_usuario,
          id_cotizacion: id_cotizacion,
          tipo: 'ingreso_referido'
        },
        order: [['fecha', 'DESC']],
        transaction: t
      });

      if (movimientoComision) {
        const comision = parseFloat(movimientoComision.monto) || 0;

        // Restar crédito del referidor
        const creditoReferidor = await CreditoUsuario.findOne({
          where: { id_usuario: referido.id_referidor },
          transaction: t
        });

        if (creditoReferidor) {
          const nuevoCreditoReferidor = Math.max(0, parseFloat(creditoReferidor.monto_credito) - comision);

          await CreditoUsuario.upsert(
            {
              id_usuario: referido.id_referidor,
              monto_credito: nuevoCreditoReferidor,
              fecha: new Date()
            },
            { transaction: t }
          );

        }

        // Borrar movimiento de comisión
        await Movimiento.destroy({
          where: { id_movimiento: movimientoComision.id_movimiento },
          transaction: t
        });
      } else {
        // No se muestra mensaje de log para mantener silencioso
      }
    }

    // 🟩 Guardar cambios
    await t.commit();

    const successResponse = {
      success: true,
      message: 'Pago denegado correctamente. Todos los cambios han sido revertidos.',
      detalles: {
        id_cotizacion,
        id_solicitud,
        id_usuario,
        monto_credito_devuelto: monto_credito_usado
      }
    };

    return res.status(200).json(successResponse);

  } catch (error) {
    await t.rollback();

    console.error('❌ [DENEGAR PAGO] Error crítico:', {
      error: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: 'Error al denegar el pago. Se revertieron los cambios.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const acceptPayment = async (req, res) => {
  const t = await Cotizacion.sequelize.transaction();

  try {
    const { id_cotizacion, id_solicitud } = req.body;

    if (!id_cotizacion || !id_solicitud) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'Faltan campos requeridos.' });
    }

    // 1️⃣ Verificar existencia de cotización
    const cotizacion = await Cotizacion.findByPk(id_cotizacion, { transaction: t });
    if (!cotizacion) throw new Error('Cotización no encontrada');

    // 2️⃣ Verificar existencia de solicitud
    const solicitud = await SolicitudServicio.findByPk(id_solicitud, { transaction: t });
    if (!solicitud) throw new Error('Solicitud de servicio no encontrada');

    // 3️⃣ Validar que la cotización esté en estado "pagado"
    if (cotizacion.estado !== 'pagado') {
      throw new Error(`Solo se pueden aceptar cotizaciones con estado 'pagado'. Estado actual: '${cotizacion.estado}'`);
    }

    // 3.5️⃣ Calcular comisión de la app
    const configApp = await Config.findOne({
      where: { tipo_config: 'comision_por_servicio' },
      transaction: t
    });
    const porcentajeApp = configApp ? parseFloat(configApp.valor) || 0 : 0;

    const manoObra = parseFloat(cotizacion.monto_manodeobra) || 0;
    const descMembresia = parseFloat(cotizacion.descuento_membresia) || 0;
    const credUsado = parseFloat(cotizacion.credito_usado) || 0;

    const baseCalculo = manoObra;
    const comisionBrutaApp = Math.round(((baseCalculo * porcentajeApp) / 100) * 100) / 100;
    // La App absorbe el descuento de membresía de su propia comisión (Utilidad Real)
    const montoComisionApp = Math.max(0, comisionBrutaApp - descMembresia);

    // 4️⃣ Actualizar estados principales y guardar comisión
    await cotizacion.update({
      estado: 'confirmado',
      monto_comision_app: montoComisionApp
    }, { transaction: t });
    await solicitud.update({ estado: 'finalizado' }, { transaction: t });

    // 4.5️⃣ Acreditar cashback de membresía al usuario (si aplica)
    // El descuento_membresia es un cashback que se devuelve al usuario como crédito
    if (descMembresia > 0) {
      const creditoActual = await CreditoUsuario.findOne({
        where: { id_usuario: cotizacion.id_usuario || solicitud.id_usuario },
        transaction: t
      });

      const montoAnterior = creditoActual ? parseFloat(creditoActual.monto_credito) || 0 : 0;
      const nuevoCredito = Math.round((montoAnterior + descMembresia) * 100) / 100;

      await CreditoUsuario.upsert(
        {
          id_usuario: cotizacion.id_usuario || solicitud.id_usuario,
          monto_credito: nuevoCredito,
          fecha: new Date()
        },
        { transaction: t }
      );

      console.log(`[AceptarPago] Cashback de membresía acreditado: L. ${descMembresia} al usuario ID ${cotizacion.id_usuario || solicitud.id_usuario}`);
    }

    // 5️⃣ Actualizar movimiento del técnico (si existe) buscando por id_cotizacion
    const movimientoTecnico = await Movimiento.findOne({
      where: {
        id_cotizacion,
        tipo: 'ingreso'
      },
      order: [['fecha', 'DESC']],
      transaction: t
    });

    if (movimientoTecnico) {
      const porcentajeTecnico = 100 - porcentajeApp;
      const montoTecnico = Math.round(((manoObra * porcentajeTecnico) / 100) * 100) / 100;

      await movimientoTecnico.update({
        estado: 'completado',
        monto: montoTecnico
      }, { transaction: t });
    } else {
      // No se muestra mensaje de log para mantener silencioso
    }

    // 6️⃣ Actualizar movimiento del referido (si existe) buscando por id_cotizacion

    // Buscar información del referido
    const referido = await Referido.findOne({
      where: { id_referido_usuario: solicitud.id_usuario },
      transaction: t
    });

    let tieneProgreso = false;

    if (referido && referido.id_referidor) {
      // Obtener información del referidor incluyendo su rol
      const referidor = await Usuario.findByPk(referido.id_referidor, {
        include: [{
          model: Rol,
          as: 'rol',
          required: true
        }],
        transaction: t
      });

      // Verificar si el referidor es de tipo 'usuario' para revisar progreso de membresía
      const rolReferidor = referidor?.rol?.nombre_rol || 'desconocido';
      const esUsuario = rolReferidor.toLowerCase() === 'usuario';
      console.log(`[AceptarPago] Verificando referidor ID ${referido.id_referidor} con rol: ${rolReferidor}`);

      if (esUsuario) {
        // Solo verificar progreso de membresía para referidores con rol 'usuario'
        const configGracia = await Config.findOne({
          where: { tipo_config: 'reset_credito' },
          transaction: t
        });

        const diasGracia = parseInt(configGracia?.valor || '5', 10);
        const diasPorMes = 30 + diasGracia;

        const ultimaMembresia = await Membresia.findOne({
          where: {
            id_usuario: referido.id_referidor,
            estado: ['activa', 'vencida']
          },
          order: [['fecha', 'DESC']],
          transaction: t
        });

        if (ultimaMembresia) {
          const hoy = new Date();
          const fechaMembresia = new Date(ultimaMembresia.fecha);
          const diffTiempo = hoy - fechaMembresia;
          const diffDias = Math.floor(diffTiempo / (1000 * 60 * 60 * 24));

          if (diffDias <= diasPorMes) {
            tieneProgreso = true;
            console.log(`[AceptarPago] Referidor ID ${referido.id_referidor} tiene membresía vigente`);
          } else {
            console.log(`[AceptarPago] Referidor ID ${referido.id_referidor} no tiene membresía vigente`);
          }
        } else {
          console.log(`[AceptarPago] Referidor ID ${referido.id_referidor} no tiene membresías registradas`);
        }
      } else {
        // Para cualquier otro rol del referidor, se asume que tiene progreso (no se verifica membresía)
        tieneProgreso = true;
        console.log(`[AceptarPago] Referidor ID ${referido.id_referidor} tiene rol ${rolReferidor}, se asume progreso`);
      }
    } else {
      console.log('[AceptarPago] No se encontró referido para este usuario');
    }

    const movimientoReferido = await Movimiento.findOne({
      where: {
        id_cotizacion,
        tipo: 'ingreso_referido',
        estado: 'pendiente'
      },
      include: [{
        model: Usuario,
        as: 'usuario',
        include: [{
          model: Rol,
          as: 'rol',
          required: true
        }]
      }],
      order: [['fecha', 'DESC']],
      transaction: t
    });

    if (movimientoReferido) {
      const rolReferidor = movimientoReferido.usuario?.rol?.nombre_rol?.toLowerCase() || 'desconocido';
      const esUsuario = rolReferidor === 'usuario';

      // Solo verificamos membresía para usuarios con rol 'usuario'
      if (esUsuario) {
        if (tieneProgreso) {
          // Si es usuario y tiene progreso, marcar como completado
          await movimientoReferido.update({ estado: 'completado' }, { transaction: t });
          console.log(`[AceptarPago] Movimiento de referido completado para cotización ${id_cotizacion} (usuario con membresía)`);
        } else {
          // Si es usuario y no tiene progreso, eliminar el registro
          await movimientoReferido.destroy({ transaction: t });
          console.log(`[AceptarPago] Movimiento de referido eliminado (usuario sin membresía vigente) para cotización ${id_cotizacion}`);
        }
      } else {
        // Para cualquier otro rol, siempre se aprueba sin verificar membresía
        await movimientoReferido.update({ estado: 'completado' }, { transaction: t });
        console.log(`[AceptarPago] Movimiento de referido completado para cotización ${id_cotizacion} (rol: ${rolReferidor})`);
      }
    } else {
      console.log(`[AceptarPago] No se encontró movimiento de referido pendiente para cotización ${id_cotizacion}`);
    }

    // 7️⃣ Actualizar movimiento de cashback (si existe)
    const movimientoCashback = await Movimiento.findOne({
      where: {
        id_cotizacion,
        tipo: 'cashback',
        estado: 'pendiente'
      },
      transaction: t
    });

    if (movimientoCashback) {
      await movimientoCashback.update({ estado: 'completado' }, { transaction: t });
      console.log(`[AceptarPago] Movimiento de cashback completado para cotización ${id_cotizacion}`);
    }

    // ✅ Confirmar transacción
    await t.commit();

    return res.status(200).json({
      success: true,
      message: 'Pago aceptado correctamente. Estados actualizados.',
      detalles: {
        id_cotizacion,
        nuevo_estado_cotizacion: 'confirmado',
        nuevo_estado_solicitud: 'finalizado',
        movimiento_tecnico: movimientoTecnico ? 'completado' : 'no encontrado',
        movimiento_referido: movimientoReferido ? 'completado' : 'no encontrado',
        id_referidor: movimientoReferido ? movimientoReferido.id_usuario : null,
        cashback: descMembresia
      }
    });
  } catch (error) {
    await t.rollback();

    return res.status(500).json({
      success: false,
      message: 'Error al aceptar el pago. Se revertieron los cambios.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = { processPayment, denyPayment, acceptPayment };