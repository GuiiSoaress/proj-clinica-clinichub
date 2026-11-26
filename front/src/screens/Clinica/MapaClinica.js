// src/screens/Clinica/MapaClinica.js
// Tela de mapa da clínica (Aula 12): exibe a localização da unidade em um mapa
// interativo (react-native-maps), permite enquadrar o paciente e a clínica simultaneamente,
// preserva acessibilidade integral via leitor de tela e texto selecionável, e delega
// o cálculo de rota ao aplicativo nativo do aparelho (ADR 001).

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Callout } from 'react-native-maps';
import Icon, { MiniMap } from '../../components/Icons';
import { Botao } from '../../components/Layout';
import { UNIDADE } from '../../data/mock';
import {
  COORDENADAS_CLINICA,
  REGIAO_INICIAL,
  PermissaoNegada,
  obterPosicaoAtual,
  distanciaKm,
  formatarDistancia,
  estimarTempo,
} from '../../services/localizacao';
import { colors, fonts } from '../../theme';

export default function MapaClinica({ navigation }) {
  const insets = useSafeAreaInsets();
  const mapaRef = useRef(null);

  const [posicao, setPosicao] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState(null);
  // null = sem erro de permissão | true = pode perguntar de novo | false = bloqueado nos ajustes
  const [podePerguntarDeNovo, setPodePerguntarDeNovo] = useState(null);

  // Exemplo 6: Memorização de coordenadas para evitar recriação de objetos a cada render
  const coordenadasClinica = useMemo(
    () => ({
      latitude: COORDENADAS_CLINICA.latitude,
      longitude: COORDENADAS_CLINICA.longitude,
    }),
    []
  );

  const coordenadaUsuario = useMemo(
    () =>
      posicao
        ? {
            latitude: posicao.latitude,
            longitude: posicao.longitude,
          }
        : null,
    [posicao?.latitude, posicao?.longitude]
  );

  // Passo 2 - Item 11 & 12: Reaproveita obterPosicaoAtual() e enquadra com fitToCoordinates + edgePadding
  const localizarUsuario = useCallback(async () => {
    setErro(null);
    setPodePerguntarDeNovo(null);
    setBuscando(true);
    try {
      const atual = await obterPosicaoAtual();
      setPosicao(atual);

      // Enquadra a posição do usuário e a clínica ao mesmo tempo
      // edgePadding garante respiro nas quatro bordas para os marcadores não colarem na borda
      mapaRef.current?.fitToCoordinates(
        [
          { latitude: atual.latitude, longitude: atual.longitude },
          { latitude: COORDENADAS_CLINICA.latitude, longitude: COORDENADAS_CLINICA.longitude },
        ],
        {
          edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
          animated: true,
        }
      );
    } catch (e) {
      if (e instanceof PermissaoNegada || e?.name === 'PermissaoNegada') {
        setPodePerguntarDeNovo(e.canAskAgain);
        setErro(
          e.canAskAgain
            ? 'Precisamos da permissão de localização para mostrar sua posição no mapa e calcular a distância.'
            : 'A permissão de localização foi negada permanentemente neste aparelho. Para ver sua posição, ative o acesso nos ajustes do sistema.'
        );
      } else {
        setErro(
          'Não foi possível obter a localização do GPS. Verifique se o GPS está ativado e tente novamente.'
        );
      }
    } finally {
      setBuscando(false);
    }
  }, []);

  useEffect(() => {
    localizarUsuario();
  }, [localizarUsuario]);

  // Passo 2 - Item 14: Caminho para os ajustes do sistema
  const abrirAjustes = async () => {
    if (Platform.OS === 'web') return;
    try {
      await Linking.openSettings();
    } catch {
      setErro('Não foi possível abrir os ajustes automaticamente. Abra as Configurações do aparelho.');
    }
  };

  // Passo 2 - animateToRegion para mover a câmera suavemente até a clínica
  const voltarParaClinica = () => {
    mapaRef.current?.animateToRegion(REGIAO_INICIAL, 600);
  };

  // Passo 4 - Itens 21 e 22: Delegar rota para o app nativo via Linking.openURL e Platform.select
  const abrirNoAppDeMapas = async () => {
    const nome = encodeURIComponent(UNIDADE.nome);
    const { latitude, longitude } = COORDENADAS_CLINICA;

    // geo: no Android, maps: no iOS, e busca web como fallback
    const url = Platform.select({
      ios: `maps:0,0?q=${nome}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${nome})`,
      default: `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
    });

    try {
      const suportado = await Linking.canOpenURL(url);
      if (suportado) {
        await Linking.openURL(url);
      } else {
        await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
      }
    } catch {
      await Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`);
    }
  };

  const km = posicao ? distanciaKm(posicao, COORDENADAS_CLINICA) : null;
  const tempo = km !== null ? estimarTempo(km) : null;

  return (
    <View style={[styles.tela, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar para a tela anterior"
          onPress={() => navigation.goBack()}
          style={styles.voltar}
        >
          <Icon name="back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.titulo}>Como chegar</Text>
      </View>

      {/* PARTE DE CIMA: O Mapa (Passo 2, Itens 7, 8, 9; Passo 3, Item 15) */}
      <View style={styles.mapaWrapper}>
        {Platform.OS === 'web' ? (
          <View
            style={styles.webFallback}
            accessibilityLabel={`Mapa ilustrativo da localização da ${UNIDADE.nome}`}
          >
            <MiniMap />
            <Text style={styles.webFallbackTexto}>
              Mapa interativo nativo renderizado com react-native-maps no Android e iOS.
            </Text>
            <TouchableOpacity
              style={styles.botaoWebFallback}
              onPress={abrirNoAppDeMapas}
              accessibilityRole="button"
              accessibilityLabel="Abrir localização da clínica no Google Maps externo"
            >
              <Text style={styles.botaoWebFallbackTexto}>Abrir no Google Maps</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <MapView
            ref={mapaRef}
            style={styles.mapa}
            // initialRegion define o ponto de partida sem prender a câmera
            initialRegion={REGIAO_INICIAL}
            showsUserLocation={!!posicao}
            showsMyLocationButton={false}
            // Passo 3 - Item 15: accessibilityLabel obrigatório no MapView
            accessibilityLabel={`Mapa mostrando a localização da ${UNIDADE.nome}`}
          >
            {/* Marcador da Clínica */}
            <Marker
              coordinate={coordenadasClinica}
              title={UNIDADE.nome}
              description={UNIDADE.endereco}
              pinColor={colors.green}
            >
              {/* Callout customizado com informações da clínica */}
              <Callout tooltip={false}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitulo}>{UNIDADE.nome}</Text>
                  <Text style={styles.calloutTexto}>{UNIDADE.endereco}</Text>
                  {UNIDADE.telefone ? (
                    <Text style={styles.calloutSubtexto}>{UNIDADE.telefone}</Text>
                  ) : null}
                </View>
              </Callout>
            </Marker>

            {/* Marcador do Usuário (se localizado) */}
            {coordenadaUsuario && (
              <Marker
                coordinate={coordenadaUsuario}
                title="Você está aqui"
                description="Sua localização aproximada obtida via GPS"
                pinColor={colors.coral}
              />
            )}
          </MapView>
        )}

        {/* Botão flutuante para recentralizar na clínica rapidamente sobre o mapa */}
        <TouchableOpacity
          style={styles.botaoFlutuanteMapa}
          onPress={voltarParaClinica}
          accessibilityRole="button"
          accessibilityLabel="Centralizar mapa na clínica"
        >
          <Icon name="mapPin" size={18} color={colors.green} />
          <Text style={styles.botaoFlutuanteTexto}>Ver clínica</Text>
        </TouchableOpacity>
      </View>

      {/* PARTE DE BAIXO: O Painel de Texto (Passo 2, Itens 10; Passo 3, Itens 16 e 17) */}
      {/* Regra de ouro da Aula 12: a informação vive no TEXTO, o mapa é só a forma agradável de exibi-la */}
      <ScrollView
        style={styles.painel}
        contentContainerStyle={[
          styles.painelConteudo,
          { paddingBottom: Math.max(insets.bottom, 24) + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cartão de informações da unidade */}
        <View style={styles.cardUnidade}>
          <View style={styles.cardHeader}>
            <View style={styles.iconeUnidade}>
              <Icon name="mapPin" size={22} color={colors.green} filled />
            </View>
            <View style={styles.cardTituloContainer}>
              <Text style={styles.unidadeRotulo}>Unidade de atendimento</Text>
              <Text style={styles.unidadeNome}>{UNIDADE.nome}</Text>
            </View>
          </View>

          <View style={styles.divisor} />

          {/* Passo 3 - Item 17: Endereço e telefone com prop selectable */}
          <View style={styles.infoLinha}>
            <Text style={styles.infoTitulo}>Endereço:</Text>
            <Text style={styles.infoTexto} selectable>
              {UNIDADE.endereco}
            </Text>
            {UNIDADE.complemento ? (
              <Text style={styles.infoSubtexto} selectable>
                {UNIDADE.complemento}
              </Text>
            ) : null}
          </View>

          {UNIDADE.telefone ? (
            <View style={styles.infoLinha}>
              <Text style={styles.infoTitulo}>Telefone:</Text>
              <Text style={styles.infoTexto} selectable>
                {UNIDADE.telefone}
              </Text>
            </View>
          ) : null}

          {UNIDADE.horario ? (
            <View style={styles.infoLinha}>
              <Text style={styles.infoTitulo}>Horário:</Text>
              <Text style={styles.horarioTexto}>{UNIDADE.horario}</Text>
            </View>
          ) : null}
        </View>

        {/* Barra de Ações: Onde estou?, Ver a clínica, Como chegar (Passo 3 e Passo 4) */}
        <View style={styles.botoesContainer}>
          <TouchableOpacity
            style={[styles.botaoAcao, buscando && styles.botaoDesativado]}
            onPress={localizarUsuario}
            disabled={buscando}
            accessibilityRole="button"
            accessibilityLabel="Mostrar minha localização no mapa e enquadrar a clínica"
          >
            {buscando ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Icon name="refresh" size={18} color={colors.white} />
            )}
            <Text style={styles.botaoAcaoTexto}>
              {buscando ? 'Localizando...' : 'Onde estou?'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoAcao, styles.botaoSecundario]}
            onPress={abrirNoAppDeMapas}
            accessibilityRole="button"
            accessibilityLabel="Abrir rota no aplicativo de mapas do aparelho"
          >
            <Icon name="mapPin" size={18} color={colors.ink} />
            <Text style={[styles.botaoAcaoTexto, { color: colors.ink }]}>Como chegar</Text>
          </TouchableOpacity>
        </View>

        {/* Card de Erro de Permissão / GPS */}
        {erro && (
          <View style={styles.cardErro}>
            <View style={styles.erroHeader}>
              <Icon name="alertTriangle" size={20} color={colors.danger} />
              <Text style={styles.erroTitulo}>
                {podePerguntarDeNovo === false
                  ? 'Permissão bloqueada nos ajustes'
                  : podePerguntarDeNovo === true
                    ? 'Permissão de localização necessária'
                    : 'Localização indisponível'}
              </Text>
            </View>
            <Text style={styles.erroTexto}>{erro}</Text>

            {podePerguntarDeNovo === true && (
              <Botao
                titulo="Permitir e tentar novamente"
                onPress={localizarUsuario}
                disabled={buscando}
                style={styles.botaoErro}
              />
            )}

            {podePerguntarDeNovo === false && Platform.OS !== 'web' && (
              <Botao
                titulo="Abrir ajustes do aparelho"
                onPress={abrirAjustes}
                style={styles.botaoErro}
              />
            )}

            {podePerguntarDeNovo === null && (
              <Botao
                titulo="Tentar novamente"
                variante="branco"
                onPress={localizarUsuario}
                disabled={buscando}
                style={[styles.botaoErro, styles.botaoContorno]}
              />
            )}
          </View>
        )}

        {/* Card de Métricas de Distância e Tempo (Passo 2, Item 13) */}
        {posicao && km !== null && tempo && (
          <View style={styles.cardMetricas}>
            <View style={styles.metricasLinha}>
              <View style={styles.metricaItem}>
                <Text style={styles.metricaRotulo}>Distância em linha reta</Text>
                <Text style={styles.metricaValor}>{formatarDistancia(km)}</Text>
              </View>
              <View style={styles.divisorVertical} />
              <View style={styles.metricaItem}>
                <Text style={styles.metricaRotulo}>Tempo estimado</Text>
                <Text style={styles.metricaTempo}>{tempo.resumo}</Text>
              </View>
            </View>

            <View style={styles.detalhesGps}>
              {posicao.precisao !== null && (
                <Text style={styles.detalhesGpsTexto}>
                  Precisão do sinal: ± {Math.round(posicao.precisao)} m
                </Text>
              )}
              <Text style={styles.detalhesGpsSubtexto}>
                Coordenadas: {posicao.latitude.toFixed(5)}, {posicao.longitude.toFixed(5)}
              </Text>
            </View>

            {/* Aviso explícito de UX sobre cálculo de linha reta */}
            <View style={styles.avisoUx}>
              <Text style={styles.avisoUxTexto}>
                A distância é calculada em linha reta (fórmula de Haversine). Para traçar a rota
                real pelas ruas com trânsito em tempo real, toque no botão{' '}
                <Text style={{ fontFamily: fonts.bold }}>Como chegar</Text> acima.
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
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
  mapaWrapper: {
    height: 290,
    width: '100%',
    position: 'relative',
    backgroundColor: colors.mint,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapa: {
    ...StyleSheet.absoluteFillObject,
  },
  webFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  webFallbackTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.green,
    textAlign: 'center',
    marginTop: 4,
  },
  botaoWebFallback: {
    backgroundColor: colors.green,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 6,
  },
  botaoWebFallbackTexto: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.white,
  },
  botaoFlutuanteMapa: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  botaoFlutuanteTexto: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },
  callout: {
    width: 210,
    padding: 6,
  },
  calloutTitulo: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.green,
  },
  calloutTexto: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.ink,
    marginTop: 2,
  },
  calloutSubtexto: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  painel: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  painelConteudo: {
    padding: 20,
    gap: 16,
  },
  cardUnidade: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconeUnidade: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTituloContainer: {
    flex: 1,
  },
  unidadeRotulo: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unidadeNome: {
    fontFamily: fonts.bold,
    fontSize: 18,
    color: colors.green,
    marginTop: 2,
  },
  divisor: {
    height: 1,
    backgroundColor: colors.line,
  },
  infoLinha: {
    gap: 2,
  },
  infoTitulo: {
    fontFamily: fonts.bold,
    fontSize: 12,
    color: colors.muted,
  },
  infoTexto: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.ink,
  },
  infoSubtexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.muted,
  },
  horarioTexto: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },
  botoesContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  botaoAcao: {
    flex: 1,
    backgroundColor: colors.green,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  botaoSecundario: {
    backgroundColor: colors.mint,
  },
  botaoDesativado: {
    opacity: 0.6,
  },
  botaoAcaoTexto: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.white,
  },
  cardErro: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.coral,
    gap: 10,
  },
  erroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  erroTitulo: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.danger,
    flex: 1,
  },
  erroTexto: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.muted,
  },
  botaoErro: {
    marginTop: 4,
  },
  botaoContorno: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  cardMetricas: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  metricasLinha: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metricaItem: {
    flex: 1,
    gap: 3,
  },
  divisorVertical: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: colors.line,
  },
  metricaRotulo: {
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricaValor: {
    fontFamily: fonts.title,
    fontSize: 26,
    color: colors.green,
  },
  metricaTempo: {
    fontFamily: fonts.bold,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    marginTop: 2,
  },
  detalhesGps: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    padding: 10,
    gap: 2,
  },
  detalhesGpsTexto: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.ink,
  },
  detalhesGpsSubtexto: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.muted,
  },
  avisoUx: {
    backgroundColor: colors.mint,
    borderRadius: 12,
    padding: 12,
  },
  avisoUxTexto: {
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 17,
    color: colors.green,
  },
});
