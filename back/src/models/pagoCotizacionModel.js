const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PagoCotizacion = sequelize.define("PagoCotizacion", {
    id_pagocotizacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_cuenta: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    num_comprobante: {
        type: DataTypes.STRING,
        allowNull: true
    },
    monto_manodeobra: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    comentario:{
        type:DataTypes.STRING,
        allowNull:true
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "pagado", "rechazado"),
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "pagocotizacion",
});

module.exports = PagoCotizacion;