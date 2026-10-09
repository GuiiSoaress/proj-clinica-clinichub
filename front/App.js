// App.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { Fraunces_600SemiBold, Fraunces_700Bold } from '@expo-google-fonts/fraunces';

import { AppProvider, useApp } from './src/context/AppContext';
import { colors } from './src/theme';
import Login from './src/screens/Login/Login';
import Inicio from './src/screens/Inicio/Inicio';
import Agendar from './src/screens/Agendar/Agendar';
import Confirmar from './src/screens/Confirmar/Confirmar';
import Confirmada from './src/screens/Confirmada/Confirmada';
import Consultas from './src/screens/Consultas/Consultas';
import Perfil from './src/screens/Perfil/Perfil';

const Stack = createStackNavigator();

function RootNavigator() {
  // Consumimos o estado global para saber se tem alguém logado
  const { token, verificandoSessao } = useApp();

  // Enquanto estiver lendo o Secure Store (operação assíncrona), mostra loading
  if (verificandoSessao) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  // O NavigationContainer gerencia as rotas. 
  // Dependendo do `token`, montamos um "Stack" diferente (Telas Privadas vs Públicas).
  // Essa é a proteção de rotas: se não tem token, o aplicativo não deixa renderizar a tela "Inicio".
  return (
    <NavigationContainer>
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
          </>
        ) : (
          // === ROTAS PÚBLICAS (Usuário Deslogado) ===
          <Stack.Screen name="Login" component={Login} />
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