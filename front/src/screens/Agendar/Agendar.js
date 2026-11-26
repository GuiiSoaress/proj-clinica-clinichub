// src/screens/Agendar/Agendar.js
import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Icon from '../../components/Icons';
import { Screen, Botao, MedicoAvatar } from '../../components/Layout';
import { useApp } from '../../context/AppContext';
import { ESPECIALIDADES } from '../../data/mock';
import { filtrarMedicos } from '../../regras';
import { colors, fonts } from '../../theme';

export default function Agendar({ navigation }) {
  const { medicos: listaMedicos, medicoSelecionado, setMedicoSelecionado } = useApp();
  const [busca, setBusca] = useState('');
  const [especialidade, setEspecialidade] = useState('Cardiologia');

  // Regra de filtro em função pura (src/regras.js), testada sem tela.
  const medicos = useMemo(
    () => filtrarMedicos(listaMedicos, busca, especialidade),
    [listaMedicos, busca, especialidade]
  );

  // Só considera selecionado quem ainda está na lista filtrada.
  const selecionado = medicos.find((m) => m.id === medicoSelecionado?.id) || null;

  return (
    <Screen
      navigation={navigation}
      tab="Agendar"
      testID="tela-agendar"
      footer={
        <Botao
          testID="botao-agendar"
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
          testID="campo-busca"
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
              testID={`especialidade-${esp}`}
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
        <View style={styles.secaoTopo}>
          <Text style={styles.h2}>Médico</Text>
          <Pressable
            testID="botao-novo-medico"
            accessibilityRole="button"
            onPress={() => navigation.navigate('CadastroEdicaoMedico')}
            style={styles.novoMedicoBtn}
          >
            <Text style={styles.novoMedicoTexto}>+ Novo médico</Text>
          </Pressable>
        </View>

        <View testID="lista-medicos" style={{ gap: 10 }}>
          {medicos.length === 0 ? (
            <Text testID="lista-medicos-vazia" style={styles.vazio}>Nenhum médico encontrado.</Text>
          ) : (
            medicos.map((m) => {
              const ativo = selecionado?.id === m.id;
              return (
                <Pressable
                  key={m.id}
                  testID={`medico-${m.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: ativo }}
                  onPress={() => setMedicoSelecionado(m)}
                  style={[styles.medico, ativo && styles.medicoAtivo]}
                >
                  <MedicoAvatar nome={m.nome} fotoUri={m.fotoUri} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medicoNome}>{m.nome}</Text>
                    <Text style={styles.medicoSub}>{m.especialidade} - CRM {m.crm}</Text>
                  </View>
                  <Pressable
                    testID={`editar-medico-${m.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Editar ${m.nome}`}
                    onPress={() => navigation.navigate('CadastroEdicaoMedico', { medico: m })}
                    style={styles.editarBtn}
                  >
                    <Text style={styles.editarTexto}>Editar</Text>
                  </Pressable>
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
  secaoTopo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h2: { fontFamily: fonts.titleSemi, fontSize: 20, color: colors.ink },
  novoMedicoBtn: { minHeight: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.mint, justifyContent: 'center' },
  novoMedicoTexto: { fontFamily: fonts.bold, fontSize: 13, color: colors.green },
  medico: { backgroundColor: colors.white, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: 'transparent' },
  medicoAtivo: { borderColor: colors.coral },
  medicoNome: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  medicoSub: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, marginTop: 2 },
  editarBtn: { minHeight: 36, paddingHorizontal: 10, borderRadius: 10, backgroundColor: colors.bg, justifyContent: 'center' },
  editarTexto: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },
  vazio: { fontFamily: fonts.body, fontSize: 14, color: colors.muted },
});
