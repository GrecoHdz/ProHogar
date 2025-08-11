const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuariosModel');

const login = async (req, res) => {
  const { identidad, password } = req.body;

  try {
    const user = await Usuario.findOne({ where: { identidad: identidad } });

    if (!user || user.password_hash !== password) {
      return res.status(400).json({ message: 'Credenciales Incorrectas.' });
    }

    const token = jwt.sign({ id: user.id, usuario: user.usuario }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.json({ token });
  } catch (error) {
    console.error('Error en el login:', error);
    res.status(500).json({ message: 'Error al iniciar sesión.' });
  }
};

module.exports = { login };