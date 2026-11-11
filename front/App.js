// App.js
import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';

import { AppProvider, useApp } from './src/context/AppContext';
import { colors } from './src/theme';
import Login from './src/screens/Login/Login';
import LoginBiometrico from './src/screens/Login/LoginBiometrico';
import Inicio from './src/screens/Inicio/Inicio';
import Agendar from './src/screens/Agendar/Agendar';
import Confirmar from './src/screens/Confirmar/Confirmar';
import Confirmada from './src/screens/Confirmada/Confirmada';
import Consultas from './src/screens/Consultas/Consultas';
import Perfil from './src/screens/Perfil/Perfil';
import SinaisVitais from './src/screens/Consulta/SinaisVitais';
import ComoChegar from './src/screens/Clinica/ComoChegar';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';
import NotificacoesScreen from './src/screens/Notificacoes/NotificacoesScreen';

// Passo 2 - Item 4: chamar configurarHandler() uma vez, no topo do App.js
import {
  configurarHandler,
  prepararCanal,
  Notifications,
} from './src/services/lembretes';

configurarHandler();

// Passo 4 - Item 21: Usar uma ref no NavigationContainer para conseguir navegar de fora das telas
export const navigationRef = createNavigationContainerRef();

const Stack = createStackNavigator();

function RootNavigator() {
  // Consumimos o estado global para saber se tem alguém logado
  const { token, verificandoSessao } = useApp();

  // Passo 4 - Item 20: Guarda para não navegar de novo a cada recarga em desenvolvimento
  const idUltimaNotifProcessada = useRef(null);
  const pendenciaNavegacao = useRef(null);

  const processarRespostaNotificacao = (resposta) => {
    if (!resposta || !resposta.notification) return;

    const identifier = resposta.notification.request?.identifier;
    if (identifier && idUltimaNotifProcessada.current === identifier) {
      return; // Já processada nesta sessão/recarga
    }
    if (identifier) {
      idUltimaNotifProcessada.current = identifier;
    }

    const data = resposta.notification.request?.content?.data;
    if (data?.tela) {
      // Contrato: aceita 'Confirmada' ou o alias 'DetalheConsulta'
      const telaDestino = data.tela === 'DetalheConsulta' ? 'Confirmada' : data.tela;
      const params = data.consultaId ? { id: String(data.consultaId) } : {};

      if (token && navigationRef.isReady()) {
        navigationRef.navigate(telaDestino, params);
      } else {
        // Se ainda não estiver na área logada ou o navigator não estiver pronto,
        // guarda a pendência para navegar logo após o login/desbloqueio biométrico
        pendenciaNavegacao.current = { tela: telaDestino, params };
      }
    }
  };

  useEffect(() => {
    // Passo 2 - Item 5: prepararCanal() para o Android, com importance HIGH
    prepararCanal();

    // Passo 4 - Item 18: Caminho A — app aberto ou em segundo plano
    const subResposta = Notifications.addNotificationResponseReceivedListener((resposta) => {
      processarRespostaNotificacao(resposta);
    });

    // Passo 4 - Item 19: Caminho B — app fechado (o toque abre o app)
    Notifications.getLastNotificationResponseAsync().then((respostaInicial) => {
      if (respostaInicial) {
        processarRespostaNotificacao(respostaInicial);
      }
    });

    // Passo 4 - Item 22: Removam os listeners no retorno do useEffect
    return () => {
      subResposta?.remove();
    };
  }, []);

  // Quando o usuário completa o login ou desbloqueio biométrico, efetiva a navegação pendente
  useEffect(() => {
    if (token && pendenciaNavegacao.current && navigationRef.isReady()) {
      const { tela, params } = pendenciaNavegacao.current;
      pendenciaNavegacao.current = null;
      navigationRef.navigate(tela, params);
    }
  }, [token]);

  // Enquanto estiver lendo o Secure Store (operação assíncrona), mostra loading
  if (verificandoSessao) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  // O NavigationContainer gerencia as rotas com navigationRef (Passo 4 - Item 21).
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator
        screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}
      >
        {token ? (
          // === ROTAS PRIVADAS (Usuário Logado) ===
          <>
            <Stack.Screen name="Inicio" component={Inicio} />
            <Stack.Screen name="Agendar" component={Agendar} />
            <Stack.Screen name="Confirmar" component={Confirmar} />
            <Stack.Screen name="Confirmada" component={Confirmada} />
            <Stack.Screen name="Consultas" component={Consultas} />
            <Stack.Screen name="Perfil" component={Perfil} />
            <Stack.Screen name="SinaisVitais" component={SinaisVitais} />
            <Stack.Screen name="ComoChegar" component={ComoChegar} />
            <Stack.Screen name="CadastroEdicaoMedico" component={CadastroEdicaoMedicoScreen} />
            <Stack.Screen name="Notificacoes" component={NotificacoesScreen} />
          </>
        ) : (
          // === ROTAS PÚBLICAS (Usuário Deslogado ou Sessão Trancada) ===
          <>
            <Stack.Screen name="LoginBiometrico" component={LoginBiometrico} />
            <Stack.Screen name="Login" component={Login} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
