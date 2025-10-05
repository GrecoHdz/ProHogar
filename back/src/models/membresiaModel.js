const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Membresia = sequelize.define("Membresia", {
    id_membresia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_usuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    id_cuenta: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    num_comprobante: {
        type: DataTypes.STRING,
        allowNull: true
    },
    monto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("activa", "vencida", "pendiente"),
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "pagomembresia",
    indexes: [ 
        {
          name: 'idx_membresia_id_usuario',
          fields: ['id_usuario']
        }, 
        {
          name: 'idx_membresia_id_usuario_fecha',
          fields: ['id_usuario', 'fecha']
        }, 
        {
          name: 'idx_membresia_estado',
          fields: ['estado']
        }, 
        {
          name: 'idx_membresia_usuario_estado',
          fields: ['id_usuario', 'estado']
        }
      ]
      
});

module.exports = Membresia;