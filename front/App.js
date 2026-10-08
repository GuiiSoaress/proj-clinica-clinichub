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

import { AppProvider } from './src/context/AppContext';
import { colors } from './src/theme';
import Login from './src/screens/Login/Login';
import Inicio from './src/screens/Inicio/Inicio';
import Agendar from './src/screens/Agendar/Agendar';
import Confirmar from './src/screens/Confirmar/Confirmar';
import Confirmada from './src/screens/Confirmada/Confirmada';
import Consultas from './src/screens/Consultas/Consultas';
import Perfil from './src/screens/Perfil/Perfil';

const Stack = createStackNavigator();

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
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{ headerShown: false, cardStyle: { backgroundColor: colors.bg } }}
          >
            <Stack.Screen name="Login" component={Login} />
            <Stack.Screen name="Inicio" component={Inicio} />
            <Stack.Screen name="Agendar" component={Agendar} />
            <Stack.Screen name="Confirmar" component={Confirmar} />
            <Stack.Screen name="Confirmada" component={Confirmada} />
            <Stack.Screen name="Consultas" component={Consultas} />
            <Stack.Screen name="Perfil" component={Perfil} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </SafeAreaProvider>
  );
}