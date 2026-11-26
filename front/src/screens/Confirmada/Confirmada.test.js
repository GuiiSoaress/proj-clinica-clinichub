// src/screens/Confirmada/Confirmada.test.js
// Notificação sem permissão, vista pela tela: o app avisa e NÃO promete um
// lembrete que não vai acontecer. O resultado do service de lembretes chega
// pela rota (como no app real, vindo de Confirmar).
import { render, screen } from '@testing-library/react-native';
import Confirmada from './Confirmada';
import { useApp } from '../../context/AppContext';

jest.mock('../../context/AppContext', () => ({
  useApp: jest.fn(),
  formatarData: () => '15/12/2026',
}));

const CONSULTA = {
  id: 'c9',
  medico: 'Dra Camila Rocha',
  especialidade: 'Cardiologia',
  data: new Date(2026, 11, 15),
  hora: '14:00',
  unidade: 'Clínica Centro',
  status: 'proxima',
};

const navigation = { navigate: jest.fn(), replace: jest.fn() };

beforeEach(() => {
  useApp.mockReturnValue({ consultas: [CONSULTA], cancelar: jest.fn() });
});

const abrir = (lembrete) => render(<Confirmada navigation={navigation} route={{ params: { id: 'c9', lembrete } }} />);

describe('Consulta confirmada — lembrete com defeito', () => {
  it('notificação sem permissão: avisa e não promete o lembrete', async () => {
    await abrir({ agendado: false, motivo: 'permissao_negada' });

    expect(screen.getByTestId('lembrete-sem-permissao')).toBeOnTheScreen();
    expect(screen.queryByTestId('lembrete-programado')).toBeNull();
  });

  it('falha do sistema ao agendar o lembrete: também não promete o aviso', async () => {
    await abrir({ agendado: false, motivo: 'erro_agendamento' });

    expect(screen.getByTestId('lembrete-indisponivel')).toBeOnTheScreen();
    expect(screen.queryByTestId('lembrete-programado')).toBeNull();
  });

  it('consulta em menos de 1 hora: explica que não há tempo para o lembrete', async () => {
    await abrir({ agendado: false, motivo: 'horario_passado' });

    expect(screen.getByTestId('lembrete-nao-agendado')).toBeOnTheScreen();
    expect(screen.queryByTestId('lembrete-programado')).toBeNull();
  });

  it('lembrete agendado de verdade: só então diz que está programado', async () => {
    await abrir({ agendado: true, identificador: 'n1' });

    expect(screen.getByTestId('lembrete-programado')).toBeOnTheScreen();
  });

  it('mostra o resumo da consulta', async () => {
    await abrir({ agendado: true });

    expect(screen.getByTestId('resumo-medico')).toHaveTextContent('Dra Camila Rocha');
    expect(screen.getByTestId('resumo-data')).toHaveTextContent('15/12/2026');
    expect(screen.getByTestId('resumo-hora')).toHaveTextContent('14:00');
  });
});
