// src/screens/Login/Login.js
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from '../../components/Icons';
import { Botao } from '../../components/Layout';
import { colors, fonts } from '../../theme';

export default function Login({ navigation }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  // Ainda não há autenticação real: ambos os caminhos entram no app.
  const entrar = () => navigation.replace('Inicio');

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <View style={styles.logo}>
            <Icon name="plus" size={28} color={colors.ink} />
          </View>
          <Text style={styles.marca}>ClinicHub</Text>
          <Text style={styles.slogan}>Agende e acompanhe suas consultas em poucos toques.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.titulo}>Entrar na sua conta</Text>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              placeholderTextColor={colors.muted2}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
          </View>

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Senha</Text>
            <TextInput
              value={senha}
              onChangeText={setSenha}
              placeholder="Digite sua senha"
              placeholderTextColor={colors.muted2}
              secureTextEntry
              style={styles.input}
            />
          </View>

          <Botao titulo="Entrar" onPress={entrar} style={{ marginTop: 6 }} />

          <Pressable accessibilityRole="button" onPress={entrar} style={styles.biometria}>
            <Icon name="fingerprint" size={22} color={colors.green} />
            <Text style={styles.biometriaTexto}>Entrar com biometria</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  hero: { backgroundColor: colors.green, minHeight: 400, paddingHorizontal: 32, paddingBottom: 72, justifyContent: 'flex-end', gap: 14 },
  logo: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.coral, alignItems: 'center', justifyContent: 'center' },
  marca: { fontFamily: fonts.title, fontSize: 44, lineHeight: 46, color: colors.white },
  slogan: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: colors.heroText, maxWidth: 280 },
  card: { flex: 1, marginTop: -40, backgroundColor: colors.white, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingTop: 36, paddingHorizontal: 28, paddingBottom: 28, gap: 18 },
  titulo: { fontFamily: fonts.titleSemi, fontSize: 26, color: colors.ink },
  campo: { gap: 6 },
  rotulo: { fontFamily: fonts.bold, fontSize: 14, color: colors.ink },
  input: { height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, backgroundColor: colors.bg, paddingHorizontal: 16, fontSize: 16, fontFamily: fonts.body, color: colors.ink },
  biometria: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  biometriaTexto: { fontFamily: fonts.medium, fontSize: 15, color: colors.green },
});
