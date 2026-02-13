
const { sequelize } = require("../config/database");
const Usuario = require("../models/usuariosModel");
const Ciudad = require("../models/ciudadesModel");
const Rol = require("../models/rolesModel");
const CreditoUsuario = require('../models/creditoUsuariosModel');
const Movimiento = require('../models/movimientosModel');
const Calificaciones = require("../models/calificacionesModels");
const TecnicoServicio = require("../models/tecnicosServiciosModel");
const { Op, fn, col, literal, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const saltRounds = 10; // Número de rondas de hashing
const Referido = require('../models/referidosModel');
const { cloudinary } = require('../config/cloudinary');

// Verificar perfil de técnico
const verificarPerfilTecnico = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        // Verificar si el usuario existe
        const usuario = await Usuario.findByPk(id_usuario, {
            attributes: ['id_usuario', 'imagen_url', 'id_rol'],
            include: [
                {
                    model: Rol,
                    as: 'rol',
                    attributes: ['nombre_rol']
                },
                {
                    model: TecnicoServicio,
                    as: 'serviciosAsignados',
                    attributes: ['id_servicio']
                }
            ]
        });

        if (!usuario) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        // Verificar si es un técnico
        if (usuario.rol.nombre_rol !== 'tecnico') {
            return res.status(400).json({ mensaje: 'El usuario no es un técnico' });
        }

        // Verificar si tiene imagen de perfil
        const tieneImagen = !!usuario.imagen_url;

        // Verificar si tiene servicios asignados
        const tieneServicios = usuario.serviciosAsignados && usuario.serviciosAsignados.length > 0;

        res.json({
            id_usuario: usuario.id_usuario,
            tiene_imagen: tieneImagen,
            tiene_servicios: tieneServicios,
            perfil_completo: tieneImagen && tieneServicios
        });

    } catch (error) {
        console.error('Error al verificar perfil de técnico:', error);
        res.status(500).json({ mensaje: 'Error al verificar perfil de técnico', error: error.message });
    }
};

// Obtener todos los usuarios con filtros, paginación y estadísticas
const obtenerUsuarios = async (req, res) => {
    try {
        // Obtener parámetros de paginación y búsqueda
        let limit = parseInt(req.query.limit) || 100;
        limit = Math.min(limit, 1000); // Máximo 1000 para reportes
        const offset = parseInt(req.query.offset) || 0;
        const estado = req.query.estado;
        const rol = req.query.rol;
        const month = req.query.month; // Formato: 'YYYY-MM'

        // Construir condiciones de búsqueda
        const whereCondition = {};
        const andConditions = [];

        // Filtro por estado
        if (estado) {
            whereCondition.estado = estado;
        }

        // Filtro por rol
        if (rol) {
            whereCondition['$rol.id_rol$'] = rol;
        }

        // Filtro por mes de registro
        if (month) {
            const [year, monthNum] = month.split('-').map(Number);
            andConditions.push(
                Sequelize.where(Sequelize.fn('YEAR', Sequelize.col('Usuario.fecha_registro')), year),
                Sequelize.where(Sequelize.fn('MONTH', Sequelize.col('Usuario.fecha_registro')), monthNum)
            );
        }

        // Combinar condiciones
        if (andConditions.length > 0) {
            whereCondition[Op.and] = andConditions;
        }

        // Obtener total de registros
        const total = await Usuario.count({
            where: whereCondition,
            include: [
                {
                    model: Rol,
                    as: 'rol',
                    attributes: []
                }
            ]
        });

        // Obtener usuarios con paginación
        const [usuarios, stats] = await Promise.all([
            Usuario.findAll({
                where: whereCondition,
                attributes: {
                    exclude: ['password_hash', 'id_ciudad', 'reset_password_token', 'reset_password_expires'],
                    include: [
                        // Contar servicios solicitados como cliente
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM solicitudservicio 
                                WHERE solicitudservicio.id_usuario = Usuario.id_usuario
                            )`),
                            'total_servicios_cliente'
                        ],
                        // Contar servicios asignados como técnico
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM solicitudservicio 
                                WHERE solicitudservicio.id_tecnico = Usuario.id_usuario
                            )`),
                            'total_servicios_tecnico'
                        ],
                        // Contar membresías pagadas por usuario
                        [
                            sequelize.literal(`(
                                SELECT COUNT(*) 
                                FROM pagomembresia 
                                WHERE pagomembresia.id_usuario = Usuario.id_usuario
                                AND pagomembresia.estado = 'activa'
                            )`),
                            'total_membresias'
                        ]
                    ]
                },
                include: [
                    {
                        model: Rol,
                        as: 'rol',
                        attributes: ['nombre_rol']
                    },
                    {
                        model: Ciudad,
                        as: 'ciudad',
                        attributes: ['nombre_ciudad']
                    },
                    // Incluir membresías para conteo
                    {
                        model: sequelize.models.Membresia,
                        as: 'membresias',
                        attributes: [],
                        required: false,
                        where: { estado: 'activa' }
                    }
                ],
                group: ['Usuario.id_usuario'],
                order: [['fecha_registro', 'DESC']],
                limit,
                offset,
                raw: true,
                nest: true
            }),

            // Consulta de estadísticas - Dividida en consultas separadas para evitar problemas de GROUP BY
            Promise.all([
                // Contar usuarios por estado
                Usuario.findAll({
                    attributes: [
                        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN estado = 'activo' THEN 1 END")), 'activos'],
                        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN estado = 'inactivo' THEN 1 END")), 'inactivos'],
                        [Sequelize.fn('COUNT', Sequelize.literal("CASE WHEN estado = 'deshabilitado' THEN 1 END")), 'deshabilitados'],
                        [Sequelize.fn('COUNT', '*'), 'total']
                    ],
                    include: [
                        {
                            model: Rol,
                            as: 'rol',
                            attributes: [],
                            where: rol ? { id_rol: rol } : {}
                        }
                    ],
                    raw: true
                }),
                // Contar usuarios que han solicitado servicios
                sequelize.query(
                    'SELECT COUNT(DISTINCT id_usuario) as usuarios_que_solicitaron_servicios FROM solicitudservicio',
                    { type: sequelize.QueryTypes.SELECT }
                ),
                // Contar técnicos activos (usuarios con rol de tecnico que están activos)
                sequelize.query(
                    `SELECT COUNT(DISTINCT u.id_usuario) as tecnicos_activos 
                     FROM usuario u
                     INNER JOIN roles r ON u.id_rol = r.id_rol
                     WHERE u.estado = 'activo' 
                     AND r.nombre_rol = 'tecnico'`,
                    { type: sequelize.QueryTypes.SELECT }
                ),
                // Contar usuarios con membresías activas
                sequelize.query(
                    "SELECT COUNT(DISTINCT id_usuario) as usuarios_con_membresia FROM pagomembresia WHERE estado = 'activa'",
                    { type: sequelize.QueryTypes.SELECT }
                )
            ])
        ]);

        // Procesar estadísticas de las consultas separadas
        const [estados, usuariosServicios, tecnicosActivos, usuariosMembresias] = stats;

        const estadisticas = {
            activos: parseInt(estados[0]?.activos) || 0,
            inactivos: parseInt(estados[0]?.inactivos) || 0,
            deshabilitados: parseInt(estados[0]?.deshabilitados) || 0,
            total: parseInt(estados[0]?.total) || 0,
            usuarios_que_solicitaron_servicios: parseInt(usuariosServicios[0]?.usuarios_que_solicitaron_servicios) || 0,
            tecnicos_activos: parseInt(tecnicosActivos[0]?.tecnicos_activos) || 0,
            usuarios_con_membresia: parseInt(usuariosMembresias[0]?.usuarios_con_membresia) || 0
        };

        // Procesar usuarios para asegurar que los contadores sean números
        const usuariosProcesados = usuarios.map(usuario => ({
            ...usuario,
            total_servicios_cliente: parseInt(usuario.total_servicios_cliente) || 0,
            total_servicios_tecnico: parseInt(usuario.total_servicios_tecnico) || 0,
            total_servicios: (parseInt(usuario.total_servicios_cliente) || 0) + (parseInt(usuario.total_servicios_tecnico) || 0),
            total_membresias: parseInt(usuario.total_membresias) || 0
        }));

        res.json({
            success: true,
            data: usuariosProcesados,
            total,
            page: Math.floor(offset / limit) + 1,
            totalPages: Math.ceil(total / limit),
            hasMore: offset + limit < total,
            estadisticas
        });
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({
            success: false,
            error: "Error al obtener usuarios",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener stats de usuarios para admin
const obtenerEstadisticasUsuarios = async (req, res) => {
    try {
        // Obtener total de usuarios
        const totalUsuarios = await Usuario.count();

        // Obtener total de referidos
        const totalReferidos = await Referido.count();

        // Obtener suma total de créditos
        const totalCreditos = await CreditoUsuario.sum('monto_credito') || 0;

        res.json({
            success: true,
            data: {
                totalUsuarios,
                totalReferidos,
                totalCreditos
            }
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener estadísticas de usuarios',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los técnicos de una ciudad (con filtros y paginación mejorada)
const obtenerTecnicosPorCiudad = async (req, res) => {
    try {
        // Obtener parámetros de paginación y búsqueda
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 100); // Máximo 100 por rendimiento
        const offset = parseInt(req.query.offset) || 0;
        const { id_ciudad, id_servicio, nombre, estado } = req.query;

        // Obtener el ID del rol de técnico
        const rolTecnico = await Rol.findOne({
            where: { nombre_rol: 'Tecnico' },
            attributes: ['id_rol'],
            raw: true
        });

        if (!rolTecnico) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró el rol de Técnico'
            });
        }

        // Construir condiciones de búsqueda
        const whereCondition = { id_rol: rolTecnico.id_rol };
        const andConditions = [];

        // Aplicar filtros
        if (id_ciudad) whereCondition.id_ciudad = id_ciudad;
        if (estado) whereCondition.estado = estado;
        if (nombre) {
            whereCondition.nombre = { [Op.like]: `%${nombre}%` };
        }

        // Construir el include dinámicamente
        const includeConditions = [
            {
                model: Rol,
                as: 'rol',
                attributes: []
            }
        ];

        // Agregar filtro por servicio solo si se proporciona id_servicio
        if (id_servicio) {
            includeConditions.push({
                model: TecnicoServicio,
                as: 'serviciosAsignados',
                where: { id_servicio: id_servicio },
                attributes: []
            });
        }

        // Obtener total de registros
        const total = await Usuario.count({
            where: whereCondition,
            include: includeConditions
        });

        // 🔎 Consultar técnicos filtrados con paginación
        const tecnicos = await Usuario.findAll({
            attributes: [
                "id_usuario",
                "nombre",
                "identidad",
                "email",
                "telefono",
                "estado",
                "fecha_registro",
                "imagen_url",
                [
                    sequelize.literal(`(
                        SELECT COUNT(*) 
                        FROM solicitudservicio 
                        WHERE solicitudservicio.id_tecnico = Usuario.id_usuario
                    )`),
                    'total_servicios_atendidos'
                ]
            ],
            where: whereCondition,
            include: [
                {
                    model: Ciudad,
                    as: "ciudad",
                    attributes: ["id_ciudad", "nombre_ciudad"]
                },
                {
                    model: Rol,
                    as: "rol",
                    attributes: ["nombre_rol"]
                },
                ...(id_servicio ? [{
                    model: TecnicoServicio,
                    as: 'serviciosAsignados',
                    where: { id_servicio: id_servicio },
                    attributes: []
                }] : [])
            ],
            limit: limit,
            offset: offset,
            order: [["nombre", "ASC"]],
            subQuery: false
        });

        if (!tecnicos.length) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
                page: 1,
                totalPages: 0,
                hasMore: false,
                limit,
                offset: 0
            });
        }

        // Obtener IDs de los técnicos
        const tecnicosIds = tecnicos.map(t => t.id_usuario);

        // 📊 Obtener datos adicionales en paralelo
        const [calificaciones, creditos] = await Promise.all([
            Calificaciones.findAll({
                attributes: [
                    "id_usuario_calificado",
                    [fn("AVG", col("calificacion")), "promedio"]
                ],
                where: {
                    id_usuario_calificado: { [Op.in]: tecnicosIds }
                },
                group: ["id_usuario_calificado"]
            }),
            CreditoUsuario.findAll({
                where: {
                    id_usuario: { [Op.in]: tecnicosIds }
                },
                attributes: ['id_usuario', 'monto_credito']
            })
        ]);

        // Crear mapas de datos
        const mapaPromedios = {};
        calificaciones.forEach(c => {
            mapaPromedios[c.id_usuario_calificado] = parseFloat(c.get("promedio")) || 0;
        });

        const mapaCreditos = {};
        creditos.forEach(c => {
            mapaCreditos[c.id_usuario] = parseFloat(c.monto_credito) || 0;
        });

        // 💰 Calcular saldo total real por técnico (ingresos - retiros + crédito)
        const saldosTotales = {};
        await Promise.all(
            tecnicosIds.map(async (id_usuario) => {
                const [ingresos, retiros] = await Promise.all([
                    Movimiento.sum('monto', {
                        where: {
                            id_usuario,
                            estado: 'completado',
                            tipo: { [Op.in]: ['ingreso', 'ingreso_referido'] }
                        }
                    }),
                    Movimiento.sum('monto', {
                        where: {
                            id_usuario,
                            estado: 'completado',
                            tipo: 'retiro'
                        }
                    })
                ]);

                const saldoMovimientos = (ingresos || 0) - (retiros || 0);
                const saldoCredito = mapaCreditos[id_usuario] || 0;
                saldosTotales[id_usuario] = parseFloat(saldoMovimientos + saldoCredito);
            })
        );

        // 🧮 Armar respuesta final
        const tecnicosConDatos = tecnicos.map(t => {
            const data = t.toJSON();
            const { id_ciudad, ...rest } = data;
            return {
                ...rest,
                ciudad: { id_ciudad, ...data.ciudad },
                promedio_calificacion: mapaPromedios[data.id_usuario] ?? 0,
                saldo_total: saldosTotales[data.id_usuario] ?? 0,
                total_servicios_atendidos: parseInt(data.total_servicios_atendidos) || 0
            };
        });

        // Calcular información de paginación
        const page = Math.floor(offset / limit) + 1;
        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + limit < total;

        return res.status(200).json({
            success: true,
            data: tecnicosConDatos,
            total,
            page,
            totalPages,
            hasMore,
            limit,
            offset
        });

    } catch (error) {
        console.error("Error al obtener técnicos:", error);
        return res.status(500).json({
            success: false,
            error: "Error al obtener técnicos",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los usuarios de una ciudad (con filtros)
const obtenerUsuariosPorCiudad = async (req, res) => {
    const { id_ciudad, nombre, estado, limit = 10, offset = 0 } = req.query;

    try {
        // Rol dinámico de usuario
        const rolUsuario = await Rol.findOne({
            where: { nombre_rol: 'Usuario' },
            attributes: ['id_rol'],
            raw: true
        });

        if (!rolUsuario) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró el rol de Usuario'
            });
        }

        // 🧩 Filtros dinámicos (en SQL)
        let filtrosSQL = `WHERE u.id_rol = :rolId`;
        if (id_ciudad) filtrosSQL += ` AND u.id_ciudad = :ciudadId`;
        if (estado) filtrosSQL += ` AND u.estado = :estado`;
        if (nombre) filtrosSQL += ` AND u.nombre LIKE :nombre`;

        // 🧾 Consulta principal con filtros
        let query = `
        SELECT 
            u.id_usuario,
            u.nombre,
            u.identidad,
            u.email,
            u.telefono,
            u.estado,
            u.id_ciudad,
            c.nombre_ciudad,
            r.nombre_rol,
            COUNT(ref.id_referido) AS total_referidos,
            COALESCE(cu.monto_credito, 0) AS monto_credito
        FROM usuario u
        LEFT JOIN ciudad c ON u.id_ciudad = c.id_ciudad
        LEFT JOIN roles r ON u.id_rol = r.id_rol
        LEFT JOIN referido ref ON u.id_usuario = ref.id_referidor
        LEFT JOIN credito cu ON u.id_usuario = cu.id_usuario
        ${filtrosSQL}
        GROUP BY u.id_usuario, c.nombre_ciudad, r.nombre_rol, cu.monto_credito
        ORDER BY u.nombre ASC
        LIMIT :limit OFFSET :offset
      `;

        // Parámetros seguros
        const replacements = {
            rolId: rolUsuario.id_rol,
            limit: parseInt(limit),
            offset: parseInt(offset)
        };
        if (id_ciudad) replacements.ciudadId = id_ciudad;
        if (estado) replacements.estado = estado;
        if (nombre) replacements.nombre = `%${nombre}%`;

        // Ejecutar consulta
        const [usuariosConReferidos] = await Usuario.sequelize.query(query, { replacements });

        if (!usuariosConReferidos.length) {
            return res.status(200).json({
                total: 0,
                usuarios: []
            });
        }

        // 📦 Total (sin limit)
        const totalUsuarios = await Usuario.count({
            where: {
                id_rol: rolUsuario.id_rol,
                ...(id_ciudad && { id_ciudad }),
                ...(estado && { estado }),
                ...(nombre && { nombre: { [Op.like]: `%${nombre}%` } })
            }
        });

        // 🧮 Formatear respuesta
        const usuariosFormateados = usuariosConReferidos.map(usuario => ({
            id_usuario: usuario.id_usuario,
            nombre: usuario.nombre,
            identidad: usuario.identidad,
            email: usuario.email,
            telefono: usuario.telefono,
            estado: usuario.estado,
            credito: { monto: parseFloat(usuario.monto_credito) || 0 },
            ciudad: {
                id_ciudad: usuario.id_ciudad,
                nombre_ciudad: usuario.nombre_ciudad
            },
            rol: { nombre_rol: usuario.nombre_rol },
            total_referidos: parseInt(usuario.total_referidos) || 0
        }));

        return res.json({
            total: totalUsuarios,
            usuarios: usuariosFormateados
        });

    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        return res.status(500).json({
            error: "Error al obtener usuarios",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener datos para Gráfico de crecimiento de usuarios
const obtenerGraficaCrecimientoUsuarios = async (req, res) => {
    try {
        const { fechaInicio, fechaFin } = req.query;

        // Establecer fechas por defecto (últimos 12 meses)
        const endDate = fechaFin ? new Date(fechaFin) : new Date();
        const startDate = fechaInicio ? new Date(fechaInicio) : new Date();
        startDate.setMonth(startDate.getMonth() - 11);
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);

        // Asegurar que el final del rango sea el último día del mes
        const endOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);

        // Generar etiquetas para los 12 meses
        const labels = [];
        const data = [];
        const currentMonth = new Date(startDate);

        while (currentMonth <= endDate) {
            const year = currentMonth.getFullYear();
            const month = currentMonth.getMonth();
            const monthName = currentMonth.toLocaleString('es-ES', { month: 'short' });

            labels.push(`${monthName} ${year}`);
            data.push(0); // Inicializar contador en 0

            // Mover al siguiente mes
            currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        // Obtener el conteo de usuarios por mes
        const usuariosPorMes = await Usuario.findAll({
            where: {
                fecha_registro: {
                    [Op.between]: [startDate, endOfMonth]
                }
            },
            attributes: [
                [Sequelize.fn('YEAR', Sequelize.col('fecha_registro')), 'year'],
                [Sequelize.fn('MONTH', Sequelize.col('fecha_registro')), 'month'],
                [Sequelize.fn('COUNT', Sequelize.col('id_usuario')), 'total']
            ],
            group: [
                Sequelize.fn('YEAR', Sequelize.col('fecha_registro')),
                Sequelize.fn('MONTH', Sequelize.col('fecha_registro'))
            ],
            order: [
                [Sequelize.fn('YEAR', Sequelize.col('fecha_registro')), 'ASC'],
                [Sequelize.fn('MONTH', Sequelize.col('fecha_registro')), 'ASC']
            ],
            raw: true
        });

        // Mapear los resultados a los meses correspondientes
        usuariosPorMes.forEach(item => {
            const monthIndex = (item.year - startDate.getFullYear()) * 12 + (item.month - startDate.getMonth() - 1);
            if (monthIndex >= 0 && monthIndex < data.length) {
                data[monthIndex] = parseInt(item.total);
            }
        });

        // Calcular total acumulado
        const total = data.reduce((sum, count) => sum + count, 0);

        res.json({
            success: true,
            data: {
                labels: labels,
                data: data,
                total: total
            }
        });

    } catch (error) {
        console.error('Error al obtener estadísticas de crecimiento de usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener las estadísticas de crecimiento de usuarios',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener todos los administradores
const obtenerAdministradores = async (req, res) => {
    const { nombre, estado, id_ciudad, limit = 10, offset = 0 } = req.query;

    try {
        // Obtener el ID del rol de administrador
        const rolAdmin = await Rol.findOne({
            where: { nombre_rol: 'Admin' },
            attributes: ['id_rol'],
            raw: true
        });

        if (!rolAdmin) {
            return res.status(404).json({
                success: false,
                error: 'No se encontró el rol de Administrador'
            });
        }

        // Construir condiciones de búsqueda
        const whereCondition = { id_rol: rolAdmin.id_rol };
        if (estado) whereCondition.estado = estado;
        if (nombre) whereCondition.nombre = { [Op.like]: `%${nombre}%` };
        if (id_ciudad) whereCondition.id_ciudad = id_ciudad;

        // Consultar administradores
        const administradores = await Usuario.findAll({
            attributes: [
                "id_usuario",
                "nombre",
                "identidad",
                "email",
                "telefono",
                "estado",
                "id_ciudad"
            ],
            where: whereCondition,
            include: [
                {
                    model: Ciudad,
                    as: "ciudad",
                    attributes: ["id_ciudad", "nombre_ciudad"]
                },
                {
                    model: Rol,
                    as: "rol",
                    attributes: ["nombre_rol"]
                }
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [["nombre", "ASC"]]
        });

        // Obtener total de administradores
        const total = await Usuario.count({ where: whereCondition });

        // Formatear respuesta
        const administradoresFormateados = administradores.map(admin => {
            const adminData = admin.get({ plain: true });
            return {
                ...adminData,
                ciudad: adminData.ciudad || null,
                rol: adminData.rol
            };
        });

        return res.json({
            success: true,
            total,
            administradores: administradoresFormateados
        });

    } catch (error) {
        console.error("Error al obtener administradores:", error);
        return res.status(500).json({
            success: false,
            error: "Error al obtener administradores",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener todos los técnicos y administradores de una ciudad (con filtros y paginación)
const obtenerTecnicosYAdminsPorCiudad = async (req, res) => {
    try {
        // Obtener parámetros de paginación y búsqueda
        let limit = parseInt(req.query.limit) || 10;
        limit = Math.min(limit, 100); // Máximo 100 por rendimiento
        const offset = parseInt(req.query.offset) || 0;
        const { id_ciudad, id_servicio, nombre, estado } = req.query;

        // Obtener los IDs de los roles de técnico, administrador y super admin
        const [rolTecnico, rolAdmin, rolSA] = await Promise.all([
            Rol.findOne({
                where: { nombre_rol: 'Tecnico' },
                attributes: ['id_rol'],
                raw: true
            }),
            Rol.findOne({
                where: { nombre_rol: 'Admin' },
                attributes: ['id_rol'],
                raw: true
            }),
            Rol.findOne({
                where: { nombre_rol: 'sa' },
                attributes: ['id_rol'],
                raw: true
            })
        ]);

        if (!rolTecnico || !rolAdmin) {
            return res.status(404).json({
                success: false,
                error: 'No se encontraron los roles de Técnico o Administrador'
            });
        }

        // Construir array de roles a incluir
        const rolesIds = [rolTecnico.id_rol, rolAdmin.id_rol];
        if (rolSA) {
            rolesIds.push(rolSA.id_rol);
        }

        // Construir condiciones de búsqueda
        const whereCondition = {
            id_rol: { [Op.in]: rolesIds }
        };

        // Aplicar filtros
        if (id_ciudad) whereCondition.id_ciudad = id_ciudad;
        if (estado) whereCondition.estado = estado;
        if (nombre) {
            whereCondition.nombre = { [Op.like]: `%${nombre}%` };
        }

        // Construir el include dinámicamente
        const includeConditions = [
            {
                model: Rol,
                as: 'rol',
                attributes: []
            }
        ];

        // Agregar filtro por servicio solo si se proporciona id_servicio
        // (solo aplica para técnicos)
        if (id_servicio) {
            includeConditions.push({
                model: TecnicoServicio,
                as: 'serviciosAsignados',
                where: { id_servicio: id_servicio },
                attributes: [],
                required: false // LEFT JOIN para no excluir admins
            });
        }

        // Obtener total de registros
        const total = await Usuario.count({
            where: whereCondition,
            include: includeConditions,
            distinct: true
        });

        // 🔎 Consultar usuarios filtrados con paginación
        const usuarios = await Usuario.findAll({
            attributes: [
                "id_usuario",
                "nombre",
                "identidad",
                "email",
                "telefono",
                "estado",
                "fecha_registro",
                "imagen_url",
                "id_rol",
                [
                    sequelize.literal(`(
                        SELECT COUNT(*) 
                        FROM solicitudservicio 
                        WHERE solicitudservicio.id_tecnico = Usuario.id_usuario
                    )`),
                    'total_servicios_atendidos'
                ]
            ],
            where: whereCondition,
            include: [
                {
                    model: Ciudad,
                    as: "ciudad",
                    attributes: ["id_ciudad", "nombre_ciudad"]
                },
                {
                    model: Rol,
                    as: "rol",
                    attributes: ["id_rol", "nombre_rol"]
                },
                ...(id_servicio ? [{
                    model: TecnicoServicio,
                    as: 'serviciosAsignados',
                    where: { id_servicio: id_servicio },
                    attributes: [],
                    required: false
                }] : [])
            ],
            limit: limit,
            offset: offset,
            order: [
                [sequelize.literal(`CASE WHEN Usuario.id_rol = ${rolTecnico.id_rol} THEN 0 ELSE 1 END`), 'ASC'], // Técnicos primero
                ["nombre", "ASC"]
            ],
            subQuery: false
        });

        if (!usuarios.length) {
            return res.status(200).json({
                success: true,
                data: [],
                total: 0,
                page: 1,
                totalPages: 0,
                hasMore: false,
                limit,
                offset: 0
            });
        }

        // Obtener IDs de los usuarios
        const usuariosIds = usuarios.map(u => u.id_usuario);

        // 📊 Obtener datos adicionales en paralelo
        const [calificaciones, creditos] = await Promise.all([
            Calificaciones.findAll({
                attributes: [
                    "id_usuario_calificado",
                    [fn("AVG", col("calificacion")), "promedio"]
                ],
                where: {
                    id_usuario_calificado: { [Op.in]: usuariosIds }
                },
                group: ["id_usuario_calificado"]
            }),
            CreditoUsuario.findAll({
                where: {
                    id_usuario: { [Op.in]: usuariosIds }
                },
                attributes: ['id_usuario', 'monto_credito']
            })
        ]);

        // Crear mapas de datos
        const mapaPromedios = {};
        calificaciones.forEach(c => {
            mapaPromedios[c.id_usuario_calificado] = parseFloat(c.get("promedio")) || 0;
        });

        const mapaCreditos = {};
        creditos.forEach(c => {
            mapaCreditos[c.id_usuario] = parseFloat(c.monto_credito) || 0;
        });

        // 💰 Calcular saldo total real por usuario (ingresos - retiros + crédito)
        const saldosTotales = {};
        await Promise.all(
            usuariosIds.map(async (id_usuario) => {
                const [ingresos, retiros] = await Promise.all([
                    Movimiento.sum('monto', {
                        where: {
                            id_usuario,
                            estado: 'completado',
                            tipo: { [Op.in]: ['ingreso', 'ingreso_referido'] }
                        }
                    }),
                    Movimiento.sum('monto', {
                        where: {
                            id_usuario,
                            estado: 'completado',
                            tipo: 'retiro'
                        }
                    })
                ]);

                const saldoMovimientos = (ingresos || 0) - (retiros || 0);
                const saldoCredito = mapaCreditos[id_usuario] || 0;
                saldosTotales[id_usuario] = parseFloat(saldoMovimientos + saldoCredito);
            })
        );

        // 🧮 Armar respuesta final
        const usuariosConDatos = usuarios.map(u => {
            const data = u.toJSON();
            const { id_ciudad, ...rest } = data;
            const esTecnico = data.rol.id_rol === rolTecnico.id_rol;

            return {
                ...rest,
                ciudad: { id_ciudad, ...data.ciudad },
                promedio_calificacion: esTecnico ? (mapaPromedios[data.id_usuario] ?? 0) : null,
                saldo_total: saldosTotales[data.id_usuario] ?? 0,
                total_servicios_atendidos: esTecnico ? (parseInt(data.total_servicios_atendidos) || 0) : null,
                tipo_usuario: esTecnico ? 'Tecnico' : 'Admin'
            };
        });

        // Calcular información de paginación
        const page = Math.floor(offset / limit) + 1;
        const totalPages = Math.ceil(total / limit);
        const hasMore = offset + limit < total;

        // Calcular estadísticas adicionales
        const totalTecnicos = usuariosConDatos.filter(u => u.tipo_usuario === 'Tecnico').length;
        const totalAdmins = usuariosConDatos.filter(u => u.tipo_usuario === 'Admin').length;

        return res.status(200).json({
            success: true,
            data: usuariosConDatos,
            total,
            page,
            totalPages,
            hasMore,
            limit,
            offset,
            estadisticas: {
                total_tecnicos: totalTecnicos,
                total_admins: totalAdmins,
                total_usuarios: usuariosConDatos.length
            }
        });

    } catch (error) {
        console.error("Error al obtener técnicos y administradores:", error);
        return res.status(500).json({
            success: false,
            error: "Error al obtener técnicos y administradores",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

//Obtener Usuario por ID
const obtenerUsuarioPorId = async (req, res) => {
    const { id } = req.params;

    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del usuario" });
    }

    try {
        const usuario = await Usuario.findByPk(id, {
            attributes: { exclude: ['password_hash'] },
            include: [
                {
                    model: Ciudad,
                    as: 'ciudad',
                    attributes: ['nombre_ciudad']
                },
                {
                    model: Rol,
                    as: 'rol',
                    attributes: ['nombre_rol']
                }
            ]
        });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "No se encontró ningún usuario con el ID proporcionado",
                idBuscado: id
            });
        }

        res.json(usuario);
    } catch (error) {
        console.error("Error al obtener usuario por ID:", error);
        res.status(500).json({
            error: "Error al obtener usuario por ID",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener Usuario por nombre (búsqueda por aproximación)
const obtenerUsuarioPorNombre = async (req, res) => {
    const { nombre } = req.params;

    if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ error: "Se requiere un término de búsqueda" });
    }

    try {
        const usuarios = await Usuario.findAll({
            attributes: { exclude: ['password_hash'] },
            where: {
                nombre: {
                    [Op.like]: `%${nombre}%`
                }
            },
            order: [['nombre', 'ASC']] // Ordenar por nombre
        });

        if (!usuarios || usuarios.length === 0) {
            return res.status(404).json({
                mensaje: "No se encontraron usuarios que coincidan con la búsqueda",
                terminoBuscado: nombre
            });
        }

        res.json(usuarios);
    } catch (error) {
        console.error("Error al buscar usuarios por nombre:", error);
        res.status(500).json({
            error: "Error al buscar usuarios",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Obtener Usuario por identidad
const obtenerUsuarioPorIdentidad = async (req, res) => {
    const { identidad } = req.params;

    if (!identidad) {
        return res.status(400).json({ error: "Se requiere el parámetro de identidad" });
    }

    try {
        const usuario = await Usuario.findOne({ where: { identidad } });

        if (!usuario) {
            return res.status(404).json({
                mensaje: "No se encontró ningún usuario con la identidad proporcionada",
                identidadBuscada: identidad
            });
        }

        res.json(usuario);
    } catch (error) {
        console.error("Error al obtener usuario por identidad:", error);
        res.status(500).json({
            error: "Error al obtener usuario por identidad",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Función para verificar RTN por número de identidad
const verificarRTN = async (req, res) => {
    const { id_usuario } = req.params;

    if (!id_usuario) {
        return res.status(400).json({
            success: false,
            error: "Se requiere el ID del usuario"
        });
    }

    try {
        // Buscar el usuario por id_usuario
        const usuario = await Usuario.findOne({
            where: { id_usuario },
            attributes: ['id_usuario', 'nombre', 'identidad']
        });

        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: "No se encontró ningún usuario con el ID proporcionado",
                idBuscado: id_usuario
            });
        }

        // Verificar si la identidad tiene más de 13 dígitos
        const identidadSinGuiones = usuario.identidad.replace(/-/g, '');
        const cantidadDigitos = identidadSinGuiones.length;

        if (cantidadDigitos > 13) {
            // Es un RTN
            return res.json({
                success: true,
                message: "El número de identidad corresponde a un RTN",
                data: {
                    nombre: usuario.nombre,
                    rtn: usuario.identidad,
                    cantidad_digitos: cantidadDigitos
                }
            });
        } else {
            // No es un RTN
            return res.json({
                success: false,
                message: "El número de identidad no corresponde a un RTN",
                data: {
                    nombre: usuario.nombre,
                    identidad: usuario.identidad,
                    cantidad_digitos: cantidadDigitos
                }
            });
        }

    } catch (error) {
        console.error("Error al verificar RTN:", error);
        res.status(500).json({
            success: false,
            error: "Error al verificar RTN",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Crear Usuario
const crearUsuario = async (req, res) => {
    const {
        nombre,
        identidad,
        email,
        telefono,
        password_hash,
        id_ciudad,
        es_tecnico
    } = req.body;

    let rolAsignado;
    try {
        const nombreRol = es_tecnico ? 'Tecnico' : 'Usuario';

        rolAsignado = await Rol.findOne({
            where: { nombre_rol: nombreRol },
            attributes: ['id_rol'],
            raw: true
        });

        if (!rolAsignado) {
            return res.status(500).json({
                success: false,
                error: `No se pudo determinar el rol ${nombreRol}`
            });
        }
    } catch (error) {
        console.error("Error al obtener el rol:", error);
        return res.status(500).json({
            success: false,
            error: 'Error al obtener el rol',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }

    const id_rol = rolAsignado.id_rol;

    try {
        // Verificar si ya existe un usuario con el mismo email, teléfono o identidad
        const usuarioExistente = await Usuario.findOne({
            where: {
                [Op.or]: [
                    { email },
                    { telefono },
                    { identidad }
                ]
            }
        });

        if (usuarioExistente) {
            let field = 'dato';

            if (usuarioExistente.email === email) field = 'correo electrónico';
            else if (usuarioExistente.telefono === telefono) field = 'teléfono';
            else if (usuarioExistente.identidad === identidad) field = 'número de identidad';

            return res.status(400).json({
                status: 400,
                error: "Error de validación",
                message: `El ${field} ya está en uso por otro usuario`,
                field: field === 'correo electrónico' ? 'email' :
                    field === 'teléfono' ? 'telefono' : 'identidad'
            });
        }

        // Hashear la contraseña
        const hashedPassword = await bcrypt.hash(password_hash, saltRounds);

        // Crear el usuario con estado 'deshabilitado' si es técnico
        const usuario = await Usuario.create({
            nombre,
            id_rol,
            identidad,
            email,
            telefono,
            password_hash: hashedPassword,
            id_ciudad,
            estado: es_tecnico ? 'deshabilitado' : 'activo'
        });

        // No devolver la contraseña en la respuesta
        const usuarioSinPassword = usuario.toJSON();
        delete usuarioSinPassword.password_hash;

        res.status(201).json({
            status: 201,
            message: `${es_tecnico ? 'Técnico' : 'Usuario'} creado exitosamente`,
            id_usuario: usuario.id_usuario,
            rol: es_tecnico ? 'Tecnico' : 'Usuario'
        });
    } catch (error) {
        console.error("Error al crear usuario:", error);

        // Manejar errores de validación de Sequelize
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors?.map(err => ({
                field: err.path,
                message: err.message,
                type: err.type,
                value: err.value
            })) || [];

            console.error('Errores de validación:', errors);

            // Si es un error de duplicación pero no se pudo manejar antes
            if (error.name === 'SequelizeUniqueConstraintError' && errors.length === 0) {
                console.error('Error de restricción única sin detalles:', error);
                let field = 'dato';
                const errorMessage = error.original?.message || '';

                if (errorMessage.includes('email')) field = 'correo electrónico';
                else if (errorMessage.includes('telefono')) field = 'teléfono';
                else if (errorMessage.includes('identidad')) field = 'número de identidad';

                return res.status(400).json({
                    status: 400,
                    error: "Error de validación",
                    message: `El ${field} ya está en uso por otro usuario`,
                    field: field === 'correo electrónico' ? 'email' :
                        field === 'teléfono' ? 'telefono' : 'identidad'
                });
            }

            return res.status(400).json({
                status: 400,
                error: "Error de validación",
                message: "Por favor, verifica los datos ingresados",
                validationErrors: errors
            });
        }

        // Para otros errores
        return res.status(500).json({
            status: 500,
            error: "Error interno del servidor",
            message: "Ocurrió un error al crear el usuario",
            details: process.env.NODE_ENV === 'development' ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
                originalError: error.original
            } : undefined
        });
    }
};

// Controlador para actualizar la imagen de perfil
const actualizarImagenPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Guardar el public_id de la imagen anterior si existe
        const imagenAnteriorId = usuario.imagen_public_id;

        // Si se subió una nueva imagen
        if (req.file) {
            // Actualizar con la nueva imagen
            await usuario.update({
                imagen_url: req.file.path,
                imagen_public_id: req.file.filename
            });

            // Si existía una imagen anterior, eliminarla de Cloudinary
            if (imagenAnteriorId) {
                try {
                    await cloudinary.uploader.destroy(imagenAnteriorId);
                } catch (error) {
                    console.error('Error al eliminar la imagen anterior:', error);
                    // No detenemos el flujo si falla la eliminación
                }
            }

            return res.json({
                success: true,
                data: {
                    imagen_url: req.file.path,
                    mensaje: 'Imagen de perfil actualizada correctamente'
                }
            });
        }

        return res.status(400).json({
            success: false,
            error: 'No se proporcionó ninguna imagen'
        });

    } catch (error) {
        console.error('Error al actualizar imagen de perfil:', error);

        // Si hubo un error y se subió una nueva imagen, la eliminamos
        if (req.file && req.file.filename) {
            try {
                await cloudinary.uploader.destroy(req.file.filename);
            } catch (e) {
                console.error('Error al limpiar imagen subida:', e);
            }
        }

        return res.status(500).json({
            success: false,
            error: 'Error al actualizar la imagen de perfil',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Controlador para eliminar la imagen de perfil
const eliminarImagenPerfil = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = await Usuario.findByPk(id);

        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        const imagenAnteriorId = usuario.imagen_public_id;

        if (!imagenAnteriorId) {
            return res.status(400).json({
                success: false,
                error: 'El usuario no tiene una imagen de perfil'
            });
        }

        // Actualizar el usuario para eliminar la referencia a la imagen
        await usuario.update({
            imagen_url: null,
            imagen_public_id: null
        });

        // Eliminar la imagen de Cloudinary
        try {
            await cloudinary.uploader.destroy(imagenAnteriorId);
        } catch (error) {
            console.error('Error al eliminar la imagen de Cloudinary:', error);
            // No revertimos la actualización del usuario aunque falle la eliminación en Cloudinary
        }

        return res.json({
            success: true,
            mensaje: 'Imagen de perfil eliminada correctamente'
        });

    } catch (error) {
        console.error('Error al eliminar imagen de perfil:', error);
        return res.status(500).json({
            success: false,
            error: 'Error al eliminar la imagen de perfil',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Actualizar Usuario
const actualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const {
        nombre,
        identidad,
        email,
        telefono,
        id_ciudad,
        id_rol,
        password_hash,
        activo,
        estado
    } = req.body;

    if (!id) {
        return res.status(400).json({
            status: 400,
            error: "Se requiere el ID del usuario"
        });
    }

    try {
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({
                status: 404,
                error: "Usuario no encontrado",
                message: `No se encontró un usuario con el ID: ${id}`
            });
        }

        // Actualizar solo los campos que se proporcionaron en el body
        if (nombre !== undefined) usuario.nombre = nombre;
        if (identidad !== undefined) usuario.identidad = identidad;
        if (email !== undefined) usuario.email = email;
        if (telefono !== undefined) usuario.telefono = telefono;
        if (id_ciudad !== undefined) usuario.id_ciudad = id_ciudad;
        if (id_rol !== undefined) usuario.id_rol = id_rol;

        if (password_hash) {
            const hashedPassword = await bcrypt.hash(password_hash, saltRounds);
            usuario.password_hash = hashedPassword;
        }

        if (activo !== undefined) usuario.activo = activo;
        if (estado !== undefined) usuario.estado = estado;

        await usuario.save();

        // No devolver la contraseña en la respuesta
        const usuarioActualizado = usuario.toJSON();
        delete usuarioActualizado.password_hash;

        res.json({
            status: 200,
            message: "Perfil actualizado exitosamente",
            usuario: usuarioActualizado
        });
    } catch (error) {
        console.error("Error al actualizar usuario:", error);

        if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
            let field = 'dato';
            let value = '';

            const match = error.original?.message?.match(/Duplicate entry '(.+?)' for key '(.+?)'/);
            if (match) {
                value = match[1];
                const keyName = match[2];

                if (keyName.includes('telefono')) field = 'teléfono';
                else if (keyName.includes('email')) field = 'correo electrónico';
                else if (keyName.includes('identidad')) field = 'número de identidad';

                return res.status(400).json({
                    status: 400,
                    error: "Error de validación",
                    message: `El ${field} "${value}" ya está en uso por otro usuario`,
                    field: field
                });
            }
        }

        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errors = error.errors.map(err => ({
                field: err.path,
                message: err.message
            }));

            return res.status(400).json({
                status: 400,
                error: "Error de validación",
                message: "Por favor, verifica los datos ingresados",
                validationErrors: errors
            });
        }

        res.status(500).json({
            status: 500,
            error: "Error al actualizar el perfil",
            message: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Actualizar contraseña con verificación de contraseña actual
const actualizarPassword = async (req, res) => {

    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!id) {
        const error = "Se requiere el ID del usuario";
        console.error('Error de validación:', error);
        return res.status(400).json({
            status: 400,
            error: error
        });
    }

    if (!newPassword) {
        const error = "Se requiere la nueva contraseña";
        console.error('Error de validación:', error);
        return res.status(400).json({
            status: 400,
            error: error
        });
    }

    try {
        // Buscar el usuario por id_usuario (que es la clave primaria) 
        const usuario = await Usuario.findOne({
            where: { id_usuario: id },
            attributes: ['id_usuario', 'email', 'password_hash'] // Solo los campos necesarios
        });

        if (!usuario) {
            const error = `Usuario con ID ${id} no encontrado`;
            console.error(error);
            return res.status(404).json({
                status: 404,
                error: error
            });
        }

        // Verificar que el password_hash existe
        if (!usuario.password_hash) {
            console.error('El usuario no tiene contraseña configurada');
            return res.status(400).json({
                status: 400,
                error: 'No se puede verificar la contraseña actual'
            });
        }

        // Si se proporciona currentPassword, verificar que sea correcta (usuario cambiando su propia contraseña)
        // Si no se proporciona, significa que un administrador está cambiando la contraseña
        if (currentPassword) {
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, usuario.password_hash);

            if (!isCurrentPasswordValid) {
                console.error('La contraseña actual proporcionada no es correcta');
                return res.status(400).json({
                    status: 400,
                    error: "Contraseña actual incorrecta",
                    message: "La contraseña actual proporcionada no es correcta."
                });
            }
        }

        // Verificar que la nueva contraseña sea diferente a la actual
        const isSameAsCurrent = await bcrypt.compare(newPassword, usuario.password_hash);

        if (isSameAsCurrent) {
            console.error('La nueva contraseña no puede ser igual a la actual');
            return res.status(400).json({
                status: 400,
                error: "La nueva contraseña no puede ser igual a la actual",
                message: "La nueva contraseña debe ser diferente a la contraseña actual."
            });
        }

        // Hashear y guardar la nueva contraseña
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        usuario.password_hash = hashedPassword;
        await usuario.save();

        // No devolver la contraseña en la respuesta
        const usuarioActualizado = usuario.toJSON();
        delete usuarioActualizado.password_hash;


        res.json({
            status: 200,
            message: "Contraseña actualizada exitosamente",
            usuario: usuarioActualizado
        });

    } catch (error) {
        console.error("Error al actualizar la contraseña:", error);

        // Detalles adicionales del error
        const errorDetails = {
            name: error.name,
            message: error.message,
            ...(error.errors && {
                errors: error.errors.map(e => ({
                    message: e.message,
                    type: e.type,
                    path: e.path,
                    value: e.value
                }))
            })
        };

        console.error('Detalles del error:', errorDetails);

        res.status(500).json({
            status: 500,
            error: "Error al actualizar la contraseña",
            message: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo más tarde.",
            details: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        });
    }
};

//Eliminar Usuario
const eliminarUsuario = async (req, res) => {
    const { id } = req.params; // Cambiado de id_usuario a id para que coincida con la ruta

    if (!id) {
        return res.status(400).json({ error: "Se requiere el ID del usuario" });
    }

    try {
        const usuario = await Usuario.findByPk(id);
        if (!usuario) {
            return res.status(404).json({
                error: "Usuario no encontrado",
                idBuscado: id
            });
        }

        await usuario.destroy();

        res.json({
            status: 200,
            message: "Usuario eliminado exitosamente",
            idEliminado: id
        });
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({
            error: "Error al eliminar usuario",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    verificarPerfilTecnico,
    obtenerGraficaCrecimientoUsuarios,
    obtenerUsuarios,
    obtenerTecnicosPorCiudad,
    obtenerTecnicosYAdminsPorCiudad,
    obtenerUsuariosPorCiudad,
    obtenerAdministradores,
    obtenerEstadisticasUsuarios,
    obtenerUsuarioPorId,
    obtenerUsuarioPorNombre,
    obtenerUsuarioPorIdentidad,
    crearUsuario,
    actualizarUsuario,
    actualizarPassword,
    actualizarImagenPerfil,
    eliminarImagenPerfil,
    verificarRTN,
    eliminarUsuario
};