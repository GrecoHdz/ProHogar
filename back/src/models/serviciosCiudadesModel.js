const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ServicioCiudad = sequelize.define("servicio_ciudad", {
    id_servicio_ciudad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_servicio: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_ciudad: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "servicios_ciudades",
    indexes: [
        {
            unique: true,
            name: 'uk_servicio_ciudad',
            fields: ['id_servicio', 'id_ciudad']
        }
    ]
});

module.exports = ServicioCiudad;
