// front/src/services/processamento.js
// Serviço puro de detecção de conflitos da agenda clínica (Aula 10 — Processamento Multithread).
// Não importa React nem React Native para poder rodar tanto no app quanto em Node
// e em tarefas em segundo plano na Aula 11.

export const TAMANHO_FATIA_PADRAO = 500;

const MINUTO_MS = 60 * 1000;

function extrairIntervalo(consulta) {
  const inicio = new Date(consulta.dataHora).getTime();
  const duracao = Number(consulta.duracaoMinutos) || 30;
  return {
    inicio,
    fim: inicio + duracao * MINUTO_MS,
  };
}

function criarRegistroConflito(a, b) {
  return {
    id: `${a.id}__${b.id}`,
    medicoId: a.medicoId,
    medicoNome: a.medicoNome || `Médico #${a.medicoId}`,
    especialidade: a.especialidade || '',
    consultaA: a,
    consultaB: b,
  };
}

/**
 * Verifica se duas consultas pertencem ao mesmo médico e têm horários sobrepostos.
 * Condição estrita: inicioA < fimB && inicioB < fimA (término igual ao início não conflita).
 */
export function conflita(a, b) {
  if (!a || !b) return false;
  if (String(a.medicoId) !== String(b.medicoId)) return false;

  const intervaloA = extrairIntervalo(a);
  const intervaloB = extrairIntervalo(b);
  return intervaloA.inicio < intervaloB.fim && intervaloB.inicio < intervaloA.fim;
}

/**
 * Quantidade teórica de comparações do algoritmo ingênuo O(n²): n × (n - 1) / 2.
 */
export function contarComparacoesIngenuas(n) {
  return (n * (n - 1)) / 2;
}

/**
 * Passo 2 — Versão ingênua O(n²) com dois laços aninhados.
 * Mantida para comparação de desempenho e validação de equivalência contra o algoritmo otimizado.
 */
export function detectarConflitosIngenuo(consultas = []) {
  const conflitos = [];
  let comparacoes = 0;

  for (let i = 0; i < consultas.length; i++) {
    for (let j = i + 1; j < consultas.length; j++) {
      comparacoes += 1;
      if (conflita(consultas[i], consultas[j])) {
        conflitos.push(criarRegistroConflito(consultas[i], consultas[j]));
      }
    }
  }

  return { conflitos, comparacoes };
}

/**
 * Passo 3 — Versão otimizada síncrona:
 * 1. Agrupa por medicoId em um Map;
 * 2. Ordena a agenda de cada médico por início;
 * 3. Percorre com sweep-line comparando apenas enquanto houver sobreposição possível.
 */
export function detectarConflitosOrdenado(consultas = []) {
  const porMedico = new Map();

  for (let i = 0; i < consultas.length; i++) {
    const consulta = consultas[i];
    const chave = String(consulta.medicoId);
    const { inicio, fim } = extrairIntervalo(consulta);
    if (!porMedico.has(chave)) {
      porMedico.set(chave, []);
    }
    porMedico.get(chave).push({ consulta, inicio, fim });
  }

  const conflitos = [];
  let comparacoes = 0;

  for (const lista of porMedico.values()) {
    lista.sort((a, b) => a.inicio - b.inicio || String(a.consulta.id).localeCompare(String(b.consulta.id)));

    for (let i = 0; i < lista.length; i++) {
      const atual = lista[i];
      for (let j = i + 1; j < lista.length; j++) {
        comparacoes += 1;
        const proxima = lista[j];
        // Como a lista está ordenada por início, se a próxima começa quando ou depois
        // que a atual termina, nenhuma consulta posterior pode sobrepor a atual.
        if (proxima.inicio >= atual.fim) {
          break;
        }
        conflitos.push(criarRegistroConflito(atual.consulta, proxima.consulta));
      }
    }
  }

  return {
    conflitos,
    comparacoes,
    totalMedicos: porMedico.size,
  };
}

/**
 * Passo 4 — Cede a vez ao Event Loop usando macrotask (setTimeout 0).
 * Diferente de Promise.resolve() (microtask), setTimeout(0) permite que a thread
 * de UI processe toques, animações e repinturas entre as fatias.
 */
export function cederAVez() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Passo 4 — Sinal simples de cancelamento cooperativo para tarefas de CPU.
 */
export function criarSinalDeCancelamento() {
  let estaCancelado = false;
  return {
    get cancelado() {
      return estaCancelado;
    },
    cancelar() {
      estaCancelado = true;
    },
  };
}

/**
 * Passo 4 — Processa uma lista em fatias configuráveis, cedendo a vez entre blocos,
 * reportando progresso e respeitando o sinal de cancelamento.
 */
export async function processarEmFatias(itens = [], processarItem, opcoes = {}) {
  const {
    tamanhoFatia = TAMANHO_FATIA_PADRAO,
    onProgresso,
    sinal,
  } = opcoes;

  const total = itens.length;
  const fatiaEfetiva = Math.max(1, Number(tamanhoFatia) || TAMANHO_FATIA_PADRAO);
  const resultados = [];

  if (total === 0) {
    onProgresso?.(1, 0, 0);
    return { cancelado: false, processados: 0, resultados };
  }

  for (let inicio = 0; inicio < total; inicio += fatiaEfetiva) {
    if (sinal?.cancelado) {
      console.log(`[processamento] processarEmFatias interrompido após ${inicio} de ${total} itens.`);
      return { cancelado: true, processados: inicio, resultados };
    }

    const fim = Math.min(inicio + fatiaEfetiva, total);
    for (let i = inicio; i < fim; i++) {
      if (processarItem) {
        resultados.push(processarItem(itens[i], i));
      }
    }

    if (sinal?.cancelado) {
      console.log(`[processamento] processarEmFatias interrompido após ${fim} de ${total} itens.`);
      return { cancelado: true, processados: fim, resultados };
    }

    onProgresso?.(Math.min(1, fim / total), fim, total);

    if (fim < total) {
      await cederAVez();
    }
  }

  return { cancelado: false, processados: total, resultados };
}

/**
 * Passo 4 — Detecção de conflitos cooperativa (não-bloqueante).
 * Etapa 1 (0% -> 40%): normaliza e agrupa as consultas por médico em fatias configuráveis.
 * Etapa 2 (40% -> 100%): ordena e verifica conflitos por médico, cedendo a vez a cada médico
 * (e periodicamente dentro de listas muito longas).
 */
export async function detectarConflitos(consultas = [], opcoes = {}) {
  const {
    tamanhoFatia = TAMANHO_FATIA_PADRAO,
    onProgresso,
    sinal,
  } = opcoes;

  const inicioMs = Date.now();
  const porMedico = new Map();

  // Etapa 1: Agrupamento fatiado por médico
  const etapaAgrupamento = await processarEmFatias(
    consultas,
    (consulta) => {
      const chave = String(consulta.medicoId);
      const { inicio, fim } = extrairIntervalo(consulta);
      if (!porMedico.has(chave)) {
        porMedico.set(chave, []);
      }
      porMedico.get(chave).push({ consulta, inicio, fim });
    },
    {
      tamanhoFatia,
      sinal,
      onProgresso: (proporcao) => {
        onProgresso?.(proporcao * 0.4, 'Agrupando consultas por médico...');
      },
    }
  );

  if (etapaAgrupamento.cancelado) {
    console.log('[processamento] Detecção de conflitos cancelada durante agrupamento.');
    return {
      cancelado: true,
      conflitos: [],
      comparacoes: 0,
      totalConsultas: consultas.length,
      totalMedicos: porMedico.size,
      duracaoMs: Date.now() - inicioMs,
    };
  }

  // Etapa 2: Ordenação e sweep-line por médico, cedendo a vez a cada médico
  const medicos = Array.from(porMedico.values());
  const totalMedicos = medicos.length;
  const conflitos = [];
  let comparacoes = 0;

  if (totalMedicos === 0) {
    onProgresso?.(1, 'Concluído');
    return {
      cancelado: false,
      conflitos,
      comparacoes,
      totalConsultas: consultas.length,
      totalMedicos: 0,
      duracaoMs: Date.now() - inicioMs,
      verificadoEm: new Date().toISOString(),
    };
  }

  const fatiaInterna = Math.max(1, Number(tamanhoFatia) || TAMANHO_FATIA_PADRAO);

  for (let m = 0; m < totalMedicos; m++) {
    if (sinal?.cancelado) {
      console.log(`[processamento] Detecção de conflitos cancelada no médico ${m}/${totalMedicos}.`);
      return {
        cancelado: true,
        conflitos,
        comparacoes,
        totalConsultas: consultas.length,
        totalMedicos,
        duracaoMs: Date.now() - inicioMs,
      };
    }

    const lista = medicos[m];
    lista.sort((a, b) => a.inicio - b.inicio || String(a.consulta.id).localeCompare(String(b.consulta.id)));

    for (let i = 0; i < lista.length; i++) {
      const atual = lista[i];
      for (let j = i + 1; j < lista.length; j++) {
        comparacoes += 1;
        const proxima = lista[j];
        if (proxima.inicio >= atual.fim) {
          break;
        }
        conflitos.push(criarRegistroConflito(atual.consulta, proxima.consulta));
      }

      // Se um único médico tiver um volume muito grande de consultas, também cede dentro do laço
      if ((i + 1) % fatiaInterna === 0 && i + 1 < lista.length) {
        if (sinal?.cancelado) {
          console.log(`[processamento] Detecção de conflitos cancelada no médico ${m + 1}/${totalMedicos}.`);
          return {
            cancelado: true,
            conflitos,
            comparacoes,
            totalConsultas: consultas.length,
            totalMedicos,
            duracaoMs: Date.now() - inicioMs,
          };
        }
        await cederAVez();
      }
    }

    const progressoAtual = 0.4 + 0.6 * ((m + 1) / totalMedicos);
    onProgresso?.(progressoAtual, `Conferindo agenda (${m + 1}/${totalMedicos} médicos)...`);

    if (m + 1 < totalMedicos) {
      await cederAVez();
    }
  }

  return {
    cancelado: false,
    conflitos,
    comparacoes,
    totalConsultas: consultas.length,
    totalMedicos,
    duracaoMs: Date.now() - inicioMs,
    verificadoEm: new Date().toISOString(),
  };
}
