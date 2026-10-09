import * as SecureStore from 'expo-secure-store';

// Chave utilizada para guardar os dados no cofre do dispositivo
const CHAVE_SESSAO = 'clinica.sessao';

/**
 * Salva o token e os dados do usuário no armazenamento seguro.
 * @param {string} token - O JWT ou token de sessão da API.
 * @param {object} usuario - Objeto contendo os dados do usuário (id, nome, perfil).
 */
export async function salvarSessao(token, usuario) {
  try {
    // Como o SecureStore guarda apenas strings, precisamos converter o objeto para JSON
    const dados = JSON.stringify({ token, usuario });
    await SecureStore.setItemAsync(CHAVE_SESSAO, dados);
  } catch (e) {
    console.error('Erro ao salvar sessão', e);
  }
}

/**
 * Tenta ler o token guardado no dispositivo.
 * @returns {object|null} Retorna { token, usuario } ou null se não houver sessão.
 */
export async function recuperarSessao() {
  try {
    const dados = await SecureStore.getItemAsync(CHAVE_SESSAO);
    if (dados) {
      return JSON.parse(dados); // Desfaz a stringificação para devolver como objeto
    }
  } catch (e) {
    console.error('Erro ao ler sessão', e);
  }
  return null;
}

/**
 * Remove a sessão do cofre (usado no logout).
 */
export async function limparSessao() {
  try {
    await SecureStore.deleteItemAsync(CHAVE_SESSAO);
  } catch (e) {
    console.error('Erro ao limpar sessão', e);
  }
}
