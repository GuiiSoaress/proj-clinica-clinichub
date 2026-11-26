// front/src/screens/Agenda/SincronizarAgenda.js
// Tela restrita à recepção para sincronizar a agenda da clínica e detectar
// conflitos de horários entre consultas sem bloquear a interface (Aula 10).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from '../../components/Icons';
import { Screen, Botao } from '../../components/Layout';
import { useApp } from '../../context/AppContext';
import BASE_URL, { get } from '../../services/api';
import {
  TAMANHO_FATIA_PADRAO,
  detectarConflitos,
} from '../../services/processamento';
import { useTarefaPesada } from '../../hooks/useTarefaPesada';
import { colors, fonts } from '../../theme';

const CHAVE_CACHE = '@clinichub:ultima_sincronizacao_agenda';
const PASSO_LISTA = 30;

function formatarDataHora(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(data.getDate())}/${pad(data.getMonth() + 1)}/${data.getFullYear()} às ${pad(data.getHours())}:${pad(data.getMinutes())}`;
}

function formatarHorarioIntervalo(consulta) {
  if (!consulta?.dataHora) return '--:--';
  const inicio = new Date(consulta.dataHora);
  if (Number.isNaN(inicio.getTime())) return '--:--';
  const duracao = Number(consulta.duracaoMinutos) || 30;
  const fim = new Date(inicio.getTime() + duracao * 60000);
  const pad = (n) => String(n).padStart(2, '0');
  const hIni = `${pad(inicio.getUTCHours())}:${pad(inicio.getUTCMinutes())}`;
  const hFim = `${pad(fim.getUTCHours())}:${pad(fim.getUTCMinutes())}`;
  return `${hIni}–${hFim} (${duracao} min)`;
}

function formatarDataDia(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(data.getUTCDate())}/${pad(data.getUTCMonth() + 1)}/${data.getUTCFullYear()}`;
}

export default function SincronizarAgenda({ navigation }) {
  const { usuario, logout } = useApp();
  const ehRecepcao = usuario?.perfil === 'recepcao';

  const [medicoFiltro, setMedicoFiltro] = useState('todos');
  const [limiteVisivel, setLimiteVisivel] = useState(PASSO_LISTA);

  const executarVerificacao = useCallback(async ({ sinal, onProgresso }) => {
    onProgresso(0.05, 'Carregando agenda da clínica...');
    const consultasApi = await get('/agenda/consultas');

    if (sinal.cancelado) {
      return { cancelado: true };
    }

    const res = await detectarConflitos(consultasApi, {
      tamanhoFatia: TAMANHO_FATIA_PADRAO,
      sinal,
      onProgresso: (proporcao, texto) => {
        onProgresso(0.1 + proporcao * 0.9, texto || 'Verificando conflitos por médico...');
      },
    });

    if (res.cancelado || sinal.cancelado) {
      return res;
    }

    const resultadoCompleto = {
      ...res,
      totalConflitos: res.conflitos.length,
    };

    try {
      const resumoCache = {
        verificadoEm: resultadoCompleto.verificadoEm,
        totalConsultas: resultadoCompleto.totalConsultas,
        totalMedicos: resultadoCompleto.totalMedicos,
        duracaoMs: resultadoCompleto.duracaoMs,
        comparacoes: resultadoCompleto.comparacoes,
        totalConflitos: resultadoCompleto.totalConflitos,
        conflitos: resultadoCompleto.conflitos.slice(0, 50),
        parcialDoCache: resultadoCompleto.totalConflitos > 50,
      };
      await AsyncStorage.setItem(CHAVE_CACHE, JSON.stringify(resumoCache));
    } catch (e) {
      // Cache é apenas conveniência para abertura instantânea; não bloqueia o fluxo.
    }

    return resultadoCompleto;
  }, []);

  const {
    rodando,
    progresso,
    etapa,
    resultado,
    erro,
    erroStatus,
    cancelada,
    executar,
    cancelar,
    definirResultado,
  } = useTarefaPesada(executarVerificacao);

  // Carrega o resultado salvo da última verificação para exibir imediatamente ao abrir.
  useEffect(() => {
    if (!ehRecepcao) return;
    let ativo = true;

    AsyncStorage.getItem(CHAVE_CACHE)
      .then((bruto) => {
        if (!ativo || !bruto) return;
        const salvo = JSON.parse(bruto);
        if (salvo && typeof salvo === 'object') {
          definirResultado(salvo);
        }
      })
      .catch(() => {});

    return () => {
      ativo = false;
    };
  }, [ehRecepcao, definirResultado]);

  const conflitos = resultado?.conflitos || [];
  const totalConflitos = resultado?.totalConflitos ?? conflitos.length;

  const medicosComConflito = useMemo(() => {
    const mapa = new Map();
    for (const c of conflitos) {
      const chave = String(c.medicoId);
      if (!mapa.has(chave)) {
        mapa.set(chave, {
          id: chave,
          nome: c.medicoNome || `Médico #${c.medicoId}`,
          quantidade: 0,
        });
      }
      mapa.get(chave).quantidade += 1;
    }
    return Array.from(mapa.values()).sort((a, b) => b.quantidade - a.quantidade);
  }, [conflitos]);

  const conflitosFiltrados = useMemo(() => {
    if (medicoFiltro === 'todos') return conflitos;
    return conflitos.filter((c) => String(c.medicoId) === medicoFiltro);
  }, [conflitos, medicoFiltro]);

  const conflitosVisiveis = conflitosFiltrados.slice(0, limiteVisivel);
  const percentual = Math.round(progresso * 100);

  if (!ehRecepcao) {
    return (
      <Screen navigation={navigation}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            onPress={() => navigation.goBack()}
            style={styles.voltar}
          >
            <Icon name="back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.titulo}>Agenda da clínica</Text>
        </View>

        <View style={styles.bloco}>
          <View style={styles.cardRestrito}>
            <View style={styles.iconeRestrito}>
              <Icon name="alertTriangle" size={28} color={colors.danger} />
            </View>
            <Text style={styles.restritoTitulo}>Acesso restrito</Text>
            <Text style={styles.restritoTexto}>
              A conferência de conflitos da agenda está disponível apenas para o perfil de recepção.
            </Text>
            <Botao
              titulo="Voltar"
              onPress={() => navigation.goBack()}
              style={{ width: '100%', marginTop: 8 }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen navigation={navigation} testID="tela-sincronizar-agenda">
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => navigation.goBack()}
          style={styles.voltar}
        >
          <Icon name="back" size={22} color={colors.ink} />
        </Pressable>
        <View style={styles.headerTexto}>
          <Text style={styles.titulo}>Agenda da clínica</Text>
          <Text style={styles.subtitulo}>Sincronização e detecção de conflitos de horários</Text>
        </View>
      </View>

      <View style={styles.bloco}>
        <View style={styles.cardStatus}>
          <View style={styles.cardStatusTopo}>
            <View style={styles.badgeIcone}>
              <Icon name="refresh" size={20} color={colors.green} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitulo}>Conferência de conflitos</Text>
              <Text style={styles.cardMeta}>
                {resultado?.verificadoEm
                  ? `Última verificação em ${formatarDataHora(resultado.verificadoEm)}`
                  : 'Nenhuma verificação realizada ainda'}
              </Text>
            </View>
          </View>

          {rodando ? (
            <View testID="carregando-agenda" style={styles.progressoBox}>
              <View style={styles.progressoTextoLinha}>
                <Text style={styles.progressoEtapa}>{etapa || 'Processando agenda...'}</Text>
                <Text style={styles.progressoPercentual}>{percentual}%</Text>
              </View>
              <View style={styles.trilho}>
                <View style={[styles.barra, { width: `${percentual}%` }]} />
              </View>
              <Botao
                testID="botao-cancelar-verificacao"
                titulo="Cancelar verificação"
                variante="perigo"
                onPress={cancelar}
                style={{ marginTop: 6 }}
              />
            </View>
          ) : (
            <Botao
              testID="botao-sincronizar"
              titulo={erro ? 'Tentar novamente' : 'Sincronizar e verificar conflitos'}
              onPress={() => {
                setMedicoFiltro('todos');
                setLimiteVisivel(PASSO_LISTA);
                executar();
              }}
              style={{ marginTop: 14 }}
            />
          )}

          {cancelada && !rodando && (
            <View style={styles.avisoCancelada}>
              <Text style={styles.avisoCanceladaTexto}>
                Verificação interrompida pela recepção.
              </Text>
            </View>
          )}

          {erro && !rodando && (
            <View testID="mensagem-erro" style={styles.cardErro}>
              <Text style={styles.erroTitulo}>
                {erroStatus === 401
                  ? 'Sessão expirada'
                  : erroStatus === 403
                    ? 'Acesso restrito'
                    : !erroStatus
                      ? 'Não foi possível conectar à API'
                      : 'Não foi possível sincronizar'}
              </Text>
              <Text style={styles.erroTexto}>
                {erroStatus === 401
                  ? 'A API foi reiniciada e invalidou a sessão anterior. Entre novamente com a conta da recepção.'
                  : erroStatus === 403
                    ? 'Esta verificação é permitida apenas para o perfil de recepção.'
                    : !erroStatus
                      ? `${erro}. Verifique se a auth-api está rodando em ${BASE_URL} e se o aparelho está na mesma rede.`
                      : erro}
              </Text>
              {erroStatus === 401 && (
                <Botao
                  titulo="Fazer login novamente"
                  onPress={logout}
                  style={{ marginTop: 8 }}
                />
              )}
            </View>
          )}
        </View>
      </View>

      {resultado && (
        <>
          <View style={styles.bloco}>
            <View style={styles.metricasLinha}>
              <View style={styles.metricaCard}>
                <Text style={styles.metricaValor}>{resultado.totalConsultas}</Text>
                <Text style={styles.metricaRotulo}>Consultas</Text>
              </View>
              <View style={styles.metricaCard}>
                <Text style={styles.metricaValor}>{resultado.totalMedicos}</Text>
                <Text style={styles.metricaRotulo}>Médicos</Text>
              </View>
              <View
                style={[
                  styles.metricaCard,
                  totalConflitos > 0 ? styles.metricaAlerta : styles.metricaOk,
                ]}
              >
                <Text
                  style={[
                    styles.metricaValor,
                    { color: totalConflitos > 0 ? colors.danger : colors.green },
                  ]}
                >
                  {totalConflitos}
                </Text>
                <Text style={styles.metricaRotulo}>Conflitos</Text>
              </View>
            </View>
          </View>

          {medicosComConflito.length > 0 && (
            <View style={styles.bloco}>
              <Text style={styles.h2}>Filtrar por médico</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsLinha}
              >
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setMedicoFiltro('todos');
                    setLimiteVisivel(PASSO_LISTA);
                  }}
                  style={[styles.chip, medicoFiltro === 'todos' && styles.chipAtivo]}
                >
                  <Text style={[styles.chipTexto, medicoFiltro === 'todos' && styles.chipTextoAtivo]}>
                    Todos ({conflitos.length})
                  </Text>
                </Pressable>
                {medicosComConflito.map((m) => {
                  const ativo = medicoFiltro === m.id;
                  return (
                    <Pressable
                      key={m.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setMedicoFiltro(m.id);
                        setLimiteVisivel(PASSO_LISTA);
                      }}
                      style={[styles.chip, ativo && styles.chipAtivo]}
                    >
                      <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>
                        {m.nome} ({m.quantidade})
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.bloco}>
            <View style={styles.listaTopo}>
              <Text style={styles.h2}>Conflitos encontrados</Text>
              {resultado.parcialDoCache && (
                <Text style={styles.cacheNota}>Exibindo amostra salva · sincronize para lista completa</Text>
              )}
            </View>

            {conflitosVisiveis.length === 0 ? (
              <View style={styles.cardVazio}>
                <Text style={styles.vazioTexto}>
                  Nenhum conflito de horário encontrado para este filtro.
                </Text>
              </View>
            ) : (
              <View style={styles.lista}>
                {conflitosVisiveis.map((item) => (
                  <View key={item.id} style={styles.cardConflito}>
                    <View style={styles.conflitoTopo}>
                      <Text style={styles.conflitoMedico}>{item.medicoNome}</Text>
                      <Text style={styles.conflitoData}>{formatarDataDia(item.consultaA?.dataHora)}</Text>
                    </View>
                    {!!item.especialidade && (
                      <Text style={styles.conflitoEspecialidade}>{item.especialidade}</Text>
                    )}

                    <View style={styles.horariosBox}>
                      <View style={styles.horarioItem}>
                        <Text style={styles.horarioHora}>{formatarHorarioIntervalo(item.consultaA)}</Text>
                        <Text style={styles.horarioPaciente}>
                          Paciente: {item.consultaA?.pacienteNome || 'Não informado'}
                        </Text>
                      </View>
                      <View style={styles.divisor} />
                      <View style={styles.horarioItem}>
                        <Text style={styles.horarioHora}>{formatarHorarioIntervalo(item.consultaB)}</Text>
                        <Text style={styles.horarioPaciente}>
                          Paciente: {item.consultaB?.pacienteNome || 'Não informado'}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

                {conflitosVisiveis.length < conflitosFiltrados.length && (
                  <Botao
                    titulo={`Mostrar mais (${conflitosFiltrados.length - conflitosVisiveis.length} restantes)`}
                    variante="branco"
                    onPress={() => setLimiteVisivel((atual) => atual + PASSO_LISTA)}
                  />
                )}
              </View>
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  voltar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTexto: { flex: 1 },
  titulo: { fontFamily: fonts.title, fontSize: 28, color: colors.ink },
  subtitulo: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  bloco: { paddingHorizontal: 24, paddingTop: 20 },
  h2: { fontFamily: fonts.titleSemi, fontSize: 18, color: colors.ink, marginBottom: 10 },

  cardRestrito: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  iconeRestrito: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restritoTitulo: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.ink },
  restritoTexto: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  cardStatus: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
  },
  cardStatusTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIcone: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  cardMeta: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },

  progressoBox: { marginTop: 16, gap: 10 },
  progressoTextoLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  progressoEtapa: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink, flex: 1 },
  progressoPercentual: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  trilho: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.line,
    overflow: 'hidden',
  },
  barra: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: colors.green,
  },

  avisoCancelada: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.bg,
  },
  avisoCanceladaTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.muted,
  },

  cardErro: {
    marginTop: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.dangerBg,
    gap: 4,
  },
  erroTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.danger },
  erroTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.ink, lineHeight: 19 },

  metricasLinha: { flexDirection: 'row', gap: 10 },
  metricaCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metricaAlerta: { backgroundColor: colors.dangerBg },
  metricaOk: { backgroundColor: colors.mint },
  metricaValor: { fontFamily: fonts.title, fontSize: 22, color: colors.ink },
  metricaRotulo: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 2 },

  chipsLinha: { gap: 8, paddingVertical: 2 },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.white,
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: colors.green },
  chipTexto: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  chipTextoAtivo: { fontFamily: fonts.bold, color: colors.white },

  listaTopo: { marginBottom: 4 },
  cacheNota: { fontFamily: fonts.body, fontSize: 12, color: colors.muted, marginBottom: 8 },
  lista: { gap: 10 },
  cardVazio: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 18,
  },
  vazioTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },

  cardConflito: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  conflitoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  conflitoMedico: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, flex: 1 },
  conflitoData: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  conflitoEspecialidade: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },

  horariosBox: {
    marginTop: 4,
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  horarioItem: { gap: 2 },
  horarioHora: { fontFamily: fonts.bold, fontSize: 13, color: colors.danger },
  horarioPaciente: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  divisor: { height: 1, backgroundColor: colors.line },
});
