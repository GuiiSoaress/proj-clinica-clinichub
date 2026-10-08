// src/context/AppContext.js
// Estado global simples: lista de consultas do paciente e o rascunho do agendamento.
import React, { createContext, useContext, useMemo, useState } from 'react';
import { CONSULTAS_INICIAIS, UNIDADE } from '../data/mock';

const AppContext = createContext(null);

export const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MESES_ABREV = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const pad = (n) => String(n).padStart(2, '0');
export const formatarData = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export function AppProvider({ children }) {
  const [consultas, setConsultas] = useState(CONSULTAS_INICIAIS);
  const [medicoSelecionado, setMedicoSelecionado] = useState(null);

  const value = useMemo(
    () => ({
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
    [consultas, medicoSelecionado]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
