const { Op } = require("sequelize");
const { sequelize } = require("../config/database");
const Notificacion = require("../models/notificacionesModel");
const NotificacionDestinatario = require("../models/notificacionesDestinatariosModel");
const Usuario = require("../models/usuariosModel"); // opcional si manejas roles
const Rol = require("../models/rolesModel");

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
              nombre_rol: { [Op.ne]: 'Administrador' }
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
      message: "Error al obtener notificaciones"
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
      message: "Error al obtener notificaciones del usuario"
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
      message: "Error al crear notificación"
    });
  }
};

// ============================================================
// 4️⃣ Enviar notificación (a usuario, rol o global)
// ============================================================
const enviarNotificacion = async (req, res) => {
  let { id_notificacion, titulo, id_usuario, nombre_rol, global } = req.body;
  const t = await sequelize.transaction();

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
    if (id_usuario && !global && !nombre_rol) {
      destinatarios.push({
        id_notificacion,
        id_usuario,
        leido: false,
        fecha_creacion: new Date(),
        fecha_leido: null
      });
    }
    // 📍 4️⃣ Enviar a todos los usuarios de un rol
    else if (nombre_rol && !global) {
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

      destinatarios = usuarios.map(u => ({
        id_notificacion,
        id_usuario: u.id_usuario,
        leido: false,
        fecha_creacion: new Date(),
        fecha_leido: null
      }));
    }
    // 🌍 5️⃣ Enviar como notificación global (a TODOS los usuarios)
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
        message: "Debes especificar id_usuario, nombre_rol o global=true. También puedes usar 'titulo' en lugar de id_notificacion."
      });
    }

    // 💾 Guardar todos los destinatarios
    await NotificacionDestinatario.bulkCreate(destinatarios, {
      transaction: t
    });

    await t.commit();

    res.json({
      success: true,
      message: "Notificación enviada correctamente",
      data: {
        id_notificacion,
        titulo: notificacion.titulo,
        cantidad_destinatarios: destinatarios.length,
        tipo_envio: global ? 'Global' : (nombre_rol ? `Rol: ${nombre_rol}` : 'Usuario individual')
      }
    });
  } catch (error) {
    await t.rollback();
    console.error("Error al enviar notificación:", error);
    res.status(500).json({
      success: false,
      message: "Error al enviar notificación",
      error: error.message
    });
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
      message: "Error al obtener notificaciones creadas manualmente"
    });
  }
};

// ============================================================
// 6️⃣ Marcar todas las notificaciones de un usuario como leídas
// ============================================================
const marcarComoLeida = async (req, res) => {
  console.log('=== SOLICITUD RECIBIDA ===');
  console.log('Método:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Body recibido:', req.body);

  const { id_usuario } = req.body;

  if (!id_usuario) {
    const errorResponse = {
      success: false,
      message: "Se requiere el ID de usuario"
    };
    console.log('=== RESPUESTA DE ERROR ===', errorResponse);
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
    console.log('=== RESPUESTA EXITOSA ===', successResponse);
    return res.json(successResponse);
  } catch (error) {
    console.error("Error al marcar notificaciones como leídas:", error);
    const errorResponse = {
      success: false,
      message: "Error al actualizar notificaciones",
      error: error.message
    };
    console.log('=== RESPUESTA DE ERROR ===', errorResponse);
    res.status(500).json(errorResponse);
  }
};

// ============================================================
// Marcar una notificación individual como leída
// ============================================================
const marcarNotificacionIndividual = async (req, res) => {
  console.log('=== SOLICITUD RECIBIDA ===');
  console.log('Método:', req.method);
  console.log('URL:', req.originalUrl);
  console.log('Body recibido:', req.body);

  const { id_destinatario_notificacion } = req.body;

  if (!id_destinatario_notificacion) {
    const errorResponse = {
      success: false,
      message: "Se requiere el ID del destinatario de la notificación"
    };
    console.log('=== RESPUESTA DE ERROR ===', errorResponse);
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

    console.log('=== RESPUESTA EXITOSA ===', successResponse);
    return res.json(successResponse);

  } catch (error) {
    console.error("Error al marcar notificación individual:", error);
    const errorResponse = {
      success: false,
      message: "Error al actualizar la notificación",
      error: error.message
    };
    console.log('=== RESPUESTA DE ERROR ===', errorResponse);
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
      message: "Error al eliminar notificación"
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
      message: `Se eliminaron ${eliminadas} notificaciones leídas.`
    });
  } catch (error) {
    console.error("Error al eliminar notificaciones leídas:", error);
    res.status(500).json({
      success: false,
      message: "Error al eliminar notificaciones leídas"
    });
  }
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
  eliminarLeidas
};
 
