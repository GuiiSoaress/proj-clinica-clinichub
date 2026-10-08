// src/components/Layout.js
// Componentes de layout compartilhados: Screen (com barra de abas/rodapé fixo),
// TabBar, Botao e MedicoAvatar.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from './Icons';
import { colors, fonts, shadowBar } from '../theme';

export function iniciais(nome) {
  const partes = nome.replace(/^(Dr|Dra)\s+/i, '').split(' ').filter(Boolean);
  return ((partes[0]?.[0] || '') + (partes[partes.length - 1]?.[0] || '')).toUpperCase();
}

export function Botao({ titulo, onPress, variante = 'primario', disabled, style }) {
  const v = botaoVariantes[variante];
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.botao,
        { backgroundColor: v.bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <Text style={[styles.botaoTexto, { color: v.cor }]}>{titulo}</Text>
    </Pressable>
  );
}

const botaoVariantes = {
  primario: { bg: colors.coral, cor: colors.ink },
  branco: { bg: colors.white, cor: colors.ink },
  perigo: { bg: colors.dangerBg, cor: colors.danger },
};

export function MedicoAvatar({ nome, size = 56 }) {
  return (
    <View style={[styles.avatar, { width: size, height: size }]}>
      <Text style={[styles.avatarTexto, { fontSize: size * 0.36 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const ABAS = [
  { rota: 'Inicio', rotulo: 'Início', icone: 'home' },
  { rota: 'Agendar', rotulo: 'Agendar', icone: 'calendarPlus' },
  { rota: 'Perfil', rotulo: 'Perfil', icone: 'user' },
];

export function TabBar({ ativa, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabBar, shadowBar, { bottom: Math.max(insets.bottom, 12) + 12 }]}>
      {ABAS.map((aba) => {
        const ativo = aba.rota === ativa;
        const cor = ativo ? colors.green : colors.muted2;
        return (
          <Pressable
            key={aba.rota}
            accessibilityRole="tab"
            accessibilityState={{ selected: ativo }}
            onPress={() => navigation.navigate(aba.rota)}
            style={styles.tabItem}
          >
            <Icon
              name={aba.icone}
              color={cor}
              filled={ativo && aba.icone !== 'calendarPlus'}
              strokeWidth={ativo && aba.icone === 'calendarPlus' ? 2.2 : 1.8}
            />
            <Text style={[styles.tabTexto, { color: cor }]}>{aba.rotulo}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Tela padrão: fundo bege, rolagem, barra de abas opcional (`tab`) e
 * rodapé fixo opcional (`footer`) posicionado acima da barra.
 */
export function Screen({ navigation, tab, footer, children, contentStyle, scroll = true }) {
  const insets = useSafeAreaInsets();
  const base = Math.max(insets.bottom, 12);
  const tabAltura = tab ? 68 + 24 + base : base + 16;
  const footerAltura = footer ? 54 + 24 : 0;
  const rodapeBottom = tab ? 68 + 24 + base + 8 : base + 16;

  const Container = scroll ? ScrollView : View;
  const containerProps = scroll
    ? { showsVerticalScrollIndicator: false, keyboardShouldPersistTaps: 'handled' }
    : {};

  return (
    <View style={styles.screen}>
      <Container
        style={styles.flex}
        contentContainerStyle={
          scroll ? [{ paddingTop: Math.max(insets.top, 24) + 12, paddingBottom: tabAltura + footerAltura }, contentStyle] : undefined
        }
        {...containerProps}
      >
        {children}
      </Container>
      {footer ? <View style={[styles.footer, { bottom: rodapeBottom }]}>{footer}</View> : null}
      {tab ? <TabBar ativa={tab} navigation={navigation} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  botao: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  botaoTexto: { fontFamily: fonts.bold, fontSize: 17 },
  avatar: { borderRadius: 16, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontFamily: fonts.title, color: colors.green },
  footer: { position: 'absolute', left: 24, right: 24 },
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 68,
    backgroundColor: colors.white,
    borderRadius: 24,
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  tabItem: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabTexto: { fontFamily: fonts.bold, fontSize: 12 },
});
