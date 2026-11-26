// src/services/api.test.js
// Cenários de falha da API: fora do ar, lenta e respondendo erro.
// O `fetch` global é trocado por um falso — nenhum servidor precisa estar no ar.
import { apiFetch, get, post, ApiIndisponivel, TEMPO_LIMITE_MS } from './api';

const fetchOriginal = global.fetch;

afterEach(() => {
  global.fetch = fetchOriginal;
  jest.useRealTimers();
});

const resposta = (status, corpo) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => corpo,
});

describe('cliente HTTP — API com defeito', () => {
  it('API fora do ar: troca o erro técnico por uma mensagem que o usuário entende', async () => {
    global.fetch = jest.fn(() => Promise.reject(new TypeError('Network request failed')));

    const erro = await get('/medicos').catch((e) => e);

    expect(erro).toBeInstanceOf(ApiIndisponivel);
    expect(erro.motivo).toBe('offline');
    expect(erro.message).toMatch(/Não foi possível conectar ao servidor/);
    expect(erro.message).not.toMatch(/Network request failed/);
    expect(erro.status).toBeUndefined();
  });

  it('API lenta (acima de 10 s): desiste no teto e avisa, em vez de esperar para sempre', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(() => new Promise(() => {})); // nunca responde

    const pedido = apiFetch('/medicos').catch((e) => e);
    await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_MS);
    const erro = await pedido;

    expect(TEMPO_LIMITE_MS).toBe(10000);
    expect(erro).toBeInstanceOf(ApiIndisponivel);
    expect(erro.motivo).toBe('tempo_esgotado');
  });

  it('API responde 500: o erro carrega o status HTTP e a mensagem do servidor', async () => {
    global.fetch = jest.fn(async () => resposta(500, { erro: 'Falha interna' }));

    const erro = await post('/consultas', {}).catch((e) => e);

    expect(erro.status).toBe(500);
    expect(erro.message).toBe('Falha interna');
  });

  it('API responde 2xx: devolve o corpo já convertido', async () => {
    global.fetch = jest.fn(async () => resposta(200, [{ id: 1 }]));
    await expect(get('/medicos')).resolves.toEqual([{ id: 1 }]);
  });
});
