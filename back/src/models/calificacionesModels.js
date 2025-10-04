const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Calificacion = sequelize.define('Calificacion', {
    id_calificacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_usuario_calificado: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_usuario_calificador: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    calificacion: {
        type: DataTypes.TINYINT,
        allowNull: false
    },
    comentario: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'calificaciones',
    timestamps: false
});

module.exports = Calificacion;
