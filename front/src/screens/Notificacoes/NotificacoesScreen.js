// src/screens/Notificacoes/NotificacoesScreen.js
// Tela de gerenciamento e diagnóstico de lembretes locais (Aula 8) e Push Remoto (Aula 9).
// Permite auditar lista com getAllScheduledNotificationsAsync(), verificar status do push,
// copiar token do dispositivo e testar o envio de notificações.

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import * as Device from 'expo-device';
import * as Clipboard from 'expo-clipboard';

import Icon from '../../components/Icons';
import { Screen, Botao } from '../../components/Layout';
import { colors, fonts } from '../../theme';
import {
  garantirPermissao,
  listarLembretesAgendados,
  cancelarLembrete,
  cancelarTodosLembretes,
  agendarLembrete,
  Notifications,
} from '../../services/lembretes';
import {
  manterRegistroAtualizado,
  obterTokenSalvo,
} from '../../services/push';
import { useApp } from '../../context/AppContext';

export default function NotificacoesScreen({ navigation }) {
  const { agendar } = useApp();
  const [permissao, setPermissao] = useState('verificando...');
  const [agendadas, setAgendadas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do Push (Aula 9)
  const [pushToken, setPushToken] = useState(null);
  const [pushStatus, setPushStatus] = useState('verificando...'); // 'ativo' | 'sem_permissao' | 'emulador' | 'web' | 'pendente'
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [copiado, setCopiado] = useState(false);
  const [registrandoPush, setRegistrandoPush] = useState(false);

  const carregarStatus = useCallback(async () => {
    setCarregando(true);
    try {
      if (Platform.OS !== 'web') {
        const resp = await Notifications.getPermissionsAsync();
        setPermissao(resp.status);
        setCanAskAgain(resp.canAskAgain);

        const lista = await listarLembretesAgendados();
        setAgendadas(lista);

        // Checagem de Push
        if (!Device.isDevice) {
          setPushStatus('emulador');
        } else if (resp.status !== 'granted') {
          setPushStatus('sem_permissao');
        } else {
          const salvo = await obterTokenSalvo();
          if (salvo) {
            setPushToken(salvo);
            setPushStatus('ativo');
          } else {
            setPushStatus('pendente');
          }
        }
      } else {
        setPermissao('web (não suportado)');
        setPushStatus('web');
        setAgendadas([]);
      }
    } catch (e) {
      console.warn('Erro ao carregar status de notificações:', e);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarStatus();
  }, [carregarStatus]);

  const pedirPermissaoNovamente = async () => {
    const ok = await garantirPermissao();
    setPermissao(ok ? 'granted' : 'denied');
    if (!ok && Platform.OS !== 'web') {
      Alert.alert(
        'Permissão necessária',
        'As notificações estão desativadas. Deseja abrir os ajustes do aparelho?',
        [
          { text: 'Não', style: 'cancel' },
          { text: 'Abrir Ajustes', onPress: () => Linking.openSettings() },
        ]
      );
    }
    await carregarStatus();
  };

  // Sincroniza / registra o token de Push na API (Aula 9)
  const sincronizarPushToken = async () => {
    setRegistrandoPush(true);
    try {
      const res = await manterRegistroAtualizado();
      if (res.sucesso && res.token) {
        setPushToken(res.token);
        setPushStatus('ativo');
        Alert.alert('Sucesso!', 'Token do dispositivo registrado na API da clínica.');
      } else {
        if (res.motivo === 'emulador') {
          setPushStatus('emulador');
          Alert.alert(
            'Indisponível no Emulador',
            'Push notifications exigem aparelho físico. Use um celular com development build.'
          );
        } else if (res.motivo === 'permissao_negada') {
          setPushStatus('sem_permissao');
          Alert.alert(
            'Permissão negada',
            'Permissão de notificação necessária para receber avisos push da clínica.'
          );
        } else {
          Alert.alert('Aviso de registro', res.erro || 'Falha ao sincronizar push token.');
        }
      }
    } finally {
      setRegistrandoPush(false);
      await carregarStatus();
    }
  };

  const copiarTokenParaClipboard = async () => {
    if (!pushToken) return;
    await Clipboard.setStringAsync(pushToken);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  // Teste rápido Aula 8: Daqui a 5 segundos (verificar handler e banner)
  const testarEmSegundos = async (segundos = 5) => {
    const dataDisparo = new Date(Date.now() + segundos * 1000);
    const mockConsulta = {
      id: `teste_${Date.now()}`,
      medico: 'Médico de Teste',
      especialidade: 'Clínica Geral',
      data: new Date(Date.now() + (segundos + 60) * 1000),
      hora: `${String(dataDisparo.getHours()).padStart(2, '0')}:${String(dataDisparo.getMinutes()).padStart(2, '0')}`,
    };

    const res = await agendarLembrete(mockConsulta, { dataDisparoCustomizada: dataDisparo });
    if (res.agendado) {
      Alert.alert(
        'Lembrete programado!',
        `Notificação local disparará em ${segundos} segundos. Deixe o app aberto ou minimize para conferir o banner.`
      );
    } else {
      Alert.alert('Não agendado', `Motivo: ${res.motivo}`);
    }
    await carregarStatus();
  };

  // Teste do Passo 3 - Item 16:
  // "consulta daqui a 3 minutos, lembrete 1 minuto antes"
  const testarConsulta3Minutos = async () => {
    const agora = Date.now();
    const dataConsulta = new Date(agora + 3 * 60 * 1000);
    const dataLembrete = new Date(agora + 1 * 60 * 1000);

    const horaStr = `${String(dataConsulta.getHours()).padStart(2, '0')}:${String(dataConsulta.getMinutes()).padStart(2, '0')}`;
    const res = await agendar({
      medico: { nome: 'Dr. Teste Curto', especialidade: 'Clínica' },
      data: dataConsulta,
      hora: horaStr,
      opcoesLembrete: { dataDisparoCustomizada: dataLembrete },
    });

    if (res?.lembrete?.agendado) {
      Alert.alert(
        'Teste Agendado',
        `Consulta criada para daqui a 3 min (${horaStr}). Lembrete agendado para disparar em 1 minuto!`
      );
    } else {
      Alert.alert('Aviso', `Lembrete não agendado: ${res?.lembrete?.motivo}`);
    }
    await carregarStatus();
  };

  const cancelarItem = async (identificador, consultaId) => {
    if (consultaId) {
      await cancelarLembrete(consultaId);
    } else if (Platform.OS !== 'web') {
      await Notifications.cancelScheduledNotificationAsync(identificador);
    }
    await carregarStatus();
  };

  const limparTodas = async () => {
    await cancelarTodosLembretes();
    await carregarStatus();
    Alert.alert('Fila limpa', 'Todas as notificações agendadas foram canceladas.');
  };

  return (
    <Screen navigation={navigation}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => navigation.goBack()}
          style={styles.voltar}
        >
          <Icon name="back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.titulo}>Notificações</Text>
      </View>

      {/* BLOCO 1: PUSH NOTIFICATIONS (Aula 9 - Passos 2 e 3) */}
      <View style={styles.bloco}>
        <Text style={styles.rotulo}>Push Notifications (Servidor da Clínica)</Text>
        <View style={styles.card}>
          <View style={styles.statusLinha}>
            <Text style={styles.statusTexto}>
              Status do Push:{' '}
              <Text
                style={{
                  fontFamily: fonts.bold,
                  color:
                    pushStatus === 'ativo'
                      ? colors.green
                      : pushStatus === 'sem_permissao'
                        ? colors.coral
                        : colors.muted,
                }}
              >
                {pushStatus === 'ativo'
                  ? 'Ativo (Conectado)'
                  : pushStatus === 'sem_permissao'
                    ? 'Sem Permissão'
                    : pushStatus === 'emulador'
                      ? 'Indisponível no Emulador'
                      : pushStatus === 'web'
                        ? 'Indisponível na Web'
                        : pushStatus}
              </Text>
            </Text>

            {pushStatus === 'sem_permissao' && !canAskAgain && Platform.OS !== 'web' && (
              <Pressable
                onPress={() => Linking.openSettings()}
                style={styles.btnPermissao}
              >
                <Text style={styles.btnPermissaoTexto}>Ajustes</Text>
              </Pressable>
            )}
          </View>

          {/* Texto explícito obrigatório da Aula 9 (Passo 3 - Item 15) */}
          <View style={styles.boxAvisoPerda}>
            <Text style={styles.avisoPerdaTexto}>
              {pushStatus === 'ativo'
                ? 'Você receberá avisos em tempo real da clínica sobre alterações de horário, atrasos ou cancelamentos na sua agenda.'
                : 'Aviso: você continuará recebendo o lembrete agendado no aparelho, mas não avisos de alterações feitas pela clínica.'}
            </Text>
          </View>

          {/* Exibição e cópia do Token para teste via terminal */}
          {pushToken ? (
            <View style={styles.tokenBox}>
              <Text style={styles.tokenRotulo}>Token deste aparelho (Expo Push Service):</Text>
              <Text style={styles.tokenValor} numberOfLines={2} selectable>
                {pushToken}
              </Text>
              <Botao
                titulo={copiado ? 'Token copiado com sucesso! ✓' : 'Copiar Push Token'}
                variante="branco"
                onPress={copiarTokenParaClipboard}
                style={[styles.botaoContorno, { marginTop: 8 }]}
              />
              <Text style={styles.dicaTerminal}>
                Para testar no terminal: node servidor/enviar-push.js "{pushToken.slice(0, 22)}..." "Aviso" "Corpo"
              </Text>
            </View>
          ) : (
            <Botao
              titulo={registrandoPush ? 'Registrando aparelho...' : 'Obter e registrar token na API'}
              onPress={sincronizarPushToken}
              disabled={registrandoPush || pushStatus === 'emulador'}
              style={{ marginTop: 4 }}
            />
          )}
        </View>
      </View>

      {/* BLOCO 2: STATUS DA PERMISSÃO DO SISTEMA */}
      <View style={styles.bloco}>
        <Text style={styles.rotulo}>Permissão Geral de Notificações</Text>
        <View style={styles.card}>
          <View style={styles.statusLinha}>
            <Text style={styles.statusTexto}>
              Permissão:{' '}
              <Text
                style={{
                  fontFamily: fonts.bold,
                  color: permissao === 'granted' ? colors.green : colors.danger,
                }}
              >
                {permissao === 'granted'
                  ? 'Concedida'
                  : permissao === 'denied'
                    ? 'Negada'
                    : permissao}
              </Text>
            </Text>
            {permissao !== 'granted' && (
              <Pressable
                onPress={pedirPermissaoNovamente}
                style={styles.btnPermissao}
              >
                <Text style={styles.btnPermissaoTexto}>Solicitar</Text>
              </Pressable>
            )}
          </View>
          <Text style={styles.sub}>
            As notificações locais funcionam mesmo sem internet e lembram você 1 hora antes de cada consulta.
          </Text>
        </View>
      </View>

      {/* BLOCO 3: TESTES RÁPIDOS DE LEMBRETE (Aula 8) */}
      <View style={styles.bloco}>
        <Text style={styles.h2}>Testes de Lembrete Local (Aula 8)</Text>
        <View style={{ gap: 10 }}>
          <Botao
            titulo="Disparar lembrete em 5 segundos"
            variante="branco"
            onPress={() => testarEmSegundos(5)}
            style={styles.botaoContorno}
          />
          <Botao
            titulo="Passo 3: Consulta em 3 min (aviso em 1 min)"
            onPress={testarConsulta3Minutos}
          />
        </View>
      </View>

      {/* BLOCO 4: AUDITORIA DAS AGENDADAS (getAllScheduledNotificationsAsync) */}
      <View style={styles.bloco}>
        <View style={styles.secaoTopo}>
          <Text style={styles.h2}>
            Agendadas no aparelho ({agendadas.length})
          </Text>
          <Pressable onPress={carregarStatus} style={styles.recarregarBtn}>
            <Text style={styles.recarregarTexto}>Atualizar</Text>
          </Pressable>
        </View>

        <Text style={styles.nota}>
          Verificação via getAllScheduledNotificationsAsync(). Prova de que os lembretes são registrados e cancelados no sistema operacional.
        </Text>

        {carregando ? (
          <ActivityIndicator color={colors.green} style={{ marginTop: 16 }} />
        ) : (
          <FlatList
            scrollEnabled={false}
            data={agendadas}
            keyExtractor={(item) => item.identifier}
            renderItem={({ item }) => (
              <View style={styles.itemNotif}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitulo}>{item.content.title}</Text>
                  <Text style={styles.itemCorpo}>{item.content.body}</Text>
                  <Text style={styles.itemId}>
                    ID: {item.identifier.slice(0, 24)}...
                  </Text>
                </View>
                <Pressable
                  onPress={() =>
                    cancelarItem(
                      item.identifier,
                      item.content.data?.consultaId
                    )
                  }
                  style={styles.cancelarBtn}
                >
                  <Text style={styles.cancelarTexto}>Cancelar</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.vazioBox}>
                <Text style={styles.vazioTexto}>
                  Nenhuma notificação agendada no aparelho no momento.
                </Text>
              </View>
            }
          />
        )}

        {agendadas.length > 0 && (
          <Botao
            titulo="Cancelar todas as notificações"
            variante="perigo"
            onPress={limparTodas}
            style={{ marginTop: 14 }}
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
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
  bloco: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  rotulo: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  h2: {
    fontFamily: fonts.titleSemi,
    fontSize: 18,
    color: colors.ink,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 16,
    gap: 10,
  },
  statusLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusTexto: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
  },
  btnPermissao: {
    backgroundColor: colors.mint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  btnPermissaoTexto: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
  },
  boxAvisoPerda: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
  },
  avisoPerdaTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  tokenBox: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  tokenRotulo: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  tokenValor: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.green,
  },
  dicaTerminal: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted2,
    marginTop: 8,
    fontStyle: 'italic',
  },
  sub: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    lineHeight: 18,
  },
  secaoTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recarregarBtn: {
    padding: 6,
  },
  recarregarTexto: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },
  nota: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
    marginBottom: 10,
    lineHeight: 16,
  },
  itemNotif: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemTitulo: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
  itemCorpo: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
  },
  itemId: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted2,
    marginTop: 4,
  },
  cancelarBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.dangerBg,
    borderRadius: 8,
  },
  cancelarTexto: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.danger,
  },
  vazioBox: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  vazioTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  botaoContorno: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
});
