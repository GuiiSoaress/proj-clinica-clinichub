// src/screens/Consultas/Consultas.js
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Icon from '../../components/Icons';
import { Screen } from '../../components/Layout';
import ConsultaCard from '../../components/ConsultaCard';
import { useApp } from '../../context/AppContext';
import { colors, fonts } from '../../theme';

const ABAS = [
  { chave: 'proxima', rotulo: 'Próximas', vazio: 'Você não tem consultas agendadas.' },
  { chave: 'concluida', rotulo: 'Concluídas', vazio: 'Nenhuma consulta concluída.' },
  { chave: 'cancelada', rotulo: 'Canceladas', vazio: 'Nenhuma consulta cancelada.' },
];

export default function Consultas({ navigation }) {
  const { consultas } = useApp();
  const [aba, setAba] = useState('proxima');
  const atual = ABAS.find((a) => a.chave === aba);
  const lista = consultas.filter((c) => c.status === aba).sort((a, b) => a.data - b.data);

  return (
    <Screen navigation={navigation} tab="Inicio">
      <View style={styles.header}>
        <Text style={styles.titulo}>Minhas Consultas</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Agendar consulta" onPress={() => navigation.navigate('Agendar')} style={styles.logo}>
          <Icon name="plus" size={24} color={colors.coral} />
        </Pressable>
      </View>

      <View style={styles.abas}>
        {ABAS.map((a) => {
          const ativo = a.chave === aba;
          return (
            <Pressable
              key={a.chave}
              accessibilityRole="tab"
              accessibilityState={{ selected: ativo }}
              onPress={() => setAba(a.chave)}
              style={[styles.aba, ativo && styles.abaAtiva]}
            >
              <Text style={[styles.abaTexto, ativo && styles.abaTextoAtivo]}>{a.rotulo}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.lista}>
        {lista.length === 0 ? (
          <Text style={styles.vazio}>{atual.vazio}</Text>
        ) : (
          lista.map((c) => (
            <ConsultaCard key={c.id} consulta={c} onPress={() => navigation.navigate('Confirmada', { id: c.id })} />
          ))
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontFamily: fonts.title, fontSize: 30, color: colors.ink },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  abas: { marginHorizontal: 24, marginTop: 20, padding: 4, backgroundColor: colors.white, borderRadius: 16, flexDirection: 'row', gap: 4 },
  aba: { flex: 1, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  abaAtiva: { backgroundColor: colors.green },
  abaTexto: { fontFamily: fonts.medium, fontSize: 14, color: colors.muted },
  abaTextoAtivo: { fontFamily: fonts.bold, color: colors.white },
  lista: { paddingHorizontal: 24, paddingTop: 20, gap: 12 },
  vazio: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
