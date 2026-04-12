const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const Notificacion = require("../models/notificacionesModel");
const NotificacionDestinatario = require("../models/notificacionesDestinatariosModel");
const Usuario = require("../models/usuariosModel"); // opcional si manejas roles
const Rol = require("../models/rolesModel");
const Ciudad = require("../models/ciudadesModel");
const webpush = require("web-push");
const SuscripcionNotificacion = require("../models/suscripcionesNotificacionesModel");

// Configurar Web Push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || 'mailto:contactomisegurohn@gmail.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  } catch (error) {
    console.error('❌ Error configurando Web Push:', error.message);
  }
}

// Helper para enviar notificaciones push
const enviarPushHelper = async (destinatarios, titulo, cuerpo, data = {}) => {
  try {
    const userIds = destinatarios.map(d => d.id_usuario);

    // Obtener suscripciones de los usuarios afectados
    const subscriptions = await SuscripcionNotificacion.findAll({
      where: {
        id_usuario: { [Op.in]: userIds }
      }
    });

    if (subscriptions.length === 0) return;

    const notifications = subscriptions.map(sub => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          auth: sub.keys_auth,
          p256dh: sub.keys_p256dh
        }
      };

      const payload = JSON.stringify({
        title: titulo,
        body: cuerpo,
        icon: '/pwa-512x512.png', // Ajustar ruta del icono según corresponda
        data: {
          url: data.url || '/', // URL por defecto si no se proporciona
          ...data
        }
      });

      return webpush.sendNotification(pushSubscription, payload)
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // La suscripción ya no es válida, eliminarla
            return SuscripcionNotificacion.destroy({ where: { id_suscripcion: sub.id_suscripcion } });
          }
        });
    });

    await Promise.allSettled(notifications);
  } catch (error) {
    console.error('❌ Error general en enviarPushHelper:', error);
  }
};

// ============================================================
// 1️⃣ Obtener todas las notificaciones del sistema
// ============================================================
const obtenerTodas = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: notificaciones } = await NotificacionDestinatario.findAndCountAll({
      include: [
        {
          model: Notificacion,
          attributes: ['titulo', 'creado_por'],
          where: { creado_por: 'Sistema' },
          required: true
        },
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['nombre'],
          required: true,
          include: [{
            model: Rol,
            as: 'rol',
            attributes: [],
            where: {
              nombre_rol: { [Op.ne]: 'Admin' }
            },
            required: true
          }]
        }
      ],
      attributes: ['id_destinatario_notificacion', 'id_notificacion', 'fecha_creacion', 'leido', 'fecha_leido'],
      order: [['fecha_creacion', 'DESC']],
      raw: true,
      nest: true,
      limit,
      offset
    });

    const notificacionesFormateadas = notificaciones.map(notif => ({
      id: notif.id_destinatario_notificacion,
      titulo: notif.Notificacion.titulo,
      nombreUsuario: notif.usuario.nombre,
      fecha: notif.fecha_creacion,
      leido: notif.leido,
      fechaLeido: notif.fecha_leido
    }));

    res.json({
      success: true,
      data: notificacionesFormateadas,
      pagination: {
        total: count,
        page,
        pages: Math.ceil(count / limit),
        limit
      }
    });
  } catch (error) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener notificaciones",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// 2️⃣ Obtener notificaciones por usuario (simplificado)
// ============================================================
const obtenerPorUsuario = async (req, res) => {
  const { id_usuario } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const offset = (page - 1) * limit;

  try {
    const { count, rows: notificaciones } = await NotificacionDestinatario.findAndCountAll({
      include: [
        {
          model: Notificacion,
          attributes: ['titulo', 'creado_por', 'tipo'],
          required: true
        }
      ],
      where: { id_usuario },
      attributes: ['id_destinatario_notificacion', 'id_notificacion', 'fecha_creacion', 'leido', 'fecha_leido'],
      order: [['fecha_creacion', 'DESC']],
      limit,
      offset,
      raw: true,
      nest: true
    });

    const totalPages = Math.ceil(count / limit);

    // Contar notificaciones no leídas
    const unreadCount = await NotificacionDestinatario.count({
      where: {
        id_usuario,
        leido: false
      }
    });

    res.json({
      success: true,
      data: notificaciones.map(notif => ({
        id: notif.id_destinatario_notificacion,
        titulo: notif.Notificacion.titulo,
        fecha: notif.fecha_creacion,
        leido: notif.leido,
        creadoPor: notif.Notificacion.creado_por,
        tipo: notif.Notificacion.tipo
      })),
      pagination: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      unreadCount
    });
  } catch (error) {
    console.error("Error al obtener notificaciones por usuario:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener notificaciones del usuario",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// 3️⃣ Crear Notificación (solo registro base)
// ============================================================
const crearNotificacion = async (req, res) => {
  const { tipo, titulo, creado_por } = req.body;

  try {
    const nueva = await Notificacion.create({
      tipo,
      titulo,
      creado_por,
      fecha_creacion: new Date()
    });

    res.json({
      success: true,
      data: nueva
    });
  } catch (error) {
    console.error("Error al crear notificación:", error);
    res.status(500).json({
      success: false,
      message: "Error al crear notificación",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// 4️⃣ Enviar notificación (a usuario, rol o global)
// ============================================================
const enviarNotificacion = async (req, res) => {

  let { id_notificacion, titulo, id_usuario, nombre_rol, global, id_ciudad } = req.body;
  const t = await sequelize.transaction();
  let ciudad = null; // Declarar la variable en el ámbito de la función

  try {
    let notificacion = null;

    // 🔍 1️⃣ Buscar notificación por título si no viene ID
    if (!id_notificacion && titulo) {
      notificacion = await Notificacion.findOne({
        where: { titulo },
        raw: true
      });

      if (!notificacion) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `No se encontró una notificación con el título '${titulo}'`
        });
      }

      id_notificacion = notificacion.id_notificacion;
    }

    // 🔍 2️⃣ Verificar que la notificación existe
    if (!notificacion) {
      notificacion = await Notificacion.findByPk(id_notificacion, { raw: true });
    }

    if (!notificacion) {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: "La notificación especificada no existe"
      });
    }

    let destinatarios = [];

    // 📍 3️⃣ Enviar a un usuario específico
    if (id_usuario && !global && !nombre_rol && !id_ciudad) {
      destinatarios.push({
        id_notificacion,
        id_usuario,
        leido: false,
        fecha_creacion: new Date(),
        fecha_leido: null
      });
    }
    // 🌆 4️⃣ Enviar a todos los usuarios de una ciudad con o sin filtro de rol
    else if (id_ciudad && !global) {
      // Verificar que la ciudad existe
      ciudad = await Ciudad.findByPk(id_ciudad, {
        attributes: ['id_ciudad', 'nombre_ciudad'],
        raw: true
      });

      if (!ciudad) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `No se encontró la ciudad con ID ${id_ciudad}`
        });
      }

      // Construir el objeto de condiciones para la consulta
      const whereClause = { id_ciudad };

      // Si se especificó un rol, agregarlo a las condiciones
      if (nombre_rol) {
        const rol = await Rol.findOne({
          where: { nombre_rol },
          attributes: ['id_rol'],
          raw: true
        });

        if (!rol) {
          await t.rollback();
          return res.status(404).json({
            success: false,
            message: `No se encontró el rol '${nombre_rol}'`
          });
        }

        whereClause.id_rol = rol.id_rol;
      }

      // Obtener los usuarios que cumplan con los filtros
      const usuarios = await Usuario.findAll({
        where: whereClause,
        attributes: ['id_usuario']
      });

      if (usuarios.length === 0) {
        await t.rollback();
        const mensaje = nombre_rol
          ? `No hay usuarios con el rol '${nombre_rol}' en la ciudad '${ciudad.nombre_ciudad}'`
          : `No hay usuarios registrados en la ciudad '${ciudad.nombre_ciudad}'`;

        return res.status(404).json({
          success: false,
          message: mensaje
        });
      }

      destinatarios = usuarios.map(u => ({
        id_notificacion,
        id_usuario: u.id_usuario,
        leido: false,
        fecha_creacion: new Date(),
        fecha_leido: null
      }));

      // Actualizar el tipo de envío para incluir ambos filtros si es necesario
      let tipoEnvio = nombre_rol
        ? `Ciudad: ${ciudad.nombre_ciudad}, Rol: ${nombre_rol}`
        : `Ciudad: ${ciudad.nombre_ciudad}`;
    }
    // 📍 5️⃣ Enviar a todos los usuarios de un rol (solo si no se especificó ciudad)
    else if (nombre_rol && !global && !id_ciudad) {
      const rolUsuario = await Rol.findOne({
        where: { nombre_rol },
        attributes: ['id_rol'],
        raw: true
      });

      if (!rolUsuario) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `No se encontró el rol '${nombre_rol}'`
        });
      }

      const usuarios = await Usuario.findAll({
        where: { id_rol: rolUsuario.id_rol },
        attributes: ['id_usuario']
      });

      if (usuarios.length === 0) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: `No hay usuarios con el rol '${nombre_rol}'`
        });
      }

      destinatarios = usuarios.map(u => ({
        id_notificacion,
        id_usuario: u.id_usuario,
        leido: false,
        fecha_creacion: new Date(),
        fecha_leido: null
      }));

      let tipoEnvio = `Rol: ${nombre_rol}`;
    }
    // 🌍 6️⃣ Enviar como notificación global (a TODOS los usuarios)
    else if (global) {
      const todosUsuarios = await Usuario.findAll({
        attributes: ['id_usuario']
      });

      if (todosUsuarios.length === 0) {
        await t.rollback();
        return res.status(404).json({
          success: false,
          message: "No hay usuarios registrados para enviar la notificación global"
        });
      }

      destinatarios = todosUsuarios.map(u => ({
        id_notificacion,
        id_usuario: u.id_usuario,
        leido: false,
        fecha_creacion: new Date(),
        fecha_leido: null
      }));
    }
    // ❌ Sin destinatarios válidos
    else {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: "Debes especificar id_usuario, id_ciudad, nombre_rol o global=true. También puedes usar 'titulo' en lugar de id_notificacion."
      });
    }

    // 💾 Guardar todos los destinatarios
    await NotificacionDestinatario.bulkCreate(destinatarios, {
      transaction: t
    });

    // 🚀 Enviar Push Notifications (async, no bloquear respuesta)
    // Se ejecuta DESPUÉS de confirmar que se guardaron en DB
    enviarPushHelper(
      destinatarios,
      notificacion.tipo ? `Tienes una nueva notificación` : 'Tienes una nueva notificación',
      notificacion.titulo,
      {
        id_notificacion: notificacion.id_notificacion,
        tipo: notificacion.tipo
      }
    ).catch(e => console.error('Error enviando push async:', e));

    await t.commit();

    const respuesta = {
      success: true,
      message: "Notificación enviada correctamente",
      data: {
        id_notificacion,
        titulo: notificacion.titulo,
        cantidad_destinatarios: destinatarios.length,
        tipo_envio: global ? 'Global' :
          (nombre_rol ? `Rol: ${nombre_rol}` :
            (id_ciudad ? `Ciudad: ${ciudad?.nombre_ciudad || id_ciudad}` : 'Usuario individual'))
      }
    };

    res.json(respuesta);
  } catch (error) {
    if (t && !t.finished) {
      await t.rollback();
    }

    console.error('❌ Error al enviar notificación:', {
      error: error.message,
      stack: error.stack,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const errorResponse = {
      success: false,
      message: "Error al enviar notificación",
      error: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: error.details || error.original?.message
      })
    };

    res.status(500).json(errorResponse);
  }
};

// ============================================================
// 5️⃣ Obtener notificaciones creadas manualmente (no del sistema)
// ============================================================
const obtenerCreadasManualmente = async (req, res) => {
  try {
    const notificaciones = await Notificacion.findAll({
      where: {
        creado_por: { [Op.ne]: 'Sistema' }
      },
      order: [['fecha_creacion', 'DESC']],
      attributes: ['id_notificacion', 'tipo', 'titulo', 'creado_por', 'fecha_creacion']
    });

    res.json({
      success: true,
      data: notificaciones
    });
  } catch (error) {
    console.error("Error al obtener notificaciones creadas manualmente:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener notificaciones creadas manualmente",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// 6️⃣ Marcar todas las notificaciones de un usuario como leídas
// ============================================================
const marcarComoLeida = async (req, res) => {

  const { id_usuario } = req.body;

  if (!id_usuario) {
    const errorResponse = {
      success: false,
      message: "Se requiere el ID de usuario"
    };
    return res.status(400).json(errorResponse);
  }

  try {
    const [updatedCount] = await NotificacionDestinatario.update(
      {
        leido: true,
        fecha_leido: new Date()
      },
      {
        where: {
          id_usuario,
          leido: false
        }
      }
    );

    const successResponse = {
      success: true,
      message: `Se marcaron ${updatedCount} notificaciones como leídas`,
      updatedCount
    };
    return res.json(successResponse);
  } catch (error) {
    console.error("Error al marcar notificaciones como leídas:", error);
    const errorResponse = {
      success: false,
      message: "Error al actualizar notificaciones",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    res.status(500).json(errorResponse);
  }
};

// ============================================================
// Marcar una notificación individual como leída
// ============================================================
const marcarNotificacionIndividual = async (req, res) => {

  const { id_destinatario_notificacion } = req.body;

  if (!id_destinatario_notificacion) {
    const errorResponse = {
      success: false,
      message: "Se requiere el ID del destinatario de la notificación"
    };
    return res.status(400).json(errorResponse);
  }

  try {
    const [updatedCount] = await NotificacionDestinatario.update(
      {
        leido: true,
        fecha_leido: new Date()
      },
      {
        where: {
          id_destinatario_notificacion,
          leido: false
        }
      }
    );

    const successResponse = {
      success: true,
      message:
        updatedCount === 0
          ? "La notificación ya estaba leída o no existe"
          : "Notificación marcada como leída",
      updatedCount
    };

    return res.json(successResponse);

  } catch (error) {
    console.error("Error al marcar notificación individual:", error);
    const errorResponse = {
      success: false,
      message: "Error al actualizar la notificación",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    };
    return res.status(500).json(errorResponse);
  }
};

// ============================================================
// 7️⃣ Eliminar una notificación y todos sus destinatarios
// ============================================================
const eliminarNotificacion = async (req, res) => {
  const { id_notificacion } = req.params;
  const t = await sequelize.transaction();

  try {
    const deleted = await NotificacionDestinatario.destroy({
      where: { id_notificacion },
      transaction: t
    });

    await Notificacion.destroy({
      where: { id_notificacion },
      transaction: t
    });

    await t.commit();

    res.json({
      success: true,
      message: "Notificación eliminada correctamente",
      destinatarios_eliminados: deleted
    });
  } catch (error) {
    await t.rollback();
    console.error("Error al eliminar notificación:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar notificación",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// 8️⃣ Eliminar todas las notificaciones leídas
// ============================================================
const eliminarLeidas = async (req, res) => {
  try {
    const eliminadas = await NotificacionDestinatario.destroy({
      where: { leido: true }
    });

    res.json({
      success: true,
      message: `Se eliminaron ${eliminadas} notificaciones leídas.`,
      details: eliminadas
    });
  } catch (error) {
    console.error("Error al eliminar notificaciones leídas:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar notificaciones leídas",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// 9️⃣ Guardar Suscripción Push (Browser)
// ============================================================
const guardarSuscripcionPush = async (req, res) => {
  const { endpoint, keys, user_agent, expirationTime, id_usuario } = req.body;

  // Validación básica
  if (!endpoint || !keys || !keys.auth || !keys.p256dh || !id_usuario) {
    return res.status(400).json({
      success: false,
      message: "Faltan datos requeridos (endpoint, keys, id_usuario)"
    });
  }

  try {
    // Al ser "solo uno por usuario", eliminamos cualquier otra suscripción que tenga este usuario
    // excepto la que estamos tratando ahora (si es que ya existía)
    await SuscripcionNotificacion.destroy({
      where: {
        id_usuario,
        endpoint: { [Op.ne]: endpoint }
      }
    });

    // Verificar si ya existe la suscripción para este endpoint
    const [subscription, created] = await SuscripcionNotificacion.findOrCreate({
      where: { endpoint },
      defaults: {
        id_usuario,
        keys_auth: keys.auth,
        keys_p256dh: keys.p256dh,
        user_agent,
        expiration_time: expirationTime ? new Date(expirationTime) : null
      }
    });

    if (!created) {
      // Actualizar si ya existe (por ejemplo, si cambió el usuario o las llaves)
      subscription.id_usuario = id_usuario;
      subscription.keys_auth = keys.auth;
      subscription.keys_p256dh = keys.p256dh;
      if (user_agent) subscription.user_agent = user_agent;
      if (expirationTime) subscription.expiration_time = new Date(expirationTime);
      subscription.fecha_creacion = new Date(); // Actualizar fecha para mantener "frescura"
      await subscription.save();
    }

    res.json({
      success: true,
      message: created ? "Suscripción creada y centralizada" : "Suscripción actualizada",
      data: subscription
    });
  } catch (error) {
    console.error("Error al guardar suscripción push:", error);
    res.status(500).json({
      success: false,
      message: "Error al guardar suscripción",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============================================================
// 9️⃣.1 Eliminar Suscripción Push
// ============================================================
const eliminarSuscripcionPush = async (req, res) => {
  const id_usuario = (req.body && req.body.id_usuario) ||
    (req.query && req.query.id_usuario) ||
    (req.user && req.user.id_usuario);

  if (!id_usuario) {
    return res.status(400).json({
      success: false,
      message: "Falta id_usuario"
    });
  }

  try {
    const deletedCount = await SuscripcionNotificacion.destroy({
      where: { id_usuario }
    });

    res.json({
      success: true,
      message: "Suscripciones eliminadas",
      deletedCount
    });
  } catch (error) {
    console.error("Error al eliminar suscripción push:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar suscripción"
    });
  }
};

// ============================================================
// 🔟 Obtener Key Pública VAPID
// ============================================================
const obtenerVapidKey = (req, res) => {
  res.json({
    success: true,
    key: process.env.VAPID_PUBLIC_KEY
  });
};

// ============================================================
// EXPORTS
// ============================================================
module.exports = {
  obtenerTodas,
  obtenerPorUsuario,
  crearNotificacion,
  enviarNotificacion,
  obtenerCreadasManualmente,
  marcarComoLeida,
  marcarNotificacionIndividual,
  eliminarNotificacion,
  eliminarLeidas,
  guardarSuscripcionPush,
  eliminarSuscripcionPush,
  obtenerVapidKey

};
