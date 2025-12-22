const Movimiento = require("../models/movimientosModel");
const Cotizacion = require("../models/cotizacionModel"); 
const SolicitudServicio = require("../models/solicitudServicioModel");
const Servicio = require("../models/serviciosModel");
const { Op, Sequelize } = require('sequelize');
const sequelize = require('../config/database');
const Membresia = require('../models/membresiaModel');
const PagoVisita = require('../models/pagoVisitaModel');
const Usuario = require('../models/usuariosModel');
const Rol = require('../models/rolesModel');

//Obtener transacciones con datos de cotización y suma total de montos
const getTransacciones = async (req, res) => {
    try {
      const { id_usuario } = req.params;
      const { 
        page = 1, 
        limit = 5, 
        startDate, 
        endDate
      } = req.query;
  
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const offset = (pageNum - 1) * limitNum;
  
      // 📅 Condiciones base
      const where = { id_usuario };
  
      if (startDate && endDate) {
        where.fecha = {
          [Op.between]: [
            ajustarFechaLocal(startDate, true), // Inicio del día
            ajustarFechaLocal(endDate)         // Fin del día
          ]
        };
      }
  
      // 📊 Contar total de registros
      const totalMovimientos = await Movimiento.count({ where });
      
      // 📋 Contar membresías activas y vencidas
      const whereMembresiasCount = { id_usuario };
      if (startDate && endDate) {
        whereMembresiasCount.fecha = {
          [Op.between]: [
            ajustarFechaLocal(startDate, true),
            ajustarFechaLocal(endDate)
          ]
        };
      }
      
      const totalMembresiasCount = await Membresia.count({
        where: {
          ...whereMembresiasCount,
          estado: { [Op.in]: ['activa', 'vencida'] }
        }
      });
      
      const total = totalMovimientos + totalMembresiasCount;
  
      // 📦 Obtener movimientos con relación a cotización
      const movimientos = await Movimiento.findAll({
        where,
        order: [['fecha', 'DESC']],
        limit: limitNum,
        offset: offset,
        attributes: [
          'id_movimiento',
          'descripcion',
          'monto',
          'tipo',
          'fecha',
          'estado',
          'id_cotizacion'
        ],
        include: [
          {
            model: Cotizacion,
            as: 'cotizacion',
            required: false,
            attributes: [
              'id_cotizacion',
              'id_solicitud',
              'monto_manodeobra',
              'descuento_membresia',
              'credito_usado'
            ]
          }
        ]
      });
  
      // 💰 Calcular saldo disponible total
      const totalIngresos = await Movimiento.sum('monto', {
        where: {
          id_usuario,
          estado: 'completado',
          tipo: { [Op.in]: ['ingreso', 'ingreso_referido'] }
        }
      });

      const totalRetiros = await Movimiento.sum('monto', {
        where: {
          id_usuario,
          estado: 'completado',
          tipo: 'retiro'
        }
      });

      // 📋 Obtener membresías activas y vencidas del usuario
      const whereMembresias = { id_usuario };
      if (startDate && endDate) {
        whereMembresias.fecha = {
          [Op.between]: [
            ajustarFechaLocal(startDate, true),
            ajustarFechaLocal(endDate)
          ]
        };
      }

      const membresias = await Membresia.findAll({
        where: {
          ...whereMembresias,
          estado: { [Op.in]: ['activa', 'vencida'] }
        },
        attributes: ['id_membresia', 'monto', 'fecha', 'estado'],
        order: [['fecha', 'DESC']],
        raw: true
      });

      // 💰 Sumar montos de membresías al saldo
      const totalMembresias = membresias.reduce((sum, m) => sum + (parseFloat(m.monto) || 0), 0);

      // Calcular saldo disponible para el rango de fechas si se especificó
      let saldoRangoFechas = null;
      if (startDate && endDate) {
        const ingresosRango = await Movimiento.sum('monto', {
          where: {
            ...where,
            estado: 'completado',
            tipo: { [Op.in]: ['ingreso', 'ingreso_referido'] }
          }
        });

        const retirosRango = await Movimiento.sum('monto', {
          where: {
            ...where,
            estado: 'completado',
            tipo: 'retiro'
          }
        });

        // Sumar membresías del rango al saldo de fechas
        const membresiasRango = await Membresia.sum('monto', {
          where: {
            ...whereMembresias,
            estado: { [Op.in]: ['activa', 'vencida'] }
          }
        });

        saldoRangoFechas = parseFloat((ingresosRango || 0) - (retirosRango || 0) + (membresiasRango || 0));
      }

      const saldoDisponible = parseFloat((totalIngresos || 0) - (totalRetiros || 0) + totalMembresias);
  
      // 🧩 Formatear respuesta
      const transaccionesMovimientos = movimientos.map(mov => {
        const data = mov.get({ plain: true });
  
        return {
          id_movimiento: data.id_movimiento,
          descripcion: data.descripcion || 'Transacción',
          monto: parseFloat(data.monto),
          tipo: data.tipo,
          fecha: data.fecha,
          estado: data.estado,
          cotizacion: data.cotizacion
            ? { 
                id_solicitud: data.cotizacion.id_solicitud,
                monto_manodeobra: parseFloat(data.cotizacion.monto_manodeobra || 0),
                descuento_membresia: parseFloat(data.cotizacion.descuento_membresia || 0),
                credito_usado: parseFloat(data.cotizacion.credito_usado || 0)
              }
            : null
        };
      });

      // 📋 Formatear membresías como movimientos de ingreso
      const transaccionesMembresias = membresias.map(membresia => ({
        id_movimiento: `membresia_${membresia.id_membresia}`,
        descripcion: `Pago Membresía`,
        monto: parseFloat(membresia.monto),
        tipo: 'ingreso',
        fecha: membresia.fecha,
        estado: 'completado',
        cotizacion: null
      }));

      // 🔄 Combinar todas las transacciones
      const transacciones = [...transaccionesMovimientos, ...transaccionesMembresias];
      
      // 📅 Ordenar por fecha descendente
      transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
      // 📤 Respuesta final
      res.json({
        success: true,
        data: transacciones,
        saldoDisponible,
        saldoRangoFechas: saldoRangoFechas !== null ? saldoRangoFechas : saldoDisponible,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      });
  
    } catch (error) {
      console.error('Error al obtener transacciones:', error);
      res.status(500).json({
        success: false,
        error: 'Error al obtener las transacciones',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
};
  
const getTopUsuariosCredito = async (req, res) => {
    try {
        // Obtener el top 5 de técnicos con más crédito
        const topUsuarios = await Movimiento.findAll({
            attributes: [
                'id_usuario',
                [Sequelize.literal(`
                    SUM(CASE 
                        WHEN Movimiento.tipo IN ('ingreso', 'ingreso_referido') AND Movimiento.estado = 'completado' THEN Movimiento.monto 
                        WHEN Movimiento.tipo = 'retiro' AND Movimiento.estado = 'completado' THEN -Movimiento.monto 
                        ELSE 0 
                    END)
                `), 'saldo_total']
            ],
            group: ['Movimiento.id_usuario'],
            order: [['saldo_total', 'DESC']],
            limit: 5,
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['nombre'],
                include: [{
                    model: Rol,   
                    as: 'rol', 
                    where: {
                        nombre_rol: 'tecnico'  
                    },
                    attributes: [] 
                }],
                required: true
            }],
            raw: true,
            nest: true
        });

        // Formatear la respuesta
        const resultado = topUsuarios.map(item => ({ 
            nombre: item.usuario?.nombre ? 
                   `${item.usuario.nombre}`.trim() : 
                   'Técnico sin nombre',
            saldo_total: parseFloat(item.saldo_total) || 0
        }));

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('Error al obtener top técnicos por crédito:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener el top de técnicos por crédito',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
// Obtener todos los retiros con información detallada y filtros
const obtenerRetiros = async (req, res) => {
    try {
        // Obtener parámetros de paginación y búsqueda
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 10); // Máximo 10 por rendimiento
        const offset = parseInt(req.query.offset) || 0;
        const searchTerm = req.query.search || '';
        const estado = req.query.estado;
        const month = req.query.month; // Formato: 'YYYY-MM'
        const metodoPago = req.query.metodo_pago;

        // Construir condiciones de búsqueda
        const whereCondition = { tipo: 'retiro' }; // Solo retiros
        const andConditions = [];

        // Filtro por término de búsqueda
        if (searchTerm) {
            andConditions.push({
                [Op.or]: [
                    { '$usuario.nombre$': { [Op.like]: `%${searchTerm}%` } },
                    { '$usuario.telefono$': { [Op.like]: `%${searchTerm}%` } },
                    { referencia: { [Op.like]: `%${searchTerm}%` } },
                    { concepto: { [Op.like]: `%${searchTerm}%` } }
                ]
            });
        }

        // Filtro por estado
        if (estado) {
            whereCondition.estado = estado;
        }

        // Filtro por método de pago
        if (metodoPago) {
            whereCondition.metodo_pago = metodoPago;
        }

        // Filtro por mes (año y mes)
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('Movimiento.fecha')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('Movimiento.fecha')), monthNum)
            );
        }

        // Combinar condiciones
        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        // Configuración base de la consulta
        const queryOptions = {
            where: whereCondition,
            order: [['fecha', 'DESC']],
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    required: false,
                    attributes: ['nombre']
                },
                {
                    model: Cotizacion,
                    as: 'cotizacion',
                    required: false,
                    attributes: ['id_solicitud', 'monto_manodeobra', 'descuento_membresia', 'credito_usado'],
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
                }
            ],
            attributes: [
                'id_movimiento', 
                'monto', 
                'fecha', 
                'estado', 
                'tipo', 
                'id_cotizacion', 
                'id_usuario',
                'descripcion'
            ],
            raw: false,
            distinct: true
        };

        // Obtener estadísticas de movimientos por estado
        const stats = await Movimiento.findAll({
            where: whereCondition,
            attributes: [
                'estado',
                [Sequelize.fn('COUNT', Sequelize.col('id_movimiento')), 'total']
            ],
            group: ['estado'],
            raw: true
        });

        // Inicializar estadísticas
        const statsData = {
            pendientes: 0,
            completados: 0,
            rechazados: 0,
            total: 0
        };

        // Procesar estadísticas
        stats.forEach(stat => {
            const estado = stat.estado ? stat.estado.toLowerCase() : 'pendiente';
            const total = parseInt(stat.total) || 0;
            
            if (estado.includes('pendiente')) {
                statsData.pendientes += total;
            } else if (estado.includes('completado') || estado.includes('aprobado')) {
                statsData.completados += total;
            } else if (estado.includes('rechazado') || estado.includes('cancelado')) {
                statsData.rechazados += total;
            }
            
            statsData.total += total;
        });

        // Obtener total de registros para la paginación
        const total = statsData.total;
        const totalPages = Math.ceil(total / limit);

        // Aplicar paginación
        queryOptions.limit = limit;
        queryOptions.offset = offset;

        // Obtener movimientos con paginación
        const { count, rows: movimientos } = await Movimiento.findAndCountAll(queryOptions);

        // Formatear la respuesta
        const movimientosFormateados = await Promise.all(movimientos.map(async movimiento => {
            const datosMovimiento = movimiento.get({ plain: true });
            const esIngreso = datosMovimiento.tipo === 'ingreso';
            const esRetiro = datosMovimiento.tipo === 'retiro';
            const estadoNormalizado = (datosMovimiento.estado || '').toLowerCase();
            
            // Calcular el monto según el tipo de movimiento
            let monto;
            if (esIngreso && datosMovimiento.cotizacion) {
                const cotizacion = datosMovimiento.cotizacion;
                // Cálculo: (monto_manodeobra - descuento_membresia - credito_usado) - monto_movimiento
                const montoBase = (parseFloat(cotizacion.monto_manodeobra || 0) - 
                                parseFloat(cotizacion.descuento_membresia || 0) - 
                                parseFloat(cotizacion.credito_usado || 0));
                monto = (montoBase - parseFloat(datosMovimiento.monto || 0)).toFixed(2);
            } else {
                monto = parseFloat(datosMovimiento.monto || 0).toFixed(2);
            }
            
            const base = {
                id_usuario: datosMovimiento.id_usuario || null,
                id_movimiento: datosMovimiento.id_movimiento,
                id_solicitud: datosMovimiento.cotizacion?.id_solicitud || null,
                monto: monto,
                fecha: new Date(datosMovimiento.fecha).toISOString().split('T')[0],
                estado: estadoNormalizado,
                tipo: datosMovimiento.tipo,
                nombre_usuario: datosMovimiento.usuario ? 
                    `${datosMovimiento.usuario.nombre || ''}`.trim() : 
                    'Usuario no encontrado'
            };

            // Agregar campos específicos para ingresos
            if (esIngreso && datosMovimiento.cotizacion) {
                const solicitud = datosMovimiento.cotizacion.solicitud;
                base.colonia = solicitud?.colonia || 'Sin colonia especificada';
                base.servicio = solicitud?.servicio?.nombre || 'Servicio no especificado';
            } 
            // Agregar campos específicos para retiros
            else if (esRetiro) {
                base.descripcion = datosMovimiento.descripcion;
            }

            return base;
        }));

        // Obtener todos los registros coincidentes para calcular totales
        const allMovimientos = await Movimiento.findAll({
            where: whereCondition,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    required: false,
                    attributes: ['nombre']
                },
                {
                    model: Cotizacion,
                    as: 'cotizacion',
                    required: false,
                    attributes: ['id_solicitud', 'monto_manodeobra', 'descuento_membresia', 'credito_usado'],
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
                }
            ],
            order: [['fecha', 'DESC']],
            raw: true,
            nest: true
        });

        // Formatear todos los movimientos para calcular totales
        const allMovimientosFormateados = await Promise.all(allMovimientos.map(async movimiento => {
            const datosMovimiento = movimiento;
            const esIngreso = datosMovimiento.tipo === 'ingreso';
            const esRetiro = datosMovimiento.tipo === 'retiro';
            const estadoNormalizado = (datosMovimiento.estado || '').toLowerCase();
            
            // Calcular el monto según el tipo de movimiento
            let monto;
            if (esIngreso && datosMovimiento.cotizacion) {
                const cotizacion = datosMovimiento.cotizacion;
                // Cálculo: (monto_manodeobra - descuento_membresia - credito_usado) - monto_movimiento
                const montoBase = (parseFloat(cotizacion.monto_manodeobra || 0) - 
                                parseFloat(cotizacion.descuento_membresia || 0) - 
                                parseFloat(cotizacion.credito_usado || 0));
                monto = (montoBase - parseFloat(datosMovimiento.monto || 0)).toFixed(2);
            } else {
                monto = parseFloat(datosMovimiento.monto || 0).toFixed(2);
            }
            
            const base = { 
                id_movimiento: datosMovimiento.id_movimiento,
                id_solicitud: datosMovimiento.cotizacion?.id_solicitud || null,
                monto: monto,
                fecha: new Date(datosMovimiento.fecha).toISOString().split('T')[0],
                estado: estadoNormalizado === 'completado' ? 'Completado' : 'Pendiente',
                tipo: datosMovimiento.tipo,
                descripcion: datosMovimiento.descripcion,
                nombre_usuario: datosMovimiento.usuario ? 
                    `${datosMovimiento.usuario.nombre || ''}`.trim() : 
                    'Usuario no encontrado'
            };

            // Agregar campos específicos para ingresos
            if (esIngreso && datosMovimiento.cotizacion) {
                const solicitud = datosMovimiento.cotizacion.solicitud;
                base.colonia = solicitud?.colonia || 'Sin colonia especificada';
                base.servicio = solicitud?.servicio?.nombre || 'Servicio no especificado';
            } 
            // Agregar campos específicos para retiros
            else if (esRetiro) {
                base.descripcion = datosMovimiento.descripcion;
            }

            return base;
        }));

        // Calcular totales de TODOS los registros coincidentes
        const totales = allMovimientosFormateados.reduce((acc, mov) => {
            const monto = parseFloat(mov.monto) || 0;
            const estado = mov.estado?.toLowerCase() || '';
            
            // Solo contabilizar retiros con estado 'completado'
            if (mov.tipo === 'retiro' && estado === 'completado') {
                acc.retiros += monto;
            }

            return acc;
        }, { retiros: 0 });

        // Enviar respuesta
        // Calcular el total de montos de los movimientos con estado 'completado'
        const totalMonto = allMovimientosFormateados.reduce((sum, mov) => {
            const estado = mov.estado?.toLowerCase() || '';
            if (estado === 'completado') {
                return sum + (parseFloat(mov.monto) || 0);
            }
            return sum;
        }, 0);
        
        // Crear objeto de estadísticas mensuales
        const monthlyStats = {
            pendientes: parseInt(statsData.pendientes) || 0,
            aprobados: parseInt(statsData.completados) || 0,
            rechazados: parseInt(statsData.rechazados) || 0,
            total: totalMonto
        };

        res.json({
            movimientos: movimientosFormateados,
            estadisticas: monthlyStats,
            paginacion: {
                total,
                totalPages,
                limit,
                offset
            }
        });
    } catch (error) {
        console.error('Error al obtener retiros:', error);
        res.status(500).json({ 
            success: false,
            mensaje: 'Error al obtener retiros',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener reporte de ingresos y gráfico mensual
const obtenerReporteIngresos = async (req, res) => {
    try {
        const { fechaInicio, fechaFin, mesActual } = req.query;
        
        // Validar que mesActual tenga el formato correcto (YYYY-MM)
        let fechaReferencia = new Date();
        if (mesActual && /^\d{4}-(0[1-9]|1[0-2])$/.test(mesActual)) {
            const [anio, mes] = mesActual.split('-').map(Number);
            // Crear fecha en la zona horaria local
            fechaReferencia = new Date(anio, mes - 1, 1);
        }
        
        // 1. Obtener ingresos por diferentes fuentes con filtros de fecha
        const [
            ingresosMembresias,
            ingresosVisitas,
            cotizaciones,
            totalRetiros,
            totalComisiones
        ] = await Promise.all([
            // Ingresos por membresías activadas
            Membresia.sum('monto', {
                where: {
                    estado: {
                        [Op.in]: ['activa', 'vencida']
                    },
                    ...(fechaInicio || fechaFin ? {
                        fecha: {
                            ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                            ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                        }
                    } : {})
                }
            }),
            // Ingresos por pagos de visita
            PagoVisita.sum('monto', {
                where: {
                    estado: 'aprobado',
                    ...(fechaInicio || fechaFin ? {
                        fecha: {
                            ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                            ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                        }
                    } : {})
                }
            }),
            // Obtener cotizaciones confirmadas para calcular ingresos por servicios
            Cotizacion.findAll({
                where: {
                    estado: 'confirmado',
                    ...(fechaInicio || fechaFin ? {
                        fecha: {
                            ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                            ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                        }
                    } : {})
                },
                attributes: ['monto_manodeobra', 'descuento_membresia', 'credito_usado'],
                raw: true
            }),
            // Obtener total de retiros
            Movimiento.sum('monto', {
                where: {
                    tipo: 'retiro',
                    estado: 'completado',
                    ...(fechaInicio || fechaFin ? {
                        fecha: {
                            ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                            ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                        }
                    } : {})
                }
            }),
            // Obtener total de comisiones por referidos
            Movimiento.sum('monto', {
                where: {
                    tipo: 'ingreso_referido',
                    estado: 'completado',
                    ...(fechaInicio || fechaFin ? {
                        fecha: {
                            ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                            ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                        }
                    } : {})
                }
            })
        ]);

        // Calcular ingresos por servicios (cotizaciones)
        const ingresosServicios = cotizaciones.reduce((total, cotizacion) => {
            const descuento = cotizacion.descuento_membresia || 0;
            const credito = cotizacion.credito_usado || 0;
            return total + (cotizacion.monto_manodeobra - descuento - credito);
        }, 0);

        // Calcular ingresos totales (solo sumamos ingresos, no restamos retiros ni comisiones aquí)
        const ingresosTotales = (ingresosServicios || 0) + 
                              (ingresosMembresias || 0) + 
                              (ingresosVisitas || 0);
                              
        // Calcular ganancia neta (ingresos - retiros - comisiones)
        const gananciaNeta = ingresosTotales - (totalRetiros || 0) - (totalComisiones || 0);

        // 2. Obtener datos para el gráfico de los 12 meses anteriores al mes actual o al mes proporcionado
        const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const meses = [];
        
        // Generar arreglo de los 12 meses anteriores al mes de referencia
        for (let i = 11; i >= 0; i--) {
            const fecha = new Date(fechaReferencia);
            fecha.setMonth(fecha.getMonth() - i);
            
            meses.push({
                mes: fecha.getMonth() + 1,
                anio: fecha.getFullYear(),
                nombre: `${mesesNombres[fecha.getMonth()]} ${fecha.getFullYear()}`
            });
        }

        // Obtener ingresos por mes para el gráfico
        const ingresosPorMes = await Promise.all(meses.map(async ({ mes, anio }) => {
            // Usar la zona horaria local para el cálculo de fechas
            const fechaInicio = new Date(anio, mes - 1, 1, 0, 0, 0);
            const ultimoDiaMes = new Date(anio, mes, 0);
            const fechaFin = new Date(anio, mes - 1, ultimoDiaMes.getDate(), 23, 59, 59, 999);

            // Obtener ingresos por membresías
            const ingresosMembresiasMes = await Membresia.sum('monto', {
                where: {
                    estado: { [Op.in]: ['activa', 'vencida'] },
                    fecha: { 
                        [Op.between]: [
                            fechaInicio,
                            fechaFin
                        ] 
                    }
                }
            }) || 0;

            // Obtener ingresos por visitas
            const ingresosVisitasMes = await PagoVisita.sum('monto', {
                where: {
                    estado: 'aprobado',
                    fecha: { 
                        [Op.between]: [
                            fechaInicio,
                            fechaFin
                        ] 
                    }
                }
            }) || 0;

            // Obtener ingresos por servicios (cotizaciones)
            const cotizacionesMes = await Cotizacion.findAll({
                where: {
                    estado: 'confirmado',
                    fecha: { 
                        [Op.between]: [
                            fechaInicio,
                            fechaFin
                        ] 
                    }
                },
                attributes: ['monto_manodeobra', 'descuento_membresia', 'credito_usado'],
                raw: true
            });

            const ingresosServiciosMes = cotizacionesMes.reduce((total, cotizacion) => {
                const descuento = cotizacion.descuento_membresia || 0;
                const credito = cotizacion.credito_usado || 0;
                return total + (cotizacion.monto_manodeobra - descuento - credito);
            }, 0);

            // Obtener retiros del mes
            const retirosMes = await Movimiento.sum('monto', {
                where: {
                    tipo: 'retiro',
                    estado: 'completado',
                    fecha: { 
                        [Op.between]: [
                            fechaInicio,
                            fechaFin
                        ] 
                    }
                }
            }) || 0;

            const ingresosTotalesMes = (ingresosServiciosMes || 0) + (ingresosMembresiasMes || 0) + (ingresosVisitasMes || 0);
            const gananciaNetaMes = ingresosTotalesMes - (retirosMes || 0);

            return {
                mes: mes,
                anio: anio,
                total: gananciaNetaMes
            };
        }));

        // Formatear respuesta
        const reporte = {
            resumen: {
                ingresosTotales: parseFloat(ingresosTotales).toFixed(2),
                ingresosServicios: parseFloat(ingresosServicios || 0).toFixed(2),
                ingresosMembresias: parseFloat(ingresosMembresias || 0).toFixed(2),
                ingresosVisitas: parseFloat(ingresosVisitas || 0).toFixed(2),
                retiros: parseFloat(totalRetiros || 0).toFixed(2),
                comisiones: parseFloat(totalComisiones || 0).toFixed(2),
                gananciaNeta: parseFloat(gananciaNeta).toFixed(2)
            },
            grafico: {
                etiquetas: meses.map(m => m.nombre),
                datos: ingresosPorMes.map(item => parseFloat(item.total).toFixed(2))
            }
        };

        res.json({
            success: true,
            data: reporte
        });

    } catch (error) {
        console.error('Error al generar el reporte de ingresos:', error);
        res.status(500).json({
            success: false,
            error: 'Error al generar el reporte de ingresos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los movimientos con información detallada
const getAllMovimientos = async (req, res) => {
    try {
        const { page = 1, limit = 10, tipo, fecha } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // Configurar condiciones de búsqueda
        const where = {};
        
        // Filtrar por tipo de movimiento
        if (tipo === 'retiros') where.tipo = 'retiro';
        if (tipo === 'ingresos') where.tipo = 'ingreso';
        
        // Filtrar por mes y año si se proporciona fecha en formato YYYY-MM
        if (fecha && /^\d{4}-\d{2}$/.test(fecha)) {
            const [year, month] = fecha.split('-').map(Number);
            const startDate = new Date(year, month - 1, 1); // mes es 0-indexed
            const endDate = new Date(year, month, 0, 23, 59, 59); // último día del mes
            
            where.fecha = {
                [Op.between]: [startDate, endDate]
            };
        }

        // Configuración base de la consulta
        const queryOptions = {
            where,
            order: [['fecha', 'DESC']],
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    required: false,
                    attributes: ['nombre']
                },
                {
                    model: Cotizacion,
                as: 'cotizacion',
                required: false,
                attributes: ['id_solicitud', 'monto_manodeobra', 'descuento_membresia', 'credito_usado'],
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
            }],
            attributes: [
                'id_movimiento', 
                'monto', 
                'fecha', 
                'estado', 
                'tipo', 
                'id_cotizacion', 
                'id_usuario',
                'descripcion'
            ],
            raw: false,
            distinct: true
        };

        // Obtener total de registros
        const total = await Movimiento.count({ 
            where: queryOptions.where,
            distinct: true,
            col: 'id_movimiento'
        });
        
        const totalPages = Math.ceil(total / limitNum);

        // Aplicar paginación
        queryOptions.limit = limitNum;
        queryOptions.offset = offset;

        // Obtener movimientos con paginación
        const { count, rows: movimientos } = await Movimiento.findAndCountAll(queryOptions);

        // Obtener membresías y visitas como ingresos adicionales si no se filtra por tipo específico
        let membresiasIngresos = [];
        let visitasIngresos = [];
        
        if (!tipo || tipo === 'ingresos') {
            // Configurar filtros de fecha para membresías y visitas
            const fechaFilter = {};
            if (fecha && /^\d{4}-\d{2}$/.test(fecha)) {
                const [year, month] = fecha.split('-').map(Number);
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);
                fechaFilter.fecha = { [Op.between]: [startDate, endDate] };
            }

            // Obtener membresías aprobadas
            const membresiasQuery = {
                where: {
                    estado: { [Op.in]: ['activa', 'vencida'] },
                    ...fechaFilter
                },
                include: [
                    {
                        model: Usuario,
                        as: 'usuario',
                        required: false,
                        attributes: ['nombre']
                    }
                ],
                attributes: ['id_membresia', 'monto', 'fecha', 'estado', 'id_usuario'],
                order: [['fecha', 'DESC']],
                raw: true,
                nest: true
            };

            // Aplicar paginación a membresías
            const membresiasLimit = Math.max(0, limitNum - movimientos.length);
            if (membresiasLimit > 0) {
                membresiasQuery.limit = membresiasLimit;
                membresiasIngresos = await Membresia.findAll(membresiasQuery);
            }

            // Obtener visitas aprobadas
            const visitasQuery = {
                where: {
                    estado: 'aprobado',
                    ...fechaFilter
                },
                include: [
                    {
                        model: Usuario,
                        as: 'usuario',
                        required: false,
                        attributes: ['nombre']
                    },
                    {
                        model: SolicitudServicio,
                        as: 'solicitud',
                        required: false,
                        include: [{
                            model: Usuario,
                            as: 'cliente',
                            required: false,
                            attributes: ['nombre']
                        }]
                    }
                ],
                attributes: ['id_pagovisita', 'monto', 'fecha', 'estado', 'id_usuario', 'id_solicitud'],
                order: [['fecha', 'DESC']],
                raw: true,
                nest: true
            };

            // Aplicar paginación a visitas
            const visitasLimit = Math.max(0, limitNum - movimientos.length - membresiasIngresos.length);
            if (visitasLimit > 0) {
                visitasQuery.limit = visitasLimit;
                visitasIngresos = await PagoVisita.findAll(visitasQuery);
            }
        }

        // Formatear movimientos de la tabla Movimiento
        const movimientosFormateados = await Promise.all(movimientos.map(async movimiento => {
            const datosMovimiento = movimiento.get({ plain: true });
            const esIngreso = datosMovimiento.tipo === 'ingreso';
            const esRetiro = datosMovimiento.tipo === 'retiro';
            const estadoNormalizado = (datosMovimiento.estado || '').toLowerCase();
            
            // Calcular el monto según el tipo de movimiento
            let monto;
            if (esIngreso && datosMovimiento.cotizacion) {
                const cotizacion = datosMovimiento.cotizacion;
                // Cálculo: (monto_manodeobra - descuento_membresia - credito_usado)
                const montoBase = (parseFloat(cotizacion.monto_manodeobra || 0) - 
                                parseFloat(cotizacion.descuento_membresia || 0) - 
                                parseFloat(cotizacion.credito_usado || 0));
                monto = montoBase.toFixed(2);
            } else {
                monto = parseFloat(datosMovimiento.monto || 0).toFixed(2);
            }
            
            const base = {
                id_movimiento: datosMovimiento.id_movimiento,
                id_solicitud: datosMovimiento.cotizacion?.id_solicitud || null,
                monto: monto,
                fecha: new Date(datosMovimiento.fecha).toISOString().split('T')[0],
                estado: estadoNormalizado === 'completado' ? 'Completado' : 'Pendiente',
                tipo: datosMovimiento.tipo,
                nombre_usuario: datosMovimiento.usuario ? 
                    `${datosMovimiento.usuario.nombre || ''}`.trim() : 
                    'Usuario no encontrado'
            };

            // Agregar campos específicos para ingresos
            if (esIngreso && datosMovimiento.cotizacion) {
                const solicitud = datosMovimiento.cotizacion.solicitud;
                base.colonia = solicitud?.colonia || 'Sin colonia especificada';
                base.servicio = solicitud?.servicio?.nombre || 'Servicio no especificado';
            } 
            // Agregar campos específicos para retiros
            else if (esRetiro) {
                base.descripcion = datosMovimiento.descripcion || 'Retiro de fondos';
            }

            return base;
        }));

        // Formatear membresías como ingresos
        const membresiasFormateadas = membresiasIngresos.map(membresia => ({
            id_movimiento: `membresia_${membresia.id_membresia}`,
            id_solicitud: null,
            monto: parseFloat(membresia.monto || 0).toFixed(2),
            fecha: new Date(membresia.fecha).toISOString().split('T')[0],
            estado: 'Completado',
            tipo: 'ingreso',
            nombre_usuario: membresia.usuario?.nombre || 'Usuario no encontrado',
            servicio: 'Membresía'
        }));

        // Formatear visitas como ingresos
        const visitasFormateadas = visitasIngresos.map(visita => ({
            id_movimiento: `visita_${visita.id_pagovisita}`,
            id_solicitud: visita.id_solicitud || visita.solicitud?.id_solicitud || null,
            monto: parseFloat(visita.monto || 0).toFixed(2),
            fecha: new Date(visita.fecha).toISOString().split('T')[0],
            estado: 'Completado',
            tipo: 'ingreso',
            nombre_usuario: visita.solicitud?.cliente?.nombre || visita.usuario?.nombre || 'Usuario no encontrado',
            servicio: 'Visita Técnica'
        }));

        // Combinar todos los movimientos
        let todosMovimientos = [...movimientosFormateados, ...membresiasFormateadas, ...visitasFormateadas];
        
        // Ordenar por fecha descendente
        todosMovimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        
        // Aplicar paginación final al conjunto combinado
        const startIndex = offset;
        const endIndex = startIndex + limitNum;
        const movimientosPaginados = todosMovimientos.slice(startIndex, endIndex);

        // Obtener todos los registros coincidentes para calcular totales (incluyendo membresías y visitas)
        let allMovimientosFormateados = [];
        
        // Movimientos de la tabla Movimiento
        const allMovimientos = await Movimiento.findAll({
            where,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    required: false,
                    attributes: ['nombre']
                },
                {
                    model: Cotizacion,
                    as: 'cotizacion',
                    required: false,
                    attributes: ['id_solicitud', 'monto_manodeobra', 'descuento_membresia', 'credito_usado'],
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
                }
            ],
            order: [['fecha', 'DESC']],
            raw: true,
            nest: true
        });

        // Formatear movimientos de la tabla Movimiento
        const movimientosTablaFormateados = await Promise.all(allMovimientos.map(async movimiento => {
            const datosMovimiento = movimiento;
            const esIngreso = datosMovimiento.tipo === 'ingreso';
            const esRetiro = datosMovimiento.tipo === 'retiro';
            const estadoNormalizado = (datosMovimiento.estado || '').toLowerCase();
            
            // Calcular el monto según el tipo de movimiento
            let monto;
            if (esIngreso && datosMovimiento.cotizacion) {
                const cotizacion = datosMovimiento.cotizacion;
                // Cálculo: (monto_manodeobra - descuento_membresia - credito_usado)
                const montoBase = (parseFloat(cotizacion.monto_manodeobra || 0) - 
                                parseFloat(cotizacion.descuento_membresia || 0) - 
                                parseFloat(cotizacion.credito_usado || 0));
                monto = montoBase.toFixed(2);
            } else {
                monto = parseFloat(datosMovimiento.monto || 0).toFixed(2);
            }
            
            const base = {
                id_movimiento: datosMovimiento.id_movimiento,
                id_solicitud: datosMovimiento.cotizacion?.id_solicitud || null,
                monto: monto,
                fecha: new Date(datosMovimiento.fecha).toISOString().split('T')[0],
                estado: estadoNormalizado === 'completado' ? 'Completado' : 'Pendiente',
                tipo: datosMovimiento.tipo,
                nombre_usuario: datosMovimiento.usuario ? 
                    `${datosMovimiento.usuario.nombre || ''}`.trim() : 
                    'Usuario no encontrado'
            };

            // Agregar campos específicos para ingresos
            if (esIngreso && datosMovimiento.cotizacion) {
                const solicitud = datosMovimiento.cotizacion.solicitud;
                base.colonia = solicitud?.colonia || 'Sin colonia especificada';
                base.servicio = solicitud?.servicio?.nombre || 'Servicio no especificado';
            } 
            // Agregar campos específicos para retiros
            else if (esRetiro) {
                base.descripcion = datosMovimiento.descripcion || 'Retiro de fondos';
            }

            return base;
        }));

        allMovimientosFormateados = [...movimientosTablaFormateados];

        // Agregar todas las membresías y visitas para los totales (sin límite de paginación)
        if (!tipo || tipo === 'ingresos') {
            // Configurar filtros de fecha para totales
            const fechaFilter = {};
            if (fecha && /^\d{4}-\d{2}$/.test(fecha)) {
                const [year, month] = fecha.split('-').map(Number);
                const startDate = new Date(year, month - 1, 1);
                const endDate = new Date(year, month, 0, 23, 59, 59);
                fechaFilter.fecha = { [Op.between]: [startDate, endDate] };
            }

            // Obtener todas las membresías para totales
            const allMembresias = await Membresia.findAll({
                where: {
                    estado: { [Op.in]: ['activa', 'vencida'] },
                    ...fechaFilter
                },
                attributes: ['monto', 'fecha', 'estado'],
                raw: true
            });

            // Obtener todas las visitas para totales
            const allVisitas = await PagoVisita.findAll({
                where: {
                    estado: 'aprobado',
                    ...fechaFilter
                },
                attributes: ['monto', 'fecha', 'estado'],
                raw: true
            });

            // Formatear todas las membresías
            const allMembresiasFormateadas = allMembresias.map(membresia => ({
                id_movimiento: `membresia_${membresia.id_membresia || 'total'}`,
                monto: parseFloat(membresia.monto || 0).toFixed(2),
                estado: 'Completado',
                tipo: 'ingreso'
            }));

            // Formatear todas las visitas
            const allVisitasFormateadas = allVisitas.map(visita => ({
                id_movimiento: `visita_${visita.id_pagovisita || 'total'}`,
                monto: parseFloat(visita.monto || 0).toFixed(2),
                estado: 'Completado',
                tipo: 'ingreso'
            }));

            allMovimientosFormateados = [...allMovimientosFormateados, ...allMembresiasFormateadas, ...allVisitasFormateadas];
        }

        // Calcular totales de TODOS los registros coincidentes
        const totales = allMovimientosFormateados.reduce((acc, mov) => {
            const monto = parseFloat(mov.monto) || 0;
            
            if (mov.tipo === 'ingreso' && mov.estado?.toLowerCase() === 'completado') {
                acc.ingresos += monto;
            }
            
            if (mov.tipo === 'retiro' && mov.estado?.toLowerCase() === 'completado') {
                acc.retiros += monto;
            }
            
            return acc;
        }, { ingresos: 0, retiros: 0 });

        // Calcular el total real de registros para paginación
        const totalRegistros = tipo === 'retiros' ? 
            total : 
            total + (membresiasIngresos.length + visitasIngresos.length);

        // Respuesta final
        res.json({
            success: true,
            data: {
                movimientos: movimientosPaginados
            },
            summary: {
                totalIngresos: totales.ingresos.toFixed(2),
                totalRetiros: totales.retiros.toFixed(2)
            },
            pagination: {
                total: totalRegistros,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalRegistros / limitNum),
                hasMore: pageNum < Math.ceil(totalRegistros / limitNum)
            }
        });

    } catch (error) {
        console.error('Error en getAllMovimientos:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener los movimientos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener estadisticas del dashboard admin
const obtenerEstadisticasDashboard = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;
        
        // Obtener total de usuarios (usa 'fecha' como campo de fecha)
        const whereUsuario = {};
        if (fechaInicio || fechaFin) {
            whereUsuario.fecha_registro = {};
            if (fechaInicio) whereUsuario.fecha_registro[Op.gte] = ajustarFechaLocal(fechaInicio, true);
            if (fechaFin) {
                whereUsuario.fecha_registro[Op.lte] = ajustarFechaLocal(fechaFin);
            }
        }
        const totalUsuarios = await Usuario.count({ where: whereUsuario });

        // Obtener total de servicios (usa 'fecha_solicitud' como campo de fecha)
        const whereServicio = {};
        if (fechaInicio || fechaFin) {
            whereServicio.fecha_solicitud = {};
            if (fechaInicio) whereServicio.fecha_solicitud[Op.gte] = ajustarFechaLocal(fechaInicio, true);
            if (fechaFin) {
                whereServicio.fecha_solicitud[Op.lte] = ajustarFechaLocal(fechaFin);
            }
        }
        const totalServicios = await SolicitudServicio.count({ where: whereServicio });

        // Obtener total de membresías activas
        const totalMembresiasActivas = await Membresia.count({
            where: {
                estado: 'activa',
                ...(fechaInicio || fechaFin ? {
                    fecha: {
                        ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                        ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                    }
                } : {})
            }
        });

        // Obtener ingresos totales de diferentes fuentes
        // Obtener todas las cotizaciones confirmadas en el rango de fechas
        const whereCotizacion = {
            estado: 'confirmado',
            ...(fechaInicio || fechaFin ? {
                fecha: {
                    ...(fechaInicio && { [Op.gte]: new Date(fechaInicio) }),
                    ...(fechaFin && { [Op.lte]: new Date(fechaFin) })
                }
            } : {})
        };
        
        const cotizaciones = await Cotizacion.findAll({
            where: whereCotizacion,
            attributes: ['monto_manodeobra', 'descuento_membresia', 'credito_usado'],
            raw: true
        });
        
        // Calcular el total usando JavaScript
        const totalCotizaciones = cotizaciones.reduce((total, cotizacion) => {
            const descuento = cotizacion.descuento_membresia || 0;
            const credito = cotizacion.credito_usado || 0;
            return total + (cotizacion.monto_manodeobra - descuento - credito);
        }, 0);
        
        const [
            ingresosMembresias,
            ingresosVisitas
        ] = await Promise.all([
            // Ingresos por membresías activadas
            Membresia.sum('monto', {
                where: {
                    estado: {
                        [Op.in]: ['activa', 'vencida']
                    },
                    ...(fechaInicio || fechaFin ? {
                        fecha: {
                            ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                            ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                        }
                    } : {})
                }
            }),
            // Ingresos por pagos de visita (usa 'fecha' como campo de fecha)
            PagoVisita.sum('monto', {
                where: {
                    estado: 'aprobado',
                    ...(fechaInicio || fechaFin ? {
                        fecha: {
                            ...(fechaInicio && { [Op.gte]: ajustarFechaLocal(fechaInicio, true) }),
                            ...(fechaFin && { [Op.lte]: ajustarFechaLocal(fechaFin) })
                        }
                    } : {})
                }
            })
        ]);

        // Calcular el total sumando todas las fuentes de ingreso
        const ingresosTotales = (totalCotizaciones || 0) + 
                              (ingresosMembresias || 0) + 
                              (ingresosVisitas || 0);

        // Verificar si hay servicios pendientes (sin filtro de fecha)
        const serviciosPendientes = await SolicitudServicio.count({
            where: {
                estado: {
                    [Op.in]: ['pendiente', 'pendiente_asignacion', 'verificando_pagoservicio', 'verificando_pagovisita']
                }
            }
        });

        // Verificar si hay membresías pendientes (sin filtro de fecha)
        const membresiasPendientes = await Membresia.count({
            where: {
                estado: 'pendiente'
            }
        });

        // Formatear respuesta
        const estadisticas = {
            totalUsuarios: totalUsuarios || 0,
            totalServicios: totalServicios || 0,
            totalMembresiasActivas: totalMembresiasActivas || 0,
            serviciosPendiente: serviciosPendientes > 0 ? 'si' : 'no',
            totalServiciosPendientes: serviciosPendientes || 0,
            membresiasPendiente: membresiasPendientes > 0 ? 'si' : 'no',
            totalMembresiasPendientes: membresiasPendientes || 0,
            ingresosTotales: parseFloat(ingresosTotales || 0).toFixed(2),
            desgloseIngresos: {
                servicios: parseFloat(totalCotizaciones || 0).toFixed(2),
                membresias: parseFloat(ingresosMembresias || 0).toFixed(2),
                visitas: parseFloat(ingresosVisitas || 0).toFixed(2)
            }
        };

        res.json({
            success: true,
            data: estadisticas
        });

    } catch (error) {
        console.error('Error al obtener estadísticas del dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas del dashboard',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        const mesAjustado = parseInt(mes) - 1;
        const startDate = new Date(year, mesAjustado, 1);
        const endDate = new Date(year, mesAjustado + 1, 0, 23, 59, 59);
        
        // Condiciones base
        const where = {
            id_usuario,
            fecha: {
                [Op.between]: [startDate, endDate]
            }
        };

        // Filtros por tipo
        const esRetiro = tipo === 'retiros';
        const esIngreso = tipo === 'ingresos';
        
        if (esRetiro) where.tipo = 'retiro';
        if (esIngreso) where.tipo = 'ingreso';

        // Configuración de consulta base
        const queryOptions = {
            where,
            order: [['fecha', 'DESC']],
            raw: false
        };

        // Si es ingreso, incluir relaciones
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

            queryOptions.attributes = ['id_movimiento', 'monto', 'fecha', 'estado', 'tipo', 'id_cotizacion'];
        }

        // Obtener total de registros para paginación
        const total = await Movimiento.count({
            where: queryOptions.where,
            distinct: true,
            col: 'id_movimiento'
        });

        const totalPages = Math.ceil(total / limitNum);

        // Aplicar paginación
        queryOptions.limit = limitNum;
        queryOptions.offset = offset;
        queryOptions.distinct = true;

        // Obtener movimientos paginados
        const { rows: movimientos } = await Movimiento.findAndCountAll({
            ...queryOptions,
            attributes: ['id_movimiento', 'id_cotizacion', 'tipo', 'monto', 'fecha', 'estado']
        });

        // Cargar relaciones manualmente
        const movimientosConRelaciones = await Promise.all(
            movimientos.map(async mov => {
                if (mov.tipo === 'ingreso' && mov.id_cotizacion) {
                    const cotizacion = await Cotizacion.findByPk(mov.id_cotizacion, {
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
                        ...mov.get({ plain: true }),
                        cotizacion: cotizacion ? cotizacion.get({ plain: true }) : null
                    };
                }
                return mov.get({ plain: true });
            })
        );

        // FORMATEAR RESULTADO PARA LA TABLA
        const movimientosFormateados = movimientosConRelaciones.map(datos => {
            const esIngreso = datos.tipo === 'ingreso';
            const esRetiro = datos.tipo === 'retiro';
            const estadoNormalizado = (datos.estado || '').toLowerCase();

            const base = {
                id_movimiento: datos.id_movimiento,
                monto: parseFloat(datos.monto).toFixed(2),
                fecha: datos.fecha instanceof Date ? 
                    `${datos.fecha.getFullYear()}-${String(datos.fecha.getMonth() + 1).padStart(2, '0')}-${String(datos.fecha.getDate()).padStart(2, '0')}` :
                    new Date(datos.fecha).toISOString().split('T')[0],
                estado: estadoNormalizado === 'completado' ? 'Completado' : estadoNormalizado === 'rechazado' ? 'Rechazado' : 'Pendiente',
                tipo: datos.tipo
            };

            if (esIngreso) {
                const cot = datos.cotizacion;
                const sol = cot?.solicitud;

                Object.assign(base, {
                    colonia: sol?.colonia || 'Sin colonia especificada',
                    servicio: sol?.servicio?.nombre || 'Servicio no especificado'
                });
            } else if (esRetiro) {
                base.descripcion = datos.descripcion || 'Retiro de fondos';
            }

            return base;
        });

        // ============================
        // 🔥 CALCULAR TOTALES DEL MES COMPLETO (sin paginación)
        // ============================
        const totalesReales = await Movimiento.findAll({
            where: {
                id_usuario,
                fecha: {
                    [Op.between]: [startDate, endDate]
                }
            },
            attributes: [
                'tipo',
                'estado',
                [Sequelize.fn('SUM', Sequelize.col('monto')), 'total']
            ],
            group: ['tipo', 'estado'],
            raw: true
        });

        let totalIngresos = 0;
        let totalRetiros = 0;

        totalesReales.forEach(item => {
            const completado = (item.estado || '').toLowerCase() === 'completado';
            const monto = parseFloat(item.total) || 0;

            if (item.tipo === 'ingreso' && completado) totalIngresos += monto;
            if (item.tipo === 'retiro' && completado) totalRetiros += monto;
        });

        // RESPUESTA FINAL
        res.json({
            success: true,
            data: movimientosFormateados,
            summary: {
                totalIngresos: totalIngresos.toFixed(2),
                totalRetiros: totalRetiros.toFixed(2),
                mes: startDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
            },
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages
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
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener ingresos mensuales',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
      res.status(500).json({ 
        success: false,
        error: 'Error al obtener servicios por mes',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
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
                estado: {
                    [Op.in]: ['finalizado', 'calificado']
                }
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
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener servicios por tipo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener estadísticas generales',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
            error: 'Error al obtener información de ingresos y retiros',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

// Función para ajustar fechas a la zona horaria local
const ajustarFechaLocal = (fecha, inicioDelDia = false) => {
    if (!fecha) return null;
    
    // Si es una cadena de fecha, crear objeto Date en zona horaria local
    const date = typeof fecha === 'string' ? new Date(fecha + 'T00:00:00') : fecha;
    
    // Crear una nueva fecha ajustada a la zona horaria local
    const fechaLocal = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        inicioDelDia ? 0 : 23,
        inicioDelDia ? 0 : 59,
        inicioDelDia ? 0 : 59,
        inicioDelDia ? 0 : 999
    );
    
    // Convertir a ISO string manteniendo la zona horaria local
    return fechaLocal;
};

// Exportar controladores
module.exports = {
    obtenerRetiros,
    getAllMovimientos, 
    crearMovimiento,
    actualizarMovimiento,
    eliminarMovimiento,
    obtenerEstadisticasDashboard,
    obtenerReporteIngresos,
    getMovimientosPorUsuario,
    getIngresosMensuales,
    getServiciosPorMes,
    getTopUsuariosCredito,
    getServiciosPorTipo,
    getEstadisticasGenerales,
    getIngresosTotalesReferidos,
    getIngresosyRetirosdeReferidos,
    getTransacciones,
};