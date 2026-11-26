// src/screens/Clinica/ComoChegar.test.js
// Cenário de falha do GPS sem GPS nenhum: o service de localização é trocado
// por um falso (jest.mock). Só é possível porque a tela NÃO importa
// expo-location direto — ela usa src/services/localizacao.js (Aula 6).
// Testes de ERRO primeiro; o caminho feliz fica por último.
import { Linking } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import ComoChegar from './ComoChegar';
import { obterPosicaoAtual, PermissaoNegada } from '../../services/localizacao';

jest.mock('../../services/localizacao', () => ({
  ...jest.requireActual('../../services/localizacao'),
  obterPosicaoAtual: jest.fn(),
}));

const navigation = { goBack: jest.fn(), navigate: jest.fn() };

beforeEach(() => {
  obterPosicaoAtual.mockReset();
  jest.spyOn(Linking, 'openSettings').mockResolvedValue();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Como chegar — GPS com defeito', () => {
  it('permissão negada definitivamente: mostra a mensagem, oferece os ajustes e mantém o endereço', async () => {
    obterPosicaoAtual.mockRejectedValue(new PermissaoNegada(false));

    await render(<ComoChegar navigation={navigation} />);

    expect(await screen.findByTestId('mensagem-erro')).toBeOnTheScreen();
    expect(screen.getByTestId('endereco-clinica')).toBeOnTheScreen();
    expect(screen.getByTestId('endereco-clinica')).toHaveTextContent(/Av\. Paulista, 1200/);
    expect(screen.queryByTestId('resultado-distancia')).toBeNull();

    await fireEvent.press(screen.getByTestId('botao-abrir-ajustes'));
    expect(Linking.openSettings).toHaveBeenCalledTimes(1);
  });

  it('permissão negada mas ainda pode perguntar: oferece tentar de novo e calcula quando o usuário libera', async () => {
    obterPosicaoAtual
      .mockRejectedValueOnce(new PermissaoNegada(true))
      .mockResolvedValueOnce({ latitude: -23.5503, longitude: -46.6339, precisao: 20 });

    await render(<ComoChegar navigation={navigation} />);

    expect(await screen.findByTestId('botao-permitir-localizacao')).toBeOnTheScreen();
    expect(screen.queryByTestId('botao-abrir-ajustes')).toBeNull();
    expect(screen.getByTestId('endereco-clinica')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('botao-permitir-localizacao'));

    expect(await screen.findByTestId('resultado-distancia')).toBeOnTheScreen();
    expect(screen.queryByTestId('mensagem-erro')).toBeNull();
    expect(obterPosicaoAtual).toHaveBeenCalledTimes(2);
  });

  it('GPS desligado (erro que não é de permissão): explica e oferece tentar novamente', async () => {
    obterPosicaoAtual.mockRejectedValue(new Error('Location services are disabled'));

    await render(<ComoChegar navigation={navigation} />);

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/GPS está ativado/);
    expect(screen.getByTestId('botao-tentar-novamente')).toBeOnTheScreen();
    expect(screen.getByTestId('endereco-clinica')).toBeOnTheScreen();
  });

  it('com GPS funcionando: mostra a distância em linha reta e o tempo estimado', async () => {
    obterPosicaoAtual.mockResolvedValue({ latitude: -23.5503, longitude: -46.6339, precisao: 15 });

    await render(<ComoChegar navigation={navigation} />);

    expect(await screen.findByTestId('valor-distancia')).toHaveTextContent('2,5 km');
    expect(screen.getByTestId('valor-tempo')).toHaveTextContent(/de carro/);
    expect(screen.queryByTestId('mensagem-erro')).toBeNull();
  });
});
