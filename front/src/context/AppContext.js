import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { CONSULTAS_INICIAIS, MEDICOS, UNIDADE } from '../data/mock';
import { recuperarSessao, limparSessao, salvarSessao } from '../services/sessao';
import { apiFetch, post, put, del } from '../services/api';
import { agendarLembrete, cancelarLembrete, sincronizarLembretes } from '../services/lembretes';

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
      agendar: async ({ medico, data, hora, opcoesLembrete = {} }) => {
        const nova = {
          id: `c${Date.now()}`,
          medico: medico.nome,
          especialidade: medico.especialidade,
          data,
          hora,
          unidade: UNIDADE.nome,
          status: 'proxima',
        };

        // 1. Ao AGENDAR: grava primeiro no servidor (POST do api.js)
        try {
          await post('/consultas', {
            ...nova,
            data: nova.data instanceof Date ? nova.data.toISOString() : nova.data,
          });
        } catch (err) {
          console.warn('Não foi possível registrar consulta na API (mantendo no app local):', err?.message);
        }

        // 2. Só depois agenda o lembrete (Passo 3 - Item 12)
        const resultadoLembrete = await agendarLembrete(nova, opcoesLembrete);
        const consultaComLembrete = { ...nova, lembrete: resultadoLembrete };

        setConsultas((atual) => [...atual, consultaComLembrete]);
        return { id: nova.id, consulta: consultaComLembrete, lembrete: resultadoLembrete };
      },

      remarcar: async (id, { data, hora, opcoesLembrete = {} }) => {
        // 1. Ao REMARCAR: atualiza no servidor via PUT
        try {
          await put(`/consultas/${id}`, {
            data: data instanceof Date ? data.toISOString() : data,
            hora,
          });
        } catch (err) {
          console.warn('Não foi possível remarcar consulta na API (mantendo no app local):', err?.message);
        }

        let consultaAtualizada = null;
        let resultadoLembrete = null;

        setConsultas((atual) =>
          atual.map((c) => {
            if (c.id === id) {
              consultaAtualizada = { ...c, data, hora };
              return consultaAtualizada;
            }
            return c;
          })
        );

        // 2. Chama agendarLembrete de novo com a nova data (Passo 3 - Item 14)
        // Como agendarLembrete cancela o lembrete anterior automaticamente, não acumula avisos.
        if (consultaAtualizada) {
          resultadoLembrete = await agendarLembrete(consultaAtualizada, opcoesLembrete);
          setConsultas((atual) =>
            atual.map((c) => (c.id === id ? { ...c, lembrete: resultadoLembrete } : c))
          );
        }

        return { id, consulta: consultaAtualizada, lembrete: resultadoLembrete };
      },

      cancelar: async (id) => {
        // 1. Ao CANCELAR a consulta: deleta na API
        try {
          await del(`/consultas/${id}`);
        } catch (err) {
          console.warn('Não foi possível cancelar consulta na API (mantendo no app local):', err?.message);
        }

        // 2. Chama cancelarLembrete depois do DELETE na API (Passo 3 - Item 15)
        await cancelarLembrete(id);

        // 3. Atualiza status da consulta no estado local
        setConsultas((atual) =>
          atual.map((c) => (c.id === id ? { ...c, status: 'cancelada', lembrete: null } : c))
        );
      },

      sincronizarLembretesAgenda: async () => {
        return await sincronizarLembretes(consultas);
      },
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
