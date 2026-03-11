const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PagoPaquete = sequelize.define("PagoPaquete", {
    id_pago_paquete: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuario',
            key: 'id_usuario'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    id_paquete_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'paquetes_usuarios',
            key: 'id_paquete_usuario'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
    },
    id_cuenta: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'cuentas',
            key: 'id_cuenta'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
    },
    monto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    num_comprobante: {
        type: DataTypes.STRING,
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "aprobado", "rechazado"),
        allowNull: false,
        defaultValue: "pendiente"
    }
}, {
    timestamps: false,
    tableName: "pago_paquete",
    indexes: [
        {
            name: 'idx_pago_paquete_usuario',
            fields: ['id_usuario']
        },
        {
            name: 'idx_pago_paquete_estado',
            fields: ['estado']
        },
        {
            name: 'idx_pago_paquete_fecha',
            fields: ['fecha']
        },
        {
            name: 'idx_pago_paquete_cuenta',
            fields: ['id_cuenta']
        }
    ]
});

module.exports = PagoPaquete;
