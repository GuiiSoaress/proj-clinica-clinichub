// src/screens/Consulta/SinaisVitais.test.js
// Cenários de falha do BLUETOOTH sem aparelho nenhum. A tela só conhece
// src/services/bluetooth.js (Aula 7); o teste troca o service por um falso
// que se comporta como o periférico com defeito.
//
// Relógio controlado (jest.useFakeTimers): a busca dura 8 s e o "sinal
// perdido" aparece após 5 s sem leitura. Avançamos o relógio do teste em vez
// de esperar de verdade — é uma condição, não um sleep.
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import SinaisVitais from './SinaisVitais';
import { criarServicoBle, pedirPermissoes } from '../../services/bluetooth';
import { post } from '../../services/api';
import { useApp } from '../../context/AppContext';

jest.mock('../../services/bluetooth', () => ({
  MODO_SIMULADO: false,
  criarServicoBle: jest.fn(),
  pedirPermissoes: jest.fn(),
}));

jest.mock('../../services/api', () => ({ post: jest.fn() }));

jest.mock('../../context/AppContext', () => ({
  useApp: jest.fn(),
  formatarData: () => '08/08/2026',
}));

const CONSULTA = { id: 'c1', medico: 'Dra Camila Rocha', data: new Date(2026, 7, 8), hora: '14:30', status: 'proxima' };
const MONITOR = { id: 'HR-01', nome: 'Monitor Cardíaco' };

let servico;
let navigation;
let registrarSinaisVitais;
let emitirLeitura;

function criarServicoFalso({ encontra = [], erroConectar = null } = {}) {
  return {
    procurar: jest.fn((aoEncontrar) => encontra.forEach((a) => aoEncontrar(a))),
    pararBusca: jest.fn(),
    conectar: jest.fn(async () => {
      if (erroConectar) throw erroConectar;
    }),
    monitorarFrequencia: jest.fn((aoReceber) => {
      emitirLeitura = aoReceber;
    }),
    desconectar: jest.fn(async () => {}),
  };
}

async function avancar(ms) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  emitirLeitura = null;
  navigation = { goBack: jest.fn(), navigate: jest.fn() };
  registrarSinaisVitais = jest.fn();
  useApp.mockReturnValue({ consultas: [CONSULTA], registrarSinaisVitais, logout: jest.fn() });
  pedirPermissoes.mockResolvedValue(true);
});

afterEach(() => {
  jest.useRealTimers();
});

async function abrirTela(opcoesServico) {
  servico = criarServicoFalso(opcoesServico);
  criarServicoBle.mockReturnValue(servico);
  await render(<SinaisVitais navigation={navigation} route={{ params: { consultaId: 'c1' } }} />);
}

async function conectarNoMonitor() {
  await fireEvent.press(screen.getByTestId('botao-procurar'));
  await fireEvent.press(screen.getByTestId(`aparelho-${MONITOR.id}`));
  expect(await screen.findByTestId('valor-bpm')).toBeOnTheScreen();
}

describe('Sinais vitais — Bluetooth com defeito', () => {
  it('nenhum aparelho encontrado: ao fim da busca a tela diz o que fazer e oferece a digitação manual', async () => {
    await abrirTela({ encontra: [] });

    await fireEvent.press(screen.getByTestId('botao-procurar'));
    expect(screen.getByTestId('carregando-busca')).toBeOnTheScreen();

    await avancar(8000);

    expect(screen.queryByTestId('carregando-busca')).toBeNull();
    expect(screen.getByTestId('aviso-sem-aparelhos')).toHaveTextContent(/Procurar novamente/);
    expect(servico.pararBusca).toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('botao-modo-manual'));
    expect(screen.getByTestId('campo-frequencia')).toBeOnTheScreen();
  });

  it('conexão instável: o aparelho para de enviar e a tela mostra "sinal perdido" em vez do último valor', async () => {
    await abrirTela({ encontra: [MONITOR] });
    await conectarNoMonitor();

    await act(async () => emitirLeitura(72));
    expect(screen.getByTestId('valor-bpm')).toHaveTextContent('72');

    await avancar(6000); // mais de 5 s sem nenhuma leitura nova

    expect(screen.getByTestId('aviso-sinal-perdido')).toBeOnTheScreen();
    expect(screen.getByTestId('valor-bpm')).toHaveTextContent('--');
    expect(screen.getByTestId('botao-importar-bluetooth')).toBeDisabled();
  });

  it('sinal volta depois de perdido: o aviso some e o valor novo aparece', async () => {
    await abrirTela({ encontra: [MONITOR] });
    await conectarNoMonitor();
    await avancar(6000);
    expect(screen.getByTestId('aviso-sinal-perdido')).toBeOnTheScreen();

    await act(async () => emitirLeitura(80));
    expect(screen.queryByTestId('aviso-sinal-perdido')).toBeNull();
    expect(screen.getByTestId('valor-bpm')).toHaveTextContent('80');
  });

  it('falha ao conectar: mostra o motivo e volta para a busca', async () => {
    await abrirTela({ encontra: [MONITOR], erroConectar: new Error('Não foi possível conectar ao aparelho.') });

    await fireEvent.press(screen.getByTestId('botao-procurar'));
    await fireEvent.press(screen.getByTestId(`aparelho-${MONITOR.id}`));

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/conectar/);
    expect(screen.getByTestId('botao-procurar')).toBeOnTheScreen();
  });

  it('permissão de Bluetooth negada: não procura e explica como seguir', async () => {
    pedirPermissoes.mockResolvedValue(false);
    await abrirTela({ encontra: [MONITOR] });

    await fireEvent.press(screen.getByTestId('botao-procurar'));

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/permissão de Bluetooth/);
    expect(servico.procurar).not.toHaveBeenCalled();
  });

  it('API fora do ar ao gravar no prontuário: avisa e mantém as leituras na tela', async () => {
    post.mockRejectedValue(new Error('Network request failed'));
    await abrirTela({ encontra: [MONITOR] });
    await conectarNoMonitor();

    for (const bpm of [70, 72, 74]) {
      await act(async () => emitirLeitura(bpm));
    }
    await fireEvent.press(screen.getByTestId('botao-importar-bluetooth'));

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/servidor/);
    expect(screen.getByTestId('valor-bpm')).toHaveTextContent('74');
    expect(registrarSinaisVitais).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  it('valor manual fora do limite é barrado antes de enviar', async () => {
    await abrirTela();
    await fireEvent.press(screen.getByTestId('botao-modo-manual'));
    await fireEvent.changeText(screen.getByTestId('campo-frequencia'), '251');
    await fireEvent.press(screen.getByTestId('botao-importar-manual'));

    expect(screen.getByTestId('mensagem-erro')).toHaveTextContent(/entre 20 e 250/);
    expect(post).not.toHaveBeenCalled();
  });

  it('ao sair da tela, libera o aparelho (desconecta)', async () => {
    await abrirTela({ encontra: [MONITOR] });
    await conectarNoMonitor();

    await screen.unmount();
    expect(servico.desconectar).toHaveBeenCalled();
  });

  it('com o aparelho funcionando: grava a média das leituras no prontuário', async () => {
    post.mockResolvedValue({ registradoEm: '2026-08-08T13:00:00Z' });
    await abrirTela({ encontra: [MONITOR] });
    await conectarNoMonitor();

    for (const bpm of [70, 72, 74]) {
      await act(async () => emitirLeitura(bpm));
    }
    await fireEvent.press(screen.getByTestId('botao-importar-bluetooth'));

    expect(post).toHaveBeenCalledWith('/sinais-vitais', {
      consultaId: 'c1',
      frequenciaMedia: 72,
      quantidadeLeituras: 3,
      origem: 'bluetooth',
    });
    expect(registrarSinaisVitais).toHaveBeenCalled();
    expect(navigation.goBack).toHaveBeenCalled();
  });
});
