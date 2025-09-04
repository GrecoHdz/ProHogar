const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const AsignacionServicio = sequelize.define("AsignacionServicio", {
    id_asignacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_tecnico: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_asignacion: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "asignado", "en_proceso", "finalizado", "cancelado"),
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "asignacionservicio",
}); 

module.exports = AsignacionServicio;