const { Sequelize, Op } = require("sequelize");
const FacturaCorrelativo = require("../models/facturaCorrelativoModel");

const obtenerCorrelativos = async (req, res) => {
    try {
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 10);
        const offset = parseInt(req.query.offset) || 0;

        const estado = req.query.estado;

        const whereCondition = {};
        if (estado) {
            whereCondition.estado = estado;
        }

        const total = await FacturaCorrelativo.count({ where: whereCondition });

        const correlativos = await FacturaCorrelativo.findAll({
            where: whereCondition,
            order: [['fecha_vencimiento', 'ASC']],
            limit,
            offset,
            raw: true
        }); 

        // Revisar correlativos próximos a vencer
        const alertas = [];
        const hoy = new Date();
        const unMesDespues = new Date();
        unMesDespues.setMonth(unMesDespues.getMonth() + 1);

        correlativos.forEach(correlativo => {
            if (correlativo.estado === 'ACTIVO') {
                // Calcular porcentaje de rango utilizado
                const rangoTotal = correlativo.rango_fin - correlativo.rango_inicio + 1;
                const utilizado = correlativo.correlativo_actual - correlativo.rango_inicio + 1;
                const porcentajeUtilizado = (utilizado / rangoTotal) * 100;

                // Alerta por rango próximo a agotarse (más del 70% utilizado)
                if (porcentajeUtilizado >= 70) {
                    alertas.push({
                        tipo: 'rango',
                        mensaje: `CAI ${correlativo.cai} ha utilizado ${porcentajeUtilizado.toFixed(1)}% de su rango disponible`,
                        cai: correlativo.cai,
                        porcentajeUtilizado: porcentajeUtilizado.toFixed(1)
                    });
                }

                // Alerta por fecha de vencimiento próxima (dentro de 1 mes)
                const fechaVencimiento = new Date(correlativo.fecha_vencimiento);
                if (fechaVencimiento <= unMesDespues) {
                    const diasRestantes = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                    alertas.push({
                        tipo: 'fecha',
                        mensaje: `CAI ${correlativo.cai} vence en ${diasRestantes} días`,
                        cai: correlativo.cai,
                        diasRestantes: diasRestantes,
                        fechaVencimiento: correlativo.fecha_vencimiento
                    });
                }
            }
        });

        // Siempre devolver success, incluso si el array está vacío
        const response = {
            success: true,
            data: correlativos || [], // Asegurar que siempre sea un array
            total: total || 0,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit) || 1,
            hasMore: offset + limit < total,
            alertas: alertas.length > 0 ? alertas : undefined
        }; 
        res.json(response);

    } catch (error) { 
        
        // En caso de error, también devolver success con array vacío
        const errorResponse = {
            success: true,
            data: [], // Array vacío en caso de error
            total: 0,
            page: 1,
            totalPages: 1,
            hasMore: false,
            alertas: undefined
        }; 
        res.json(errorResponse);
    }
};

const obtenerCorrelativoActivo = async (req, res) => {
    try {
        const hoy = new Date();

        const correlativo = await FacturaCorrelativo.findOne({
            where: {
                estado: "ACTIVO",
                fecha_vencimiento: { [Op.gte]: hoy }
            },
            order: [['id', 'DESC']],
            raw: true
        });

        if (!correlativo) {
            return res.status(409).json({
                status: 'error',
                message: 'No existe un correlativo activo vigente'
            });
        }

        res.json({
            status: 'success',
            data: correlativo
        });

    } catch (error) {
        console.error("Error al obtener correlativo activo:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al obtener correlativo activo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obtenerCorrelativoPorCAI = async (cai) => {
    const correlativo = await FacturaCorrelativo.findOne({
        where: { cai }
    });

    if (!correlativo) {
        throw new Error("No existe correlativo con ese CAI");
    }

    const rangoInicioFormateado = `${correlativo.prefijo}${correlativo.rango_inicio.toString().padStart(8, '0')}`;
    const rangoFinFormateado = `${correlativo.prefijo}${correlativo.rango_fin.toString().padStart(8, '0')}`;

    // Formatear fecha límite de emisión a DD/MM/YYYY
    const fechaVencimiento = new Date(correlativo.fecha_vencimiento);
    const dia = fechaVencimiento.getDate().toString().padStart(2, '0');
    const mes = (fechaVencimiento.getMonth() + 1).toString().padStart(2, '0');
    const anio = fechaVencimiento.getFullYear().toString();
    const fechaFormateada = `${dia}/${mes}/${anio}`;

    return {
        rango_autorizado: `${rangoInicioFormateado} - ${rangoFinFormateado}`,
        fecha_limite_emision: fechaFormateada,
        prefijo: correlativo.prefijo,
        estado: correlativo.estado,
        rango_inicio: correlativo.rango_inicio,
        rango_fin: correlativo.rango_fin
    };
};

const crearCorrelativo = async (req, res) => {
    try { 
        
        const {
            cai,
            prefijo,
            rango_inicio,
            rango_fin,
            fecha_autorizacion,
            fecha_vencimiento
        } = req.body;

        // Verificar si ya existe un correlativo activo con el mismo CAI
        const correlativoActivoExistente = await FacturaCorrelativo.findOne({
            where: { 
                estado: 'ACTIVO',
                cai: cai
            }
        });

        if (correlativoActivoExistente) {
            return res.status(400).json({
                status: 'error',
                message: 'Ya existe un correlativo activo con este CAI.'
            });
        }

            if (rango_inicio >= rango_fin) { 
            return res.status(400).json({
                status: 'error',
                message: 'El rango inicial debe ser menor al rango final'
            });
        } 
        const correlativo = await FacturaCorrelativo.create({
            cai,
            prefijo,
            rango_inicio,
            rango_fin,
            correlativo_actual: rango_inicio - 1,
            fecha_autorizacion,
            fecha_vencimiento,
            estado: 'ACTIVO'
        }); 
        res.json({
            success: true,
            data: correlativo
        });

    } catch (error) {
        console.error("=== ERROR AL CREAR CORRELATIVO ===");
        console.error("Error completo:", error);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        
        // Si es error de validación de Sequelize
        if (error.name === 'SequelizeValidationError') {
            console.error("Errores de validación:", error.errors);
            return res.status(400).json({
                status: 'error',
                message: error.errors.map(e => e.message).join(', ')
            });
        }
        
        res.status(500).json({
            status: 'error',
            message: 'Error al crear correlativo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const obtenerSiguienteCorrelativo = async (transaction = null) => {
    const correlativo = await FacturaCorrelativo.findOne({
        where: { estado: 'ACTIVO' },
        lock: transaction ? transaction.LOCK.UPDATE : undefined,
        transaction
    });

    if (!correlativo) {
        throw new Error("No existe correlativo activo");
    }

    if (correlativo.correlativo_actual >= correlativo.rango_fin) {
        await correlativo.update({ estado: 'AGOTADO' }, { transaction });
        throw new Error("Rango de facturación agotado");
    }

    correlativo.correlativo_actual += 1;

    await correlativo.save({ transaction });

    return {
        numero: `${correlativo.prefijo}-${correlativo.correlativo_actual.toString().padStart(8, '0')}`,
        cai: correlativo.cai,
        prefijo: correlativo.prefijo,
        correlativo_actual: correlativo.correlativo_actual
    };
};


const actualizarCorrelativo = async (req, res) => {
    try {
        // Si se está intentando activar este correlativo, verificar si hay otro activo con el mismo CAI
        if (req.body.estado === 'ACTIVO') {
            const correlativoActual = await FacturaCorrelativo.findByPk(req.params.id);
            
            if (correlativoActual) {
                const correlativoActivoExistente = await FacturaCorrelativo.findOne({
                    where: { 
                        estado: 'ACTIVO',
                        cai: correlativoActual.cai,
                        id: { [Op.ne]: req.params.id } // Excluir el correlativo que se está actualizando
                    }
                });

                if (correlativoActivoExistente) {
                    return res.status(400).json({
                        status: 'error',
                        message: 'Ya existe un correlativo activo con este CAI. No se puede duplicar el CAI.'
                    });
                }
            }
        }

        const [updated] = await FacturaCorrelativo.update(req.body, {
            where: { id: req.params.id }
        });

        if (!updated) {
            return res.status(404).json({
                status: 'not_found',
                message: 'Correlativo no encontrado'
            });
        }

        const correlativo = await FacturaCorrelativo.findByPk(req.params.id);

        res.json({
            success: true,
            data: correlativo
        });

    } catch (error) {
        console.error("Error al actualizar correlativo:", error);
        res.status(500).json({
            status: 'error',
            message: 'Error al actualizar correlativo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const eliminarCorrelativo = async (req, res) => {
    try { 
        
        const correlativo = await FacturaCorrelativo.findByPk(req.params.id);
        
        if (!correlativo) { 
            return res.status(404).json({
                status: 'error',
                message: 'Correlativo no encontrado'
            });
        } 
        
        await correlativo.destroy(); 
        
        res.json({
            success: true,
            message: 'Correlativo eliminado correctamente'
        });

    } catch (error) {
        console.error("=== ERROR AL ELIMINAR CORRELATIVO ===");
        console.error("Error completo:", error);
        console.error("Error message:", error.message);
        
        res.status(500).json({
            status: 'error',
            message: 'Error al eliminar correlativo',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    obtenerCorrelativos,
    obtenerCorrelativoActivo,
    crearCorrelativo,
    actualizarCorrelativo, 
    obtenerSiguienteCorrelativo,
    obtenerCorrelativoPorCAI,
    eliminarCorrelativo
};
