const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Cotizacion = sequelize.define("Cotizacion", {
    id_cotizacion: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    id_solicitud: {
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
    monto_manodeobra: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    monto_materiales: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    descuento_membresia: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    credito_usado: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    comentario:{
        type:DataTypes.STRING,
        allowNull:false
    },
    fecha: {
        type: DataTypes.DATE,
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM("pendiente", "aceptado", "rechazado", "pagado", "confirmado"),
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: "cotizaciones", 
    indexes: [  
        {
          name: 'idx_cotizacion_id_solicitud',
          fields: ['id_solicitud']
        },
        {
          name: 'idx_cotizacion_solicitud_idcotizacion',
          fields: ['id_solicitud', 'id_cotizacion']
        },
        {
          name: 'idx_cotizacion_estado',
          fields: ['estado']
        }
      ]
      
});

module.exports = Cotizacion;