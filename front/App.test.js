// App.test.js
// Testes de INTEGRAÇÃO dos fluxos críticos (login, agendamento, cancelamento)
// e a JORNADA COMPLETA, com o App inteiro renderizado em memória: sem
// emulador, sem aparelho e sem servidor.
//
// O que é falso aqui:
// - `fetch` global: responde como a auth-api (servidor/auth-api.js);
// - service de lembretes e de push: espiões, para conferir que o lembrete é
//   agendado e cancelado sem notificação de verdade;
// - biometria: aparelho sem sensor (o login por senha é o caminho testado).
// Regras: testID em vez de texto; findBy/waitFor em vez de espera fixa;
// caminho de ERRO antes do feliz; cada teste faz o próprio render.
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import App from './App';
import { agendarLembrete, cancelarLembrete } from './src/services/lembretes';
import { configuracaoApi, TEMPO_LIMITE_MS } from './src/services/api';

jest.mock('./src/services/lembretes', () => ({
  configurarHandler: jest.fn(),
  prepararCanal: jest.fn(),
  Notifications: {
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    getLastNotificationResponseAsync: jest.fn(async () => null),
  },
  agendarLembrete: jest.fn(),
  cancelarLembrete: jest.fn(),
  sincronizarLembretes: jest.fn(async () => true),
}));

jest.mock('./src/services/push', () => ({
  manterRegistroAtualizado: jest.fn(async () => ({ registrado: false })),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(async () => false),
  isEnrolledAsync: jest.fn(async () => false),
  authenticateAsync: jest.fn(),
}));

// Teto das transições de tela (a navegação anima): é teto, não pausa.
const TETO = { timeout: 5000 };
const fetchOriginal = global.fetch;

const resposta = (status, corpo) => ({ ok: status < 300, status, json: async () => corpo });

// "Servidor" falso com as mesmas regras da auth-api.
function apiFalsa(url, opcoes = {}) {
  const metodo = opcoes.method || 'GET';
  if (url.endsWith('/login') && metodo === 'POST') {
    const { email, senha } = JSON.parse(opcoes.body);
    if (email === 'recepcao@clinica.com' && senha === 'clinica123') {
      return Promise.resolve(
        resposta(200, { token: 'token-teste', usuario: { id: 1, nome: 'Recepção Teste', perfil: 'recepcao' } })
      );
    }
    return Promise.resolve(resposta(401, { erro: 'E-mail ou senha inválidos.' }));
  }
  return Promise.resolve(resposta(200, {}));
}

beforeEach(() => {
  jest.clearAllMocks();
  SecureStore.__limpar(); // cada teste começa deslogado
  global.fetch = jest.fn(apiFalsa);
  agendarLembrete.mockResolvedValue({ agendado: true, identificador: 'n1' });
  cancelarLembrete.mockResolvedValue(true);
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  global.fetch = fetchOriginal;
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------- helpers
async function abrirApp() {
  await render(<App />);
  return screen.findByTestId('tela-login', {}, TETO);
}

async function preencherLogin(email, senha) {
  await fireEvent.changeText(screen.getByTestId('campo-email'), email);
  await fireEvent.changeText(screen.getByTestId('campo-senha'), senha);
  await fireEvent.press(screen.getByTestId('botao-entrar'));
}

/** Passo repetido de todos os fluxos: abrir o app e entrar com a conta válida. */
async function entrar() {
  await abrirApp();
  await preencherLogin('recepcao@clinica.com', 'clinica123');
  return screen.findByTestId('tela-inicio', {}, TETO);
}

/** Vai do Início até a tela Confirmar com o médico escolhido. */
async function escolherMedico(id = 1) {
  await fireEvent.press(screen.getByTestId('atalho-agendar'));
  await screen.findByTestId('tela-agendar', {}, TETO);
  await fireEvent.press(screen.getByTestId(`medico-${id}`));
  await fireEvent.press(screen.getByTestId('botao-agendar'));
  return screen.findByTestId('tela-confirmar', {}, TETO);
}

// ---------------------------------------------------------------- login
describe('fluxo de login', () => {
  it('credencial inválida mostra erro e não entra', async () => {
    await abrirApp();
    await preencherLogin('recepcao@clinica.com', 'senhaerrada');

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent('E-mail ou senha inválidos.');
    expect(screen.queryByTestId('tela-inicio')).toBeNull();
  });

  it('e-mail em formato inválido é barrado antes de chamar a API', async () => {
    await abrirApp();
    await preencherLogin('recepcao.clinica.com', 'clinica123');

    expect(screen.getByTestId('mensagem-erro')).toHaveTextContent(/e-mail válido/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('API fora do ar: mostra erro compreensível e libera o botão para tentar de novo', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
    await abrirApp();
    await preencherLogin('recepcao@clinica.com', 'clinica123');

    expect(await screen.findByTestId('mensagem-erro')).toHaveTextContent(/Não foi possível conectar ao servidor/);
    expect(screen.getByTestId('botao-entrar')).toHaveTextContent('Entrar');
    expect(screen.getByTestId('botao-entrar')).toBeEnabled();
  });

  it('API lenta (não responde): não fica preso em "Entrando..."', async () => {
    // O teto real (10 s) é provado em src/services/api.test.js com relógio falso.
    // Aqui encurtamos o teto para a tela não esperar 10 s de verdade.
    configuracaoApi.tempoLimiteMs = 300;
    global.fetch = jest.fn(() => new Promise(() => {})); // nunca responde
    try {
      await abrirApp();
      await preencherLogin('recepcao@clinica.com', 'clinica123');
      expect(screen.getByTestId('botao-entrar')).toHaveTextContent('Entrando...');

      expect(await screen.findByTestId('mensagem-erro', {}, TETO)).toHaveTextContent(/demorou demais/);
      expect(screen.getByTestId('botao-entrar')).toHaveTextContent('Entrar');
    } finally {
      configuracaoApi.tempoLimiteMs = TEMPO_LIMITE_MS;
    }
  });

  it('credencial válida entra no app e cumprimenta o usuário', async () => {
    await entrar();
    expect(screen.getByTestId('saudacao')).toHaveTextContent(/Recepção/);
    expect(screen.queryByTestId('tela-login')).toBeNull();
  });
});

// ---------------------------------------------------------------- agendamento
describe('fluxo de agendamento', () => {
  it('sem médico escolhido o botão Agendar fica bloqueado', async () => {
    await entrar();
    await fireEvent.press(screen.getByTestId('atalho-agendar'));
    await screen.findByTestId('tela-agendar', {}, TETO);

    expect(screen.getByTestId('botao-agendar')).toBeDisabled();
  });

  it('horário de hoje que já passou é barrado com mensagem', async () => {
    // Congela só o RELÓGIO (Date) às 18h; temporizadores continuam reais.
    jest.useFakeTimers({
      now: new Date(2026, 10, 26, 18, 0),
      doNotFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'setImmediate',
        'clearImmediate', 'nextTick', 'queueMicrotask', 'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback', 'hrtime', 'performance'],
    });
    await entrar();
    await escolherMedico(1);

    await fireEvent.press(screen.getByTestId('dia-26'));
    await fireEvent.press(screen.getByTestId('horario-12:00'));
    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    expect(screen.getByTestId('mensagem-erro')).toHaveTextContent(/já passou/);
    expect(screen.queryByTestId('tela-confirmada')).toBeNull();
    expect(agendarLembrete).not.toHaveBeenCalled();
  });

  it('formulário completo confirma, agenda o lembrete e mostra o resumo', async () => {
    await entrar();
    await escolherMedico(1);

    await fireEvent.press(screen.getByTestId('botao-proximo-mes'));
    await fireEvent.press(screen.getByTestId('dia-15'));
    await fireEvent.press(screen.getByTestId('horario-15:30'));
    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    expect(await screen.findByTestId('tela-confirmada', {}, TETO)).toBeOnTheScreen();
    expect(screen.getByTestId('titulo-confirmada')).toHaveTextContent('Consulta Confirmada!');
    expect(screen.getByTestId('resumo-medico')).toHaveTextContent('Dra Camila Rocha');
    expect(screen.getByTestId('resumo-hora')).toHaveTextContent('15:30');
    expect(screen.getByTestId('lembrete-programado')).toBeOnTheScreen();
    expect(agendarLembrete).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/consultas$/),
      expect.objectContaining({ method: 'POST' })
    );
  });
});

// ---------------------------------------------------------------- cancelamento
describe('fluxo de cancelamento', () => {
  async function abrirConsultaC1() {
    await entrar();
    await fireEvent.press(screen.getByTestId('atalho-consultas'));
    await screen.findByTestId('tela-consultas', {}, TETO);
    await fireEvent.press(screen.getByTestId('consulta-c1'));
    return screen.findByTestId('tela-confirmada', {}, TETO);
  }

  it('pede confirmação antes e, se o usuário desiste, nada é cancelado', async () => {
    await abrirConsultaC1();

    await fireEvent.press(screen.getByTestId('botao-cancelar'));
    expect(screen.getByTestId('confirmacao-cancelamento')).toBeOnTheScreen();
    expect(cancelarLembrete).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByTestId('botao-manter-consulta'));
    expect(screen.queryByTestId('confirmacao-cancelamento')).toBeNull();
    expect(screen.getByTestId('botao-cancelar')).toBeOnTheScreen();
    expect(cancelarLembrete).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ method: 'DELETE' }));
  });

  it('depois de confirmar, o registro some das próximas e o lembrete é cancelado', async () => {
    await abrirConsultaC1();

    await fireEvent.press(screen.getByTestId('botao-cancelar'));
    await fireEvent.press(screen.getByTestId('botao-confirmar-cancelamento'));

    await waitFor(() => expect(screen.queryByTestId('tela-confirmada')).toBeNull(), TETO);
    expect(screen.getByTestId('tela-consultas')).toBeOnTheScreen();
    expect(screen.queryByTestId('consulta-c1')).toBeNull();
    expect(cancelarLembrete).toHaveBeenCalledWith('c1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/consultas\/c1$/),
      expect.objectContaining({ method: 'DELETE' })
    );

    await fireEvent.press(screen.getByTestId('filtro-cancelada'));
    expect(screen.getByTestId('consulta-c1')).toBeOnTheScreen();
  });
});

// ---------------------------------------------------------------- jornada
describe('jornada completa', () => {
  it('entra, escolhe médico e horário, confirma, vê o resumo e volta com as escolhas limpas', async () => {
    await entrar();
    await escolherMedico(2);
    expect(screen.getByTestId('medico-selecionado')).toHaveTextContent(/Dr Roberto Mendes/);

    await fireEvent.press(screen.getByTestId('botao-proximo-mes'));
    await fireEvent.press(screen.getByTestId('dia-10'));
    await fireEvent.press(screen.getByTestId('horario-12:00'));
    await fireEvent.press(screen.getByTestId('botao-confirmar'));

    await screen.findByTestId('tela-confirmada', {}, TETO);
    expect(screen.getByTestId('resumo-medico')).toHaveTextContent('Dr Roberto Mendes');
    expect(screen.getByTestId('resumo-hora')).toHaveTextContent('12:00');

    // Volta ao início do fluxo
    await fireEvent.press(screen.getByTestId('botao-fechar'));
    await waitFor(() => expect(screen.queryByTestId('tela-confirmada')).toBeNull(), TETO);
    await fireEvent.press(screen.getByTestId('atalho-agendar'));
    await screen.findByTestId('tela-agendar', {}, TETO);

    // Escolhas anteriores foram limpas: nenhum médico marcado, botão bloqueado
    expect(screen.getByTestId('medico-2')).not.toBeSelected();
    expect(screen.getByTestId('botao-agendar')).toBeDisabled();
  });
});
