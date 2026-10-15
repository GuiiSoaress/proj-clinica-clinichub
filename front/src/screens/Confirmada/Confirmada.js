// src/screens/Confirmada/Confirmada.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from '../../components/Icons';
import { Screen, Botao } from '../../components/Layout';
import { useApp, formatarData } from '../../context/AppContext';
import { colors, fonts } from '../../theme';

function Linha({ rotulo, valor, ultima }) {
  return (
    <View style={[styles.linha, !ultima && styles.linhaBorda]}>
      <Text style={styles.linhaRotulo}>{rotulo}</Text>
      <Text style={styles.linhaValor}>{valor}</Text>
    </View>
  );
}

export default function Confirmada({ navigation, route }) {
  const { consultas, cancelar } = useApp();
  const consulta = consultas.find((c) => c.id === route.params?.id);

  if (!consulta) {
    return (
      <Screen navigation={navigation}>
        <View style={{ padding: 24, paddingTop: 100 }}>
          <Text style={styles.titulo}>Consulta não encontrada</Text>
          <Botao titulo="Início" onPress={() => navigation.navigate('Inicio')} style={{ marginTop: 20 }} />
        </View>
      </Screen>
    );
  }

  const cancelada = consulta.status === 'cancelada';

  return (
    <Screen
      navigation={navigation}
      footer={
        <View style={{ gap: 10 }}>
          <Botao titulo="Minhas Consultas" onPress={() => navigation.navigate('Consultas')} />
          <Botao titulo="Fechar" variante="branco" onPress={() => navigation.navigate('Inicio')} />
          {!cancelada && (
            <Botao
              titulo="Cancelar Consulta"
              variante="perigo"
              onPress={() => {
                cancelar(consulta.id);
                navigation.navigate('Consultas');
              }}
            />
          )}
        </View>
      }
      contentStyle={{ paddingBottom: 280 }}
    >
      <View style={styles.topo}>
        <View style={[styles.selo, cancelada && { backgroundColor: colors.danger }]}>
          <Icon name="check" size={52} color={colors.white} />
        </View>
        <Text style={styles.titulo}>{cancelada ? 'Consulta Cancelada' : 'Consulta Confirmada!'}</Text>
        {!cancelada && <Text style={styles.sub}>Enviamos os detalhes para o seu e-mail.</Text>}
      </View>

      <View style={styles.card}>
        <Linha rotulo="Especialidade" valor={consulta.especialidade} />
        <Linha rotulo="Médico" valor={consulta.medico} />
        <Linha rotulo="Data" valor={formatarData(consulta.data)} />
        <Linha rotulo="Horário" valor={consulta.hora} />
        <Linha rotulo="Unidade" valor={consulta.unidade} ultima />
      </View>

      {/* Sinais vitais (Aula 7): só faz sentido antes da consulta. */}
      {consulta.status === 'proxima' && (
        <View style={styles.card}>
          <View style={styles.vitaisTopo}>
            <View style={styles.vitaisIcone}>
              <Icon name="heart" size={22} color={colors.coral} filled={!!consulta.sinaisVitais} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vitaisTitulo}>Sinais vitais</Text>
              {consulta.sinaisVitais ? (
                <Text style={styles.vitaisTexto}>
                  Frequência cardíaca: <Text style={styles.vitaisValor}>{consulta.sinaisVitais.frequenciaMedia} bpm</Text>
                  {consulta.sinaisVitais.origem === 'manual'
                    ? ' (digitado manualmente)'
                    : ` (média de ${consulta.sinaisVitais.quantidadeLeituras} leituras)`}
                </Text>
              ) : (
                <Text style={styles.vitaisTexto}>Importe a frequência cardíaca de um aparelho Bluetooth antes da consulta.</Text>
              )}
            </View>
          </View>
          <Botao
            titulo={consulta.sinaisVitais ? 'Medir novamente' : 'Importar sinais vitais'}
            variante={consulta.sinaisVitais ? 'branco' : 'primario'}
            onPress={() => navigation.navigate('SinaisVitais', { consultaId: consulta.id })}
            style={[{ marginVertical: 12 }, consulta.sinaisVitais && styles.botaoContorno]}
          />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  topo: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 24 },
  selo: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.title, fontSize: 32, color: colors.ink, marginTop: 24, marginBottom: 6, textAlign: 'center' },
  sub: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, textAlign: 'center' },
  card: { marginTop: 32, marginHorizontal: 24, backgroundColor: colors.white, borderRadius: 24, paddingVertical: 8, paddingHorizontal: 20 },
  linha: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, gap: 12 },
  linhaBorda: { borderBottomWidth: 1, borderBottomColor: colors.line },
  linhaRotulo: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
  linhaValor: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  vitaisTopo: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12 },
  vitaisIcone: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.dangerBg, alignItems: 'center', justifyContent: 'center' },
  vitaisTitulo: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  vitaisTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2, lineHeight: 18 },
  vitaisValor: { fontFamily: fonts.bold, color: colors.ink },
  botaoContorno: { borderWidth: 1, borderColor: colors.border },
});
