const { sequelize } = require("../config/database");
const Referido = require("../models/referidosModel");
const Usuario = require("../models/usuariosModel");
const { Op } = require("sequelize");
const Ciudad = require("../models/ciudadesModel");

// Obtener todos los referidos
const getAllReferidos = async (req, res) => {
    try {
        const referidos = await Referido.findAll();
        res.json({ 
            success: true,
            data: referidos 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener los referidos",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener referidos de un usuario con paginación
const getReferidosByUser = async (req, res) => {
    try {
        const { id_referidor } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // Obtener los referidos con paginación
        const { count, rows: referidos } = await Referido.findAndCountAll({ 
            where: { id_referidor },
            include: [{
                model: Usuario,
                as: 'usuario',
                attributes: ['nombre','estado']
            }],
            attributes: ['fecha_referido'],
            order: [['fecha_referido', 'DESC']],
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });
        
        // Mapear los resultados para incluir solo el nombre y la fecha
        const referidosSimples = referidos.map(referido => ({
            nombre: referido.usuario?.nombre || 'Usuario no encontrado',
            fecha: referido.fecha_referido,
            estado: referido.usuario?.estado || 'Usuario no encontrado'
        }));
        
        const totalPages = Math.ceil(count / limit);
        
        res.json({ 
            success: true,
            data: referidosSimples,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: totalPages
            }
        });
    } catch (error) {
        console.error('Error en getReferidosByUser:', error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener los referidos",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener referidor de un usuario
const getReferidorByUser = async (req, res) => {
    try {
        const { id_referido_usuario } = req.params;
        const referido = await Referido.findOne({ 
            where: { id_referido_usuario } 
        });
        
        if (!referido) {
            return res.json({ 
                success: true,
                message: "No se encontró el referidor"
            });
        }
        
        res.json({ 
            success: true,
            id_referidor: referido.id_referidor
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error al obtener el referidor",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 
// Crear Referido
const createReferido = async (req, res) => {
    try {
        const { id_referidor, id_referido_usuario } = req.body;
        
        // Validar que no exista ya el referido
        const existeReferido = await Referido.findOne({ 
            where: { id_referido_usuario } 
        });
        
        if (existeReferido) {
            return res.status(400).json({ 
                success: false,
                error: "Este usuario ya tiene un referido registrado" 
            });
        }
        
        const referido = await Referido.create({ 
            id_referidor, 
            id_referido_usuario 
        });
        
        res.status(201).json({ 
            success: true,
            data: referido 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            error: "Error al crear el referido",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener el top 5 de usuarios con más referidos
const getTopUsuariosConMasReferidos = async (req, res) => {
    try {
        const [results] = await sequelize.query(`
            SELECT 
                u.id_usuario,
                u.nombre,
                c.nombre_ciudad as ciudad,
                COUNT(r.id_referido) as cantidad_referidos,
                MAX(r.fecha_referido) as fecha
            FROM 
                referido r
            JOIN 
                usuario u ON r.id_referidor = u.id_usuario
            LEFT JOIN 
                ciudad c ON u.id_ciudad = c.id_ciudad
            GROUP BY 
                r.id_referidor, u.id_usuario, c.nombre_ciudad
            ORDER BY 
                cantidad_referidos DESC
            LIMIT 5
        `);

        // Formatear la respuesta
        const resultado = results.map(item => ({
            nombre: item.nombre || 'Usuario desconocido',
            ciudad: item.ciudad || 'Sin ciudad',
            cantidad_referidos: parseInt(item.cantidad_referidos) || 0,
            fecha: item.fecha
        }));

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('Error al obtener el top de usuarios con más referidos:', error);
        res.status(500).json({
            success: false,
            error: "Error al obtener el top de usuarios con más referidos",
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllReferidos,
    getReferidosByUser,
    getReferidorByUser,
    createReferido,
    getTopUsuariosConMasReferidos
};