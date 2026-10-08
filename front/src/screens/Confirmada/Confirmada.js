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
});
