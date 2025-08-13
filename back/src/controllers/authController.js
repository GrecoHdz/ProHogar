const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuariosModel');
const Rol = require('../models/rolesModel');

const login = async (req, res) => {
  const { identidad, password } = req.body;

  try {
    const user = await Usuario.findOne({ where: { identidad: identidad } });

    if (!user || user.password_hash !== password) {
      return res.status(400).json({ message: 'Credenciales Incorrectas.' });
    }

    const token = jwt.sign({ 
      id: user.id_usuario, 
      identidad: user.identidad,
      rol: user.id_rol 
    }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Incluir el rol en la consulta del usuario
    const rol = await Rol.findByPk(user.id_rol, {
      attributes: ['id_rol', 'nombre_rol']
    });

    // Crear una copia del objeto usuario sin el password_hash
    const userData = user.get({ plain: true });
    delete userData.password_hash;

    // Agregar el nombre del rol al objeto de usuario
    if (rol) {
      userData.role = rol.nombre_rol.toLowerCase();
      userData.rol_nombre = rol.nombre_rol; // Mantener el nombre original
    } else {
      userData.role = 'usuario';
      userData.rol_nombre = 'Usuario';
    }

    res.json({ 
      token,
      user: userData
    });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
};

module.exports = { login };