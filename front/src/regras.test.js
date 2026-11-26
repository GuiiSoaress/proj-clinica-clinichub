// src/regras.test.js
// Testes de UNIDADE das regras de negócio (base da pirâmide): sem tela, sem
// rede, sem aparelho. Cada `it` descreve o COMPORTAMENTO esperado e os casos
// de fronteira aparecem explicitamente.
import {
  SENHA_MINIMA,
  validarEmail,
  validarSenha,
  validarLogin,
  validarMedico,
  normalizarTelefone,
  formatarTelefone,
  contarSegmentosSms,
  mediaLeituras,
  validarFrequenciaCardiaca,
  juntarDataHora,
  validarAgendamento,
  filtrarMedicos,
} from './regras';

describe('validação do login', () => {
  it('recusa e-mail vazio', () => {
    expect(validarEmail('')).toMatch(/informe o e-mail/i);
  });

  it('recusa e-mail só com espaços', () => {
    expect(validarEmail('   ')).toMatch(/informe o e-mail/i);
  });

  it('recusa e-mail sem arroba', () => {
    expect(validarEmail('recepcaoclinica.com')).toMatch(/e-mail válido/i);
  });

  it('recusa e-mail sem domínio depois do arroba', () => {
    expect(validarEmail('recepcao@clinica')).toMatch(/e-mail válido/i);
  });

  it('aceita e-mail válido com espaços nas pontas', () => {
    expect(validarEmail('  recepcao@clinica.com ')).toBeNull();
  });

  it('recusa senha vazia', () => {
    expect(validarSenha('')).toMatch(/informe a senha/i);
  });

  it('recusa senha com um caractere a menos que o mínimo', () => {
    expect(validarSenha('a'.repeat(SENHA_MINIMA - 1))).toMatch(/pelo menos/i);
  });

  it('aceita senha com exatamente o mínimo de caracteres (fronteira)', () => {
    expect(SENHA_MINIMA).toBe(6);
    expect(validarSenha('abc123')).toBeNull();
  });

  it('pede os dois campos quando e-mail e senha estão vazios', () => {
    expect(validarLogin('', '')).toBe('Preencha e-mail e senha.');
  });

  it('acusa primeiro o e-mail inválido, antes da senha', () => {
    expect(validarLogin('semarroba', '123')).toMatch(/e-mail válido/i);
  });

  it('libera o login com e-mail e senha válidos', () => {
    expect(validarLogin('recepcao@clinica.com', 'clinica123')).toBeNull();
  });
});

describe('validação do cadastro de médico', () => {
  const valido = { nome: 'Dra Camila Rocha', especialidade: 'Cardiologia', crm: '513115-SP' };

  it('marca nome, especialidade e CRM como obrigatórios quando vazios', () => {
    expect(validarMedico({})).toEqual({
      nome: 'Campo obrigatório',
      especialidade: 'Campo obrigatório',
      crm: 'Campo obrigatório',
    });
  });

  it('trata nome só com espaços como vazio', () => {
    expect(validarMedico({ ...valido, nome: '   ' })).toHaveProperty('nome');
  });

  it('aceita médico sem e-mail e sem telefone (são opcionais)', () => {
    expect(validarMedico(valido)).toEqual({});
  });

  it('recusa telefone opcional preenchido com número inválido', () => {
    expect(validarMedico({ ...valido, telefone: '1234' })).toHaveProperty('telefone');
  });

  it('recusa e-mail opcional preenchido sem arroba', () => {
    expect(validarMedico({ ...valido, email: 'medico.clinica.com' })).toHaveProperty('email');
  });
});

describe('normalização de telefone', () => {
  it('normaliza celular com máscara e sem DDI para E.164', () => {
    expect(normalizarTelefone('(11) 91234-5678')).toBe('+5511912345678');
  });

  it('mantém celular que já vem com DDI 55', () => {
    expect(normalizarTelefone('+55 11 91234-5678')).toBe('+5511912345678');
  });

  it('aceita DDI sem o sinal de mais', () => {
    expect(normalizarTelefone('5511912345678')).toBe('+5511912345678');
  });

  it('remove o zero de tronco antes do DDD', () => {
    expect(normalizarTelefone('011 91234-5678')).toBe('+5511912345678');
  });

  it('normaliza telefone fixo de 8 dígitos', () => {
    expect(normalizarTelefone('(11) 3123-4567')).toBe('+551131234567');
  });

  it('recusa número curto demais', () => {
    expect(normalizarTelefone('91234-5678')).toBeNull();
  });

  it('recusa DDD começando com zero', () => {
    expect(normalizarTelefone('(01) 91234-5678')).toBeNull();
  });

  it('recusa celular de 9 dígitos que não começa com 9', () => {
    expect(normalizarTelefone('(11) 81234-5678')).toBeNull();
  });

  it('recusa texto sem dígitos', () => {
    expect(normalizarTelefone('sem telefone')).toBeNull();
  });

  it('formata para exibição no padrão (11) 91234-5678', () => {
    expect(formatarTelefone('+5511912345678')).toBe('(11) 91234-5678');
    expect(formatarTelefone('1131234567')).toBe('(11) 3123-4567');
  });
});

describe('segmentos de SMS', () => {
  it('mensagem vazia não ocupa segmento', () => {
    expect(contarSegmentosSms('')).toBe(0);
  });

  it('160 caracteres sem acento cabem em 1 segmento (fronteira)', () => {
    expect(contarSegmentosSms('a'.repeat(160))).toBe(1);
  });

  it('161 caracteres sem acento viram 2 segmentos', () => {
    expect(contarSegmentosSms('a'.repeat(161))).toBe(2);
  });

  it('306 caracteres cabem em 2 segmentos e 307 viram 3 (153 por segmento)', () => {
    expect(contarSegmentosSms('a'.repeat(306))).toBe(2);
    expect(contarSegmentosSms('a'.repeat(307))).toBe(3);
  });

  it('um único acento fora do GSM-7 reduz o limite para 70 caracteres', () => {
    const comCedilha = 'ç' + 'a'.repeat(69);
    expect(comCedilha).toHaveLength(70);
    expect(contarSegmentosSms(comCedilha)).toBe(1);
    expect(contarSegmentosSms(comCedilha + 'a')).toBe(2);
  });

  it('caractere estendido do GSM-7 (€) conta como dois', () => {
    expect(contarSegmentosSms('€' + 'a'.repeat(158))).toBe(1);
    expect(contarSegmentosSms('€' + 'a'.repeat(159))).toBe(2);
  });
});

describe('sinais vitais', () => {
  it('média das leituras é arredondada', () => {
    expect(mediaLeituras([70, 71])).toBe(71);
  });

  it('lista vazia não tem média', () => {
    expect(mediaLeituras([])).toBeNull();
  });

  it('aceita exatamente os limites de 20 e 250 bpm (fronteira)', () => {
    expect(validarFrequenciaCardiaca('20')).toEqual({ valor: 20, erro: null });
    expect(validarFrequenciaCardiaca('250')).toEqual({ valor: 250, erro: null });
  });

  it('recusa 19 e 251 bpm', () => {
    expect(validarFrequenciaCardiaca('19').erro).toMatch(/entre 20 e 250/);
    expect(validarFrequenciaCardiaca('251').erro).toMatch(/entre 20 e 250/);
  });

  it('aceita vírgula como separador decimal e arredonda', () => {
    expect(validarFrequenciaCardiaca('72,6').valor).toBe(73);
  });

  it('recusa valor vazio ou que não é número', () => {
    expect(validarFrequenciaCardiaca('').erro).not.toBeNull();
    expect(validarFrequenciaCardiaca('abc').erro).not.toBeNull();
  });
});

describe('validação do agendamento', () => {
  const agora = new Date(2026, 10, 26, 13, 0); // 26/11/2026 13:00
  const medico = { id: 1, nome: 'Dra Camila Rocha' };

  it('barra o agendamento sem médico', () => {
    expect(validarAgendamento({ data: agora, hora: '14:00' }, agora)).toMatch(/médico/i);
  });

  it('barra o agendamento sem dia', () => {
    expect(validarAgendamento({ medico, hora: '14:00' }, agora)).toMatch(/dia/i);
  });

  it('barra o agendamento sem horário', () => {
    expect(validarAgendamento({ medico, data: agora }, agora)).toMatch(/horário/i);
  });

  it('barra horário de hoje que já passou', () => {
    expect(validarAgendamento({ medico, data: agora, hora: '12:00' }, agora)).toMatch(/já passou/i);
  });

  it('barra exatamente o horário de agora (fronteira)', () => {
    expect(validarAgendamento({ medico, data: agora, hora: '13:00' }, agora)).toMatch(/já passou/i);
  });

  it('aceita horário ainda por vir no mesmo dia', () => {
    expect(validarAgendamento({ medico, data: agora, hora: '14:00' }, agora)).toBeNull();
  });

  it('junta data e hora no horário local', () => {
    const d = juntarDataHora(new Date(2026, 11, 1), '15:30');
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([1, 15, 30]);
  });
});

describe('busca de médicos', () => {
  const lista = [
    { id: 1, nome: 'Dra Camila Rocha', especialidade: 'Cardiologia' },
    { id: 6, nome: 'Dr João de Oliveira', especialidade: 'Clínico Geral' },
  ];

  it('encontra médico ignorando acentos e maiúsculas', () => {
    expect(filtrarMedicos(lista, 'JOAO').map((m) => m.id)).toEqual([6]);
  });

  it('busca também pela especialidade', () => {
    expect(filtrarMedicos(lista, 'clinico').map((m) => m.id)).toEqual([6]);
  });

  it('respeita a especialidade escolhida no filtro', () => {
    expect(filtrarMedicos(lista, '', 'Cardiologia').map((m) => m.id)).toEqual([1]);
  });

  it('devolve lista vazia quando ninguém combina', () => {
    expect(filtrarMedicos(lista, 'ortopedia')).toEqual([]);
  });
});
