// src/screens/Login/LoginBiometrico.test.js
// Cenários de falha da BIOMETRIA sem sensor nenhum.
//
// Dívida de arquitetura registrada no relatório de bugs: Login e
// LoginBiometrico chamam `expo-local-authentication` DIRETO (não há service de
// biometria). Mockar a biblioteca funciona, mas o certo é isolar num service
// como foi feito com GPS, câmera e Bluetooth.
import * as LocalAuthentication from 'expo-local-authentication';
import { render, screen, fireEvent } from '@testing-library/react-native';
import LoginBiometrico from './LoginBiometrico';
import Login from './Login';
import { obterToken, recuperarSessao } from '../../services/sessao';
import { useApp } from '../../context/AppContext';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  authenticateAsync: jest.fn(),
}));

jest.mock('../../services/sessao', () => ({
  obterToken: jest.fn(),
  recuperarSessao: jest.fn(),
}));

jest.mock('../../context/AppContext', () => ({ useApp: jest.fn() }));

let navigation;
let destrancarSessao;

beforeEach(() => {
  jest.clearAllMocks();
  navigation = { navigate: jest.fn(), replace: jest.fn(), reset: jest.fn(), getState: () => ({ routeNames: [] }) };
  destrancarSessao = jest.fn(async () => ({ token: 'tok' }));
  useApp.mockReturnValue({ destrancarSessao, login: jest.fn() });

  // Padrão: aparelho COM sensor, biometria cadastrada e sessão salva no cofre.
  LocalAuthentication.hasHardwareAsync.mockResolvedValue(true);
  LocalAuthentication.isEnrolledAsync.mockResolvedValue(true);
  obterToken.mockResolvedValue('tok');
  recuperarSessao.mockResolvedValue({ token: 'tok', usuario: { nome: 'Recepção' } });
});

describe('Login biométrico — sensor com defeito', () => {
  it('aparelho sem sensor: o botão de biometria não aparece e a entrada por senha continua visível', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);

    await render(<LoginBiometrico navigation={navigation} />);

    expect(await screen.findByTestId('tela-login-biometrico')).toBeOnTheScreen();
    expect(screen.queryByTestId('botao-biometria')).toBeNull();
    expect(screen.getByTestId('link-email-senha')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('link-email-senha'));
    expect(navigation.navigate).toHaveBeenCalledWith('Login');
  });

  it('sensor existe mas nenhuma digital cadastrada: também cai para senha', async () => {
    LocalAuthentication.isEnrolledAsync.mockResolvedValue(false);

    await render(<LoginBiometrico navigation={navigation} />);

    expect(await screen.findByTestId('link-email-senha')).toBeOnTheScreen();
    expect(screen.queryByTestId('botao-biometria')).toBeNull();
  });

  it('usuário cancela a leitura: avisa sem tratar como erro e não destranca a sessão', async () => {
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'user_cancel' });

    await render(<LoginBiometrico navigation={navigation} />);
    await fireEvent.press(await screen.findByTestId('botao-biometria'));

    expect(await screen.findByTestId('mensagem-aviso')).toHaveTextContent(/cancelada/);
    expect(screen.queryByTestId('mensagem-erro')).toBeNull();
    expect(screen.getByTestId('link-email-senha')).toBeOnTheScreen();
    expect(destrancarSessao).not.toHaveBeenCalled();
  });

  it('biometria falha (digital não reconhecida): mostra erro e mantém a saída por senha', async () => {
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: false, error: 'lockout' });

    await render(<LoginBiometrico navigation={navigation} />);
    await fireEvent.press(await screen.findByTestId('botao-biometria'));

    expect(await screen.findByTestId('mensagem-erro')).toBeOnTheScreen();
    expect(screen.getByTestId('link-email-senha')).toBeOnTheScreen();
    expect(destrancarSessao).not.toHaveBeenCalled();
  });

  it('sem sessão salva no cofre: vai direto para o login com senha', async () => {
    obterToken.mockResolvedValue(null);

    await render(<LoginBiometrico navigation={navigation} />);

    await screen.findByTestId('carregando-biometria').catch(() => null);
    expect(navigation.replace).toHaveBeenCalledWith('Login');
  });

  it('com sensor funcionando: a digital confirmada destranca a sessão', async () => {
    LocalAuthentication.authenticateAsync.mockResolvedValue({ success: true });

    await render(<LoginBiometrico navigation={navigation} />);
    await fireEvent.press(await screen.findByTestId('botao-biometria'));

    expect(destrancarSessao).toHaveBeenCalledTimes(1);
  });
});

describe('Login com senha — atalho de biometria', () => {
  it('aparelho sem sensor: não oferece o atalho e os campos de senha continuam visíveis', async () => {
    LocalAuthentication.hasHardwareAsync.mockResolvedValue(false);

    await render(<Login navigation={navigation} />);

    expect(await screen.findByTestId('campo-senha')).toBeOnTheScreen();
    expect(screen.getByTestId('botao-entrar')).toBeOnTheScreen();
    expect(screen.queryByTestId('botao-biometria')).toBeNull();
  });

  it('com sensor, digital e sessão salva: oferece o atalho de biometria', async () => {
    await render(<Login navigation={navigation} />);
    expect(await screen.findByTestId('botao-biometria')).toBeOnTheScreen();
  });
});
