const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Cuenta = sequelize.define("cuentas", {
    id_cuenta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    banco: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    beneficiario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    num_cuenta: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    tipo: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    activo: {
        type: DataTypes.TINYINT(1),
        allowNull: false,
        defaultValue: 1
    }
}, {
    timestamps: false,
    tableName: "cuentas",
});

module.exports = Cuenta;
