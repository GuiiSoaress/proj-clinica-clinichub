// src/screens/Consultas/Consultas.js
import React, { useState, useEffect } from 'react';
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
  const { consultas, sincronizarLembretesAgenda, usuario } = useApp();
  const [aba, setAba] = useState('proxima');
  const ehRecepcao = usuario?.perfil === 'recepcao';
  const atual = ABAS.find((a) => a.chave === aba);
  const lista = consultas.filter((c) => c.status === aba).sort((a, b) => a.data - b.data);

  // Passo 7 (Extensão): sincroniza lembretes com a agenda real ao abrir a tela
  useEffect(() => {
    sincronizarLembretesAgenda?.();
  }, [sincronizarLembretesAgenda]);

  return (
    <Screen navigation={navigation} tab="Inicio" testID="tela-consultas">
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
              testID={`filtro-${a.chave}`}
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

      {ehRecepcao && (
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('SincronizarAgenda')}
          style={({ pressed }) => [styles.bannerRecepcao, { opacity: pressed ? 0.85 : 1 }]}
        >
          <View style={styles.bannerIcone}>
            <Icon name="refresh" size={18} color={colors.green} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitulo}>Conferir conflitos da agenda</Text>
            <Text style={styles.bannerSub}>Sincronização completa da clínica</Text>
          </View>
          <Text style={styles.bannerSeta}>›</Text>
        </Pressable>
      )}

      <View testID="lista-consultas" style={styles.lista}>
        {lista.length === 0 ? (
          <Text testID="lista-consultas-vazia" style={styles.vazio}>{atual.vazio}</Text>
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
  bannerRecepcao: {
    marginHorizontal: 24,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: colors.mint,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerIcone: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  bannerSub: { fontFamily: fonts.body, fontSize: 12, color: colors.muted },
  bannerSeta: { fontSize: 20, color: colors.green },
  lista: { paddingHorizontal: 24, paddingTop: 20, gap: 12 },
  vazio: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
