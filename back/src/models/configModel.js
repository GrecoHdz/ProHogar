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
        type: DataTypes.STRING(100),
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "config",
    hooks: {
        afterSync: async () => {
            const configs = [
                { tipo_config: "visita_tecnico", valor: "150" }
            ];

            for (const cfg of configs) {
                await Config.findOrCreate({
                    where: { tipo_config: cfg.tipo_config },
                    defaults: { valor: cfg.valor },
                });
            }
        },
    },
});

module.exports = Config;