const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Movimiento = sequelize.define('Movimiento', {
    id_movimiento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_cotizacion: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    id_referido: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM('ingreso', 'retiro','ingreso_referido'),
        allowNull: false
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    },
    estado: {
        type: DataTypes.ENUM('pendiente', 'completado','rechazado'),
        allowNull: true,
        defaultValue: 'pendiente'
    }
}, {
    tableName: 'movimientos',
    timestamps: false, 
    indexes: [
        {
          name: 'idx_movimientos_usuario_tipo_fecha',
          fields: ['id_usuario', 'tipo', 'fecha']
        },
        {
          name: 'idx_movimientos_usuario_estado',
          fields: ['id_usuario', 'estado']
        },
        {
          name: 'idx_movimientos_tipo_estado_fecha',
          fields: ['tipo', 'estado', 'fecha']
        },
        {
          name: 'idx_movimientos_referido_fecha',
          fields: ['id_referido', 'fecha']
        }
    ] 
}); 

module.exports = Movimiento;