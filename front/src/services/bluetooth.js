// src/services/bluetooth.js
// Service de leitura de sinais vitais via Bluetooth Low Energy (Aula 7).
//
// =====================================================================
// INTERFACE (o que as telas conhecem)
// =====================================================================
//   procurar(aoEncontrar)          -> começa a busca; chama aoEncontrar({ id, nome })
//   pararBusca()                   -> interrompe a busca
//   conectar(id)                   -> Promise; rejeita com Error de mensagem amigável
//   monitorarFrequencia(aoReceber) -> chama aoReceber(bpm) a cada nova leitura
//   desconectar()                  -> Promise; libera o aparelho
//
// Nenhum nome acima menciona BLE, UUID ou base64: a tela não precisa saber
// como o dado chega. Trocar o periférico (ou o modo) não mexe nas telas.
//
// =====================================================================
// MODO SIMULADO x MODO REAL
// =====================================================================
// MODO_SIMULADO = true  -> roda no Expo Go, com aparelhos falsos.
// MODO_SIMULADO = false -> usa react-native-ble-plx. Exige DEVELOPMENT BUILD
//                          (npx expo run:android ou EAS Build) e um periférico
//                          BLE de frequência cardíaca por perto.
// Passo a passo completo em Docs/004-bluetooth-modo-real.md.

import { Platform, PermissionsAndroid } from 'react-native';

// Ponto ÚNICO do código que decide o modo.
export const MODO_SIMULADO = true;

// ---------------------------------------------------------------------
// Falhas provocadas de propósito (Passo 4 da atividade). Só valem no modo
// simulado. Deixe tudo desligado no uso normal.
// ---------------------------------------------------------------------
export const FALHAS_SIMULADAS = {
  semAparelhos: false,       // a busca termina sem encontrar nada
  erroAoConectar: false,     // conectar() lança erro
  perderConexaoApos: 0,      // para de emitir após N leituras (0 = nunca)
};

// UUIDs padronizados pelo Bluetooth SIG: iguais em qualquer monitor
// cardíaco que siga o padrão Heart Rate Profile.
const SERVICO_FREQ_CARDIACA = '0000180d-0000-1000-8000-00805f9b34fb';
const CARACTERISTICA_MEDICAO = '00002a37-0000-1000-8000-00805f9b34fb';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// =====================================================================
// DECODIFICAÇÃO (função pura, testável sem hardware)
// =====================================================================
// Formato Heart Rate Measurement (0x2A37): o bit 0 do primeiro byte (flags)
// indica se o valor vem em 8 bits (byte 1) ou 16 bits little-endian (bytes 1-2).
export function decodificarFrequencia(valorBase64) {
  const { Buffer } = require('buffer');
  const bytes = Buffer.from(valorBase64, 'base64');
  if (bytes.length < 2) return null;
  const formato16bits = (bytes[0] & 0x01) === 1;
  if (formato16bits) {
    return bytes.length >= 3 ? bytes.readUInt16LE(1) : null;
  }
  return bytes[1];
}

// =====================================================================
// PERMISSÕES (Android)
// =====================================================================
// Android 12 (API 31) criou BLUETOOTH_SCAN/CONNECT. Antes disso, escanear
// exigia localização precisa (quem vê os aparelhos ao redor deduz onde você está).
export async function pedirPermissoes() {
  if (MODO_SIMULADO || Platform.OS !== 'android') return true;

  const permissoes =
    Platform.Version >= 31
      ? [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];

  const resultado = await PermissionsAndroid.requestMultiple(permissoes);
  return Object.values(resultado).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
}

// =====================================================================
// IMPLEMENTAÇÃO SIMULADA
// =====================================================================
// Os atrasos são de propósito: sem eles a tela fica "boa demais" e não
// percebemos a falta dos indicadores de carregando.
export function criarServicoBleSimulado() {
  let temporizadores = [];
  let intervalo = null;

  const limparTemporizadores = () => {
    temporizadores.forEach(clearTimeout);
    temporizadores = [];
  };

  return {
    procurar(aoEncontrar) {
      if (FALHAS_SIMULADAS.semAparelhos) return;
      temporizadores.push(
        setTimeout(() => aoEncontrar({ id: 'SIM-01', nome: 'Monitor Cardíaco (simulado)' }), 700),
        setTimeout(() => aoEncontrar({ id: 'SIM-02', nome: 'Oxímetro (simulado)' }), 1600)
      );
    },

    pararBusca() {
      limparTemporizadores();
    },

    async conectar() {
      await esperar(1200);
      if (FALHAS_SIMULADAS.erroAoConectar) {
        throw new Error(
          'Não foi possível conectar ao aparelho. Verifique se ele está ligado, com bateria e perto do celular.'
        );
      }
    },

    monitorarFrequencia(aoReceber) {
      let emitidas = 0;
      intervalo = setInterval(() => {
        const limite = FALHAS_SIMULADAS.perderConexaoApos;
        if (limite > 0 && emitidas >= limite) return; // "conexão caiu": silêncio
        emitidas += 1;
        aoReceber(Math.floor(60 + Math.random() * 41)); // 60 a 100 bpm
      }, 1500);
    },

    async desconectar() {
      console.log('[bluetooth simulado] desconectar() chamado');
      limparTemporizadores();
      if (intervalo) clearInterval(intervalo);
      intervalo = null;
    },
  };
}

// =====================================================================
// IMPLEMENTAÇÃO REAL (react-native-ble-plx)
// =====================================================================
export function criarServicoBleReal() {
  // require DENTRO da função: no modo simulado a biblioteca nativa nem é
  // carregada, e por isso o app abre normalmente no Expo Go.
  const { BleManager } = require('react-native-ble-plx');
  const manager = new BleManager();
  let dispositivo = null;
  let assinatura = null;

  return {
    procurar(aoEncontrar) {
      // Filtrar pelo serviço de frequência cardíaca evita listar todos os
      // aparelhos BLE do ambiente (fones, relógios, TVs...).
      manager.startDeviceScan([SERVICO_FREQ_CARDIACA], null, (erro, encontrado) => {
        if (erro) {
          console.log('[bluetooth] erro na busca:', erro.message);
          return;
        }
        if (encontrado) {
          aoEncontrar({ id: encontrado.id, nome: encontrado.name || 'Aparelho sem nome' });
        }
      });
    },

    pararBusca() {
      manager.stopDeviceScan();
    },

    async conectar(id) {
      try {
        dispositivo = await manager.connectToDevice(id, { timeout: 10000 });
        // Sem descobrir serviços/características, o monitoramento não funciona.
        await dispositivo.discoverAllServicesAndCharacteristics();
      } catch (e) {
        dispositivo = null;
        console.log('[bluetooth] falha ao conectar:', e?.message);
        throw new Error(
          'Não foi possível conectar ao aparelho. Verifique se o Bluetooth está ligado e se o aparelho está perto do celular.'
        );
      }
    },

    monitorarFrequencia(aoReceber) {
      if (!dispositivo) return;
      assinatura = dispositivo.monitorCharacteristicForService(
        SERVICO_FREQ_CARDIACA,
        CARACTERISTICA_MEDICAO,
        (erro, caracteristica) => {
          if (erro || !caracteristica?.value) return;
          const bpm = decodificarFrequencia(caracteristica.value);
          if (bpm != null) aoReceber(bpm);
        }
      );
    },

    async desconectar() {
      console.log('[bluetooth] desconectar() chamado');
      manager.stopDeviceScan();
      if (assinatura) assinatura.remove();
      assinatura = null;
      if (dispositivo) {
        try {
          await manager.cancelDeviceConnection(dispositivo.id);
        } catch (e) {
          // Já estava desconectado: nada a fazer.
        }
      }
      dispositivo = null;
    },
  };
}

// =====================================================================
// FÁBRICA: o único ponto que as telas usam
// =====================================================================
export function criarServicoBle() {
  return MODO_SIMULADO ? criarServicoBleSimulado() : criarServicoBleReal();
}
