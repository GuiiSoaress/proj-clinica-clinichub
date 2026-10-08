// src/components/ConsultaCard.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';
import { MESES_ABREV, pad } from '../context/AppContext';

/**
 * Card de consulta com o "selo" de data à esquerda.
 * variante "home": mostra horário no selo e a especialidade como subtítulo.
 * variante "lista": mostra o mês no selo e "esp · hora · unidade" como subtítulo.
 */
export default function ConsultaCard({ consulta, variante = 'lista', onPress }) {
  const dia = pad(consulta.data.getDate());
  const sub = variante === 'home' ? consulta.especialidade : `${consulta.especialidade} · ${consulta.hora} · ${consulta.unidade}`;
  const seloBaixo = variante === 'home' ? consulta.hora : MESES_ABREV[consulta.data.getMonth()];
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper onPress={onPress} style={styles.card} accessibilityRole={onPress ? 'button' : undefined}>
      <View style={[styles.selo, variante === 'home' ? styles.seloHome : styles.seloLista]}>
        <Text style={[styles.dia, { fontSize: variante === 'home' ? 24 : 26 }]}>{dia}</Text>
        <Text style={styles.seloBaixo}>{seloBaixo}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.nome}>{consulta.medico}</Text>
        <Text style={styles.sub}>{sub}</Text>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  selo: { height: 64, borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  seloHome: { width: 64 },
  seloLista: { width: 60 },
  dia: { fontFamily: fonts.title, color: colors.green, lineHeight: 28 },
  seloBaixo: { fontFamily: fonts.bold, fontSize: 13, color: colors.green, marginTop: 2 },
  info: { flex: 1 },
  nome: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 3 },
});
