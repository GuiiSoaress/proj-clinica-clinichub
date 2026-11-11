// src/screens/Notificacoes/NotificacoesScreen.js
// Tela de gerenciamento e diagnóstico de lembretes locais (Aula 8).
// Permite verificar permissão, auditar lista com getAllScheduledNotificationsAsync()
// e executar os testes rápidos previstos nos Passos 3 e 4.

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
import { useApp } from '../../context/AppContext';

export default function NotificacoesScreen({ navigation }) {
  const { agendar } = useApp();
  const [permissao, setPermissao] = useState('verificando...');
  const [agendadas, setAgendadas] = useState([]);
  const [carregando, setCarregando] = useState(true);

  const carregarStatus = useCallback(async () => {
    setCarregando(true);
    try {
      if (Platform.OS !== 'web') {
        const resp = await Notifications.getPermissionsAsync();
        setPermissao(resp.status);
        const lista = await listarLembretesAgendados();
        setAgendadas(lista);
      } else {
        setPermissao('web (não suportado)');
        setAgendadas([]);
      }
    } catch (e) {
      console.warn('Erro ao carregar notificações:', e);
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

  // Teste rápido 1: Daqui a 5 segundos (para verificar o handler e o banner)
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
    const dataLembrete = new Date(agora + 1 * 60 * 1000); // 1 minuto antes (dispara em 60s)

    const horaStr = `${String(dataConsulta.getHours()).padStart(2, '0')}:${String(dataConsulta.getMinutes()).padStart(2, '0')}`;
    const res = await agendar({
      medico: { nome: 'Dr. Teste Curto', especialidade: 'Clínica' },
      data: dataConsulta,
      hora: horaStr,
      opcoesLembrete: { dataDisparoCustomizada: dataLembrete },
    });

    if (res?.lembrete?.agendado) {
      Alert.alert(
        'Teste do Passo 3 Agendado',
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

      <View style={styles.bloco}>
        <Text style={styles.rotulo}>Status da permissão</Text>
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

      {/* Seção de testes rápidos para a aula */}
      <View style={styles.bloco}>
        <Text style={styles.h2}>Testes de lembrete (Aula 8)</Text>
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

      {/* Seção da lista de agendamentos pendentes */}
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
    paddingTop: 20,
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
    gap: 8,
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
