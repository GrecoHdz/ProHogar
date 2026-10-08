const crypto = require('crypto');

const getHmacSecret = () => {
  const secret = process.env.HMAC_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('HMAC_SECRET o JWT_SECRET no están definidos en las variables de entorno');
  }
  return secret;
};

/**
 * Genera una firma HMAC-SHA256 para el id_usuario dado.
 * @param {number|string} idUsuario 
 * @returns {string} Hex string de la firma HMAC
 */
const generarFirmaPerfil = (idUsuario) => {
  const secret = getHmacSecret();
  return crypto
    .createHmac('sha256', secret)
    .update(String(idUsuario))
    .digest('hex');
};

/**
 * Valida una firma HMAC recibida contra el id_usuario.
 * @param {number|string} idUsuario 
 * @param {string} firmaRecibida 
 * @returns {boolean} true si la firma es válida
 */
const validarFirmaPerfil = (idUsuario, firmaRecibida) => {
  if (!idUsuario || !firmaRecibida || typeof firmaRecibida !== 'string') {
    return false;
  }
  try {
    const firmaEsperada = generarFirmaPerfil(idUsuario);
    const bufEsperada = Buffer.from(firmaEsperada, 'hex');
    const bufRecibida = Buffer.from(firmaRecibida, 'hex');
    
    if (bufEsperada.length !== bufRecibida.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(bufEsperada, bufRecibida);
  } catch (error) {
    return false;
  }
};

module.exports = {
  generarFirmaPerfil,
  validarFirmaPerfil
};
