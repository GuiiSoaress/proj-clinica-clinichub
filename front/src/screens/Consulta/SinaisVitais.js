// src/screens/Consulta/SinaisVitais.js
// Importa a frequência cardíaca do paciente de um aparelho Bluetooth antes
// da consulta e grava a média no prontuário (Aula 7).
//
// Regra de ouro: esta tela só conhece o service de src/services/bluetooth.js.
// Ela não sabe qual biblioteca, protocolo ou formato de dado está por trás,
// e funciona igual no modo simulado e no modo real.
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from '../../components/Icons';
import { Screen, Botao } from '../../components/Layout';
import { useApp, formatarData } from '../../context/AppContext';
import { criarServicoBle, pedirPermissoes, MODO_SIMULADO } from '../../services/bluetooth';
import { post } from '../../services/api';
import { colors, fonts } from '../../theme';

const DURACAO_BUSCA_MS = 8000;        // busca precisa ter fim: gasta bateria
const LIMITE_SEM_LEITURA_MS = 5000;   // sem leitura por mais que isso = sinal perdido
const MINIMO_LEITURAS = 3;            // uma leitura só não vale muito; a média de várias, sim
const MAXIMO_LEITURAS = 60;           // guarda só as mais recentes

const media = (valores) =>
  valores.length ? Math.round(valores.reduce((s, v) => s + v, 0) / valores.length) : null;

export default function SinaisVitais({ navigation, route }) {
  const { consultas, registrarSinaisVitais, logout } = useApp();
  const consulta = consultas.find((c) => c.id === route.params?.consultaId);

  const servicoRef = useRef(null);
  const timerBuscaRef = useRef(null);
  const ultimaLeituraRef = useRef(0);

  // fase: 'busca' | 'conectando' | 'conectado'
  const [fase, setFase] = useState('busca');
  const [procurando, setProcurando] = useState(false);
  const [buscaConcluida, setBuscaConcluida] = useState(false);
  const [aparelhos, setAparelhos] = useState([]);
  const [aparelho, setAparelho] = useState(null);
  const [leituras, setLeituras] = useState([]);
  const [sinalPerdido, setSinalPerdido] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const [manual, setManual] = useState(false);
  const [valorManual, setValorManual] = useState('');

  // Cria o service ao abrir a tela e libera o aparelho ao sair dela.
  // Sair da tela conectado sem desconectar gasta bateria dos dois lados e
  // impede outro app de usar o aparelho.
  useEffect(() => {
    try {
      servicoRef.current = criarServicoBle();
    } catch (e) {
      servicoRef.current = null;
      setErro('O Bluetooth não está disponível nesta versão do app. Digite os valores manualmente.');
    }
    return () => {
      clearTimeout(timerBuscaRef.current);
      servicoRef.current?.pararBusca();
      servicoRef.current?.desconectar();
    };
  }, []);

  // Vigia o sinal: se as leituras pararem de chegar, a tela não pode
  // continuar mostrando o último valor como se fosse atual.
  useEffect(() => {
    if (fase !== 'conectado') return undefined;
    const vigia = setInterval(() => {
      const semLeitura = Date.now() - ultimaLeituraRef.current > LIMITE_SEM_LEITURA_MS;
      setSinalPerdido(semLeitura);
    }, 1000);
    return () => clearInterval(vigia);
  }, [fase]);

  if (!consulta) {
    return (
      <Screen navigation={navigation}>
        <View style={{ padding: 24, paddingTop: 100 }}>
          <Text style={styles.titulo}>Consulta não encontrada</Text>
          <Botao titulo="Voltar" onPress={() => navigation.goBack()} style={{ marginTop: 20 }} />
        </View>
      </Screen>
    );
  }

  // ------------------------------------------------------------ ações
  const procurar = async () => {
    if (!servicoRef.current) return;
    setErro(null);
    setAparelhos([]);
    setBuscaConcluida(false);

    const autorizado = await pedirPermissoes();
    if (!autorizado) {
      setErro(
        'Sem permissão de Bluetooth, não dá para procurar aparelhos. Libere a permissão nas configurações do celular ou digite os valores manualmente.'
      );
      return;
    }

    setProcurando(true);
    servicoRef.current.procurar((encontrado) => {
      // O mesmo aparelho se anuncia várias vezes: evita duplicatas.
      setAparelhos((atuais) => (atuais.some((a) => a.id === encontrado.id) ? atuais : [...atuais, encontrado]));
    });

    clearTimeout(timerBuscaRef.current);
    timerBuscaRef.current = setTimeout(() => {
      servicoRef.current?.pararBusca();
      setProcurando(false);
      setBuscaConcluida(true);
    }, DURACAO_BUSCA_MS);
  };

  const conectar = async (escolhido) => {
    clearTimeout(timerBuscaRef.current);
    servicoRef.current.pararBusca();
    setProcurando(false);
    setErro(null);
    setFase('conectando');
    try {
      await servicoRef.current.conectar(escolhido.id);
      setAparelho(escolhido);
      setLeituras([]);
      setSinalPerdido(false);
      ultimaLeituraRef.current = Date.now();
      setFase('conectado');
      servicoRef.current.monitorarFrequencia((bpm) => {
        ultimaLeituraRef.current = Date.now();
        setSinalPerdido(false);
        setLeituras((anteriores) => [...anteriores.slice(-(MAXIMO_LEITURAS - 1)), bpm]);
      });
    } catch (e) {
      setFase('busca');
      setBuscaConcluida(true);
      setErro(e?.message || 'Não foi possível conectar ao aparelho. Tente novamente ou digite os valores manualmente.');
    }
  };

  const desconectar = async () => {
    await servicoRef.current?.desconectar();
    setAparelho(null);
    setLeituras([]);
    setSinalPerdido(false);
    setFase('busca');
  };

  const abrirManual = async () => {
    clearTimeout(timerBuscaRef.current);
    servicoRef.current?.pararBusca();
    setProcurando(false);
    if (fase === 'conectado') await desconectar();
    setErro(null);
    setManual(true);
  };

  // Grava no prontuário. Enquanto o valor está só na memória da tela, ele
  // não é registro médico.
  const enviar = async ({ frequenciaMedia, quantidadeLeituras, origem }) => {
    setErro(null);
    setEnviando(true);
    try {
      const registro = await post('/sinais-vitais', {
        consultaId: consulta.id,
        frequenciaMedia,
        quantidadeLeituras,
        origem,
      });
      registrarSinaisVitais(consulta.id, {
        frequenciaMedia,
        quantidadeLeituras,
        origem,
        registradoEm: registro?.registradoEm ? new Date(registro.registradoEm) : new Date(),
      });
      await servicoRef.current?.desconectar();
      navigation.goBack();
    } catch (e) {
      if (e?.status === 401) {
        setErro('Sua sessão expirou. Entre novamente para gravar no prontuário.');
        await logout();
        return;
      }
      setErro(
        e?.status
          ? `O servidor recusou o registro: ${e.message}`
          : 'Não foi possível falar com o servidor. Verifique a conexão e tente de novo; as leituras continuam nesta tela.'
      );
    } finally {
      setEnviando(false);
    }
  };

  const importarBluetooth = () =>
    enviar({ frequenciaMedia: media(leituras), quantidadeLeituras: leituras.length, origem: 'bluetooth' });

  const importarManual = () => {
    const bpm = Number(valorManual.replace(',', '.'));
    if (!Number.isFinite(bpm) || bpm < 20 || bpm > 250) {
      setErro('Digite uma frequência cardíaca entre 20 e 250 bpm.');
      return;
    }
    enviar({ frequenciaMedia: Math.round(bpm), quantidadeLeituras: 1, origem: 'manual' });
  };

  // ------------------------------------------------------------ render
  const ultima = leituras[leituras.length - 1];
  const mediaAtual = media(leituras);

  return (
    <Screen navigation={navigation} contentStyle={{ paddingBottom: 48 }}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={() => navigation.goBack()} style={styles.voltar}>
          <Icon name="back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.titulo}>Sinais vitais</Text>
      </View>

      <Text style={styles.contexto}>
        {consulta.medico} · {formatarData(consulta.data)} às {consulta.hora}
      </Text>
      {MODO_SIMULADO && <Text style={styles.selo}>Modo simulado</Text>}

      {manual ? (
        // ------------------------------------------------ entrada manual
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>Digitar manualmente</Text>
          <Text style={styles.texto}>Informe a frequência cardíaca medida no paciente.</Text>
          <View style={styles.campoLinha}>
            <TextInput
              style={styles.campo}
              value={valorManual}
              onChangeText={setValorManual}
              keyboardType="number-pad"
              placeholder="Ex.: 78"
              placeholderTextColor={colors.muted2}
              maxLength={3}
              accessibilityLabel="Frequência cardíaca em batimentos por minuto"
            />
            <Text style={styles.unidade}>bpm</Text>
          </View>
          <Botao
            titulo={enviando ? 'Gravando...' : 'Importar para o prontuário'}
            onPress={importarManual}
            disabled={enviando || !valorManual}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : fase === 'busca' ? (
        // ------------------------------------------------ procurando
        <View style={styles.card}>
          <Text style={styles.cardTitulo}>1. Encontre o aparelho</Text>
          <Text style={styles.texto}>Ligue o monitor cardíaco ou oxímetro e deixe-o perto do celular.</Text>
          <Botao
            titulo={procurando ? 'Procurando...' : buscaConcluida ? 'Procurar novamente' : 'Procurar aparelhos'}
            onPress={procurar}
            disabled={procurando || !servicoRef.current}
            style={{ marginTop: 16 }}
          />
          {procurando && <ActivityIndicator color={colors.green} style={{ marginTop: 16 }} />}

          {aparelhos.map((a) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() => conectar(a)}
              style={({ pressed }) => [styles.aparelho, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.aparelhoIcone}>
                <Icon name="heart" size={22} color={colors.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aparelhoNome}>{a.nome}</Text>
                <Text style={styles.aparelhoAcao}>Toque para conectar</Text>
              </View>
            </Pressable>
          ))}

          {buscaConcluida && !procurando && aparelhos.length === 0 && (
            <View style={styles.aviso}>
              <Text style={styles.avisoTitulo}>Nenhum aparelho encontrado</Text>
              <Text style={styles.avisoTexto}>
                Confira se o aparelho está ligado, com bateria e a menos de 2 metros do celular, se o Bluetooth do
                celular está ativado, e toque em "Procurar novamente". Se não funcionar, digite os valores manualmente.
              </Text>
            </View>
          )}
        </View>
      ) : fase === 'conectando' ? (
        // ------------------------------------------------ conectando
        <View style={[styles.card, { alignItems: 'center', paddingVertical: 36 }]}>
          <ActivityIndicator size="large" color={colors.green} />
          <Text style={[styles.texto, { marginTop: 16, textAlign: 'center' }]}>
            Conectando ao aparelho... isso leva alguns segundos.
          </Text>
        </View>
      ) : (
        // ------------------------------------------------ conectado
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.texto}>Conectado a {aparelho?.nome}</Text>
          <View style={styles.bpmLinha}>
            <Icon name="heart" size={32} color={sinalPerdido ? colors.muted2 : colors.coral} filled />
            <Text style={[styles.bpm, sinalPerdido && { color: colors.muted2 }]}>
              {sinalPerdido || ultima == null ? '--' : ultima}
            </Text>
            <Text style={styles.unidade}>bpm</Text>
          </View>

          {sinalPerdido ? (
            <View style={[styles.aviso, { alignSelf: 'stretch' }]}>
              <Text style={styles.avisoTitulo}>Sinal perdido</Text>
              <Text style={styles.avisoTexto}>
                O aparelho parou de enviar leituras. Aproxime-o do celular e verifique se ainda está ligado. Se não
                voltar, toque em "Desconectar" e procure de novo.
              </Text>
            </View>
          ) : (
            <Text style={styles.texto}>
              {leituras.length === 0
                ? 'Aguardando a primeira leitura...'
                : `${leituras.length} ${leituras.length === 1 ? 'leitura recebida' : 'leituras recebidas'} · média ${mediaAtual} bpm`}
            </Text>
          )}

          {leituras.length > 0 && leituras.length < MINIMO_LEITURAS && (
            <Text style={styles.dica}>Aguarde pelo menos {MINIMO_LEITURAS} leituras para importar.</Text>
          )}

          <Botao
            titulo={enviando ? 'Gravando...' : 'Importar para o prontuário'}
            onPress={importarBluetooth}
            disabled={enviando || leituras.length < MINIMO_LEITURAS}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
          <Botao titulo="Desconectar" variante="branco" onPress={desconectar} disabled={enviando} style={{ marginTop: 10, alignSelf: 'stretch' }} />
        </View>
      )}

      {erro && (
        <View style={styles.erroBox}>
          <Text style={styles.erroTexto}>{erro}</Text>
        </View>
      )}

      {/* Requisito: se o Bluetooth falhar, a consulta não pode parar. */}
      <Pressable
        accessibilityRole="link"
        onPress={manual ? () => { setErro(null); setManual(false); } : abrirManual}
        style={styles.link}
      >
        <Text style={styles.linkTexto}>{manual ? 'Usar o aparelho Bluetooth' : 'Digitar os valores manualmente'}</Text>
      </Pressable>

      <Text style={styles.rodape}>
        Sinal vital é dado de saúde do paciente: ele vai para o prontuário, não para logs nem serviços de terceiros.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 },
  voltar: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontFamily: fonts.title, fontSize: 26, color: colors.ink, flex: 1 },
  contexto: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, paddingHorizontal: 24, marginTop: 12 },
  selo: {
    alignSelf: 'flex-start', marginLeft: 24, marginTop: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 10, backgroundColor: colors.mint, color: colors.green, fontFamily: fonts.bold, fontSize: 12, overflow: 'hidden',
  },
  card: { marginTop: 20, marginHorizontal: 24, backgroundColor: colors.white, borderRadius: 24, padding: 20 },
  cardTitulo: { fontFamily: fonts.titleSemi, fontSize: 19, color: colors.ink, marginBottom: 6 },
  texto: { fontFamily: fonts.body, fontSize: 14, color: colors.muted, lineHeight: 20 },
  dica: { fontFamily: fonts.medium, fontSize: 13, color: colors.muted2, marginTop: 8, textAlign: 'center' },
  aparelho: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 12, minHeight: 64,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
  },
  aparelhoIcone: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' },
  aparelhoNome: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink },
  aparelhoAcao: { fontFamily: fonts.body, fontSize: 13, color: colors.muted2, marginTop: 2 },
  aviso: { marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.bg },
  avisoTitulo: { fontFamily: fonts.bold, fontSize: 15, color: colors.ink, marginBottom: 4 },
  avisoTexto: { fontFamily: fonts.body, fontSize: 13, color: colors.muted, lineHeight: 19 },
  bpmLinha: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: 12 },
  bpm: { fontFamily: fonts.title, fontSize: 64, color: colors.ink },
  unidade: { fontFamily: fonts.medium, fontSize: 16, color: colors.muted },
  campoLinha: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  campo: {
    flex: 1, height: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16,
    fontFamily: fonts.bold, fontSize: 20, color: colors.ink, backgroundColor: colors.white,
  },
  erroBox: { marginTop: 16, marginHorizontal: 24, padding: 14, borderRadius: 16, backgroundColor: colors.dangerBg },
  erroTexto: { fontFamily: fonts.medium, fontSize: 14, color: colors.danger, lineHeight: 20 },
  link: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 16, marginHorizontal: 24 },
  linkTexto: { fontFamily: fonts.bold, fontSize: 15, color: colors.green, textDecorationLine: 'underline' },
  rodape: { fontFamily: fonts.body, fontSize: 12, color: colors.muted2, textAlign: 'center', marginTop: 16, marginHorizontal: 32 },
});
