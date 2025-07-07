const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Tecnico = sequelize.define("Tecnico", {
    id_tecnico: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false
    }
});

module.exports = Tecnico;