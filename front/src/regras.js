// src/regras.js
// Regras de negócio do ClinicHub em FUNÇÕES PURAS (Aula 14 — Passo 2).
//
// Nada aqui importa React, React Native ou bibliotecas de periféricos: cada
// função recebe dados e devolve dados. É isso que permite testar a regra em
// milissegundos, sem tela, sem emulador e sem servidor (base da pirâmide).
// As telas apenas chamam estas funções e mostram o resultado.

export const SENHA_MINIMA = 6;
export const FREQUENCIA_MINIMA = 20;
export const FREQUENCIA_MAXIMA = 250;

// ---------------------------------------------------------------------
// Validação de formulários
// ---------------------------------------------------------------------

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Valida um e-mail. Devolve `null` quando está ok ou a mensagem de erro.
 */
export function validarEmail(email) {
  const valor = String(email ?? '').trim();
  if (!valor) return 'Informe o e-mail.';
  if (!REGEX_EMAIL.test(valor)) return 'Digite um e-mail válido (ex.: voce@email.com).';
  return null;
}

/**
 * Valida a senha. Exatamente SENHA_MINIMA caracteres é aceito (fronteira).
 */
export function validarSenha(senha) {
  const valor = String(senha ?? '');
  if (!valor.trim()) return 'Informe a senha.';
  if (valor.length < SENHA_MINIMA) return `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`;
  return null;
}

/**
 * Validação local do formulário de login (antes de chamar a API).
 * Devolve a primeira mensagem de erro encontrada ou `null`.
 */
export function validarLogin(email, senha) {
  if (!String(email ?? '').trim() && !String(senha ?? '').trim()) {
    return 'Preencha e-mail e senha.';
  }
  return validarEmail(email) || validarSenha(senha);
}

/**
 * Valida os dados do formulário de médico.
 * Devolve um objeto { campo: mensagem } — vazio quando tudo está ok.
 */
export function validarMedico(dados = {}) {
  const erros = {};
  ['nome', 'especialidade', 'crm'].forEach((campo) => {
    if (!dados[campo] || String(dados[campo]).trim() === '') {
      erros[campo] = 'Campo obrigatório';
    }
  });

  if (dados.email && String(dados.email).trim() && validarEmail(dados.email)) {
    erros.email = 'E-mail inválido';
  }

  if (dados.telefone && String(dados.telefone).trim() && !normalizarTelefone(dados.telefone)) {
    erros.telefone = 'Telefone inválido. Use DDD + número, ex.: (11) 91234-5678';
  }

  return erros;
}

// ---------------------------------------------------------------------
// Telefone e SMS (ADR 003 — o envio acontece no servidor/gateway)
// ---------------------------------------------------------------------

/**
 * Normaliza um telefone brasileiro para E.164 (+55DDDNUMERO).
 * Aceita com ou sem DDI, com máscara, espaços ou traços.
 * Devolve `null` quando o número não é válido.
 */
export function normalizarTelefone(texto) {
  let digitos = String(texto ?? '').replace(/\D/g, '');
  if (!digitos) return null;

  // Prefixo de operadora/tronco: "0 11 9..." -> "11 9..."
  if (digitos.length === 11 || digitos.length === 12) {
    if (digitos.startsWith('0')) digitos = digitos.slice(1);
  }

  let nacional;
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith('55')) {
    nacional = digitos.slice(2);
  } else if (digitos.length === 10 || digitos.length === 11) {
    nacional = digitos;
  } else {
    return null;
  }

  // DDD válido: dois dígitos de 1 a 9 (não existe DDD começando ou terminando em 0).
  if (!/^[1-9][1-9]/.test(nacional)) return null;
  // Celular (11 dígitos) começa com 9 depois do DDD.
  if (nacional.length === 11 && nacional[2] !== '9') return null;
  // Fixo (10 dígitos) começa com 2 a 5 depois do DDD.
  if (nacional.length === 10 && !/[2-5]/.test(nacional[2])) return null;

  return `+55${nacional}`;
}

/**
 * Formata um telefone (qualquer entrada aceita por normalizarTelefone) para
 * exibição: (11) 91234-5678 ou (11) 3123-4567. Devolve `null` se inválido.
 */
export function formatarTelefone(texto) {
  const e164 = normalizarTelefone(texto);
  if (!e164) return null;
  const nacional = e164.slice(3);
  const ddd = nacional.slice(0, 2);
  const numero = nacional.slice(2);
  const corte = numero.length === 9 ? 5 : 4;
  return `(${ddd}) ${numero.slice(0, corte)}-${numero.slice(corte)}`;
}

// Alfabeto GSM-7 básico (cada caractere ocupa 1 posição) e estendido (ocupa 2).
const GSM7_BASICO =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?' +
  '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
const GSM7_ESTENDIDO = '^{}\\[~]|€';

/**
 * Conta quantos segmentos de SMS uma mensagem ocupa (cada segmento é cobrado).
 * - Só caracteres GSM-7: 1 segmento até 160; acima disso, 153 por segmento.
 * - Com qualquer caractere fora do GSM-7 (ex.: "ã", "ç", emoji): UCS-2,
 *   1 segmento até 70; acima disso, 67 por segmento.
 */
export function contarSegmentosSms(texto) {
  const mensagem = String(texto ?? '');
  if (!mensagem) return 0;

  const caracteres = Array.from(mensagem);
  const ehGsm = caracteres.every((c) => GSM7_BASICO.includes(c) || GSM7_ESTENDIDO.includes(c));

  if (ehGsm) {
    const tamanho = caracteres.reduce((soma, c) => soma + (GSM7_ESTENDIDO.includes(c) ? 2 : 1), 0);
    return tamanho <= 160 ? 1 : Math.ceil(tamanho / 153);
  }

  // UCS-2 conta unidades de 16 bits (emoji ocupa 2).
  const tamanho = mensagem.length;
  return tamanho <= 70 ? 1 : Math.ceil(tamanho / 67);
}

// ---------------------------------------------------------------------
// Sinais vitais (Aula 7)
// ---------------------------------------------------------------------

/**
 * Média arredondada das leituras; `null` para lista vazia.
 */
export function mediaLeituras(valores = []) {
  if (!valores.length) return null;
  return Math.round(valores.reduce((soma, v) => soma + v, 0) / valores.length);
}

/**
 * Valida a frequência cardíaca digitada manualmente (aceita vírgula).
 * Os limites FREQUENCIA_MINIMA e FREQUENCIA_MAXIMA são aceitos (fronteira).
 * @returns {{ valor: number | null, erro: string | null }}
 */
export function validarFrequenciaCardiaca(texto) {
  const bruto = String(texto ?? '').trim();
  const bpm = Number(bruto.replace(',', '.'));
  if (!bruto || !Number.isFinite(bpm) || bpm < FREQUENCIA_MINIMA || bpm > FREQUENCIA_MAXIMA) {
    return {
      valor: null,
      erro: `Digite uma frequência cardíaca entre ${FREQUENCIA_MINIMA} e ${FREQUENCIA_MAXIMA} bpm.`,
    };
  }
  return { valor: Math.round(bpm), erro: null };
}

// ---------------------------------------------------------------------
// Agendamento
// ---------------------------------------------------------------------

/**
 * Junta a data (Date ou ISO) e a hora 'HH:mm' em um único Date local.
 */
export function juntarDataHora(data, hora) {
  const d = data instanceof Date ? new Date(data.getTime()) : new Date(data);
  const [h, m] = String(hora || '0:0').split(':').map((p) => parseInt(p, 10) || 0);
  d.setHours(h, m, 0, 0);
  return d;
}

/**
 * Valida o formulário de agendamento antes de gravar.
 * Barra médico, data ou horário ausentes e horários que já passaram.
 * Devolve `null` quando está ok ou a mensagem de erro.
 */
export function validarAgendamento({ medico, data, hora } = {}, agora = new Date()) {
  if (!medico) return 'Selecione um médico.';
  if (!data) return 'Selecione o dia da consulta.';
  if (!hora || !/^\d{2}:\d{2}$/.test(hora)) return 'Selecione o horário da consulta.';
  if (juntarDataHora(data, hora).getTime() <= agora.getTime()) {
    return 'Esse horário já passou. Escolha outro dia ou horário.';
  }
  return null;
}

/**
 * Remove acentos e deixa em minúsculas (para busca).
 */
export const normalizarBusca = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Filtra a lista de médicos pela especialidade escolhida e pelo texto da busca
 * (nome ou especialidade, sem diferenciar acentos e maiúsculas).
 */
export function filtrarMedicos(lista = [], busca = '', especialidade = null) {
  const q = normalizarBusca(busca.trim());
  return lista.filter((m) => {
    if (especialidade && m.especialidade !== especialidade) return false;
    if (!q) return true;
    return normalizarBusca(m.nome).includes(q) || normalizarBusca(m.especialidade).includes(q);
  });
}
