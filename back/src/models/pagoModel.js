const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Pago = sequelize.define("Pago", {
    id_pago: {
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
    id_membresia: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    monto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo_pago: {
        type: DataTypes.ENUM("efectivo", "tarjeta", "transferencia"),
        allowNull: false
    },
    metodo_pago: {
        type: DataTypes.ENUM("efectivo", "tarjeta", "transferencia"),
        allowNull: false
    },
    fecha_pago: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "pagado", "cancelado"),
        allowNull: false
    }
});

module.exports = Pago;