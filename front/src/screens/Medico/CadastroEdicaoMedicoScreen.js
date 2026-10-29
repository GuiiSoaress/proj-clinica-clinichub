// src/screens/Medico/CadastroEdicaoMedicoScreen.js
// Tela de cadastro e edição de médico (Aula 6 — Passo 2: foto de perfil via câmera).

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icons';
import MedicoForm from '../../components/MedicoForm';
import { useApp } from '../../context/AppContext';
import { colors, fonts } from '../../theme';

export default function CadastroEdicaoMedicoScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { salvarMedico } = useApp();
  const medico = route?.params?.medico || null;

  const handleSave = async (dadosMedico) => {
    return salvarMedico(medico ? { ...medico, ...dadosMedico } : dadosMedico);
  };

  return (
    <View style={[styles.screen, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => navigation.goBack()}
          style={styles.voltar}
        >
          <Icon name="back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.titulo}>{medico ? 'Editar médico' : 'Novo médico'}</Text>
      </View>

      <MedicoForm
        medico={medico}
        onSave={handleSave}
        onCancel={() => navigation.goBack()}
        navigation={navigation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voltar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: colors.ink,
    flex: 1,
  },
});
