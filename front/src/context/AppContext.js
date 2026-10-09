import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { CONSULTAS_INICIAIS, UNIDADE } from '../data/mock';
import { recuperarSessao, limparSessao, salvarSessao } from '../services/sessao';
import { apiFetch } from '../services/api';

const AppContext = createContext(null);

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const pad = (n) => String(n).padStart(2, '0');
export const formatarData = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export function AppProvider({ children }) {
  const [consultas, setConsultas] = useState(CONSULTAS_INICIAIS);
  const [medicoSelecionado, setMedicoSelecionado] = useState(null);

  // Estados de autenticação
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  // Inicializa a sessão ao abrir o app:
  // Essa função tenta recuperar o token do cofre assim que o AppProvider é montado.
  // Graças ao "verificandoSessao", podemos segurar a tela de Splash ou Loading até terminar a leitura.
  useEffect(() => {
    const carregarSessao = async () => {
      try {
        const sessao = await recuperarSessao();
        if (sessao && sessao.token) {
          // Aqui poderíamos validar o token na API, mas confiaremos no armazenamento por enquanto
          setToken(sessao.token);
          setUsuario(sessao.usuario);
        }
      } finally {
        setVerificandoSessao(false); // Terminou a leitura, independente de ter token ou não
      }
    };
    carregarSessao();
  }, []);

  /**
   * Função chamada pela Tela de Login.
   * Dispara um POST para a API, valida a resposta e salva o token em caso de sucesso.
   */
  const login = async (email, senha) => {
    const resposta = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim(), senha }),
    });

    // Erro 401 significa que o usuário digitou e-mail ou senha errados.
    if (resposta.status === 401) {
      throw new Error('E-mail ou senha inválidos.');
    }
    // Outros erros como 500 ou servidor desligado
    if (!resposta.ok) {
      throw new Error(`Erro HTTP ${resposta.status}`);
    }

    const dados = await resposta.json();
    
    // Sucesso! Guarda fisicamente no cofre e depois na memória do React
    await salvarSessao(dados.token, dados.usuario);
    setToken(dados.token);
    setUsuario(dados.usuario);
  };

  /**
   * Função de Logout, geralmente acionada por um botão "Sair" no Perfil.
   * Remove o token do cofre e limpa os estados da memória.
   */
  const logout = async () => {
    await limparSessao();
    setToken(null);
    setUsuario(null);
    // Limpar dados do usuário ao sair
    setConsultas(CONSULTAS_INICIAIS);
  };

  /**
   * Função utilitária que pode ser usada em outras telas:
   * se qualquer requisição pra API retornar 401 (Token Expirado),
   * força o logout imediato do usuário.
   */
  const forceLogoutIfUnauthorized = async (response) => {
    if (response.status === 401) {
      await logout();
      return true;
    }
    return false;
  };

  const value = useMemo(
    () => ({
      usuario,
      token,
      verificandoSessao,
      login,
      logout,
      forceLogoutIfUnauthorized,
      consultas,
      medicoSelecionado,
      setMedicoSelecionado,
      agendar: ({ medico, data, hora }) => {
        const nova = {
          id: `c${Date.now()}`,
          medico: medico.nome,
          especialidade: medico.especialidade,
          data,
          hora,
          unidade: UNIDADE.nome,
          status: 'proxima',
        };
        setConsultas((atual) => [...atual, nova]);
        return nova.id;
      },
      cancelar: (id) =>
        setConsultas((atual) => atual.map((c) => (c.id === id ? { ...c, status: 'cancelada' } : c))),
    }),
    [consultas, medicoSelecionado, usuario, token, verificandoSessao]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
