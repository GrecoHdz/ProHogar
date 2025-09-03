const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SolicitudServicio = sequelize.define("solicitudservicio", {
    id_solicitud: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_categoria: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_ciudad:{
        type: DataTypes.INTEGER,
        allowNull: false
    },
    colonia:{
        type: DataTypes.STRING,
        allowNull: false
    },
    direccion_precisa:{
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion:{
        type: DataTypes.TEXT,
        allowNull: false
    },
    fecha_solicitud:{
        type: DataTypes.DATE,
        allowNull: false
    },
    estado:{
        type: DataTypes.ENUM("pendiente_pago", "pendiente_asignacion", "asignado", "en_proceso", "finalizado", "cancelado"),
        allowNull: false
    },
    visita_pagada:{
        type: DataTypes.BOOLEAN,
        allowNull: false
    },
    comentario_admin:{
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: "solicitudservicio",
});

module.exports = SolicitudServicio;



