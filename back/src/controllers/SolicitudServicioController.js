const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicio = require("../models/serviciosModel");
const Usuario = require("../models/usuariosModel");
const Ciudad = require("../models/ciudadesModel"); 
const Calificacion = require("../models/calificacionesModels"); 
const Pagovisita = require("../models/pagoVisitaModel"); 
const Cuenta = require("../models/cuentasModel"); 
const Cotizacion = require("../models/cotizacionModel"); 
const { Op, Sequelize } = require("sequelize"); 

//Obtener todas las solicitudes de servicios con paginación 
const obtenerSolicitudesServicios = async (req, res) => {
    try {
      // Obtener parámetros de paginación y filtros
      let limit = parseInt(req.query.limit) || 10; // Por defecto 10 elementos
      limit = Math.min(limit, 100); // Máximo 100 por rendimiento
      const offset = parseInt(req.query.offset) || 0;
      const month = req.query.month; // Formato esperado: 'YYYY-MM'
  
      // Construcción de condiciones
      const whereCondition = {};
      const andConditions = [];

      // Filtrar por técnico si se proporciona el ID
      if (req.query.id_tecnico) {
        whereCondition.id_tecnico = req.query.id_tecnico;
      }
  
      // Filtro por mes (año y mes)
      if (month) {
        const [year, monthNum] = month.split('-').map(Number);
        andConditions.push(
          Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('fecha_solicitud')), year),
          Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('fecha_solicitud')), monthNum)
        );
      }
  
      // Filtro por estado (incluir)
      if (req.query.status) {
        const statuses = req.query.status.split(',');
        whereCondition.estado = { [Op.in]: statuses };
      }
      // Filtro por estado (excluir)
      else if (req.query.excludeStatus) {
        const statusesToExclude = req.query.excludeStatus.split(',');
        whereCondition.estado = { [Op.notIn]: statusesToExclude };
      }
  
      // Filtro por tipo de servicio
      if (req.query.serviceType) {
        whereCondition.id_servicio = parseInt(req.query.serviceType);
      }
  
      // Filtro por búsqueda
      if (req.query.search) {
        const searchTerm = req.query.search;
        andConditions.push({
          [Op.or]: [
            { id_solicitud: { [Op.like]: `%${searchTerm}%` } },
            { '$cliente.nombre$': { [Op.like]: `%${searchTerm}%` } }
          ]
        });
      }
  
      // Combinar condiciones
      if (andConditions.length > 0) {
        whereCondition[Op.and] = andConditions;
      }
  
      // 1️⃣ Obtener el conteo total con include (para evitar el error del alias)
      const total = await SolicitudServicio.count({
        where: whereCondition,
        include: [
          {
            model: Usuario,
            as: 'cliente',
            attributes: [] // Solo para habilitar el alias '$cliente.nombre$'
          }
        ],
        distinct: true,
        col: 'id_solicitud'
      });
  
      // 2️⃣ Obtener los registros paginados
      const solicitudes = await SolicitudServicio.findAll({
        where: whereCondition,
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
            model: Usuario,
            as: 'cliente',
            attributes: ['id_usuario', 'nombre', 'telefono']
          },
          {
            model: Ciudad,
            as: 'ciudad',
            attributes: ['id_ciudad', 'nombre_ciudad']
          },
          {
            model: Calificacion,
            as: 'calificacion',
            attributes: ['calificacion', 'comentario']
          },
          {
            model: Pagovisita,
            as: 'pagoVisita',
            include: [
              {
                model: Cuenta,
                as: 'cuenta',
                attributes: ['banco', 'num_cuenta', 'tipo']
              }
            ],
            attributes: ['id_cuenta', 'monto', 'num_comprobante', 'fecha']
          },
          {
            model: Cotizacion,
            as: 'cotizacion',
            include: [
              {
                model: Cuenta,
                as: 'cuenta',
                attributes: ['banco', 'num_cuenta', 'tipo']
              }
            ],
            attributes: [
              'id_cotizacion',
              'num_comprobante',
              'monto_manodeobra',
              'descuento_membresia',
              'credito_usado'
            ]
          }
        ],
        order: [['fecha_solicitud', 'DESC']],
        limit,
        offset,
        raw: true,
        nest: true
      });
  
      // 3️⃣ Formatear respuesta
      const solicitudesFormateadas = solicitudes.map(
        ({
          id_servicio,
          servicio,
          tecnico,
          id_usuario,
          id_tecnico,
          cliente,
          id_cliente,
          ciudad,
          id_ciudad,
          calificacion,
          pagoVisita,
          cotizacion,
          ...solicitud
        }) => ({
          ...solicitud,
          servicio: servicio
            ? {
                id_servicio: servicio.id_servicio,
                nombre: servicio.nombre
              }
            : null,
          tecnico: tecnico
            ? {
                id_tecnico: tecnico.id_usuario,
                nombre: tecnico.nombre
              }
            : null,
          cliente: cliente
            ? {
                id_cliente: cliente.id_usuario,
                nombre: cliente.nombre,
                telefono: cliente.telefono
              }
            : null,
          ciudad: ciudad
            ? {
                id_ciudad: ciudad.id_ciudad,
                nombre: ciudad.nombre_ciudad
              }
            : null,
          calificacion: calificacion
            ? {
                calificacion: calificacion.calificacion,
                comentario: calificacion.comentario
              }
            : null,
          pagoVisita: pagoVisita
            ? {
                monto: pagoVisita.monto,
                num_comprobante: pagoVisita.num_comprobante,
                fecha: pagoVisita.fecha,
                cuenta: pagoVisita.cuenta
                  ? {
                      banco: pagoVisita.cuenta.banco,
                      num_cuenta: pagoVisita.cuenta.num_cuenta,
                      tipo: pagoVisita.cuenta.tipo
                    }
                  : null
              }
            : null,
          cotizacion: cotizacion
            ? {
                id_cotizacion: cotizacion.id_cotizacion,
                num_comprobante: cotizacion.num_comprobante,
                monto_manodeobra: cotizacion.monto_manodeobra,
                descuento_membresia: cotizacion.descuento_membresia,
                credito_usado: cotizacion.credito_usado,
                total:
                  (cotizacion.monto_manodeobra || 0) -
                  (cotizacion.descuento_membresia || 0) -
                  (cotizacion.credito_usado || 0),
                cuenta: cotizacion.cuenta
                  ? {
                      banco: cotizacion.cuenta.banco,
                      num_cuenta: cotizacion.cuenta.num_cuenta,
                      tipo: cotizacion.cuenta.tipo
                    }
                  : null
              }
            : null
        })
      );
  
      // 4️⃣ Enviar respuesta
      res.json({
        data: solicitudesFormateadas,
        total,
        page: Math.floor(offset / limit) + 1,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: 'Error al obtener las solicitudes de servicios' });
    }
  };
  

//Obtener todas las solicitudes de servicios por servicio
const obtenerSolicitudServicioPorServicio = async (req, res) => {
    try {
        const solicitudes = await SolicitudServicio.findAll({
            where: {
                id_servicio: req.params.id
            }
        });
        res.json(solicitudes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las solicitudes de servicios por servicio" });
    }
};

//Obtener todas las solicitudes de servicios por usuario con el nombre del servicio
const obtenerSolicitudServicioPorUsuario = async (req, res) => {
    try {
        const idUsuario = req.params.id;
        
        // Obtener todas las solicitudes con los datos del servicio
        const solicitudes = await SolicitudServicio.findAll({
            where: {
                id_usuario: idUsuario
            },
            include: [{
                model: Servicio,
                as: 'servicio',
                attributes: ['id_servicio', 'nombre']
            },
            {
                model: Usuario,
                as: 'tecnico',
                attributes: ['nombre'] 
            }
        ],
            order: [['fecha_solicitud', 'DESC']],
            raw: true,
            nest: true
        });

        // Formatear la respuesta para incluir el servicio con id y nombre
        const solicitudesFormateadas = solicitudes.map(({ id_servicio, servicio, ...solicitud }) => ({
            ...solicitud,
            servicio: {
                id_servicio,
                nombre: servicio?.nombre || 'Servicio no disponible'
            }
        }));
        
        // Contar las solicitudes totales
        const totalSolicitudes = await SolicitudServicio.count({
            where: {
                id_usuario: idUsuario
            }
        });

        // Contar solicitudes finalizadas (completadas)
        const finalizadas = await SolicitudServicio.count({
            where: {
                id_usuario: idUsuario,
                estado: 'finalizado'
            }
        });

        // Contar solicitudes pendientes (cualquier estado que no sea finalizado o cancelado)
        const pendientes = await SolicitudServicio.count({
            where: {
                id_usuario: idUsuario,
                [Op.and]: [
                    { estado: { [Op.ne]: 'finalizado' } },
                    { estado: { [Op.ne]: 'cancelado' } }
                ]
            }
        });   

        res.json({
            solicitudes: solicitudesFormateadas,
            total: totalSolicitudes,
            finalizadas,
            pendientes,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener las solicitudes de servicios por usuario" });
    }
};

// Obtener solicitudes de servicio asignadas a un técnico específico (limit 3)
const obtenerSolicitudesPorTecnico = async (req, res) => {
    try {
        const { id_tecnico } = req.params;
        const { 
            limit = 10, 
            offset = 0,
            fechaInicio, 
            fechaFin 
        } = req.query;

        // Crear objeto de condiciones base
        const whereClause = {
            id_tecnico: id_tecnico
        };

        // Agregar filtro de fechas si están presentes
        if (fechaInicio || fechaFin) {
            whereClause.fecha_solicitud = {};
            if (fechaInicio) {
                whereClause.fecha_solicitud[Op.gte] = new Date(fechaInicio);
            }
            if (fechaFin) {
                // Ajustar la fecha fin para incluir todo el día
                const finDia = new Date(fechaFin);
                finDia.setHours(23, 59, 59, 999);
                whereClause.fecha_solicitud[Op.lte] = finDia;
            }
        }

        // Obtener solicitudes con límite y offset
        const solicitudes = await SolicitudServicio.findAll({
            where: whereClause,
            include: [{
                model: Servicio,
                as: 'servicio',
                attributes: ['id_servicio', 'nombre']
            },
            {
                model: Usuario,
                as: 'cliente',
                attributes: ['nombre','telefono'] 
            }],
            order: [['fecha_solicitud', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        // Contar total de solicitudes para este técnico con los mismos filtros
        const countWhereClause = { ...whereClause };
        
        const totalSolicitudes = await SolicitudServicio.count({
            where: countWhereClause
        });

        // Formatear la respuesta para incluir el objeto servicio y excluir id_usuario
        const solicitudesFormateadas = solicitudes.map(solicitud => {
            const { servicio, id_servicio, id_usuario, ...datosSolicitud } = solicitud.toJSON();
            return {
                ...datosSolicitud,
                servicio: servicio || null
            };
        });

        // Contar solicitudes finalizadas (completadas) y pendientes de pago
        const finalizadas = await SolicitudServicio.count({
            where: {
                ...whereClause,
                [Op.or]: [
                    { estado: 'finalizado' },
                    { estado: 'pendiente_pagoservicio' }
                ]
            }
        });

        // Contar solicitudes activas (ni finalizadas ni canceladas)
        const activas = await SolicitudServicio.count({
            where: {
                ...whereClause,
                [Op.and]: [
                    { estado: { [Op.ne]: 'finalizado' } },
                    { estado: { [Op.ne]: 'cancelado' } },
                    { estado: { [Op.ne]: 'pendiente_pagoservicio' } },
                    { estado: { [Op.ne]: 'pendiente_asignacion' } } 
                ]
            }
        });

        // Verificar si hay más resultados
        const hasMore = (parseInt(offset) + solicitudes.length) < totalSolicitudes;

        res.json({
            solicitudes: solicitudesFormateadas,
            total: totalSolicitudes,
            hasMore: hasMore,
            offset: parseInt(offset) + solicitudes.length, // Nuevo offset para la próxima carga
            finalizadas,
            activas,
        });
    } catch (error) {
        console.error('Error al obtener las solicitudes del técnico:', error);
        res.status(500).json({ error: 'Error al obtener las solicitudes del técnico' });
    }
};

//Crear una solicitud de servicio
const crearSolicitudServicio = async (req, res) => {
    try {
        const solicitud = await SolicitudServicio.create(req.body);
        res.json(solicitud);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al crear la solicitud de servicio" });
    }
};

//Actualizar una solicitud de servicio
const actualizarSolicitudServicio = async (req, res) => {
    try {
        const solicitud = await SolicitudServicio.findByPk(req.params.id);
        if (!solicitud) {
            return res.status(404).json({ error: "Solicitud de servicio no encontrada" });
        }
        
        // Si se está cancelando la solicitud
        if (req.body.estado === 'cancelado') {
            // Agregar comentario
            await solicitud.update({ 
                comentario: req.body.comentario,
                estado: 'cancelado'
            });
        } else {
            // Actualización normal
            await solicitud.update(req.body);
        }
        
        res.json(solicitud);
    } catch (error) {
        console.error('Error al actualizar la solicitud de servicio:', error);
        res.status(500).json({ error: "Error al actualizar la solicitud de servicio" });
    }
};

//Eliminar una solicitud de servicio
const eliminarSolicitudServicio = async (req, res) => {
    try {
        const solicitud = await SolicitudServicio.findByPk(req.params.id);
        if (!solicitud) {
            return res.status(404).json({ error: "Solicitud de servicio no encontrada" });
        }
        await solicitud.destroy();
        res.json({ message: "Solicitud de servicio eliminada correctamente" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al eliminar la solicitud de servicio" });
    }
};

module.exports = {
    obtenerSolicitudesPorTecnico,
    obtenerSolicitudesServicios,
    obtenerSolicitudServicioPorServicio,
    obtenerSolicitudServicioPorUsuario,
    crearSolicitudServicio,
    actualizarSolicitudServicio,
    eliminarSolicitudServicio
};
