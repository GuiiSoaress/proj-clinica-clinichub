// src/services/push.js
// Serviço de Push Notifications remotas (Aula 9).
// Irmão do lembretes.js (Aula 8) — reaproveita handler, canal e permissão dele.

import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { post } from './api';
import {
  prepararCanal,
  garantirPermissao,
  configurarHandler,
  Notifications,
} from './lembretes';

export { configurarHandler, prepararCanal };

const CHAVE_PUSH_TOKEN = '@clinichub:push_token';

/**
 * 7. ERRO PRÓPRIO: PushIndisponivel
 * Permite que a interface distinga os motivos de indisponibilidade (emulador,
 * permissão negada, projectId ausente) de uma falha de conexão com a API.
 */
export class PushIndisponivel extends Error {
  constructor(motivo, mensagem, canAskAgain = null) {
    super(mensagem);
    this.name = 'PushIndisponivel';
    this.motivo = motivo; // 'emulador' | 'permissao_negada' | 'sem_project_id' | 'web'
    this.canAskAgain = canAskAgain;
  }
}

/**
 * 6. OBTER TOKEN PUSH
 * - Confere se é dispositivo físico (Device.isDevice)
 * - Prepara o canal do Android (reaproveitando lembretes.js)
 * - Garante a permissão de notificação (reaproveitando lembretes.js)
 * - Lê o projectId do EAS
 * - Obtém o token pelo getExpoPushTokenAsync
 *
 * @returns {Promise<string>} ExponentPushToken[...]
 * @throws {PushIndisponivel}
 */
export async function obterTokenPush() {
  if (Platform.OS === 'web') {
    throw new PushIndisponivel(
      'web',
      'Push remoto não é suportado no ambiente web.'
    );
  }

  // 1. Push exige aparelho físico. Emulador não recebe (Passo 2 - Item 6 / 7).
  if (!Device.isDevice) {
    throw new PushIndisponivel(
      'emulador',
      'Push notifications exigem aparelho físico. Emulador não recebe.'
    );
  }

  // 2. Canal do Android (reaproveita prepararCanal da Aula 8).
  await prepararCanal();

  // 3. Permissão (reaproveita garantirPermissao da Aula 8).
  const temPermissao = await garantirPermissao();
  if (!temPermissao) {
    let canAskAgain = true;
    try {
      const atual = await Notifications.getPermissionsAsync();
      canAskAgain = atual?.canAskAgain ?? false;
    } catch (e) {}
    throw new PushIndisponivel(
      'permissao_negada',
      'Sem permissão de notificações. Avisos da clínica não serão entregues.',
      canAskAgain
    );
  }

  // 4. Project ID do EAS (necessário para gerar o token no EAS / Expo Push Service).
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) {
    throw new PushIndisponivel(
      'sem_project_id',
      'projectId do EAS não encontrado. Configure app.json > expo.extra.eas.projectId.'
    );
  }

  try {
    const resposta = await Notifications.getExpoPushTokenAsync({ projectId });
    return resposta.data;
  } catch (erro) {
    throw new PushIndisponivel(
      'falha_geracao',
      `Não foi possível gerar o token de push: ${erro?.message}`
    );
  }
}

/**
 * 8. REGISTRAR DISPOSITIVO
 * Obtém o push token e o envia à API com POST /dispositivos.
 * O header Authorization (Bearer token) já vai junto automaticamente através do api.js,
 * permitindo que a clínica saiba QUEM avisar.
 *
 * @returns {Promise<string>} Token registrado
 */
export async function registrarDispositivo() {
  const token = await obterTokenPush();

  // 9. Token que não chega ao servidor não serve para nada:
  await post('/dispositivos', {
    token,
    plataforma: Platform.OS,
    modelo: Device.modelName || 'Aparelho Físico',
  });

  await AsyncStorage.setItem(CHAVE_PUSH_TOKEN, token);
  return token;
}

/**
 * 10. MANTER REGISTRO ATUALIZADO
 * Chama registrarDispositivo dentro de try/catch e NÃO propaga o erro.
 * Push é um extra — falhar aqui não pode impedir o uso do app.
 *
 * @returns {Promise<{ sucesso: boolean, token?: string, erro?: string, motivo?: string }>}
 */
export async function manterRegistroAtualizado() {
  try {
    const token = await registrarDispositivo();
    return { sucesso: true, token };
  } catch (erro) {
    // Falha silenciosa ou log informativo: o app continua funcionando 100%
    return {
      sucesso: false,
      erro: erro?.message,
      motivo: erro?.motivo || 'erro_desconhecido',
      canAskAgain: erro?.canAskAgain,
    };
  }
}

/**
 * Recupera o último token salvo no cache local do dispositivo.
 */
export async function obterTokenSalvo() {
  try {
    return await AsyncStorage.getItem(CHAVE_PUSH_TOKEN);
  } catch (e) {
    return null;
  }
}
