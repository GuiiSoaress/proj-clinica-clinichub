// src/services/bluetooth.test.js
// Decodificação do dado do monitor cardíaco (Aula 7): função pura, sem hardware.
import { Buffer } from 'buffer';
import { decodificarFrequencia } from './bluetooth';

const base64 = (bytes) => Buffer.from(bytes).toString('base64');

describe('decodificação da frequência cardíaca (0x2A37)', () => {
  it('lê o valor em 8 bits quando o bit 0 das flags é 0', () => {
    expect(decodificarFrequencia(base64([0x00, 72]))).toBe(72);
  });

  it('lê o valor em 16 bits little-endian quando o bit 0 das flags é 1', () => {
    expect(decodificarFrequencia(base64([0x01, 0x2c, 0x01]))).toBe(300);
  });

  it('devolve null para pacote curto demais', () => {
    expect(decodificarFrequencia(base64([0x00]))).toBeNull();
    expect(decodificarFrequencia(base64([0x01, 0x2c]))).toBeNull();
  });
});
