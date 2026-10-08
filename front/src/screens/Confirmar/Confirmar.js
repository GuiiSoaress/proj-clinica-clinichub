// src/screens/Confirmar/Confirmar.js
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon, { MiniMap } from '../../components/Icons';
import { Screen, Botao, MedicoAvatar } from '../../components/Layout';
import { useApp, MESES, pad } from '../../context/AppContext';
import { HORARIOS, UNIDADE } from '../../data/mock';
import { colors, fonts } from '../../theme';

const DIAS_SEMANA = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const inicioDoDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const mesmoDia = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// Monta as semanas do mês (preenchendo o início com dias do mês anterior).
function montarSemanas(ano, mes) {
  const primeiro = new Date(ano, mes, 1);
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const diasMesAnterior = new Date(ano, mes, 0).getDate();
  const offset = primeiro.getDay();

  const celulas = [];
  for (let i = offset - 1; i >= 0; i--) celulas.push({ dia: diasMesAnterior - i, fora: true });
  for (let d = 1; d <= diasNoMes; d++) celulas.push({ dia: d, data: new Date(ano, mes, d) });
  while (celulas.length % 7 !== 0) celulas.push({ dia: celulas.length % 7, fora: true, vazio: true });

  const semanas = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  return semanas;
}

export default function Confirmar({ navigation }) {
  const { medicoSelecionado, agendar } = useApp();
  const hoje = useMemo(() => inicioDoDia(new Date()), []);
  const [mesRef, setMesRef] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const [dataSel, setDataSel] = useState(hoje);
  const [horaSel, setHoraSel] = useState(HORARIOS[1]);

  const semanas = useMemo(() => montarSemanas(mesRef.getFullYear(), mesRef.getMonth()), [mesRef]);
  const podeVoltarMes = mesRef > new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const mudarMes = (delta) => setMesRef(new Date(mesRef.getFullYear(), mesRef.getMonth() + delta, 1));

  if (!medicoSelecionado) {
    // Acesso direto sem médico escolhido: volta para a seleção.
    return (
      <Screen navigation={navigation}>
        <View style={styles.vazioBox}>
          <Text style={styles.vazioTexto}>Selecione um médico para continuar.</Text>
          <Botao titulo="Escolher médico" onPress={() => navigation.navigate('Agendar')} style={{ marginTop: 16 }} />
        </View>
      </Screen>
    );
  }

  const confirmar = () => {
    const id = agendar({ medico: medicoSelecionado, data: dataSel, hora: horaSel });
    navigation.replace('Confirmada', { id });
  };

  return (
    <Screen
      navigation={navigation}
      footer={<Botao titulo="Confirmar agendamento" onPress={confirmar} />}
    >
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.voltar}>
          <Icon name="back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.titulo}>Confirmar agendamento</Text>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.rotulo}>Médico selecionado</Text>
        <View style={styles.cardMedico}>
          <MedicoAvatar nome={medicoSelecionado.nome} size={52} />
          <View>
            <Text style={styles.medicoNome}>{medicoSelecionado.nome}</Text>
            <Text style={styles.medicoSub}>{medicoSelecionado.especialidade} - CRM {medicoSelecionado.crm}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.h2}>Horários Disponíveis</Text>
        <View style={styles.calendario}>
          <View style={styles.mesLinha}>
            <Text style={styles.mesTexto}>{MESES[mesRef.getMonth()]} {mesRef.getFullYear()}</Text>
            <View style={styles.mesSetas}>
              <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" disabled={!podeVoltarMes} onPress={() => mudarMes(-1)} style={styles.seta}>
                <Text style={[styles.setaTexto, !podeVoltarMes && { color: colors.disabled }]}>‹</Text>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => mudarMes(1)} style={styles.seta}>
                <Text style={styles.setaTexto}>›</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.semana}>
            {DIAS_SEMANA.map((d, i) => (
              <Text key={i} style={styles.diaSemana}>{d}</Text>
            ))}
          </View>

          {semanas.map((semana, i) => (
            <View key={i} style={styles.semana}>
              {semana.map((c, j) => {
                if (c.vazio) return <View key={j} style={styles.celula} />;
                if (c.fora) {
                  return (
                    <View key={j} style={styles.celula}>
                      <Text style={[styles.diaTexto, { color: colors.disabled }]}>{c.dia}</Text>
                    </View>
                  );
                }
                const passado = c.data < hoje;
                const ativo = mesmoDia(c.data, dataSel);
                return (
                  <Pressable
                    key={j}
                    disabled={passado}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo, disabled: passado }}
                    onPress={() => setDataSel(c.data)}
                    style={styles.celula}
                  >
                    <View style={[styles.diaBolha, ativo && styles.diaBolhaAtiva]}>
                      <Text style={[styles.diaTexto, ativo && { fontFamily: fonts.bold }, passado && { color: colors.disabled }]}>{c.dia}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View style={styles.horarios}>
            {HORARIOS.map((h) => {
              const ativo = h === horaSel;
              return (
                <Pressable
                  key={h}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  onPress={() => setHoraSel(h)}
                  style={[styles.horario, ativo && styles.horarioAtivo]}
                >
                  <Text style={[styles.horarioTexto, ativo && styles.horarioTextoAtivo]}>{h}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.bloco}>
        <Text style={styles.h2}>Local</Text>
        <View style={styles.local}>
          <View style={styles.mapa}>
            <MiniMap />
          </View>
          <View style={{ padding: 12, paddingHorizontal: 14, flex: 1 }}>
            <Text style={styles.localNome}>{UNIDADE.nome}</Text>
            <Text style={styles.localEnd}>{UNIDADE.endereco}</Text>
            <Text style={styles.localDist}>{UNIDADE.distancia}</Text>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  voltar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.title, fontSize: 26, color: colors.ink, flex: 1 },
  bloco: { paddingHorizontal: 24, paddingTop: 20 },
  rotulo: { fontFamily: fonts.bold, fontSize: 13, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  h2: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.ink, marginBottom: 10 },
  cardMedico: { backgroundColor: colors.white, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  medicoNome: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  medicoSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  calendario: { backgroundColor: colors.white, borderRadius: 20, padding: 14 },
  mesLinha: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  mesTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  mesSetas: { flexDirection: 'row' },
  seta: { width: 44, height: 32, alignItems: 'center', justifyContent: 'center' },
  setaTexto: { fontFamily: fonts.body, fontSize: 22, color: colors.muted },
  semana: { flexDirection: 'row' },
  diaSemana: { flex: 1, textAlign: 'center', fontFamily: fonts.bold, fontSize: 11, color: colors.muted2, marginBottom: 4 },
  celula: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center' },
  diaBolha: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  diaBolhaAtiva: { backgroundColor: colors.coral },
  diaTexto: { fontFamily: fonts.body, fontSize: 14, color: colors.ink },
  horarios: { flexDirection: 'row', gap: 8, marginTop: 12 },
  horario: { flex: 1, height: 40, borderRadius: 12, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  horarioAtivo: { backgroundColor: colors.green },
  horarioTexto: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  horarioTextoAtivo: { fontFamily: fonts.bold, color: colors.white },
  local: { backgroundColor: colors.white, borderRadius: 20, overflow: 'hidden', flexDirection: 'row' },
  mapa: { width: 120, backgroundColor: colors.mint, justifyContent: 'center' },
  localNome: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  localEnd: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  localDist: { fontFamily: fonts.bold, fontSize: 13, color: colors.green, marginTop: 4 },
  vazioBox: { flex: 1, padding: 24, paddingTop: 120 },
  vazioTexto: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.ink },
});
