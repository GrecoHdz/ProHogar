const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Cotizacion = sequelize.define("Cotizacion", {
    id_cotizacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_asignacion: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    mano_obra: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_cotizacion: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "aceptado", "rechazado"),
        allowNull: false
    }
});

module.exports = Cotizacion;