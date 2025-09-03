const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Referido = sequelize.define("Referido", {
    id_referido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_referidor: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_referido_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha_referido: {
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "referido",
});

module.exports = Referido;