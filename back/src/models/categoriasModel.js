const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CategoriaServicio = sequelize.define("CategoriaServicio", {
    id_categoria: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nombre_categoria: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

module.exports = CategoriaServicio;
