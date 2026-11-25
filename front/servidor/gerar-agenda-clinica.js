// front/servidor/gerar-agenda-clinica.js
// Script para gerar massa realista de consultas da clínica (Passo 1 — Aula 10).
// Pode ser executado diretamente via CLI (`node front/servidor/gerar-agenda-clinica.js`)
// para popular `front/mockup/db_clinica.json` preservando as demais coleções,
// ou importado pela `auth-api.js` como fallback.

const fs = require('fs');
const path = require('path');

const MEDICOS_AGENDA = [
  { id: 1, nome: 'Dr. João de Oliveira', especialidade: 'Cardiologia' },
  { id: 2, nome: 'Dr. Antônio de Oliveira', especialidade: 'Pediatria' },
  { id: 3, nome: 'Dra. Maria da Silva', especialidade: 'Dermatologia' },
  { id: 4, nome: 'Dra. Beatriz Souza', especialidade: 'Ginecologia' },
  { id: 5, nome: 'Dr. Carlos Santos', especialidade: 'Neurologia' },
  { id: 6, nome: 'Dra. Camila Rocha', especialidade: 'Cardiologia' },
  { id: 7, nome: 'Dr. Roberto Mendes', especialidade: 'Ortopedia' },
  { id: 8, nome: 'Dra. Ana Lima', especialidade: 'Dermatologia' },
  { id: 9, nome: 'Dr. Marcos Pereira', especialidade: 'Oftalmologia' },
  { id: 10, nome: 'Dra. Juliana Alves', especialidade: 'Clínica Geral' },
];

const NOMES_PACIENTES = [
  'Lucas Pereira',
  'Fernanda Lima',
  'Rafael Costa',
  'Juliana Alves',
  'Mariana Souza',
  'Gabriel Oliveira',
  'Beatriz Ferreira',
  'Thiago Rodrigues',
  'Camila Martins',
  'Bruno Almeida',
  'Larissa Ribeiro',
  'Felipe Carvalho',
  'Patrícia Gomes',
  'Rodrigo Barbosa',
  'Amanda Dias',
  'Gustavo Nunes',
];

const UNIDADES = ['Clínica Centro', 'Clínica Norte'];

// PRNG determinístico (Mulberry32) para garantir massa reproduzível nas medições.
function criarGeradorAleatorio(seed) {
  let estado = seed >>> 0;
  return () => {
    estado += 0x6d2b79f5;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inteiroAleatorio(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function criarDataConsulta(baseUtcMs, diaOffset, hora, minuto) {
  const data = new Date(baseUtcMs);
  data.setUTCDate(data.getUTCDate() + diaOffset);
  data.setUTCHours(hora, minuto, 0, 0);
  return data.toISOString();
}

/**
 * Gera de 2.000 a 5.000 consultas (padrão 4.000) distribuídas entre 10 médicos ao longo de 30 dias,
 * garantindo conflitos reais (horários idênticos, sobreposições parciais e sobreposição tripla).
 */
function gerarAgendaClinica({ total = 4000, seed = 202610, conflitosExtras = 45 } = {}) {
  const rand = criarGeradorAleatorio(seed);
  const baseUtcMs = Date.UTC(2026, 10, 25, 0, 0, 0, 0); // 2026-11-25
  const consultas = [];

  const quantidadeConflitosPlanejados = Math.min(conflitosExtras, Math.floor(total / 4));
  const quantidadeAleatorias = total - quantidadeConflitosPlanejados;

  const criarRegistro = (indice, medico, dataHora, duracaoMinutos) => ({
    id: `ag-${indice}`,
    medicoId: medico.id,
    medicoNome: medico.nome,
    especialidade: medico.especialidade,
    pacienteNome: NOMES_PACIENTES[indice % NOMES_PACIENTES.length],
    dataHora,
    duracaoMinutos,
    unidade: UNIDADES[indice % UNIDADES.length],
    status: 'proxima',
  });

  // 1. Consultas espalhadas por 30 dias em horários comerciais (08:00 às 17:30)
  for (let i = 1; i <= quantidadeAleatorias; i++) {
    const medico = MEDICOS_AGENDA[inteiroAleatorio(rand, 0, MEDICOS_AGENDA.length - 1)];
    const dia = inteiroAleatorio(rand, 0, 29);
    const slot = inteiroAleatorio(rand, 0, 19); // 20 slots de 30 min entre 08:00 e 17:30
    const hora = 8 + Math.floor(slot / 2);
    const minuto = (slot % 2) * 30;
    const duracaoMinutos = rand() < 0.35 ? 60 : 30;
    const dataHora = criarDataConsulta(baseUtcMs, dia, hora, minuto);

    consultas.push(criarRegistro(i, medico, dataHora, duracaoMinutos));
  }

  let proximoId = quantidadeAleatorias + 1;

  // 2. Caso explícito de sobreposição tripla para validar equivalência exata do sweep-line:
  //    14:00 (60 min) sobrepõe 14:00 (30 min) e 14:30 (30 min) do mesmo médico.
  if (proximoId + 2 <= total) {
    const medicoTriplo = MEDICOS_AGENDA[0];
    const data1400 = criarDataConsulta(baseUtcMs, 2, 14, 0);
    const data1430 = criarDataConsulta(baseUtcMs, 2, 14, 30);

    consultas.push(criarRegistro(proximoId++, medicoTriplo, data1400, 60));
    consultas.push(criarRegistro(proximoId++, medicoTriplo, data1400, 30));
    consultas.push(criarRegistro(proximoId++, medicoTriplo, data1430, 30));
  }

  // 3. Conflitos extras propositais (horários repetidos e sobreposições parciais de 60/30 min)
  let tentativas = 0;
  while (consultas.length < total && tentativas < total * 2) {
    tentativas += 1;
    const base = consultas[inteiroAleatorio(rand, 0, quantidadeAleatorias - 1)];
    const medico = MEDICOS_AGENDA.find((m) => m.id === base.medicoId) || MEDICOS_AGENDA[0];
    const inicioBase = new Date(base.dataHora).getTime();

    // Alterna entre horário idêntico (0 min de deslocamento) e sobreposição parcial (+30 min quando base tem 60 min)
    const deslocamentoMs = base.duracaoMinutos === 60 && tentativas % 2 === 0 ? 30 * 60000 : 0;
    const dataHora = new Date(inicioBase + deslocamentoMs).toISOString();
    const duracaoMinutos = tentativas % 3 === 0 ? 60 : 30;

    consultas.push(criarRegistro(proximoId++, medico, dataHora, duracaoMinutos));
  }

  return consultas;
}

if (require.main === module) {
  const caminhoDb = path.join(__dirname, '..', 'mockup', 'db_clinica.json');
  let dbExistente = {};

  if (fs.existsSync(caminhoDb)) {
    const conteudo = fs.readFileSync(caminhoDb, 'utf8');
    dbExistente = JSON.parse(conteudo);
  }

  const consultas = gerarAgendaClinica({ total: 4000 });
  const dbAtualizado = {
    ...dbExistente,
    consultas,
  };

  fs.writeFileSync(caminhoDb, JSON.stringify(dbAtualizado, null, 2) + '\n', 'utf8');

  const medicosUnicos = new Set(consultas.map((c) => c.medicoId)).size;
  const datasOrdenadas = consultas.map((c) => c.dataHora).sort();
  console.log(`Agenda gerada em ${caminhoDb}`);
  console.log(`- Total de consultas: ${consultas.length}`);
  console.log(`- Médicos distintos: ${medicosUnicos}`);
  console.log(`- Período: ${datasOrdenadas[0]} até ${datasOrdenadas[datasOrdenadas.length - 1]}`);
}

module.exports = {
  MEDICOS_AGENDA,
  gerarAgendaClinica,
};
