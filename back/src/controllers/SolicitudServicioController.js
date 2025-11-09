const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicio = require("../models/serviciosModel");
const Usuario = require("../models/usuariosModel");
const Ciudad = require("../models/ciudadesModel"); 
const Calificacion = require("../models/calificacionesModels"); 
const Pagovisita = require("../models/pagoVisitaModel"); 
const Cuenta = require("../models/cuentasModel"); 
const Cotizacion = require("../models/cotizacionModel"); 
const { Op, Sequelize } = require("sequelize"); 

// Obtener estadísticas de pagos con filtros
const obtenerEstadisticasPagos = async (req, res) => {
    try {
        // Obtener parámetros de filtro
        const month = req.query.month; // Formato esperado: 'YYYY-MM'
        const id_tecnico = req.query.id_tecnico;
        const serviceType = req.query.serviceType;

        // Construcción de condiciones
        const whereCondition = {};
        const andConditions = [];

        // Filtrar por técnico si se proporciona el ID
        if (id_tecnico) {
            whereCondition.id_tecnico = id_tecnico;
        }

        // Filtro por mes (año y mes)
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('fecha_solicitud')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('fecha_solicitud')), monthNum)
            );
        }

        // Filtro por tipo de servicio
        if (serviceType) {
            whereCondition.id_servicio = parseInt(serviceType);
        }

        // Combinar condiciones
        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        // Obtener estadísticas
        const [estadisticas, serviciosMasSolicitados] = await Promise.all([
            // Estadísticas generales
            SolicitudServicio.findAll({
                attributes: [
                    [Sequelize.fn('COUNT', Sequelize.col('id_solicitud')), 'total_solicitudes'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'completado' THEN 1 END)"), 'completadas'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'cancelado' THEN 1 END)"), 'canceladas'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'en_proceso' THEN 1 END)"), 'en_proceso'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'pendiente_asignacion' THEN 1 END)"), 'pendientes_asignacion'],
                    [Sequelize.literal("AVG(TIMESTAMPDIFF(HOUR, fecha_solicitud, NOW()))"), 'tiempo_promedio_horas']
                ],
                where: whereCondition,
                raw: true
            }),
            
            // Servicios más solicitados
            SolicitudServicio.findAll({
                attributes: [
                    'id_servicio',
                    [Sequelize.fn('COUNT', Sequelize.col('id_solicitud')), 'total'],
                    [Sequelize.col('servicio.nombre'), 'nombre_servicio']
                ],
                include: [{
                    model: Servicio,
                    as: 'servicio',
                    attributes: []
                }],
                where: whereCondition,
                group: ['id_servicio', 'servicio.nombre'],
                order: [[Sequelize.literal('total'), 'DESC']],
                limit: 5, // Top 5 servicios más solicitados
                raw: true
            })
        ]);

        // Procesar estadísticas
        const statsData = estadisticas[0] || { 
            completadas: 0, 
            canceladas: 0, 
            en_proceso: 0, 
            pendientes_asignacion: 0 
        };

        // Calcular total sumando todos los estados
        const total = Object.values(statsData).reduce((sum, value) => sum + (parseInt(value) || 0), 0);

        // Crear objeto de estadísticas
        const monthlyStats = {
            aprobados: parseInt(statsData.completadas) || 0,
            rechazados: parseInt(statsData.canceladas) || 0,
            pendientes: parseInt(statsData.pendientes_asignacion) + parseInt(statsData.en_proceso) || 0,
            total: total
        };

        // Formatear respuesta
        const resultado = {
            tiempo_promedio_horas: parseFloat(estadisticas[0]?.tiempo_promedio_horas) || 0,
            servicios_mas_solicitados: serviciosMasSolicitados.map(s => ({
                id_servicio: s.id_servicio,
                nombre: s.nombre_servicio,
                total: parseInt(s.total) || 0
            }))
        };

        // Enviar respuesta
        res.json({
            success: true,
            data: resultado
        });
    } catch (error) {
        console.error("Error al obtener estadísticas de solicitudes:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener estadísticas de solicitudes",
            details: error.message 
        });
    }
};

//Obtener todas las solicitudes de servicios con paginación 
const obtenerSolicitudesServicios = async (req, res) => {
    try {
      // Obtener parámetros de paginación y filtros
      let limit = parseInt(req.query.limit) || 10; // Por defecto 10 elementos
      limit = Math.min(limit, 10); // Máximo 100 por rendimiento
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
  
      // Obtener estadísticas de solicitudes por estado
      const [total, stats] = await Promise.all([
        // 1️⃣ Obtener el conteo total con include (para evitar el error del alias)
        SolicitudServicio.count({
          where: whereCondition,
          include: [
            {
              model: Usuario,
              as: 'cliente',
              attributes: []
            }
          ],
          distinct: true,
          col: 'id_solicitud'
        }),
        
        // Obtener conteo por estado
        SolicitudServicio.findAll({
          attributes: [
            [Sequelize.literal("COUNT(CASE WHEN estado = 'completado' OR estado = 'finalizado' OR estado = 'calificado' THEN 1 END)"), 'aprobados'],
            [Sequelize.literal("COUNT(CASE WHEN estado = 'cancelado' THEN 1 END)"), 'rechazados'],
            [Sequelize.literal("COUNT(CASE WHEN estado = 'pendiente_pagoservicio' THEN 1 END)"), 'pendientes']
          ],
          where: whereCondition,
          raw: true
        })
      ]);
      
      // Procesar estadísticas
      const statsData = stats[0] || { aprobados: 0, rechazados: 0, pendientes: 0 };
      const monthlyStats = {
        aprobados: parseInt(statsData.aprobados) || 0,
        rechazados: parseInt(statsData.rechazados) || 0,
        pendientes: parseInt(statsData.pendientes) || 0,
        total: parseInt(statsData.aprobados || 0) + parseInt(statsData.rechazados || 0) + parseInt(statsData.pendientes || 0)
      };
  
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
        hasMore: offset + limit < total,
        estadisticas: monthlyStats
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

// Obtener datos para Gráfico de solicitudes de servicios por tipo
const obtenerGraficaServiciosPorTipo = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        
        // Construir condición de fecha si se proporciona
        const whereCondition = {};
        if (fechaInicio || fechaFin) {
            whereCondition.fecha_solicitud = {};
            if (fechaInicio) {
                whereCondition.fecha_solicitud[Op.gte] = new Date(fechaInicio);
            }
            if (fechaFin) {
                const finDia = new Date(fechaFin);
                finDia.setHours(23, 59, 59, 999);
                whereCondition.fecha_solicitud[Op.lte] = finDia;
            }
        }

        // Obtener el conteo de servicios por tipo
        const serviciosPorTipo = await SolicitudServicio.findAll({
            where: whereCondition,
            include: [{
                model: Servicio,
                as: 'servicio',
                attributes: ['id_servicio', 'nombre']
            }],
            attributes: [
                [Sequelize.col('servicio.id_servicio'), 'id_servicio'],
                [Sequelize.col('servicio.nombre'), 'nombre_servicio'],
                [Sequelize.fn('COUNT', Sequelize.col('solicitudservicio.id_solicitud')), 'total']
            ],
            group: ['servicio.id_servicio', 'servicio.nombre'],
            order: [[Sequelize.literal('total'), 'DESC']],
            raw: true
        });

        // Formatear los datos para el gráfico
        const datosGrafico = {
            labels: [],
            data: []
        };

        // Llenar los datos del gráfico
        serviciosPorTipo.forEach(item => {
            datosGrafico.labels.push(item.nombre_servicio);
            datosGrafico.data.push(parseInt(item.total));
        });

        res.json({
            success: true,
            data: datosGrafico,
            total: serviciosPorTipo.reduce((sum, item) => sum + parseInt(item.total), 0)
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de servicios por tipo:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las estadísticas de servicios por tipo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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

// Obtener datos para Gráfico de servicios por mes
const obtenerGraficaServiciosPorMes = async (req, res) => {
    try {
        const { fechaActual } = req.query;
        const endDate = fechaActual ? new Date(fechaActual) : new Date();
        
        // Calcular la fecha de inicio (12 meses atrás)
        const startDate = new Date(endDate);
        startDate.setMonth(startDate.getMonth() - 11); // 11 meses + el mes actual = 12 meses
        startDate.setDate(1); // Primer día del mes
        startDate.setHours(0, 0, 0, 0);

        // Asegurar que el final del rango sea el último día del mes a la última hora
        const endOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Generar los 12 meses para asegurar que todos los meses aparezcan
        const meses = [];
        const data = [];
        const currentMonth = new Date(startDate);

        while (currentMonth <= endDate) {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const monthName = currentMonth.toLocaleString('es-ES', { month: 'short' });
            
            meses.push(`${monthName} ${year}`);
            
            // Inicializar contador para este mes
            data.push(0);
            
            // Mover al siguiente mes
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        // Obtener el conteo de servicios por mes
        const serviciosPorMes = await SolicitudServicio.findAll({
            where: {
                fecha_solicitud: {
                    [Op.between]: [startDate, endOfMonth]
                }
            },
            attributes: [
                [Sequelize.fn('YEAR', Sequelize.col('fecha_solicitud')), 'year'],
                [Sequelize.fn('MONTH', Sequelize.col('fecha_solicitud')), 'month'],
                [Sequelize.fn('COUNT', Sequelize.col('id_solicitud')), 'total']
            ],
            group: [
                Sequelize.fn('YEAR', Sequelize.col('fecha_solicitud')),
                Sequelize.fn('MONTH', Sequelize.col('fecha_solicitud'))
            ],
            order: [
                [Sequelize.fn('YEAR', Sequelize.col('fecha_solicitud')), 'ASC'],
                [Sequelize.fn('MONTH', Sequelize.col('fecha_solicitud')), 'ASC']
            ],
            raw: true
        });

        // Mapear los resultados a los meses correspondientes
        serviciosPorMes.forEach(item => {
            const monthIndex = (item.year - startDate.getFullYear()) * 12 + (item.month - startDate.getMonth() - 1);
            if (monthIndex >= 0 && monthIndex < data.length) {
                data[monthIndex] = parseInt(item.total);
            }
        });

        res.json({
            success: true,
            data: {
                labels: meses,
                data: data
            },
            total: data.reduce((sum, count) => sum + count, 0)
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de servicios por mes:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las estadísticas de servicios por mes',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener datos para Gráfico de servicios por ciudad
const obtenerGraficaServiciosPorCiudad = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        
        // Construir condición de fecha si se proporciona
        const whereCondition = {};
        if (fechaInicio || fechaFin) {
            whereCondition.fecha_solicitud = {};
            if (fechaInicio) {
                whereCondition.fecha_solicitud[Op.gte] = new Date(fechaInicio);
            }
            if (fechaFin) {
                const finDia = new Date(fechaFin);
                finDia.setHours(23, 59, 59, 999);
                whereCondition.fecha_solicitud[Op.lte] = finDia;
            }
        }

        // Obtener el conteo de servicios por ciudad
        const serviciosPorCiudad = await SolicitudServicio.findAll({
            where: whereCondition,
            include: [{
                model: Ciudad,
                as: 'ciudad',
                attributes: ['id_ciudad', 'nombre_ciudad'],
                required: true
            }],
            attributes: [
                'id_ciudad',
                [Sequelize.fn('COUNT', Sequelize.col('SolicitudServicio.id_solicitud')), 'total']
            ],
            group: ['SolicitudServicio.id_ciudad', 'ciudad.nombre_ciudad'],
            order: [[Sequelize.literal('total'), 'DESC']],
            raw: true,
            nest: true
        });

        // Formatear los datos para el gráfico
        const datosGrafico = {
            labels: [],
            data: []
        };

        // Llenar los datos del gráfico
        serviciosPorCiudad.forEach(item => {
            if (item.ciudad && item.ciudad.nombre_ciudad) {  // Solo incluir si tiene ciudad asignada
                datosGrafico.labels.push(item.ciudad.nombre_ciudad);
                datosGrafico.data.push(parseInt(item.total));
            }
        });

        res.json({
            success: true,
            data: datosGrafico,
            total: serviciosPorCiudad.reduce((sum, item) => sum + (item.nombre_ciudad ? parseInt(item.total) : 0), 0)
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de servicios por ciudad:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las estadísticas de servicios por ciudad',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerEstadisticasPagos,
    obtenerSolicitudesPorTecnico,
    obtenerSolicitudesServicios,
    obtenerGraficaServiciosPorTipo,
    obtenerGraficaServiciosPorMes,
    obtenerGraficaServiciosPorCiudad,
    obtenerSolicitudServicioPorServicio,
    obtenerSolicitudServicioPorUsuario,
    crearSolicitudServicio,
    actualizarSolicitudServicio,
    eliminarSolicitudServicio
};
