const { sequelize } = require("../config/database");
const CreditoUsuario = require("../models/creditoUsuariosModel");
const Usuarios = require("../models/usuariosModel");
const Ciudades = require("../models/ciudadesModel");
const Rol = require("../models/rolesModel");
const { Op } = require('sequelize');

//Obtener todos los creditos
const getAllCreditos = async (req, res) => {
    try {
        const creditos = await CreditoUsuario.findAll();
        res.json({
            success: true,
            data: creditos
        });
    } catch (error) {
        console.error('Error al obtener los créditos:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al obtener los créditos',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener crédito por usuario
const getCreditoPorUsuario = async (req, res) => {
    try {
      const { id_usuario } = req.params;
  
      const credito = await CreditoUsuario.findOne({
        where: { id_usuario }
      });
  
      // Si el usuario no tiene registro de crédito, devolver monto 0 sin error
      if (!credito) {
        console.log(`ℹ️ [INFO] Usuario ${id_usuario} no tiene crédito registrado. Retornando 0.`);
        return res.json({
          success: true,
          data: {
            id_usuario,
            monto_credito: 0,
            fecha: null
          }
        });
      }
  
      // Si existe registro, devolver normalmente
      return res.json({
        success: true,
        data: credito
      });
  
    } catch (error) {
      console.error('❌ [ERROR] Al obtener crédito del usuario:', error);
      return res.status(500).json({
        success: false,
        error: 'Error al obtener el crédito',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
  

// Crear o actualizar crédito
const createCredito = async (req, res) => {
    try {
        const { id_usuario, monto_credito } = req.body; 

        // Buscar crédito existente
        const creditoExistente = await CreditoUsuario.findOne({ 
            where: { id_usuario } 
        });

        let montoFinal = parseInt(monto_credito);
        
        // Si ya existe un crédito, sumar el monto
        if (creditoExistente) {
            montoFinal += parseInt(creditoExistente.monto_credito);
        }
        
        // Crear o actualizar el crédito con el monto total
        const [credito, created] = await CreditoUsuario.upsert(
            { 
                id_usuario,
                monto_credito: montoFinal,
                fecha: new Date()
            },
            {
                where: { id_usuario },
                returning: true
            }
        );

        res.json({
            success: true,
            message: created ? 'Crédito creado exitosamente' : 'Crédito actualizado exitosamente',
            data: credito,
            monto_anterior: creditoExistente ? creditoExistente.monto_credito : 0,
            monto_agregado: monto_credito,
            monto_actual: montoFinal
        });
    } catch (error) {
        console.error('Error al guardar el crédito:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al procesar el crédito',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}; 

// Resetear crédito de un usuario a 0
const resetCredito = async (req, res) => {
    try {
        const { id_usuario } = req.params;

        const creditoExistente = await CreditoUsuario.findOne({ 
            where: { id_usuario } 
        }); 

        // Actualizar monto_credito a 0
        creditoExistente.monto_credito = 0;
        creditoExistente.fecha = new Date();
        await creditoExistente.save();

        res.json({
            success: true,
            message: 'Crédito reseteado a 0 exitosamente',
            data: creditoExistente
        });
    } catch (error) {
        console.error('Error al resetear el crédito:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al resetear el crédito',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

//Eliminar credito
const deleteCredito = async (req, res) => {
    try {
        const resultado = await CreditoUsuario.destroy({ 
            where: { id_credito_usuario: req.params.id_credito_usuario } 
        });
        
        if (resultado === 0) {
            return res.status(404).json({
                success: false,
                message: 'No se encontró el crédito a eliminar'
            });
        }
        
        res.json({
            success: true,
            message: 'Crédito eliminado exitosamente',
            data: { id_credito_usuario: req.params.id_credito_usuario }
        });
    } catch (error) {
        console.error('Error al eliminar el crédito:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al eliminar el crédito',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Obtener top 5 técnicos con más crédito
const getTopTecnicosConMasCredito = async (req, res) => {
    try {
        // Obtener el ID del rol desde los parámetros de consulta
        const { id_rol } = req.query;

        // Validar que se proporcione un ID de rol
        if (!id_rol) {
            return res.status(400).json({
                success: false,
                error: 'Se requiere el parámetro id_rol en la consulta'
            });
        }

        const topTecnicos = await CreditoUsuario.findAll({
            include: [{
                model: Usuarios,
                as: 'usuario',
                where: { id_rol: id_rol },
                attributes: ['id_usuario', 'nombre', 'email', 'telefono', 'id_ciudad'],
                include: [{
                    model: Ciudades,
                    as: 'ciudad',
                    attributes: ['nombre_ciudad'],
                    required: false
                }],
                required: true
            }],
            where: {
                monto_credito: {
                    [Op.gt]: 0  // Solo créditos mayores a 0
                }
            },
            attributes: [
                'id_usuario',
                [sequelize.fn('ROUND', sequelize.col('monto_credito'), 2), 'monto_credito'],
                'fecha'
            ],
            order: [['monto_credito', 'DESC']],
            limit: 5
        });

        // Formatear la respuesta
        const resultado = topTecnicos.map(tecnico => ({ 
            nombre: tecnico.usuario?.nombre || 'Técnico',
            ciudad: tecnico.usuario?.ciudad?.nombre_ciudad || 'Sin ciudad',
            monto_credito: parseFloat(tecnico.monto_credito) || 0,
            fecha: tecnico.fecha
        }));

        res.json({
            success: true,
            data: resultado
        });

    } catch (error) {
        console.error('Error al obtener los técnicos con más crédito:', error);
        res.status(500).json({
            success: false,
            error: 'Error al obtener los técnicos con más crédito',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllCreditos,
    getCreditoPorUsuario,
    createCredito,
    resetCredito,
    deleteCredito,
    getTopTecnicosConMasCredito
};
