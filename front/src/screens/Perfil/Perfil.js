// src/screens/Perfil/Perfil.js
import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icons';
import { Screen, iniciais } from '../../components/Layout';
import { PACIENTE } from '../../data/mock';
import { colors, fonts } from '../../theme';
import { useApp } from '../../context/AppContext';

function Item({ titulo, onPress }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.item, { opacity: pressed ? 0.85 : 1 }]}>
      <Text style={styles.itemTexto}>{titulo}</Text>
      <Text style={styles.itemSeta}>›</Text>
    </Pressable>
  );
}

export default function Perfil({ navigation }) {
  const insets = useSafeAreaInsets();
  const { logout, usuario } = useApp();
  const emBreve = (t) => () => Alert.alert(t, 'Em breve.');
  const sair = async () => {
    await logout();
  };

  const nomeExibicao = usuario ? usuario.nome : PACIENTE.nome;
  const papelExibicao = usuario && usuario.perfil ? usuario.perfil : PACIENTE.papel;

  return (
    <Screen navigation={navigation} tab="Perfil" contentStyle={{ paddingTop: 0 }}>
      <View style={[styles.hero, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
        <View style={styles.heroTopo}>
          <Text style={styles.heroTitulo}>Minha Conta</Text>
          <View style={styles.logo}>
            <Icon name="plus" size={22} color={colors.ink} />
          </View>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarTexto}>{iniciais(nomeExibicao)}</Text>
        </View>
      </View>

      <View style={styles.identidade}>
        <Text style={styles.nome}>{nomeExibicao}</Text>
        <Text style={styles.papel}>{papelExibicao}</Text>
      </View>

      <View style={styles.lista}>
        <Item titulo="Minhas Consultas" onPress={() => navigation.navigate('Consultas')} />
        <Item titulo="Dados pessoais" onPress={emBreve('Dados pessoais')} />
        <Item titulo="Notificações" onPress={emBreve('Notificações')} />
        <Pressable accessibilityRole="button" onPress={sair} style={styles.sair}>
          <Text style={styles.sairTexto}>Sair</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.green, minHeight: 300, paddingHorizontal: 24, alignItems: 'center' },
  heroTopo: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitulo: { fontFamily: fonts.title, fontSize: 28, color: colors.white },
  logo: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.coral, borderWidth: 4, borderColor: colors.bg, alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: -48 },
  avatarTexto: { fontFamily: fonts.title, fontSize: 36, color: colors.ink },
  identidade: { marginTop: 62, alignItems: 'center' },
  nome: { fontFamily: fonts.title, fontSize: 26, color: colors.ink },
  papel: { fontFamily: fonts.body, fontSize: 15, color: colors.muted, marginTop: 4 },
  lista: { paddingHorizontal: 24, paddingTop: 24, gap: 10 },
  item: { height: 56, backgroundColor: colors.white, borderRadius: 16, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  itemSeta: { fontSize: 20, color: colors.muted2 },
  sair: { height: 56, backgroundColor: colors.dangerBg, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  sairTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.danger },
});
