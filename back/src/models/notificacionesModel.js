const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Notificacion = sequelize.define("Notificacion", {
    id_notificacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    tipo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    titulo:{
        type: DataTypes.STRING,
        allowNull: false
    }, 
    creado_por:{
        type: DataTypes.STRING,
        allowNull: false
    }, 
    fecha_creacion:{
        type: DataTypes.DATE,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "notificaciones",
});

module.exports = Notificacion;

