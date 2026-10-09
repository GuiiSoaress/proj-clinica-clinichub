import { recuperarSessao } from './sessao';

// Endereço base da API de Autenticação (porta 3001 conforme a Demo)
// Em dispositivo físico (Expo Go), troque 'localhost' pelo IP da máquina (ex: http://192.168.0.x:3001)
const BASE_URL = 'http://localhost:3001';

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

export default BASE_URL;
