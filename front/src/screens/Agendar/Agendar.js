// src/screens/Agendar/Agendar.js
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Icon from '../../components/Icons';
import { Screen, Botao, MedicoAvatar } from '../../components/Layout';
import { useApp } from '../../context/AppContext';
import { ESPECIALIDADES, MEDICOS } from '../../data/mock';
import { colors, fonts } from '../../theme';

const normalizar = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Agendar({ navigation }) {
  const { medicoSelecionado, setMedicoSelecionado } = useApp();
  const [busca, setBusca] = useState('');
  const [especialidade, setEspecialidade] = useState('Cardiologia');

  const medicos = useMemo(() => {
    const q = normalizar(busca.trim());
    return MEDICOS.filter((m) => {
      if (especialidade && m.especialidade !== especialidade) return false;
      if (!q) return true;
      return normalizar(m.nome).includes(q) || normalizar(m.especialidade).includes(q);
    });
  }, [busca, especialidade]);

  // Só considera selecionado quem ainda está na lista filtrada.
  const selecionado = medicos.find((m) => m.id === medicoSelecionado?.id) || null;

  return (
    <Screen
      navigation={navigation}
      tab="Agendar"
      footer={
        <Botao
          titulo="Agendar"
          disabled={!selecionado}
          onPress={() => navigation.navigate('Confirmar')}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.titulo}>Agendar Consulta</Text>
        <View style={styles.logo}>
          <Icon name="plus" size={24} color={colors.coral} />
        </View>
      </View>

      <View style={styles.busca}>
        <Icon name="search" size={22} color={colors.muted2} />
        <TextInput
          value={busca}
          onChangeText={setBusca}
          placeholder="Pesquisar por nome ou especialidade"
          placeholderTextColor={colors.muted2}
          style={styles.buscaInput}
        />
      </View>

      <View style={styles.chips}>
        {ESPECIALIDADES.map((esp) => {
          const ativo = esp === especialidade;
          return (
            <Pressable
              key={esp}
              accessibilityRole="button"
              accessibilityState={{ selected: ativo }}
              onPress={() => setEspecialidade(ativo ? null : esp)}
              style={[styles.chip, ativo && styles.chipAtivo]}
            >
              <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{esp}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.secao}>
        <Text style={styles.h2}>Médico</Text>
        <View style={{ gap: 10 }}>
          {medicos.length === 0 ? (
            <Text style={styles.vazio}>Nenhum médico encontrado.</Text>
          ) : (
            medicos.map((m) => {
              const ativo = selecionado?.id === m.id;
              return (
                <Pressable
                  key={m.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  onPress={() => setMedicoSelecionado(m)}
                  style={[styles.medico, ativo && styles.medicoAtivo]}
                >
                  <MedicoAvatar nome={m.nome} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medicoNome}>{m.nome}</Text>
                    <Text style={styles.medicoSub}>{m.especialidade} - CRM {m.crm}</Text>
                  </View>
                  {ativo ? <Icon name="checkCircle" size={24} color={colors.coral} /> : null}
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titulo: { fontFamily: fonts.title, fontSize: 30, color: colors.ink },
  logo: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  busca: { marginHorizontal: 24, marginTop: 20, height: 52, backgroundColor: colors.white, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  buscaInput: { flex: 1, fontSize: 15, fontFamily: fonts.body, color: colors.ink, outlineStyle: 'none' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 24, paddingTop: 16 },
  chip: { height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: colors.white, justifyContent: 'center' },
  chipAtivo: { backgroundColor: colors.green },
  chipTexto: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  chipTextoAtivo: { fontFamily: fonts.bold, color: colors.white },
  secao: { paddingHorizontal: 24, paddingTop: 24 },
  h2: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.ink, marginBottom: 12 },
  medico: { backgroundColor: colors.white, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: 'transparent' },
  medicoAtivo: { borderColor: colors.coral },
  medicoNome: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  medicoSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  vazio: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
