import React from 'react';
import MedicoForm from '../../components/MedicoForm'; // Ajuste o caminho
import { View } from 'react-native';

const BASE_URL = 'http://localhost:3000'; // troque pelo IP da máquina se testar no celular físico via Expo Go

const CadastroEdicaoMedicoScreen = ({ route, navigation }) => {
  // A prop 'medico' virá via route.params
  const { medico } = route.params || {};

  const handleSave = async (novoDadosMedico) => {
    const isEdicao = !!medico;
    const url = isEdicao
      ? `${BASE_URL}/medicos/${medico.id}`
      : `${BASE_URL}/medicos`;
    const method = isEdicao ? 'PUT' : 'POST';

    const resposta = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(novoDadosMedico),
    });

    if (!resposta.ok) {
      throw new Error('Não foi possível salvar o médico. Tente novamente.');
    }

    return resposta.json();
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={{ flex: 1 }}>
      <MedicoForm
        medico={medico} // Passa o objeto médico (ou undefined/null)
        onSave={handleSave}
        onCancel={handleCancel}
        navigation={navigation}
      />
    </View>
  );
};

export default CadastroEdicaoMedicoScreen;