import { Platform } from 'react-native';
import { recuperarSessao } from './sessao';

// Endereço base da API de Autenticação (porta 3001 conforme a Demo)
// Em dispositivo físico (Expo Go), usa o IP da máquina na rede local; no navegador web usa localhost.
const HOST_API = Platform.OS === 'web' ? 'localhost' : '10.110.12.28';
const BASE_URL = `http://${HOST_API}:3001`;

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

  // 4. Executa a requisição real de fato para a URL completa (http://localhost:3001/endpoint)
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  return response;
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

export default BASE_URL;
