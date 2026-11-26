// src/services/processamento.test.js
// Detecção de conflitos da agenda (Aula 10). O bug de fronteira mais caro
// deste app mora aqui: trocar `<` por `<=` faria a agenda recusar consultas
// que apenas se ENCOSTAM. Só o teste de unidade alcança esse caso.
import {
  conflita,
  detectarConflitosIngenuo,
  detectarConflitosOrdenado,
  detectarConflitos,
  criarSinalDeCancelamento,
} from './processamento';

const base = { medicoId: 1, duracaoMinutos: 30 };
const consulta = (id, dataHora, extra = {}) => ({ ...base, id, dataHora, ...extra });

describe('conflito entre duas consultas', () => {
  it('não conflita quando uma termina exatamente onde a outra começa (fronteira)', () => {
    expect(
      conflita(consulta('a', '2026-11-05T09:00:00'), consulta('b', '2026-11-05T09:30:00'))
    ).toBe(false);
  });

  it('conflita quando a segunda começa um minuto antes do fim da primeira', () => {
    expect(
      conflita(consulta('a', '2026-11-05T09:00:00'), consulta('b', '2026-11-05T09:29:00'))
    ).toBe(true);
  });

  it('conflita quando uma consulta está inteira dentro da outra', () => {
    expect(
      conflita(
        consulta('a', '2026-11-05T09:00:00', { duracaoMinutos: 60 }),
        consulta('b', '2026-11-05T09:15:00', { duracaoMinutos: 15 })
      )
    ).toBe(true);
  });

  it('não conflita mesmo horário quando os médicos são diferentes', () => {
    expect(
      conflita(consulta('a', '2026-11-05T09:00:00'), consulta('b', '2026-11-05T09:00:00', { medicoId: 2 }))
    ).toBe(false);
  });

  it('considera 30 minutos quando a duração não é informada', () => {
    const semDuracao = { id: 'a', medicoId: 1, dataHora: '2026-11-05T09:00:00' };
    expect(conflita(semDuracao, consulta('b', '2026-11-05T09:29:00'))).toBe(true);
    expect(conflita(semDuracao, consulta('c', '2026-11-05T09:30:00'))).toBe(false);
  });

  it('não quebra quando uma das consultas está ausente', () => {
    expect(conflita(null, consulta('a', '2026-11-05T09:00:00'))).toBe(false);
  });
});

describe('detecção de conflitos na agenda inteira', () => {
  const agenda = [
    consulta('a', '2026-11-05T09:00:00'),
    consulta('b', '2026-11-05T09:30:00'), // encosta em "a": ok
    consulta('c', '2026-11-05T09:45:00'), // sobrepõe "b"
    consulta('d', '2026-11-05T09:45:00', { medicoId: 2 }), // outro médico
  ];

  it('agenda vazia não tem conflitos', () => {
    expect(detectarConflitosOrdenado([]).conflitos).toEqual([]);
  });

  it('aponta só o par que realmente se sobrepõe', () => {
    const ids = detectarConflitosOrdenado(agenda).conflitos.map((c) => c.id);
    expect(ids).toEqual(['b__c']);
  });

  it('versão otimizada encontra os mesmos conflitos que a ingênua', () => {
    const ingenuo = detectarConflitosIngenuo(agenda).conflitos.map((c) => c.id).sort();
    const ordenado = detectarConflitosOrdenado(agenda).conflitos.map((c) => c.id).sort();
    expect(ordenado).toEqual(ingenuo);
  });

  it('versão fatiada (sem travar a tela) chega ao mesmo resultado', async () => {
    const res = await detectarConflitos(agenda, { tamanhoFatia: 2 });
    expect(res.conflitos.map((c) => c.id)).toEqual(['b__c']);
  });

  it('para de processar quando a verificação é cancelada', async () => {
    const sinal = criarSinalDeCancelamento();
    sinal.cancelar();
    const res = await detectarConflitos(agenda, { sinal });
    expect(res.cancelado).toBe(true);
  });
});
