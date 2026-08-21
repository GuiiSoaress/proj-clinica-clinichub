// App.js (Usando React Navigation como exemplo de estrutura profissional)
import React, { useState } from 'react';
import {View, Text, StyleSheet} from 'react-native'
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Importa todos os componentes de tela
import Splash from './src/screens/Splash/Splash';
import MenuScreen from './src/screens/Menu/MenuScreen';
import Medico from './src/screens/Medico/Medico';
import Paciente from './src/screens/Paciente/Paciente';
//import Op3Screen from './src/screens/Consulta/Consulta';
import CadastroEdicaoMedicoScreen from './src/screens/Medico/CadastroEdicaoMedicoScreen';

const Stack = createStackNavigator();

function App() {

  const [pacientes, setPacientes] = useState([]);
  const [consultas, setConsultas] = useState([]);



  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Splash">
        {/* A tela de Splash é a primeira, sem cabeçalho */}
        <Stack.Screen name="Splash" component={Splash} options={{ headerShown: false }} />
        {/* A tela Menu é o ponto de partida após o carregamento */}
        <Stack.Screen name="Menu" component={MenuScreen} options={{ title: 'Menu Principal' }} />
        
        
        <Stack.Screen name="Medicos" component={Medico} options={{ title: 'Médico(a)s' }} />
        
        {/*<Stack.Screen name="Consultas" component={Op3Screen} options={{ title: 'Consultas' }} /> */}
        <Stack.Screen name="Medicos" component={Medico} options={{ title: 'Médico(a)s' }} />
        <Stack.Screen name="Pacientes" component={Paciente} options={{ title: 'Pacientes' }} />
        {/*<Stack.Screen name="Consultas" component={Op3Screen} options={{ title: 'Consultas' }} /> */}
        <Stack.Screen name="MedicoForm" component={CadastroEdicaoMedicoScreen} options={{ title: 'Gerenciar Médico' }} />
        {/* Adicionei uma tela temporária para as ações do card */}
        <Stack.Screen name="EmConstrucao" component={() => (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 24 }}>Em Construção!</Text>
            </View>
        )} options={{ title: 'Em Construção' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App; 