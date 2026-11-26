// src/services/camera.js
// Isola o acesso à câmera (expo-image-picker) em um único arquivo (Aula 14 — Passo 2).
//
// Antes desta extração, MedicoForm e FotoPerfilCampo chamavam a biblioteca
// direto, cada um com a sua cópia da lógica de permissão. Com o service:
// - as telas não sabem qual biblioteca tira a foto;
// - o teste troca este arquivo por um falso e simula "usuário cancelou" ou
//   "permissão negada" sem câmera nenhuma.

import * as ImagePicker from 'expo-image-picker';

/**
 * Erro lançado quando o usuário nega a permissão da câmera.
 */
export class CameraPermissaoNegada extends Error {
  constructor() {
    super('Permissão da câmera negada.');
    this.name = 'CameraPermissaoNegada';
  }
}

/**
 * Pede permissão e abre a câmera com recorte quadrado (1:1) e compressão.
 * @returns {Promise<string|null>} URI da foto, ou `null` se o usuário cancelar.
 * @throws {CameraPermissaoNegada} Quando a permissão é negada.
 */
export async function tirarFoto() {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();
  if (permissao.status !== 'granted') {
    throw new CameraPermissaoNegada();
  }

  const resultado = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });

  // Fechar a câmera sem tirar foto é escolha normal do usuário, não erro.
  if (resultado.canceled) {
    return null;
  }

  return resultado.assets?.[0]?.uri || null;
}
