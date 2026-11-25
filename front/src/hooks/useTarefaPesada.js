// front/src/hooks/useTarefaPesada.js
// Hook para executar tarefas pesadas cooperativas com acompanhamento de progresso,
// proteção contra atualização após desmontagem e cancelamento automático ao sair da tela.

import { useCallback, useEffect, useRef, useState } from 'react';
import { criarSinalDeCancelamento } from '../services/processamento';

/**
 * Executa uma tarefa assíncrona cooperativa com estado de progresso e cancelamento.
 * @param {Function} tarefa Recebe `{ sinal, onProgresso, args }` e retorna o resultado.
 */
export function useTarefaPesada(tarefa) {
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [etapa, setEtapa] = useState('');
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);
  const [erroStatus, setErroStatus] = useState(null);
  const [cancelada, setCancelada] = useState(false);

  const montadoRef = useRef(true);
  const sinalRef = useRef(null);
  const tarefaRef = useRef(tarefa);
  tarefaRef.current = tarefa;

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      if (sinalRef.current) {
        console.log('[useTarefaPesada] Tela desmontada — cancelando tarefa em andamento.');
        sinalRef.current.cancelar();
        sinalRef.current = null;
      }
    };
  }, []);

  const cancelar = useCallback(() => {
    if (sinalRef.current) {
      console.log('[useTarefaPesada] Cancelamento solicitado pelo usuário.');
      sinalRef.current.cancelar();
      sinalRef.current = null;
    }
    if (montadoRef.current) {
      setRodando(false);
      setCancelada(true);
      setEtapa('');
    }
  }, []);

  const definirResultado = useCallback((valor) => {
    if (montadoRef.current) {
      setResultado(valor);
    }
  }, []);

  const executar = useCallback(async (...args) => {
    if (sinalRef.current) {
      sinalRef.current.cancelar();
    }

    const sinal = criarSinalDeCancelamento();
    sinalRef.current = sinal;

    if (montadoRef.current) {
      setRodando(true);
      setProgresso(0);
      setEtapa('Iniciando...');
      setErro(null);
      setErroStatus(null);
      setCancelada(false);
    }

    const onProgresso = (valor, textoEtapa) => {
      if (!montadoRef.current || sinal.cancelado || sinalRef.current !== sinal) {
        return;
      }
      const percentual = Math.max(0, Math.min(1, Number(valor) || 0));
      setProgresso(percentual);
      if (typeof textoEtapa === 'string') {
        setEtapa(textoEtapa);
      }
    };

    try {
      const resposta = await tarefaRef.current({ sinal, onProgresso, args });

      if (!montadoRef.current || sinalRef.current !== sinal) {
        return null;
      }

      if (sinal.cancelado || resposta?.cancelado) {
        setRodando(false);
        setCancelada(true);
        setEtapa('');
        return resposta;
      }

      sinalRef.current = null;
      setProgresso(1);
      setEtapa('');
      setResultado(resposta);
      setRodando(false);
      return resposta;
    } catch (e) {
      if (!montadoRef.current || sinalRef.current !== sinal) {
        return null;
      }

      sinalRef.current = null;
      if (sinal.cancelado) {
        setRodando(false);
        setCancelada(true);
        setEtapa('');
        return null;
      }

      setErro(e?.message || 'Não foi possível concluir o processamento.');
      setErroStatus(e?.status ?? null);
      setEtapa('');
      setRodando(false);
      return null;
    }
  }, []);

  return {
    rodando,
    progresso,
    etapa,
    resultado,
    erro,
    erroStatus,
    cancelada,
    executar,
    cancelar,
    definirResultado,
  };
}
