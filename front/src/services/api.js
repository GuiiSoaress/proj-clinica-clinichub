import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { recuperarSessao } from './sessao';

// Endereço base da API de Autenticação (porta 3001 conforme a Demo)
// No navegador web usa localhost; no dispositivo/emulador tenta extrair o IP do servidor Expo
// (hostUri) e usa o IP local da máquina como fallback.
function descobrirHostApi() {
  if (Platform.OS === 'web') return 'localhost';

  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (typeof hostUri === 'string' && hostUri.includes(':')) {
    const host = hostUri.split(':')[0].trim();
    if (host) return host;
  }

  return '10.110.12.49';
}

const HOST_API = descobrirHostApi();
const BASE_URL = `http://${HOST_API}:3001`;

// Teto de espera por resposta da API. Sem ele, uma API lenta deixava a tela
// presa em "Entrando..."/"Carregando..." para sempre (bug encontrado na Aula 14).
export const TEMPO_LIMITE_MS = 10000;

/**
 * Erro lançado quando a API não responde: fora do ar, sem rede ou lenta demais.
 * Não tem `status` HTTP — as telas usam isso para diferenciar de um 4xx/5xx.
 * `motivo`: 'offline' | 'tempo_esgotado'.
 */
export class ApiIndisponivel extends Error {
  constructor(motivo) {
    super(
      motivo === 'tempo_esgotado'
        ? 'O servidor da clínica demorou demais para responder. Tente novamente em instantes.'
        : 'Não foi possível conectar ao servidor da clínica. Verifique sua internet e tente novamente.'
    );
    this.name = 'ApiIndisponivel';
    this.motivo = motivo;
  }
}

/**
 * Wrapper (encapsulador) em volta da função fetch padrão.
 * Ele serve para interceptar a requisição antes de sair e injetar o Token no cabeçalho.
 */
export async function apiFetch(endpoint, options = {}) {
  // 1. Busca a sessão atual no Secure Store
  const sessao = await recuperarSessao();
  
  // 2. Prepara os cabeçalhos (diz que estamos enviando JSON)
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // 3. Se o usuário estiver logado, anexa o cabeçalho de Autorização (Bearer Token)
  if (sessao && sessao.token) {
    headers['Authorization'] = `Bearer ${sessao.token}`;
  }

  // 4. Executa a requisição real de fato para a URL completa (http://localhost:3001/endpoint),
  //    com teto de TEMPO_LIMITE_MS. Falha de rede vira ApiIndisponivel com mensagem amigável
  //    (antes a tela mostrava o texto técnico "Network request failed").
  const controle = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let temporizador;
  const tempoEsgotado = new Promise((_, rejeitar) => {
    temporizador = setTimeout(() => {
      controle?.abort();
      rejeitar(new ApiIndisponivel('tempo_esgotado'));
    }, TEMPO_LIMITE_MS);
  });

  try {
    return await Promise.race([
      fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
        ...(controle ? { signal: controle.signal } : {}),
      }),
      tempoEsgotado,
    ]);
  } catch (e) {
    if (e instanceof ApiIndisponivel) throw e;
    throw new ApiIndisponivel('offline');
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Atalho para GET autenticado (usa o apiFetch, então já leva o token).
 * Lança um Error com a mensagem da API quando a resposta não é 2xx.
 */
export async function get(endpoint) {
  const response = await apiFetch(endpoint, {
    method: 'GET',
  });

  let dados = null;
  try {
    dados = await response.json();
  } catch (e) {
    // Resposta sem corpo JSON: segue com null.
  }

  if (!response.ok) {
    const erro = new Error(dados?.erro || `Erro HTTP ${response.status}`);
    erro.status = response.status;
    throw erro;
  }
  return dados;
}

/**
 * Atalho para POST com corpo JSON (usa o apiFetch, então já leva o token).
 * Lança um Error com a mensagem da API quando a resposta não é 2xx.
 * @param {string} endpoint - Caminho da rota (ex.: '/sinais-vitais').
 * @param {object} corpo - Objeto que será enviado como JSON.
 * @returns {Promise<object|null>} Corpo da resposta já convertido.
 */
export async function post(endpoint, corpo) {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(corpo),
  });

  let dados = null;
  try {
    dados = await response.json();
  } catch (e) {
    // Resposta sem corpo JSON: segue com null.
  }

  if (!response.ok) {
    const erro = new Error(dados?.erro || `Erro HTTP ${response.status}`);
    erro.status = response.status;
    throw erro;
  }
  return dados;
}

/**
 * Atalho para PUT com corpo JSON.
 */
export async function put(endpoint, corpo) {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(corpo),
  });

  let dados = null;
  try {
    dados = await response.json();
  } catch (e) {
    // Resposta sem corpo JSON: segue com null.
  }

  if (!response.ok) {
    const erro = new Error(dados?.erro || `Erro HTTP ${response.status}`);
    erro.status = response.status;
    throw erro;
  }
  return dados;
}

/**
 * Atalho para DELETE (ex.: cancelar consulta na API).
 */
export async function del(endpoint) {
  const response = await apiFetch(endpoint, {
    method: 'DELETE',
  });

  let dados = null;
  try {
    dados = await response.json();
  } catch (e) {
    // Resposta sem corpo JSON: segue com null.
  }

  if (!response.ok) {
    const erro = new Error(dados?.erro || `Erro HTTP ${response.status}`);
    erro.status = response.status;
    throw erro;
  }
  return dados;
}

export default BASE_URL;
