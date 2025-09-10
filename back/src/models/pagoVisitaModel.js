const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PagoVisita = sequelize.define("PagoVisita", {
    id_pagovisita: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_solicitud: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_cuenta: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    monto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    num_comprobante: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "pagado"),
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: "pagovisita",
});

module.exports = PagoVisita;