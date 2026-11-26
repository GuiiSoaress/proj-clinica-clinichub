// front/app.config.js
// Configuração dinâmica do Expo (Aula 12 - Mapas).
// Permite injetar a chave de API do Google Maps via variável de ambiente (GOOGLE_MAPS_API_KEY)
// sem expor segredos no Git ou versionar chaves em app.json.

module.exports = ({ config }) => {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || '';

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...config.android?.config,
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
  };
};
