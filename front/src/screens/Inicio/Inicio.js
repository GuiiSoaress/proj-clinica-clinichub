// src/screens/Inicio/Inicio.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import Icon from '../../components/Icons';
import { Screen } from '../../components/Layout';
import ConsultaCard from '../../components/ConsultaCard';
import { useApp } from '../../context/AppContext';
import { colors, fonts } from '../../theme';

function Atalho({ titulo, icone, onPress, destaque, escuro }) {
  const fundo = destaque ? colors.coral : escuro ? colors.green : colors.white;
  const cor = destaque ? colors.ink : escuro ? colors.white : colors.green;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.atalho, { backgroundColor: fundo, opacity: pressed ? 0.85 : 1 }]}
    >
      <Icon name={icone} size={28} color={cor} />
      <Text style={[styles.atalhoTexto, { color: destaque ? colors.ink : escuro ? colors.white : colors.ink }]}>{titulo}</Text>
    </Pressable>
  );
}

export default function Inicio({ navigation }) {
  const { consultas, usuario } = useApp();
  const proximas = consultas
    .filter((c) => c.status === 'proxima')
    .sort((a, b) => a.data - b.data)
    .slice(0, 2);

  return (
    <Screen navigation={navigation} tab="Inicio">
      <View style={styles.header}>
        <View>
          <Text style={styles.bemVindo}>Bem-vindo de volta</Text>
          <Text style={styles.ola}>Olá, {usuario ? usuario.nome.split(' ')[0] : 'Paciente'}</Text>
        </View>
        <View style={styles.logo}>
          <Icon name="plus" size={26} color={colors.coral} />
        </View>
      </View>

      <View style={styles.secao}>
        <Text style={styles.h2}>Acesso rápido</Text>
        <View style={styles.grid}>
          <Atalho titulo="Agendar Consulta" icone="calendarPlus" destaque onPress={() => navigation.navigate('Agendar')} />
          <Atalho titulo="Minhas Consultas" icone="clipboard" onPress={() => navigation.navigate('Consultas')} />
          <Atalho titulo="Perfil" icone="user" onPress={() => navigation.navigate('Perfil')} />
          <Atalho titulo="Exames" icone="flask" escuro onPress={() => Alert.alert('Exames', 'Em breve.')} />
        </View>
      </View>

      <View style={styles.secao}>
        <View style={styles.secaoTopo}>
          <Text style={styles.h2}>Próximas consultas</Text>
          <Pressable accessibilityRole="link" onPress={() => navigation.navigate('Consultas')} style={styles.verTodas}>
            <Text style={styles.verTodasTexto}>Ver Todas ›</Text>
          </Pressable>
        </View>
        <View style={{ gap: 12 }}>
          {proximas.length === 0 ? (
            <Text style={styles.vazio}>Você não tem consultas agendadas.</Text>
          ) : (
            proximas.map((c) => (
              <ConsultaCard key={c.id} consulta={c} variante="home" onPress={() => navigation.navigate('Confirmada', { id: c.id })} />
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bemVindo: { fontFamily: fonts.body, fontSize: 15, color: colors.muted },
  ola: { fontFamily: fonts.title, fontSize: 32, marginTop: 2, color: colors.ink },
  logo: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  secao: { paddingHorizontal: 24, paddingTop: 28 },
  secaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  h2: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.ink, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  atalho: { width: '48%', flexGrow: 1, minHeight: 104, borderRadius: 20, padding: 16, justifyContent: 'space-between' },
  atalhoTexto: { fontFamily: fonts.bold, fontSize: 15 },
  verTodas: { minHeight: 44, justifyContent: 'center' },
  verTodasTexto: { fontFamily: fonts.bold, fontSize: 14, color: colors.green },
  vazio: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
