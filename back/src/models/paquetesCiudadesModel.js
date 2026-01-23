const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PaqueteCiudad = sequelize.define("paquete_ciudad", {
    id_paquete_ciudad: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_paquete: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'paquetes',
            key: 'id_paquete'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    id_ciudad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'ciudad',
            key: 'id_ciudad'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    }
}, {
    timestamps: false,
    tableName: "paquetes_ciudades",
    indexes: [
        {
            unique: true,
            name: 'uk_paquete_ciudad',
            fields: ['id_paquete', 'id_ciudad']
        }
    ]
});

module.exports = PaqueteCiudad;
