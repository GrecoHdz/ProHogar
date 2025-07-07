const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Ciudad = sequelize.define("Ciudad", {
    id_ciudad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre_ciudad: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = Ciudad;

