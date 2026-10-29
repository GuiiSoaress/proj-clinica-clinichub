// src/screens/Clinica/ComoChegar.js
// Tela "Como chegar" (Aula 6): calcula a distância do paciente até a clínica
// e uma estimativa de tempo consumindo apenas o service de localização.
//
// Regra de ouro: esta tela não importa 'expo-location' diretamente. Além disso,
// o endereço da clínica permanece sempre visível — recurso negado nunca pode
// virar tela vazia.

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
} from 'react-native';
import Icon, { MiniMap } from '../../components/Icons';
import { Screen, Botao } from '../../components/Layout';
import { UNIDADE } from '../../data/mock';
import {
  COORDENADAS_CLINICA,
  PermissaoNegada,
  obterPosicaoAtual,
  distanciaKm,
  formatarDistancia,
  estimarTempo,
} from '../../services/localizacao';
import { colors, fonts } from '../../theme';

export default function ComoChegar({ navigation }) {
  const [posicao, setPosicao] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState(null);
  // null = sem erro de permissão | true = pode perguntar de novo | false = bloqueado nos ajustes
  const [podePerguntarDeNovo, setPodePerguntarDeNovo] = useState(null);

  const atualizarLocalizacao = useCallback(async () => {
    setErro(null);
    setPodePerguntarDeNovo(null);
    setBuscando(true);
    try {
      const atual = await obterPosicaoAtual();
      setPosicao(atual);
    } catch (e) {
      if (e instanceof PermissaoNegada || e?.name === 'PermissaoNegada') {
        setPodePerguntarDeNovo(e.canAskAgain);
        setErro(
          e.canAskAgain
            ? 'Precisamos da sua permissão de localização apenas para calcular a distância até a clínica.'
            : 'A permissão de localização foi negada permanentemente neste aparelho. Para calcular a distância, ative o acesso à localização nos ajustes do sistema.'
        );
      } else {
        setErro(
          'Não foi possível obter a localização do aparelho no momento. Verifique se o GPS está ativado e tente novamente.'
        );
      }
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    atualizarLocalizacao();
  }, [atualizarLocalizacao]);

  const abrirAjustes = async () => {
    if (Platform.OS === 'web') {
      return;
    }
    try {
      await Linking.openSettings();
    } catch (e) {
      setErro('Não foi possível abrir os ajustes automaticamente. Abra as Configurações do aparelho.');
    }
  };

  const km = posicao ? distanciaKm(posicao, COORDENADAS_CLINICA) : null;
  const tempo = km !== null ? estimarTempo(km) : null;

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
        <Text style={styles.titulo}>Como chegar</Text>
      </View>

      {/* Endereço da clínica SEMPRE visível: a tela continua útil mesmo sem GPS */}
      <View style={styles.bloco}>
        <Text style={styles.rotulo}>Unidade de atendimento</Text>
        <View style={styles.cardUnidade}>
          <View style={styles.mapaIlustrativo}>
            <MiniMap />
          </View>
          <View style={styles.unidadeInfo}>
            <Text style={styles.unidadeNome}>{UNIDADE.nome}</Text>
            <Text style={styles.unidadeEndereco}>{UNIDADE.endereco}</Text>
            <Text style={styles.unidadeComplemento}>Bela Vista · São Paulo - SP · CEP 01310-100</Text>
            <Text style={styles.unidadeHorario}>Seg a Sex, das 07h às 19h</Text>
          </View>
        </View>
      </View>

      {/* Bloco de distância e tempo via GPS */}
      <View style={styles.bloco}>
        <Text style={styles.h2}>Sua distância até a clínica</Text>

        {buscando && !posicao && (
          <View style={styles.cardStatus}>
            <ActivityIndicator size="small" color={colors.green} />
            <Text style={styles.statusTexto}>Obtendo sua localização pelo GPS...</Text>
          </View>
        )}

        {erro && (
          <View style={styles.cardErro}>
            <Text style={styles.erroTitulo}>
              {podePerguntarDeNovo === false
                ? 'Permissão bloqueada nos ajustes'
                : podePerguntarDeNovo === true
                  ? 'Permissão de localização necessária'
                  : 'Localização indisponível'}
            </Text>
            <Text style={styles.erroTexto}>{erro}</Text>

            {podePerguntarDeNovo === true && (
              <Botao
                titulo="Permitir e tentar novamente"
                onPress={atualizarLocalizacao}
                disabled={buscando}
                style={styles.botaoAcao}
              />
            )}

            {podePerguntarDeNovo === false && Platform.OS !== 'web' && (
              <Botao
                titulo="Abrir ajustes do aparelho"
                onPress={abrirAjustes}
                style={styles.botaoAcao}
              />
            )}

            {podePerguntarDeNovo === null && (
              <Botao
                titulo="Tentar novamente"
                variante="branco"
                onPress={atualizarLocalizacao}
                disabled={buscando}
                style={[styles.botaoAcao, styles.botaoContorno]}
              />
            )}
          </View>
        )}

        {posicao && km !== null && tempo && (
          <View style={styles.cardResultado}>
            <View style={styles.metricas}>
              <View style={styles.metricaItem}>
                <Text style={styles.metricaRotulo}>Distância (linha reta)</Text>
                <Text style={styles.metricaValor}>{formatarDistancia(km)}</Text>
              </View>
              <View style={styles.divisorVertical} />
              <View style={styles.metricaItem}>
                <Text style={styles.metricaRotulo}>Tempo estimado</Text>
                <Text style={styles.metricaTempo}>{tempo.resumo}</Text>
              </View>
            </View>

            <View style={styles.detalhesBox}>
              {posicao.precisao !== null && (
                <Text style={styles.precisaoTexto}>
                  Precisão informada pelo aparelho: ± {Math.round(posicao.precisao)} m
                </Text>
              )}
              <Text style={styles.coordsTexto}>
                Sua posição: {posicao.latitude.toFixed(5)}, {posicao.longitude.toFixed(5)}
              </Text>
            </View>

            {/* Aviso explícito de UX exigido: distância em linha reta e tempo estimado */}
            <View style={styles.avisoUx}>
              <Text style={styles.avisoUxTexto}>
                Atenção: a distância acima é calculada em linha reta (fórmula de Haversine) e o
                tempo é apenas uma estimativa média, sem considerar ruas, trânsito ou transporte
                público.
              </Text>
            </View>

            <Botao
              titulo={buscando ? 'Atualizando...' : 'Atualizar minha posição'}
              variante="branco"
              onPress={atualizarLocalizacao}
              disabled={buscando}
              style={[styles.botaoAtualizar, styles.botaoContorno]}
            />
          </View>
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
    fontSize: 28,
    color: colors.ink,
    flex: 1,
  },
  bloco: {
    paddingHorizontal: 24,
    paddingTop: 22,
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
    fontSize: 20,
    color: colors.ink,
    marginBottom: 12,
  },
  cardUnidade: {
    backgroundColor: colors.white,
    borderRadius: 20,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  mapaIlustrativo: {
    width: 112,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unidadeInfo: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 3,
  },
  unidadeNome: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
  },
  unidadeEndereco: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
  },
  unidadeComplemento: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  unidadeHorario: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.green,
    marginTop: 4,
  },
  cardStatus: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTexto: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: colors.ink,
    flex: 1,
  },
  cardErro: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.coral,
    gap: 10,
  },
  erroTitulo: {
    fontFamily: fonts.bold,
    fontSize: 16,
    color: colors.ink,
  },
  erroTexto: {
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.muted,
  },
  botaoAcao: {
    marginTop: 6,
  },
  botaoContorno: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardResultado: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  metricas: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  metricaItem: {
    flex: 1,
    gap: 4,
  },
  divisorVertical: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.line,
  },
  metricaRotulo: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricaValor: {
    fontFamily: fonts.title,
    fontSize: 30,
    color: colors.green,
  },
  metricaTempo: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.ink,
    marginTop: 2,
  },
  detalhesBox: {
    backgroundColor: colors.bg,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  precisaoTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.ink,
  },
  coordsTexto: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.muted,
  },
  avisoUx: {
    backgroundColor: colors.mint,
    borderRadius: 14,
    padding: 12,
  },
  avisoUxTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: colors.green,
  },
  botaoAtualizar: {
    marginTop: 2,
  },
});
