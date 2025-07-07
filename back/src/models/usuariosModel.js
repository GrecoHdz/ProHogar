const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Usuario = sequelize.define("Usuario", {
    id_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_rol: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING,
        allowNull: false
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false
    },
    telefono: {
        type: DataTypes.STRING,
        allowNull: false
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha_registro: {
        type: DataTypes.DATE,
        allowNull: false
    },
});

module.exports = Usuario;
