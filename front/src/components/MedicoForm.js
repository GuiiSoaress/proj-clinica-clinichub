// src/components/MedicoForm.js
// Formulário de cadastro e edição de médico com foto de perfil via câmera (Aula 6).

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Image,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import Icon from './Icons';
import { Botao, iniciais } from './Layout';
import { ESPECIALIDADES } from '../data/mock';
import { colors, fonts } from '../theme';

// Alert.alert não funciona no navegador (Expo Web) — este helper usa
// window.alert no web e o Alert nativo no iOS/Android.
const showAlert = (title, message) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Estado inicial vazio para um novo médico
const initialMedicoState = {
  nome: '',
  especialidade: ESPECIALIDADES[0],
  crm: '',
  email: '',
  telefone: '',
};

// Sub-componente fora do MedicoForm para evitar perda de foco ao digitar
const ValidatedInput = ({ label, value, error, onChangeText, style, ...props }) => (
  <View style={[styles.campo, style]}>
    <Text style={styles.rotulo}>{label}</Text>
    <TextInput
      style={[styles.input, error && styles.inputErro]}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor={colors.muted2}
      {...props}
    />
    {error && <Text style={styles.erroTexto}>{error}</Text>}
  </View>
);

const MedicoForm = ({ medico, onSave, onCancel, navigation }) => {
  // Inicializa os dados do formulário e a URI da foto com o que já existir no modo edição
  const [formData, setFormData] = useState(medico ? { ...initialMedicoState, ...medico } : initialMedicoState);
  const [fotoUri, setFotoUri] = useState(medico?.fotoUri || null);
  const [errors, setErrors] = useState({});
  const [salvando, setSalvando] = useState(false);

  const isEditing = Boolean(medico);
  const buttonTitle = isEditing ? 'Concluir Edição' : 'Concluir Cadastro';
  const requiredFields = ['nome', 'especialidade', 'crm'];

  // Quando a prop `medico` muda, sincroniza também `fotoUri` para não manter a
  // foto do médico anterior na tela.
  useEffect(() => {
    setFormData(medico ? { ...initialMedicoState, ...medico } : initialMedicoState);
    setFotoUri(medico?.fotoUri || null);
    setErrors({});
  }, [medico]);

  const escolherFoto = async () => {
    try {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (permissao.status !== 'granted') {
        showAlert(
          'Permissão necessária',
          'Precisamos da permissão da câmera para tirar a foto de perfil do médico. Verifique os ajustes do aparelho.'
        );
        return;
      }

      const resultado = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });

      // Fechar a câmera sem tirar foto é escolha normal do usuário
      if (resultado.canceled) {
        return;
      }

      if (resultado.assets && resultado.assets.length > 0) {
        setFotoUri(resultado.assets[0].uri);
      }
    } catch (e) {
      showAlert('Erro na câmera', 'Não foi possível abrir a câmera neste dispositivo.');
    }
  };

  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validate = () => {
    let valid = true;
    const newErrors = {};

    requiredFields.forEach((field) => {
      if (!formData[field] || String(formData[field]).trim() === '') {
        newErrors[field] = 'Campo obrigatório';
        valid = false;
      }
    });

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      showAlert('Campos obrigatórios', 'Preencha nome, especialidade e CRM do médico.');
      return;
    }

    setSalvando(true);
    try {
      const dadosCompletos = {
        ...formData,
        fotoUri,
      };
      await onSave(dadosCompletos);
      showAlert(
        isEditing ? 'Sucesso' : 'Cadastro concluído',
        isEditing ? 'Dados do médico atualizados.' : 'Novo médico cadastrado com sucesso!'
      );
      navigation.goBack();
    } catch (erro) {
      showAlert('Erro', erro.message || 'Não foi possível salvar os dados do médico.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Foto de perfil em destaque no topo do formulário */}
        <View style={styles.topoFoto}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Tirar foto de perfil do médico"
            onPress={escolherFoto}
            style={({ pressed }) => [styles.avatarTouch, { opacity: pressed ? 0.85 : 1 }]}
          >
            {fotoUri ? (
              <Image source={{ uri: fotoUri }} style={styles.fotoAvatar} />
            ) : (
              <View style={styles.fotoPlaceholder}>
                {formData.nome ? (
                  <Text style={styles.placeholderIniciais}>{iniciais(formData.nome)}</Text>
                ) : (
                  <Icon name="camera" size={34} color={colors.green} />
                )}
              </View>
            )}
            <View style={styles.seloCamera}>
              <Icon name="camera" size={16} color={colors.white} />
            </View>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={escolherFoto} style={styles.botaoTirarFoto}>
            <Text style={styles.botaoTirarFotoTexto}>
              {fotoUri ? 'Tirar outra foto' : 'Tirar foto de perfil'}
            </Text>
          </Pressable>

          {fotoUri && (
            <Pressable
              accessibilityRole="button"
              onPress={() => setFotoUri(null)}
              style={styles.botaoRemoverFoto}
            >
              <Text style={styles.botaoRemoverFotoTexto}>Remover foto</Text>
            </Pressable>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.secaoTitulo}>Dados profissionais</Text>

          <ValidatedInput
            label="Nome completo *"
            placeholder="Ex.: Dra Camila Rocha"
            value={formData.nome}
            error={errors.nome}
            onChangeText={(text) => handleChange('nome', text)}
          />

          <View style={styles.campo}>
            <Text style={styles.rotulo}>Especialidade *</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={formData.especialidade}
                onValueChange={(val) => handleChange('especialidade', val)}
                style={styles.picker}
              >
                {ESPECIALIDADES.map((esp) => (
                  <Picker.Item key={esp} label={esp} value={esp} />
                ))}
              </Picker>
            </View>
          </View>

          <ValidatedInput
            label="CRM *"
            placeholder="Ex.: 513115-SP"
            autoCapitalize="characters"
            value={formData.crm}
            error={errors.crm}
            onChangeText={(text) => handleChange('crm', text)}
          />

          <ValidatedInput
            label="E-mail (opcional)"
            placeholder="medico@clinica.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email || ''}
            error={errors.email}
            onChangeText={(text) => handleChange('email', text)}
          />

          <ValidatedInput
            label="Telefone (opcional)"
            placeholder="(11) 99999-9999"
            keyboardType="phone-pad"
            value={formData.telefone || ''}
            error={errors.telefone}
            onChangeText={(text) => handleChange('telefone', text)}
          />
        </View>

        <View style={styles.acoes}>
          <Botao
            titulo={salvando ? 'Salvando...' : buttonTitle}
            onPress={handleSubmit}
            disabled={salvando}
          />
          <Botao
            titulo="Cancelar"
            variante="branco"
            onPress={onCancel || (() => navigation.goBack())}
            disabled={salvando}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 20,
  },
  topoFoto: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 16,
  },
  avatarTouch: {
    position: 'relative',
  },
  fotoAvatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: colors.mint,
    backgroundColor: colors.mint,
  },
  fotoPlaceholder: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  placeholderIniciais: {
    fontFamily: fonts.title,
    fontSize: 36,
    color: colors.green,
  },
  seloCamera: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTirarFoto: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginTop: 8,
  },
  botaoTirarFotoTexto: {
    fontFamily: fonts.bold,
    fontSize: 15,
    color: colors.green,
  },
  botaoRemoverFoto: {
    minHeight: 32,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  botaoRemoverFotoTexto: {
    fontFamily: fonts.medium,
    fontSize: 13,
    color: colors.danger,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  secaoTitulo: {
    fontFamily: fonts.titleSemi,
    fontSize: 19,
    color: colors.ink,
    marginBottom: 2,
  },
  campo: {
    gap: 6,
  },
  rotulo: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.ink,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.bg,
    paddingHorizontal: 16,
    fontSize: 15,
    fontFamily: fonts.body,
    color: colors.ink,
  },
  inputErro: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerBg,
  },
  erroTexto: {
    fontFamily: fonts.medium,
    fontSize: 12,
    color: colors.danger,
  },
  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? undefined : 50,
    width: '100%',
    color: colors.ink,
  },
  acoes: {
    gap: 10,
  },
});

export default MedicoForm;
