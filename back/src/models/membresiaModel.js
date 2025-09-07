const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Membresia = sequelize.define("Membresia", {
    id_membresia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
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
    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("activa", "vencida", "pendiente"),
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "membresia",
});

module.exports = Membresia;