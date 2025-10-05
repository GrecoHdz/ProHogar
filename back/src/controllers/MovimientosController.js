const Movimiento = require("../models/movimientosModel");
const Cotizacion = require("../models/cotizacionModel"); 
const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicio = require("../models/serviciosModel");
const { Op, Sequelize } = require('sequelize');


// Obtener todos los movimientos
const getAllMovimientos = async (req, res) => {
    try {
        const movimientos = await Movimiento.findAll();
        res.json(movimientos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener los movimientos" });
    }
};

// Obtener movimientos para el tecnico
const getMovimientosPorUsuario = async (req, res) => {
    try {
        const { mes, tipo, page = 1, limit = 10 } = req.query;
        const { id_usuario } = req.params;
        
        // Convertir a números enteros
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        const year = new Date().getFullYear();
        const mesAjustado = parseInt(mes) - 1; // Ajustar el mes (0-11)
        const startDate = new Date(year, mesAjustado, 1);
        const endDate = new Date(year, mesAjustado + 1, 0, 23, 59, 59);
        
        // Configurar condiciones de búsqueda
        const where = {
            id_usuario: id_usuario,
            fecha: {
                [Op.between]: [startDate, endDate]
            }
        };

        // Filtrar por tipo si se especifica
        const esRetiro = tipo === 'retiros';
        const esIngreso = tipo === 'ingresos';
        
        if (esRetiro) where.tipo = 'retiro';
        if (esIngreso) where.tipo = 'ingreso';

        // Configuración base de la consulta
        const queryOptions = {
            where,
            order: [['fecha', 'DESC']],
            raw: false
        };

        // Incluir relaciones necesarias para ingresos
        if (esIngreso) {
            queryOptions.include = [{
                model: Cotizacion,
                as: 'cotizacion',
                required: false,
                include: [{
                    model: SolicitudServicio,
                    as: 'solicitud',
                    required: false,
                    attributes: ['colonia', 'id_servicio', 'id_solicitud'],
                    include: [{
                        model: Servicio,
                        as: 'servicio',
                        required: false,
                        attributes: ['nombre']
                    }]
                }]
            }];
            
            // Asegurar que se incluyan los IDs de las relaciones
            queryOptions.attributes = {
                include: ['id_cotizacion']
            };
            
            // Incluir los atributos necesarios del movimiento
            queryOptions.attributes = ['id_movimiento', 'monto', 'fecha', 'estado', 'tipo', 'id_cotizacion'];
            queryOptions.raw = false;
        }

        // Obtener total de registros para la paginación
        const total = await Movimiento.count({ 
            where: queryOptions.where,
            distinct: true,
            col: 'id_movimiento' // Asegurar que cuente por el ID del movimiento
        });
        
        const totalPages = Math.ceil(total / limitNum);

        // Aplicar paginación a la consulta
        queryOptions.limit = limitNum;
        queryOptions.offset = offset;
        queryOptions.distinct = true; // Importante para evitar duplicados en la paginación

        // Obtener movimientos con paginación
        const { count, rows: movimientos } = await Movimiento.findAndCountAll({
            ...queryOptions,
            // Solo obtener los IDs primero
            attributes: ['id_movimiento', 'id_cotizacion', 'tipo', 'monto', 'fecha', 'estado']
        });
        
        // Cargar las relaciones para cada movimiento
        const movimientosConRelaciones = await Promise.all(movimientos.map(async movimiento => {
            const include = [];
            
            if (movimiento.tipo === 'ingreso' && movimiento.id_cotizacion) {
                // Cargar la cotización con sus relaciones
                const cotizacion = await Cotizacion.findByPk(movimiento.id_cotizacion, {
                    include: [{
                        model: SolicitudServicio,
                        as: 'solicitud',
                        attributes: ['colonia', 'id_servicio', 'id_solicitud'],
                        include: [{
                            model: Servicio,
                            as: 'servicio',
                            attributes: ['nombre']
                        }]
                    }]
                });
                
                return {
                    ...movimiento.get({ plain: true }),
                    cotizacion: cotizacion ? cotizacion.get({ plain: true }) : null
                };
            }
            
            return movimiento.get({ plain: true });
        }));
        
        // Formatear la respuesta
        const movimientosFormateados = movimientosConRelaciones.map(datosMovimiento => {
            const esIngreso = datosMovimiento.tipo === 'ingreso';
            const esRetiro = datosMovimiento.tipo === 'retiro';
            
            // Asegurar que el estado esté en minúsculas para consistencia
            const estadoNormalizado = (datosMovimiento.estado || '').toLowerCase();
            
            const base = {
                id_movimiento: datosMovimiento.id_movimiento,
                monto: parseFloat(datosMovimiento.monto).toFixed(2),
                fecha: new Date(datosMovimiento.fecha).toISOString().split('T')[0],
                estado: estadoNormalizado === 'completado' ? 'Completado' : 'Pendiente',
                tipo: datosMovimiento.tipo
            };

            // Agregar campos específicos para ingresos
            if (esIngreso) {
                const cotizacion = datosMovimiento.cotizacion;
                
                if (cotizacion) {
                    const solicitud = cotizacion.solicitud;
                    
                    if (solicitud) {
                        const colonia = solicitud.colonia;
                        const servicio = solicitud.servicio;
                        
                        // Agregar datos específicos de ingreso
                        Object.assign(base, {
                            colonia: colonia || 'Sin colonia especificada',
                            servicio: servicio ? servicio.nombre : 'Servicio no especificado'
                        });
                    } else {
                        // Si no hay solicitud, establecer valores por defecto
                        Object.assign(base, {
                            colonia: 'Sin colonia especificada',
                            servicio: 'Servicio no especificado'
                        });
                    }
                } else {
                    Object.assign(base, {
                        colonia: 'Sin colonia especificada',
                        servicio: 'Servicio no especificado'
                    });
                }
            } 
            // Agregar campos específicos para retiros
            else if (esRetiro) {
                base.descripcion = datosMovimiento.descripcion || 'Retiro de fondos';
            }

            return base;
        });

        // Calcular totales
        const totales = movimientosFormateados.reduce((acc, mov) => {
            const monto = parseFloat(mov.monto) || 0;
            
            // Para ingresos, verificar estado === 'completado'
            if (mov.tipo === 'ingreso' && mov.estado?.toLowerCase() === 'completado') {
                acc.ingresos += monto;
            }
            
            // Para retiros, verificar estado === 'completado'
            if (mov.tipo === 'retiro' && mov.estado?.toLowerCase() === 'completado') {
                acc.retiros += monto;
            }
            
            return acc;
        }, { ingresos: 0, retiros: 0 });

        // Respuesta final
        res.json({
            success: true,
            data: movimientosFormateados,
            summary: {
                totalIngresos: totales.ingresos.toFixed(2),
                totalRetiros: totales.retiros.toFixed(2),
                mes: startDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
            },
            pagination: {
                total: total,
                page: pageNum,
                limit: limitNum,
                totalPages: totalPages
            }
        });

    } catch (error) {
        console.error('Error en getMovimientosPorUsuario:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener los movimientos del usuario',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener ingresos mensuales por tecnico
const getIngresosMensuales = async (req, res) => {
    try {
      const { id_tecnico } = req.params;
  
      const data = await Movimiento.findAll({
        attributes: [
          [Sequelize.fn('DATE_FORMAT', Sequelize.col('Movimiento.fecha'), '%Y-%m'), 'fecha'],
          [Sequelize.fn('SUM', Sequelize.col('Movimiento.monto')), 'monto']
        ],
        include: [{
          model: Cotizacion,
          as: 'cotizacion',
          required: true,
          attributes: [],
          include: [{
            model: SolicitudServicio,
            as: 'solicitud',
            required: true,
            attributes: [],
            where: { id_tecnico }
          }]
        }],
        where: {
          tipo: 'ingreso',
          estado: 'completado'
        },
        group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('Movimiento.fecha'), '%Y-%m')],
        order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('Movimiento.fecha'), '%Y-%m'), 'ASC']]
      });
  
      const resultado = data.map(item => ({
        fecha: item.getDataValue('fecha'),
        monto: parseFloat(item.getDataValue('monto'))
      }));
  
      res.json(resultado);
    } catch (error) {
      console.error('Error en getIngresosMensuales:', error);
      res.status(500).json({ error: 'Error al obtener ingresos mensuales' });
    }
  };

//Obtener cantidad de servicios por mes
const getServiciosPorMes = async (req, res) => {
    try {
      const { id_tecnico } = req.params;
  
      const data = await Movimiento.findAll({
        attributes: [
          [Sequelize.fn('DATE_FORMAT', Sequelize.col('Movimiento.fecha'), '%Y-%m'), 'fecha'],
          [Sequelize.fn('COUNT', Sequelize.col('Movimiento.id_movimiento')), 'cantidad']
        ],
        include: [{
          model: Cotizacion,
          as: 'cotizacion',
          required: true,
          attributes: [],
          include: [{
            model: SolicitudServicio,
            as: 'solicitud',
            required: true,
            attributes: [],
            where: { id_tecnico }
          }]
        }],
        where: {
          tipo: 'ingreso',
          estado: 'completado'
        },
        group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('Movimiento.fecha'), '%Y-%m')],
        order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('Movimiento.fecha'), '%Y-%m'), 'ASC']]
      });
  
      const resultado = data.map(item => ({
        fecha: item.getDataValue('fecha'),
        cantidad: parseInt(item.getDataValue('cantidad'))
      }));
  
      res.json(resultado);
    } catch (error) {
      console.error('Error en getServiciosPorMes:', error);
      res.status(500).json({ error: 'Error al obtener servicios por mes' });
    }
};

// Obtener cantidad de servicios por tipo para un técnico
const getServiciosPorTipo = async (req, res) => {
    try {
        const { id_tecnico } = req.params;

        // Contar servicios por tipo para el técnico
        const serviciosPorTipo = await SolicitudServicio.findAll({
            attributes: [
                [Sequelize.col('servicio.nombre'), 'tipo_servicio'],
                [Sequelize.fn('COUNT', Sequelize.col('solicitudservicio.id_solicitud')), 'cantidad']
            ],
            include: [{
                model: Servicio,
                as: 'servicio',
                attributes: [],
                required: true
            }],
            where: {
                id_tecnico: id_tecnico,
                estado: 'finalizado' // Solo contar servicios finalizados
            },
            group: ['servicio.nombre'],
            order: [[Sequelize.literal('cantidad'), 'DESC']],
            raw: true
        });

        // Formatear el resultado
        const resultado = serviciosPorTipo.map(item => ({
            tipo: item.tipo_servicio,
            cantidad: parseInt(item.cantidad)
        }));

        res.json(resultado);
    } catch (error) {
        console.error('Error en getServiciosPorTipo:', error);
        res.status(500).json({ error: 'Error al obtener servicios por tipo' });
    }
};

//Obtener Estadisticas Generales del tecnico
const getEstadisticasGenerales = async (req, res) => {
    try {
        const { id_tecnico } = req.params;
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth() + 1;
        const currentYear = currentDate.getFullYear();
        const last3Months = new Date();
        last3Months.setMonth(last3Months.getMonth() - 2);

        // Obtener total de servicios
        const totalServicios = await Movimiento.count({
            where: {
                id_usuario: id_tecnico,
                estado: 'completado'
            }
        });

        // Obtener servicios de los últimos 3 meses
        const serviciosUltimos3Meses = await Movimiento.count({
            where: {
                id_usuario: id_tecnico,
                estado: 'completado',
                fecha: {
                    [Op.gte]: last3Months
                }
            }
        });

        // Obtener servicios del mes actual
        const serviciosMesActual = await Movimiento.count({
            where: {
                id_usuario: id_tecnico,
                estado: 'completado',
                [Op.and]: [
                    Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('fecha')), currentMonth),
                    Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('fecha')), currentYear)
                ]
            }
        });

        // 🔹 Último ingreso
        const ultimoIngreso = await Movimiento.findOne({
            where: { tipo: 'ingreso', estado: 'completado', id_usuario: id_tecnico },
            order: [['fecha', 'DESC']]
        });

        // 🔹 Último retiro
        const ultimoRetiro = await Movimiento.findOne({
            where: { tipo: 'retiro', estado: 'completado', id_usuario: id_tecnico },
            order: [['fecha', 'DESC']]
        });

        // 🔹 Calcular balance disponible
        const movimientos = await Movimiento.findAll({
            where: { id_usuario: id_tecnico, estado: 'completado' },
            attributes: ['tipo', 'monto']
        });

        let balance = 0;
        movimientos.forEach(mov => {
            if (mov.tipo === 'ingreso') balance += parseFloat(mov.monto);
            if (mov.tipo === 'retiro') balance -= parseFloat(mov.monto);
        });

        res.json({
            totalServicios,
            serviciosUltimos3Meses,
            serviciosMesActual,
            ultimoIngreso: ultimoIngreso ? Number(parseFloat(ultimoIngreso.monto).toFixed(2)) : null,
            ultimoRetiro: ultimoRetiro ? Number(parseFloat(ultimoRetiro.monto).toFixed(2)) : null,
            balanceDisponible: Number(balance.toFixed(2))
        });

    } catch (error) {
        console.error('Error en getEstadisticasGenerales:', error);
        res.status(500).json({ error: 'Error al obtener estadísticas generales' });
    }
}; 

//Obtener ingresos totales por referido
const getIngresosTotalesReferidos = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        
        // Obtener la suma de ingresos por referidos
        const ingresosTotales = await Movimiento.sum('monto', {
            where: { id_usuario, tipo: 'ingreso_referido', estado: 'completado' }
        }) || 0;

        // Obtener la suma de todos los retiros
        const retirosTotales = await Movimiento.sum('monto', {
            where: { id_usuario, tipo: 'retiro' }
        }) || 0;

        // Obtener la suma de retiros completados
        const retirosCompletados = await Movimiento.sum('monto', {
            where: { id_usuario, tipo: 'retiro', estado: 'completado' }
        }) || 0;

        // Calcular saldo disponible
        const saldoDisponible = ingresosTotales - retirosTotales;
        
        res.json({ 
            success: true,
            total: ingresosTotales,
            saldoDisponible: saldoDisponible > 0 ? saldoDisponible : 0,
            retirado: retirosCompletados
        });
    } catch (error) {
        console.error('Error en getIngresosTotalesReferidos:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener información de ingresos y retiros' 
        });
    }
};   

// Obtener historial de ingresos y/o retiros de referidos de un usuario, con límite, filtro por mes y tipo y resumen
const getIngresosyRetirosdeReferidos = async (req, res) => {
    try {
        const { id_usuario } = req.params;
        const { mes, tipo, page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Validaciones
        if (!id_usuario) {
            return res.status(400).json({ 
                success: false,
                error: "El parámetro id_usuario es requerido" 
            });
        }

        if (!mes || isNaN(mes) || mes < 1 || mes > 12) {
            return res.status(400).json({ 
                success: false,
                error: "Debe proporcionar un mes válido (1-12)" 
            });
        }

        // Configurar fechas
        const year = new Date().getFullYear();
        const mesAjustado = parseInt(mes) - 1;
        const startDate = new Date(year, mesAjustado, 1);
        const endDate = new Date(year, mesAjustado + 1, 0, 23, 59, 59);

        // Configurar condiciones de búsqueda
        const where = {
            id_usuario,
            fecha: { [Op.between]: [startDate, endDate] }
        };

        // Filtrar por tipo si se especifica
        if (tipo && ['retiro', 'ingreso_referido'].includes(tipo)) {
            where.tipo = tipo;
        }

        // Obtener total de registros para la paginación
        const total = await Movimiento.count({
            where,
            distinct: true,
            col: 'id_movimiento'
        });

        // Configurar opciones de consulta con paginación
        const queryOptions = {
            where,
            order: [['fecha', 'DESC']],
            attributes: ['id_movimiento', 'monto', 'descripcion', 'fecha', 'estado', 'tipo'],
            limit: parseInt(limit),
            offset,
            distinct: true,
            raw: false
        };

        // Obtener movimientos con paginación
        const { count, rows: movimientos } = await Movimiento.findAndCountAll(queryOptions);

        // Formatear movimientos
        const movimientosFormateados = movimientos.map(mov => {
            const datos = mov.get({ plain: true });
            return {
                id_movimiento: datos.id_movimiento,
                monto: parseFloat(datos.monto).toFixed(2),
                fecha: new Date(datos.fecha).toISOString().split('T')[0],
                estado: (datos.estado || '').toLowerCase() === 'completado' ? 'Completado' : 'Pendiente',
                tipo: datos.tipo,
                descripcion: datos.descripcion || (datos.tipo === 'retiro' ? 'Retiro de fondos' : 'Ingreso por referido')
            };
        });

        // Calcular totales (solo completados)
        const totales = movimientosFormateados.reduce(
            (acc, mov) => {
                const monto = parseFloat(mov.monto) || 0;
                const esCompletado = mov.estado.toLowerCase() === 'completado';

                if (mov.tipo === 'ingreso_referido' && esCompletado) acc.ingresosReferido += monto;
                if (mov.tipo === 'retiro' && esCompletado) acc.retiros += monto;

                return acc;
            },
            { ingresosReferido: 0, retiros: 0 }
        );

        const totalPages = Math.ceil(total / limit);

        // Respuesta final
        res.json({
            success: true,
            data: movimientosFormateados,
            summary: {
                totalIngresosReferido: totales.ingresosReferido.toFixed(2),
                totalRetiros: totales.retiros.toFixed(2),
                mes: startDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
            },
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages
            }
        });

    } catch (error) {
        console.error('Error en getIngresosyRetirosdeReferidos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los movimientos de referidos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 

// Crear movimiento
const crearMovimiento = async (req, res) => {
    try { 
        const movimiento = await Movimiento.create({
            ...req.body,
            estado: 'pendiente'
        });
        res.status(201).json({
            success: true,
            message: 'Movimiento creado exitosamente',
            data: movimiento
        });
    } catch (error) {
        console.error('Error al crear movimiento:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al crear el movimiento',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Actualizar movimiento
const actualizarMovimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const [updated] = await Movimiento.update(req.body, {
            where: { id_movimiento: id }
        });

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: 'Movimiento no encontrado'
            });
        }

        const movimientoActualizado = await Movimiento.findByPk(id);
        res.json({
            success: true,
            message: 'Movimiento actualizado exitosamente',
            data: movimientoActualizado
        });

    } catch (error) {
        console.error('Error al actualizar movimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al actualizar el movimiento',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Eliminar movimiento (soft delete)
const eliminarMovimiento = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Movimiento.destroy({
            where: { id_movimiento: id }
        });

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: 'Movimiento no encontrado'
            });
        }

        res.json({
            success: true,
            message: 'Movimiento eliminado exitosamente'
        });

    } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar el movimiento',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 

// Exportar controladores
module.exports = {
    getAllMovimientos,
    getMovimientosPorUsuario,
    getIngresosMensuales,
    getServiciosPorMes,
    getServiciosPorTipo,
    getEstadisticasGenerales,
    getIngresosTotalesReferidos,
    getIngresosyRetirosdeReferidos,
    crearMovimiento,
    actualizarMovimiento,
    eliminarMovimiento
};