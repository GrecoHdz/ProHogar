const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const CreditoUsuario = sequelize.define("CreditoUsuario", {
    id_credito_usuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    monto_credito: {
        type: DataTypes.INTEGER,
        allowNull: false
    }, 
    fecha: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: "credito", 
    indexes: [ 
        { name: 'idx_credito_usuario', fields: ['id_usuario'] }
      ]
});

module.exports = CreditoUsuario;