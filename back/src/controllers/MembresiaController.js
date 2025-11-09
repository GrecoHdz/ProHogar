const { Sequelize, Op } = require("sequelize");
const Membresia = require("../models/membresiaModel");
const Config = require("../models/configModel");
const Usuario = require("../models/usuariosModel");
const Cuenta = require("../models/cuentasModel");

// Obtener todas las membresias con información de usuario y cuenta
const obtenerMembresias = async (req, res) => {
    try {
        // Obtener parámetros de paginación y búsqueda
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 10); // Máximo 10 por rendimiento
        const offset = parseInt(req.query.offset) || 0;
        const searchTerm = req.query.search || '';
        const estado = req.query.estado;
        const month = req.query.month; // Formato: 'YYYY-MM'

        // Construir condiciones de búsqueda
        const whereCondition = {};
        const andConditions = [];

        // Filtro por término de búsqueda
        if (searchTerm) {
            andConditions.push({
                [Op.or]: [
                    { '$usuario.nombre$': { [Op.like]: `%${searchTerm}%` } },
                    { '$usuario.telefono$': { [Op.like]: `%${searchTerm}%` } },
                    { num_transaccion: { [Op.like]: `%${searchTerm}%` } }
                ]
            });
        }

        // Filtro por estado
        if (estado) {
            whereCondition.estado = estado;
        }

        // Filtro por mes
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('Membresia.fecha')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('Membresia.fecha')), monthNum)
            );
        }

        // Combinar condiciones
        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        // Obtener total de registros
        const total = await Membresia.count({
            where: whereCondition,
            include: [
                {
                    model: Usuario,
                    as: 'usuario',
                    attributes: []
                }
            ]
        });

        // Obtener membresías con paginación
        const [membresias, stats] = await Promise.all([
            Membresia.findAll({
                where: whereCondition,
                attributes: { exclude: ['id_usuario', 'id_cuenta'] },
                include: [
                    {
                        model: Usuario,
                        as: 'usuario',
                        attributes: ['nombre', 'telefono']
                    },
                    {
                        model: Cuenta,
                        as: 'cuenta',
                        attributes: ['banco', 'beneficiario', 'num_cuenta', 'tipo']
                    }
                ],
                order: [['fecha', 'DESC']],
                limit,
                offset,
                raw: true,
                nest: true
            }),
            
            // Consulta de estadísticas
            Membresia.findAll({
                attributes: [
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'activa' OR estado = 'vencida' THEN 1 END)"), 'activas'], 
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'pendiente' THEN 1 END)"), 'pendientes'],
                    [Sequelize.literal("COUNT(CASE WHEN estado = 'rechazada' THEN 1 END)"), 'rechazadas'],
                    [Sequelize.literal("SUM(CASE WHEN estado IN ('activa', 'vencida') THEN monto ELSE 0 END)"), 'total']
                ],
                where: whereCondition,
                raw: true
            })
        ]);
        
        // Procesar estadísticas
        const statsData = stats[0] || { activas: 0, pendientes: 0, rechazadas: 0, total: 0 };
        const estadisticas = {
            aprobados: (parseInt(statsData.activas) || 0) + (parseInt(statsData.vencidas) || 0),
            rechazados: parseInt(statsData.rechazadas) || 0,
            pendientes: parseInt(statsData.pendientes) || 0,
            total: parseFloat(statsData.total) || 0
        };
        
        res.json({
            success: true,
            data: membresias,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            estadisticas
        });
    } catch (error) {
        console.error("Error al obtener membresías:", error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener membresías",
            details: error.message 
        });
    }
};

// Obtener historial completo de membresías de un usuario
const obtenerHistorialMembresias = async (req, res) => {
    try {
        const membresias = await Membresia.findAll({ 
            where: { id_usuario: req.params.id },
            order: [['fecha', 'DESC']], // Ordenar por fecha descendente
            raw: true
        });
        
        if (!membresias || membresias.length === 0) {
            return res.status(404).json({ 
                status: 'not_found',
                message: 'No se encontraron membresías para este usuario'
            });
        }
        
        res.json({
            status: 'success',
            data: membresias,
            count: membresias.length
        });
    } catch (error) {
        console.error("Error al obtener el historial de membresías:", error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error al obtener el historial de membresías',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};
 
// Obtener la membresía activa más reciente de un usuario
const obtenerMembresiaActual = async (req, res) => {
    try {
      const { id } = req.params;
  
      const membresia = await Membresia.findOne({
        where: { id_usuario: id },
        order: [['fecha', 'DESC']],
        raw: true
      });
  
      if (!membresia) {
        console.log(`ℹ️ [INFO] Usuario ${id} no tiene membresía activa.`);
        return res.json({
          status: 'not_found',
          data: null,
          message: 'El usuario no tiene una membresía activa.'
        });
      }
  
      return res.json({
        status: 'success',
        data: membresia
      });
    } catch (error) {
      console.error("❌ [ERROR] Al obtener la membresía actual:", error);
      return res.status(500).json({
        status: 'error',
        message: 'Error al obtener la membresía actual'
      });
    }
  };
  

// Obtener progreso de membresía por usuario
const obtenerProgresoMembresia = async (req, res) => {
    try {
        // Obtener el valor de la membresía desde la tabla de configuración
        const configMembresia = await Config.findOne({
            where: { tipo_config: 'membresia' },
            raw: true
        });

        if (!configMembresia) {
            return res.status(500).json({
                status: 'error',
                message: 'No se encontró la configuración de membresía'
            });
        }

        const valorMembresia = configMembresia.valor;

        // Obtener todas las membresías del usuario
        const membresias = await Membresia.findAll({
            where: { 
                id_usuario: req.params.id_usuario,
                estado: ['activa']
            },
            order: [['fecha', 'ASC']], // Orden cronológico
            raw: true
        });

        if (!membresias || membresias.length === 0) {
            return res.json({
                status: 'success',
                mesesProgreso: 0,
                montoTotal: 0,
                valorMembresia: valorMembresia
            });
        }

        let progreso = 0;
        let maxProgreso = 0;
        let ultimaFecha = null;

        // Calcular progreso
        for (const m of membresias) {
            const fechaActual = new Date(m.fecha);

            if (!ultimaFecha) {
                progreso = 1;
            } else {
                const diffMeses = 
                    (fechaActual.getFullYear() - ultimaFecha.getFullYear()) * 12 +
                    (fechaActual.getMonth() - ultimaFecha.getMonth());

                if (diffMeses === 1) {
                    progreso++;
                } else {
                    progreso = 1; // reinicia progreso
                }
            }

            ultimaFecha = new Date(fechaActual);
            maxProgreso = Math.max(maxProgreso, progreso);
        }

        // Calcular el monto total como valor_membresia * meses de progreso
        const montoTotal = valorMembresia * maxProgreso;

        res.json({
            status: 'success',
            mesesProgreso: maxProgreso,
            montoTotal: montoTotal,
            valorMembresia: valorMembresia
        });

    } catch (error) {
        console.error("Error al obtener progreso de membresía:", error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error al obtener progreso de membresía',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crear membresia
const crearMembresia = async (req, res) => {
    try {
        const datosMembresia = {
            ...req.body,
            fecha: new Date(),  // Agregar la fecha actual
            estado: 'pendiente' // Establecer estado inicial como pendiente
        };
        
        const membresia = await Membresia.create(datosMembresia);
        res.json(membresia);
    } catch (error) {
        console.error("Error al crear membresia:", error);
        res.status(500).json({ error: "Error al crear membresia" });
    }
};

//Actualizar membresia
const actualizarMembresia = async (req, res) => {
    try {
        const [updated] = await Membresia.update(req.body, { 
            where: { 
                id_membresia: req.params.id 
            } 
        });
        
        if (updated) {
            const updatedMembresia = await Membresia.findByPk(req.params.id);
            return res.json({
                status: 'success',
                data: updatedMembresia
            });
        }
        
        throw new Error('No se pudo actualizar la membresía');
    } catch (error) {
        console.error("Error al actualizar membresia:", error);
        res.status(500).json({ 
            status: 'error',
            message: 'Error al actualizar membresía',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Eliminar membresia
const eliminarMembresia = async (req, res) => {
    try {
        const membresia = await Membresia.destroy({ where: { id: req.params.id } });
        res.json(membresia);
    } catch (error) {
        console.error("Error al eliminar membresia:", error);
        res.status(500).json({ error: "Error al eliminar membresia" });
    }
};

module.exports = {
    obtenerMembresias,
    obtenerHistorialMembresias,
    obtenerMembresiaActual,
    crearMembresia,
    actualizarMembresia,
    eliminarMembresia,
    obtenerProgresoMembresia
};
