const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Servicio = sequelize.define("servicio", {
    id_servicio: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    estado: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "servicios",
});

module.exports = Servicio;