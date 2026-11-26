// src/screens/Agenda/SincronizarAgenda.test.js
// API fora do ar na sincronização da agenda (Aula 10): nenhuma tela pode
// ficar presa em "Carregando…". O `fetch` global é trocado por um que rejeita.
import { render, screen, fireEvent } from '@testing-library/react-native';
import SincronizarAgenda from './SincronizarAgenda';
import { useApp } from '../../context/AppContext';

jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));

const fetchOriginal = global.fetch;
const navigation = { goBack: jest.fn(), navigate: jest.fn() };

beforeEach(() => {
  useApp.mockReturnValue({ usuario: { nome: 'Recepção', perfil: 'recepcao' }, logout: jest.fn() });
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = fetchOriginal;
  jest.restoreAllMocks();
});

const resposta = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo });

describe('Agenda da clínica — API com defeito', () => {
  it('API fora do ar: mostra o erro, sai do carregando e oferece tentar de novo', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));

    await render(<SincronizarAgenda navigation={navigation} />);
    await fireEvent.press(screen.getByTestId('botao-sincronizar'));

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/Não foi possível conectar/);
    expect(screen.queryByTestId('carregando-agenda')).toBeNull();
    expect(screen.getByTestId('botao-sincronizar')).toHaveTextContent('Tentar novamente');

    await fireEvent.press(screen.getByTestId('botao-sincronizar'));
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('API volta depois da falha: tentar de novo traz a agenda e some com o erro', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValue(
        resposta(200, [
          { id: 'a', medicoId: 1, medicoNome: 'Dra Ana', dataHora: '2026-11-05T09:00:00Z', duracaoMinutos: 30 },
          { id: 'b', medicoId: 1, medicoNome: 'Dra Ana', dataHora: '2026-11-05T09:15:00Z', duracaoMinutos: 30 },
        ])
      );

    await render(<SincronizarAgenda navigation={navigation} />);
    await fireEvent.press(screen.getByTestId('botao-sincronizar'));
    await screen.findByTestId('mensagem-erro');

    await fireEvent.press(screen.getByTestId('botao-sincronizar'));

    expect(await screen.findByTestId('resumo-conflitos', {}, { timeout: 3000 })).toHaveTextContent(/1/);
    expect(screen.queryByTestId('mensagem-erro')).toBeNull();
  });
});
