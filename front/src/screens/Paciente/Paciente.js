// src/screens/Op2Screen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Button } from 'react-native';

const BASE_URL = 'http://10.110.12.81:3000';


const Paciente = () => {
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);

  const buscarPacientes = async () => {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`${BASE_URL}/pacientes`);
      if (!resposta.ok) {
        throw new Error(`Erro HTTP ${resposta.status}`);
      }
      const dados = await resposta.json();
      setPacientes(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarPacientes();
  }, []);


if (carregando) {
    return (
      <View style={styles.centro}>
        <ActivityIndicator size="large" />
        <Text style={styles.texto}>Carregando pacientes...</Text>
      </View>
    );
  }

  if (erro && pacientes.length === 0) {
    return (
      <View style={styles.centro}>
        <Text style={styles.textoErro}>Não foi possível carregar os pacientes.</Text>
        <Text style={styles.texto}>{erro}</Text>
        <Button title="Tentar novamente" onPress={buscarPacientes} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Listagem de Pacientes</Text>

      <Text>
        Esta seção foca em Integração com APIs, incluindo Requisições HTTP/HTTPS
        e Consumo de Web Services [16].
      </Text>

      {/* O uso de Hooks, como o useState, é fundamental para adicionar
        interatividade e gerenciar dados [9, 17] */}

      <FlatList
        data={pacientes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={{ marginTop: 20 }}>
            <Text>Nome: {item.nome}</Text>
            <Text>CPF: {item.cpf}</Text>
            <Text>Data de nascimento: {item.dataNascimento}</Text>
            <Text>Telefone: {item.telefone}</Text>
            <Text>E-mail: {item.email}</Text>
          </View>
        )}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-around'
  },

  heading: {
    fontSize: 28,
    marginBottom: 40,
    textAlign: 'center'
  },

  centro: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },

  texto: {
    textAlign: 'center',
    marginTop: 10
  },

  textoErro: {
    textAlign: 'center',
    fontSize: 18,
    marginBottom: 10
  }
});

export default Paciente;