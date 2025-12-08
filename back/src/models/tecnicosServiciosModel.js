const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const TecnicoServicio = sequelize.define("tecnico_servicio", {
    id_tecnico_servicio: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_tecnico: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_servicio: {
        type: DataTypes.INTEGER,
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "tecnico_servicio",
    indexes: [
        {
            name: 'idx_tecnico_servicio_id_tecnico',
            fields: ['id_tecnico']
        },
        {
            name: 'idx_tecnico_servicio_id_servicio',
            fields: ['id_servicio']
        },
        {
            unique: true,
            name: 'uk_tecnico_servicio',
            fields: ['id_tecnico', 'id_servicio']
        }
    ]
});

module.exports = TecnicoServicio;
