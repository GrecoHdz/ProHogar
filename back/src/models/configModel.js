const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Config = sequelize.define("config", {
    id_config: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tipo_config: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    valor: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "config",
});

module.exports = Config;