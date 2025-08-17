const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const RefreshToken = sequelize.define('refresh_tokens', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    timestamps: false,
    tableName: 'refresh_tokens'
  });

module.exports = RefreshToken;

