// front/servidor/medir-processamento.js
// Script de medição e verificação de corretude (Passos 2, 3 e 4 — Aula 10).
// Compara a versão ingênua O(n²), a versão otimizada com Map + ordenação e
// a versão cooperativa fatiada (tamanhos 100, 500 e 5000), além de validar o cancelamento.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

function normalizarPares(conflitos) {
  return conflitos
    .map((c) => [String(c.consultaA.id), String(c.consultaB.id)].sort().join('::'))
    .sort();
}

function conjuntosIguais(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

async function main() {
  const caminhoDb = path.join(__dirname, '..', 'mockup', 'db_clinica.json');
  const db = JSON.parse(fs.readFileSync(caminhoDb, 'utf8'));
  const consultas = db.consultas || [];

  if (consultas.length < 2000) {
    console.error(`Volume insuficiente (${consultas.length}). Rode gerar-agenda-clinica.js primeiro.`);
    process.exit(1);
  }

  const caminhoModulo = path.join(__dirname, '..', 'src', 'services', 'processamento.js');
  const {
    contarComparacoesIngenuas,
    detectarConflitosIngenuo,
    detectarConflitosOrdenado,
    detectarConflitos,
    criarSinalDeCancelamento,
  } = await import(pathToFileURL(caminhoModulo).href);

  console.log(`=== Medição Aula 10 (${consultas.length} consultas) ===\n`);

  // 1. Passo 2: Versão ingênua O(n²)
  const t0Ing = Date.now();
  const perf0Ing = performance.now();
  const resIngenuo = detectarConflitosIngenuo(consultas);
  const perfIngMs = Number((performance.now() - perf0Ing).toFixed(2));
  const dateIngMs = Date.now() - t0Ing;
  const paresIngenuo = normalizarPares(resIngenuo.conflitos);

  console.log('[Passo 2] detectarConflitosIngenuo:');
  console.log(`  - Tempo (Date.now): ${dateIngMs} ms | (performance.now): ${perfIngMs} ms`);
  console.log(`  - Comparações: ${resIngenuo.comparacoes} (esperado n*(n-1)/2 = ${contarComparacoesIngenuas(consultas.length)})`);
  console.log(`  - Conflitos encontrados: ${resIngenuo.conflitos.length}\n`);

  // 2. Passo 3: Versão otimizada (Map + ordenação + sweep-line)
  const t0Ord = Date.now();
  const perf0Ord = performance.now();
  const resOrdenado = detectarConflitosOrdenado(consultas);
  const perfOrdMs = Number((performance.now() - perf0Ord).toFixed(2));
  const dateOrdMs = Date.now() - t0Ord;
  const paresOrdenado = normalizarPares(resOrdenado.conflitos);

  console.log('[Passo 3] detectarConflitosOrdenado:');
  console.log(`  - Tempo (Date.now): ${dateOrdMs} ms | (performance.now): ${perfOrdMs} ms`);
  console.log(`  - Comparações: ${resOrdenado.comparacoes}`);
  console.log(`  - Conflitos encontrados: ${resOrdenado.conflitos.length}`);

  if (!conjuntosIguais(paresIngenuo, paresOrdenado)) {
    console.error('ERRO: A versão ordenada encontrou conflitos diferentes da versão ingênua!');
    process.exit(1);
  }
  console.log('  - Equivalência com versão ingênua: 100% IDÊNTICA\n');

  // 3. Passo 4: Teste dos tamanhos de fatia (100, 500 e 5000)
  console.log('[Passo 4] detectarConflitos (fatiado + cederAVez):');
  for (const tamanhoFatia of [100, 500, 5000]) {
    let atualizacoesProgresso = 0;
    const perf0Fat = performance.now();
    const resFatia = await detectarConflitos(consultas, {
      tamanhoFatia,
      onProgresso: () => {
        atualizacoesProgresso += 1;
      },
    });
    const perfFatMs = Number((performance.now() - perf0Fat).toFixed(2));
    const paresFatia = normalizarPares(resFatia.conflitos);

    if (!conjuntosIguais(paresIngenuo, paresFatia)) {
      console.error(`ERRO: detectarConflitos(tamanhoFatia=${tamanhoFatia}) divergiu da versão ingênua!`);
      process.exit(1);
    }

    console.log(
      `  - tamanhoFatia=${tamanhoFatia}: ${resFatia.duracaoMs} ms (perf ${perfFatMs} ms) | ` +
        `updates progresso=${atualizacoesProgresso} | conflitos=${resFatia.conflitos.length} (equivalente: OK)`
    );
  }

  // 4. Passo 5 (item 28): Validar cancelamento no meio da execução
  console.log('\n[Passo 4/5] Teste de cancelamento cooperativo:');
  const sinal = criarSinalDeCancelamento();
  let chamadas = 0;
  const resCancelado = await detectarConflitos(consultas, {
    tamanhoFatia: 500,
    sinal,
    onProgresso: () => {
      chamadas += 1;
      if (chamadas === 2) {
        sinal.cancelar();
      }
    },
  });

  if (!resCancelado.cancelado) {
    console.error('ERRO: A tarefa deveria ter sido cancelada no meio!');
    process.exit(1);
  }
  console.log(`  - Cancelado com sucesso após ${chamadas} atualizações de progresso (concluiu antes do fim: OK)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
