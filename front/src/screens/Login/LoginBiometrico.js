// src/screens/Login/LoginBiometrico.js
// Passo 3 (Aula 6) — Login com biometria.
//
// Conceito fundamental: a biometria NÃO autentica na API da clínica. Ela apenas
// destranca, no próprio aparelho, o token que o login anterior já guardou no
// SecureStore (cofre). Quem diz "esta pessoa pode entrar" continua sendo o servidor.

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import Icon from '../../components/Icons';
import { Botao } from '../../components/Layout';
import { obterToken, recuperarSessao } from '../../services/sessao';
import { useApp } from '../../context/AppContext';
import { colors, fonts } from '../../theme';

export default function LoginBiometrico({ navigation }) {
  const insets = useSafeAreaInsets();
  const { destrancarSessao } = useApp();

  const [verificando, setVerificando] = useState(true);
  const [temHardware, setTemHardware] = useState(false);
  const [temBiometria, setTemBiometria] = useState(false);
  const [tokenGuardado, setTokenGuardado] = useState(null);
  const [nomeSessao, setNomeSessao] = useState(null);
  const [autenticando, setAutenticando] = useState(false);
  const [mensagemCancelamento, setMensagemCancelamento] = useState(null);
  const [erroBio, setErroBio] = useState(null);

  useEffect(() => {
    let ativo = true;

    const checarDisponibilidade = async () => {
      try {
        // As três checagens obrigatórias antes de oferecer biometria:
        const [hardware, cadastrada, token, sessao] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          obterToken(),
          recuperarSessao(),
        ]);

        if (!ativo) return;

        // Se não houver token guardado no cofre, manda direto para o login com
        // e-mail e senha — não existe sessão salva para destrancar.
        if (!token) {
          navigation.replace('Login');
          return;
        }

        setTemHardware(hardware);
        setTemBiometria(cadastrada);
        setTokenGuardado(token);
        setNomeSessao(sessao?.usuario?.nome || null);
      } catch (e) {
        if (ativo) {
          setErroBio('Não foi possível verificar o sensor biométrico deste aparelho.');
        }
      } finally {
        if (ativo) {
          setVerificando(false);
        }
      }
    };

    checarDisponibilidade();
    return () => {
      ativo = false;
    };
  }, [navigation]);

  const autenticarComBiometria = async () => {
    setErroBio(null);
    setMensagemCancelamento(null);
    setAutenticando(true);

    try {
      const resultado = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Confirme sua digital para destrancar sua sessão no ClinicHub',
        cancelLabel: 'Entrar com e-mail e senha',
        disableDeviceFallback: false,
      });

      if (resultado.success) {
        await destrancarSessao();

        // Se estivermos em um navegador de pilha única, reseta para o início/menu;
        // no RootNavigator condicional (App.js), atualizar `token` no Contexto já
        // substitui a pilha pública pela privada iniciando em "Inicio".
        if (navigation.getState?.()?.routeNames?.includes('Inicio')) {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Inicio' }],
          });
        }
        return;
      }

      // Cancelar é escolha legítima do usuário, não falha técnica.
      if (resultado.error === 'user_cancel' || resultado.error === 'system_cancel') {
        setMensagemCancelamento(
          'Leitura biométrica cancelada. Você pode tentar de novo ou entrar com e-mail e senha.'
        );
      } else {
        setErroBio(
          'Não foi possível confirmar sua biometria neste momento. Use a opção de e-mail e senha abaixo.'
        );
      }
    } catch (e) {
      setErroBio(e.message || 'Falha ao acionar a autenticação biométrica.');
    } finally {
      setAutenticando(false);
    }
  };

  const irParaEmailSenha = () => {
    navigation.navigate('Login');
  };

  // Só oferece o botão quando as três condições forem verdadeiras.
  const podeMostrarBotaoBiometria = Boolean(temHardware && temBiometria && tokenGuardado);

  if (verificando) {
    return (
      <View style={styles.carregando}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.scroll} bounces={false}>
      <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
        <View style={styles.logo}>
          <Icon name="plus" size={28} color={colors.ink} />
        </View>
        <Text style={styles.marca}>ClinicHub</Text>
        <Text style={styles.slogan}>
          {nomeSessao
            ? `Sessão salva encontrada para ${nomeSessao}.`
            : 'Sessão salva encontrada neste aparelho.'}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.iconeDestaque}>
          <Icon name="fingerprint" size={38} color={colors.green} />
        </View>

        <Text style={styles.titulo}>Acesso rápido</Text>
        <Text style={styles.descricao}>
          {podeMostrarBotaoBiometria
            ? 'Confirme sua digital para destrancar sua sessão sem precisar digitar e-mail e senha novamente.'
            : !temHardware
              ? 'Este aparelho não possui leitor biométrico disponível. Entre com seu e-mail e senha abaixo.'
              : 'Nenhuma digital ou biometria está cadastrada nos ajustes deste aparelho. Entre com seu e-mail e senha abaixo.'}
        </Text>

        {erroBio && <Text style={styles.erro}>{erroBio}</Text>}
        {mensagemCancelamento && <Text style={styles.aviso}>{mensagemCancelamento}</Text>}

        {podeMostrarBotaoBiometria && (
          <Botao
            titulo={autenticando ? 'Verificando digital...' : 'Entrar com biometria'}
            onPress={autenticarComBiometria}
            disabled={autenticando}
            style={{ marginTop: 4 }}
          />
        )}

        {/* Link SEMPRE visível: biometria é atalho, nunca requisito */}
        <Pressable
          accessibilityRole="link"
          onPress={irParaEmailSenha}
          style={styles.linkSenha}
        >
          <Text style={styles.linkSenhaTexto}>Entrar com e-mail e senha</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: { flexGrow: 1 },
  carregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  hero: {
    backgroundColor: colors.green,
    minHeight: 360,
    paddingHorizontal: 32,
    paddingBottom: 72,
    justifyContent: 'flex-end',
    gap: 14,
  },
  logo: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.coral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marca: { fontFamily: fonts.title, fontSize: 44, lineHeight: 46, color: colors.white },
  slogan: {
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.heroText,
    maxWidth: 300,
  },
  card: {
    flex: 1,
    marginTop: -40,
    backgroundColor: colors.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 36,
    paddingHorizontal: 28,
    paddingBottom: 32,
    gap: 16,
  },
  iconeDestaque: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 4,
  },
  titulo: {
    fontFamily: fonts.titleSemi,
    fontSize: 26,
    color: colors.ink,
    textAlign: 'center',
  },
  descricao: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: colors.muted,
    textAlign: 'center',
  },
  erro: {
    color: colors.danger,
    backgroundColor: colors.dangerBg,
    padding: 12,
    borderRadius: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  aviso: {
    color: colors.green,
    backgroundColor: colors.mint,
    padding: 12,
    borderRadius: 12,
    fontFamily: fonts.medium,
    fontSize: 14,
    textAlign: 'center',
  },
  linkSenha: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  linkSenhaTexto: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.green,
    textDecorationLine: 'underline',
  },
});
