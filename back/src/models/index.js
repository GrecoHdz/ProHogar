// Importa todos los modelos
const Usuario = require('./usuariosModel');
const Rol = require('./rolesModel');
const Tecnico = require('./tecnicosModel');
const Categoria = require('./categoriasModel');
const Servicio = require('./asignacionServicioModel');
const SolicitudServicio = require('./solicitudServicioModel');
const Cotizacion = require('./cotizacionModel');
const Pago = require('./pagoModel');
const Membresia = require('./membresiasModel');
const MembresiaBeneficio = require('./membresiaBeneficiosModel');
const Referido = require('./referidosModel');
const Ciudad = require('./ciudadesModel');
const RefreshToken = require('./refreshtokenModel');

// Función para configurar las asociaciones
const setupAssociations = () => {
  // Relación Usuario - Rol
  Usuario.belongsTo(Rol, { 
    foreignKey: 'id_rol',
    as: 'rol'  // Añadimos el alias 'rol' para la relación
  });
  Rol.hasMany(Usuario, { 
    foreignKey: 'id_rol',
    as: 'usuarios'  // Añadimos el alias 'usuarios' para la relación inversa
  });

  // Relación Usuario - Ciudad
  Usuario.belongsTo(Ciudad, {
    foreignKey: 'id_ciudad',
    as: 'ciudad'
  });
  Ciudad.hasMany(Usuario, {
    foreignKey: 'id_ciudad',
    as: 'usuarios'
  });

  // Relación Usuario - Técnico
  Usuario.hasOne(Tecnico, { foreignKey: 'usuario_id' });
  Tecnico.belongsTo(Usuario, { foreignKey: 'usuario_id' });

  // Relación Técnico - Categoría
  Tecnico.belongsToMany(Categoria, { 
    through: 'tecnicos_categorias',
    foreignKey: 'tecnico_id'
  });
  Categoria.belongsToMany(Tecnico, { 
    through: 'tecnicos_categorias',
    foreignKey: 'categoria_id'
  });

  // Relación Usuario - Solicitud de Servicio (Cliente)
  Usuario.hasMany(SolicitudServicio, { foreignKey: 'cliente_id' });
  SolicitudServicio.belongsTo(Usuario, { foreignKey: 'cliente_id' });

  // Relación Técnico - Solicitud de Servicio
  Tecnico.hasMany(SolicitudServicio, { foreignKey: 'tecnico_id' });
  SolicitudServicio.belongsTo(Tecnico, { foreignKey: 'tecnico_id' });

  // Relación Solicitud de Servicio - Cotización
  SolicitudServicio.hasOne(Cotizacion, { foreignKey: 'solicitud_id' });
  Cotizacion.belongsTo(SolicitudServicio, { foreignKey: 'solicitud_id' });

  // Relación Cotización - Pago
  Cotizacion.hasOne(Pago, { foreignKey: 'cotizacion_id' });
  Pago.belongsTo(Cotizacion, { foreignKey: 'cotizacion_id' });

  // Relación Usuario - RefreshToken
  Usuario.hasMany(RefreshToken, { 
    foreignKey: 'usuario_id',
    as: 'refreshTokens',
  });
  RefreshToken.belongsTo(Usuario, { 
    foreignKey: 'usuario_id',
    as: 'usuario'
  });

  // Relación Membresía - Beneficios (comentada ya que no tenemos el campo membresia_id en Usuario)
  // Membresia.hasMany(MembresiaBeneficio, { foreignKey: 'membresia_id' });
  // MembresiaBeneficio.belongsTo(Membresia, { foreignKey: 'membresia_id' });

  // Relación Usuario - Referidos
  Usuario.hasMany(Referido, { foreignKey: 'usuario_referidor_id' });
  Referido.belongsTo(Usuario, { 
    foreignKey: 'usuario_referidor_id',
    as: 'Referidor'
  });
  
  Usuario.hasMany(Referido, { foreignKey: 'usuario_referido_id' });
  Referido.belongsTo(Usuario, {
    foreignKey: 'usuario_referido_id',
    as: 'Referido'
  });

  // Relación Usuario - Ciudad (comentada ya que no tenemos el campo ciudad_id en Usuario)
  // Usuario.belongsTo(Ciudad, { foreignKey: 'ciudad_id' });
  // Ciudad.hasMany(Usuario, { foreignKey: 'ciudad_id' });

  console.log('Asociaciones configuradas correctamente');
};

// Exporta la función de configuración
module.exports = setupAssociations;