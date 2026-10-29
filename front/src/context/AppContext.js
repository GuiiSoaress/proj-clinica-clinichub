import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { CONSULTAS_INICIAIS, MEDICOS, UNIDADE } from '../data/mock';
import { recuperarSessao, limparSessao, salvarSessao } from '../services/sessao';
import { apiFetch } from '../services/api';

const AppContext = createContext(null);

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const pad = (n) => String(n).padStart(2, '0');
export const formatarData = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export function AppProvider({ children }) {
  const [consultas, setConsultas] = useState(CONSULTAS_INICIAIS);
  const [medicos, setMedicos] = useState(MEDICOS);
  const [medicoSelecionado, setMedicoSelecionado] = useState(null);
  const [fotoPacienteUri, setFotoPacienteUri] = useState(null);

  // Estados de autenticação
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [verificandoSessao, setVerificandoSessao] = useState(true);

  // Inicializa a verificação do cofre ao abrir o app:
  // Na Aula 6 (biometria), se existir um token salvo no SecureStore, ele NÃO
  // entra direto na área logada: permanece guardado no cofre para que a tela
  // LoginBiometrico o destranque com a digital do usuário (ou permita entrar com senha).
  useEffect(() => {
    const carregarSessao = async () => {
      try {
        await recuperarSessao();
      } finally {
        setVerificandoSessao(false); // Terminou a leitura, independente de ter token ou não
      }
    };
    carregarSessao();
  }, []);

  /**
   * Destranca na memória do app a sessão que já estava guardada no SecureStore.
   * Chamado somente após a confirmação biométrica no dispositivo (Aula 6).
   */
  const destrancarSessao = async () => {
    const sessao = await recuperarSessao();
    if (!sessao || !sessao.token) {
      throw new Error('Nenhuma sessão salva encontrada para destrancar.');
    }
    setToken(sessao.token);
    setUsuario(sessao.usuario || null);
    if (sessao.usuario?.fotoUri) {
      setFotoPacienteUri(sessao.usuario.fotoUri);
    }
    return sessao;
  };

  /**
   * Bloqueia a sessão ativa na memória mantendo o token guardado no cofre,
   * permitindo retornar à tela de desbloqueio biométrico sem apagar a sessão.
   */
  const bloquearSessao = () => {
    setToken(null);
    setUsuario(null);
  };

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
   * Atualiza a foto de perfil do usuário logado na memória e no cofre local.
   */
  const atualizarFotoUsuario = async (uri) => {
    setFotoPacienteUri(uri);
    if (usuario) {
      const atualizado = { ...usuario, fotoUri: uri };
      setUsuario(atualizado);
      if (token) {
        await salvarSessao(token, atualizado);
      }
    }
  };

  /**
   * Cadastra um novo médico ou atualiza um médico existente (incluindo fotoUri).
   */
  const salvarMedico = async (dadosMedico) => {
    let registroSalvo = null;

    if (dadosMedico.id) {
      registroSalvo = { ...dadosMedico };
      setMedicos((atuais) =>
        atuais.map((m) => (m.id === dadosMedico.id ? { ...m, ...registroSalvo } : m))
      );
      setMedicoSelecionado((atual) =>
        atual && atual.id === dadosMedico.id ? { ...atual, ...registroSalvo } : atual
      );
    } else {
      registroSalvo = {
        ...dadosMedico,
        id: Date.now(),
      };
      setMedicos((atuais) => [registroSalvo, ...atuais]);
    }

    return registroSalvo;
  };

  /**
   * Função de Logout, geralmente acionada por um botão "Sair" no Perfil.
   * Remove o token do cofre e limpa os estados da memória.
   */
  const logout = async () => {
    await limparSessao();
    setToken(null);
    setUsuario(null);
    setFotoPacienteUri(null);
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
      destrancarSessao,
      bloquearSessao,
      forceLogoutIfUnauthorized,
      fotoPacienteUri,
      atualizarFotoUsuario,
      medicos,
      salvarMedico,
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
      // Guarda na consulta os sinais vitais já gravados no prontuário (Aula 7),
      // para a tela de detalhes exibir o resultado.
      // sinaisVitais: { frequenciaMedia, quantidadeLeituras, origem, registradoEm }
      registrarSinaisVitais: (id, sinaisVitais) =>
        setConsultas((atual) => atual.map((c) => (c.id === id ? { ...c, sinaisVitais } : c))),
    }),
    [consultas, medicos, medicoSelecionado, usuario, token, verificandoSessao, fotoPacienteUri]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
