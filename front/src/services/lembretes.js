// src/services/lembretes.js
// Serviço isolado de lembretes locais de consultas (Aula 8).
// Nenhuma tela deve importar 'expo-notifications' ou acessar o AsyncStorage de lembretes diretamente.
//
// Notificações locais rodam 100% no dispositivo (funcionam mesmo sem internet / modo avião)
// e são suportadas no Expo Go.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANTE (Expo Go no Android):
// Importamos módulos específicos de notificação local para evitar acionar
// a auto-inscrição de Push remoto de expo-notifications no Expo Go.
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import {
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  clearLastNotificationResponseAsync,
} from 'expo-notifications/build/NotificationsEmitter';
import {
  getPermissionsAsync,
  requestPermissionsAsync,
} from 'expo-notifications/build/NotificationPermissions';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { cancelAllScheduledNotificationsAsync } from 'expo-notifications/build/cancelAllScheduledNotificationsAsync';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';

export const Notifications = {
  setNotificationHandler,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
  getLastNotificationResponseAsync,
  clearLastNotificationResponseAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  setNotificationChannelAsync,
  scheduleNotificationAsync,
  getAllScheduledNotificationsAsync,
  cancelScheduledNotificationAsync,
  cancelAllScheduledNotificationsAsync,
  AndroidImportance,
  SchedulableTriggerInputTypes,
};

export const CANAL_LEMBRETES = 'lembretes-consulta';
const CHAVE_STORAGE_LEMBRETES = '@clinichub:lembretes';

/**
 * 1. CONFIGURAR HANDLER
 * Define o comportamento quando a notificação dispara com o app em primeiro plano (aberto).
 * Deve ser chamado no topo do App.js.
 */
export function configurarHandler() {
  if (Platform.OS === 'web') return;

  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (erro) {
    console.warn('Não foi possível configurar handler de notificações:', erro?.message);
  }
}

/**
 * 2. PREPARAR CANAL (Android)
 * No Android 8+, notificações precisam de um canal configurado com importância HIGH
 * para aparecerem em banner (heads-up) na tela.
 */
export async function prepararCanal() {
  if (Platform.OS !== 'android') return;

  try {
    await Notifications.setNotificationChannelAsync(CANAL_LEMBRETES, {
      name: 'Lembretes de consulta',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  } catch (erro) {
    // No Expo Go Android algumas versões emitem aviso de permissão interna do canal;
    // a notificação usa o canal padrão em fallback sem quebrar a execução.
    console.warn('Canal Android não configurado (fallback automático):', erro?.message);
  }
}

/**
 * 3. GARANTIR PERMISSÃO
 * Confere getPermissionsAsync primeiro. Só pede com requestPermissionsAsync se ainda não tiver.
 * Se canAskAgain for false, devolve false sem insistir.
 * @returns {Promise<boolean>}
 */
export async function garantirPermissao() {
  if (Platform.OS === 'web') return false;

  try {
    const atual = await Notifications.getPermissionsAsync();
    if (atual.status === 'granted') {
      return true;
    }

    if (!atual.canAskAgain) {
      return false;
    }

    const pedida = await Notifications.requestPermissionsAsync();
    return pedida.status === 'granted';
  } catch (erro) {
    console.warn('Erro ao verificar permissão de notificação:', erro?.message);
    return false;
  }
}

/**
 * Helpers do AsyncStorage para mapeamento: consultaId -> identificadorNotificacao
 */
async function obterMapaLembretes() {
  try {
    const json = await AsyncStorage.getItem(CHAVE_STORAGE_LEMBRETES);
    return json ? JSON.parse(json) : {};
  } catch (e) {
    console.error('Erro ao ler mapa de lembretes no AsyncStorage:', e);
    return {};
  }
}

async function salvarMapaLembretes(mapa) {
  try {
    await AsyncStorage.setItem(CHAVE_STORAGE_LEMBRETES, JSON.stringify(mapa));
  } catch (e) {
    console.error('Erro ao salvar mapa de lembretes no AsyncStorage:', e);
  }
}

/**
 * Converte data e hora da consulta em um objeto Date válido.
 */
export function converterParaDataHora(data, hora) {
  const d = data instanceof Date ? new Date(data.getTime()) : new Date(data);
  if (hora && typeof hora === 'string') {
    const partes = hora.split(':');
    const h = parseInt(partes[0], 10) || 0;
    const m = parseInt(partes[1], 10) || 0;
    d.setHours(h, m, 0, 0);
  }
  return d;
}

/**
 * 4. AGENDAR LEMBRETE
 * - Cancela lembrete anterior daquela consulta ANTES de criar o novo (reagendar substitui, nunca acumula).
 * - Calcula o horário (1 hora antes por padrão, ou opções customizadas para teste).
 * - Se o horário já passou, não agenda e retorna honestamente o status.
 * - Agenda notificação com gatilho DATE e salva o vínculo consultaId -> id no AsyncStorage.
 *
 * @param {object} consulta { id, data, hora, medico, especialidade }
 * @param {object} opcoes { minutosAntes: 60, dataDisparoCustomizada?: Date }
 * @returns {Promise<{ agendado: boolean, motivo?: string, identificador?: string, dataLembrete?: Date }>}
 */
export async function agendarLembrete(consulta, opcoes = {}) {
  if (!consulta || !consulta.id) {
    return { agendado: false, motivo: 'consulta_invalida' };
  }

  // 1. Cancela lembrete anterior daquela consulta antes de agendar o novo
  await cancelarLembrete(consulta.id);

  if (Platform.OS === 'web') {
    return { agendado: false, motivo: 'plataforma_web_nao_suportada' };
  }

  const temPermissao = await garantirPermissao();
  if (!temPermissao) {
    return { agendado: false, motivo: 'permissao_negada' };
  }

  // 2. Calcula data da consulta e data do lembrete
  const dataConsulta = converterParaDataHora(consulta.data, consulta.hora);
  const minutosAntes = typeof opcoes.minutosAntes === 'number' ? opcoes.minutosAntes : 60;

  let dataLembrete = opcoes.dataDisparoCustomizada;
  if (!dataLembrete) {
    dataLembrete = new Date(dataConsulta.getTime() - minutosAntes * 60 * 1000);
  }

  const agora = new Date();
  if (dataLembrete.getTime() <= agora.getTime()) {
    // Horário já passou! Não prometer aviso que não acontecerá.
    return {
      agendado: false,
      motivo: 'horario_passado',
      dataConsulta,
      dataLembrete,
    };
  }

  // 3. Texto da notificação (Passo 6 - Privacidade na tela bloqueada):
  // Não exibe nome de médico ou especialidade para evitar vazamento de dados de saúde.
  const horaFormatada = consulta.hora || `${String(dataConsulta.getHours()).padStart(2, '0')}:${String(dataConsulta.getMinutes()).padStart(2, '0')}`;
  const titulo = 'Lembrete de consulta';
  const corpo = `Você tem uma consulta agendada às ${horaFormatada}.`;

  try {
    const identificador = await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        body: corpo,
        sound: true,
        priority: 'high',
        data: {
          consultaId: consulta.id,
          tela: 'Confirmada',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dataLembrete,
        channelId: CANAL_LEMBRETES,
      },
    });

    // 4. Guarda vínculo consultaId -> identificador no AsyncStorage
    const mapa = await obterMapaLembretes();
    mapa[consulta.id] = identificador;
    await salvarMapaLembretes(mapa);

    return {
      agendado: true,
      identificador,
      dataLembrete,
      dataConsulta,
    };
  } catch (erro) {
    console.error('Falha ao agendar lembrete:', erro);
    return { agendado: false, motivo: 'erro_agendamento', erro: erro?.message };
  }
}

/**
 * 5. CANCELAR LEMBRETE
 * Busca o identificador no mapa do AsyncStorage, cancela a notificação agendada
 * e remove a entrada correspondente.
 * @param {string} consultaId
 * @returns {Promise<boolean>}
 */
export async function cancelarLembrete(consultaId) {
  if (!consultaId) return false;

  try {
    const mapa = await obterMapaLembretes();
    const identificador = mapa[consultaId];

    if (identificador) {
      if (Platform.OS !== 'web') {
        try {
          await Notifications.cancelScheduledNotificationAsync(identificador);
        } catch (e) {
          // Se já disparou ou não existe no sistema operacional, prossegue com a limpeza
        }
      }
      delete mapa[consultaId];
      await salvarMapaLembretes(mapa);
      return true;
    }

    return false;
  } catch (erro) {
    console.error('Erro ao cancelar lembrete:', erro);
    return false;
  }
}

/**
 * Lista todas as notificações pendentes no sistema operacional.
 * Usado para auditoria e teste (Passo 3 item 17).
 */
export async function listarLembretesAgendados() {
  if (Platform.OS === 'web') return [];
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (erro) {
    console.warn('Erro ao listar notificações agendadas:', erro?.message);
    return [];
  }
}

/**
 * Cancela todas as notificações pendentes e limpa o mapa local.
 */
export async function cancelarTodosLembretes() {
  if (Platform.OS !== 'web') {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
    } catch (e) {
      console.warn('Erro ao cancelar todas notificações:', e?.message);
    }
  }
  await AsyncStorage.removeItem(CHAVE_STORAGE_LEMBRETES);
}

/**
 * Retorna o mapa de vínculos { [consultaId]: idNotificacao }
 */
export async function obterVinculosLembretes() {
  return await obterMapaLembretes();
}

/**
 * Passo 7 - Extensão:
 * Sincroniza lembretes ao carregar consultas: cancela lembretes de consultas
 * que não existem mais ou foram canceladas.
 */
export async function sincronizarLembretes(consultasAtivas = []) {
  try {
    const mapa = await obterMapaLembretes();
    const idsAtivos = new Set(
      consultasAtivas
        .filter((c) => c.status === 'proxima')
        .map((c) => c.id)
    );

    let mudou = false;
    for (const consultaId of Object.keys(mapa)) {
      if (!idsAtivos.has(consultaId)) {
        const idNotif = mapa[consultaId];
        if (Platform.OS !== 'web') {
          try {
            await Notifications.cancelScheduledNotificationAsync(idNotif);
          } catch (e) {}
        }
        delete mapa[consultaId];
        mudou = true;
      }
    }

    if (mudou) {
      await salvarMapaLembretes(mapa);
    }
    return true;
  } catch (e) {
    console.warn('Erro na sincronização de lembretes:', e);
    return false;
  }
}
