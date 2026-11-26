// src/services/localizacao.test.js
// Cálculo de distância da Aula 6, testado com pontos conhecidos.
import { distanciaKm, formatarDistancia, estimarTempo, PermissaoNegada } from './localizacao';

describe('distância em linha reta (Haversine)', () => {
  it('um grau de longitude na linha do Equador mede cerca de 111,2 km', () => {
    expect(distanciaKm({ latitude: 0, longitude: 0 }, { latitude: 0, longitude: 1 })).toBeCloseTo(111.19, 1);
  });

  it('Praça da Sé (SP) até o Centro do Rio fica entre 355 e 365 km', () => {
    const km = distanciaKm(
      { latitude: -23.5505, longitude: -46.6333 },
      { latitude: -22.9068, longitude: -43.1729 }
    );
    expect(km).toBeGreaterThan(355);
    expect(km).toBeLessThan(365);
  });

  it('distância de um ponto até ele mesmo é zero', () => {
    const p = { latitude: -23.5632, longitude: -46.6544 };
    expect(distanciaKm(p, p)).toBe(0);
  });

  it('a distância é a mesma nos dois sentidos', () => {
    const a = { latitude: -23.5632, longitude: -46.6544 };
    const b = { latitude: -23.5503, longitude: -46.6339 };
    expect(distanciaKm(a, b)).toBeCloseTo(distanciaKm(b, a), 10);
  });
});

describe('formatação da distância', () => {
  it('abaixo de 1 km mostra em metros', () => {
    expect(formatarDistancia(0.4567)).toBe('457 m');
  });

  it('a partir de 1 km mostra com uma casa e vírgula (fronteira)', () => {
    expect(formatarDistancia(1)).toBe('1,0 km');
    expect(formatarDistancia(2.53)).toBe('2,5 km');
  });
});

describe('estimativa de tempo', () => {
  it('nunca estima menos de 1 minuto', () => {
    expect(estimarTempo(0).carroMin).toBe(1);
  });

  it('até 1,5 km sugere primeiro ir a pé (fronteira)', () => {
    expect(estimarTempo(1.5).resumo).toMatch(/^~\d+ min a pé/);
    expect(estimarTempo(1.6).resumo).toMatch(/de carro ·/);
  });

  it('acima de uma hora mostra horas e minutos', () => {
    expect(estimarTempo(10).resumo).toContain('~2h 5min a pé');
  });
});

describe('erro de permissão negada', () => {
  it('guarda se ainda é possível perguntar de novo', () => {
    expect(new PermissaoNegada(true).canAskAgain).toBe(true);
    expect(new PermissaoNegada(false).canAskAgain).toBe(false);
  });
});
