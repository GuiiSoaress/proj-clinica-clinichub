import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  ScrollView, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Platform} from 'react-native';

import { Picker } from '@react-native-picker/picker';

// Alert.alert não funciona no navegador (Expo Web) — este helper usa
// window.alert no web e o Alert nativo no iOS/Android.
const showAlert = (title, message) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};


// Lista de Especialidades para o Picker
const especialidades = ['Cardiologia', 'Pediatria', 'Dermatologia', 'Ginecologia', 'Neurologia', 'Oftalmologia', 'Clínica Geral'];

// Estado inicial vazio para um novo médico
const initialMedicoState = {
  nome: '',
  especialidade: especialidades[0], // Padrão
  crm: '',
  email: '',
  telefone: '',
  logradouro: '',
  numero: '',
  complemento: '',
  cidade: '',
  uf: '',
  cep: '',
};

// =========================================================================
// SUB-COMPONENTE: INPUT COM VALIDAÇÃO
// Fica FORA do MedicoForm para não ser recriado a cada render
// (isso é o que causava a perda de foco a cada tecla digitada)
// =========================================================================
const ValidatedInput = ({ label, name, value, error, onChangeText, style, ...props }) => (
  <View style={[formStyles.inputGroup, style]}>
    <Text style={formStyles.label}>{label}</Text>
    <TextInput
      style={[formStyles.input, error && formStyles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholderTextColor="#a0a8b8"
      {...props}
    />
    {error && <Text style={formStyles.errorText}>{error}</Text>}
  </View>
);

/**
 * Componente MedicoForm para Cadastro ou Edição.
 * @param {object} props.medico - Objeto do médico para edição, ou null para cadastro.
 * @param {function} props.onSave - Função chamada ao concluir com sucesso.
 * @param {function} props.onCancel - Função chamada ao cancelar.
 * @param {object} props.navigation - Objeto de navegação.
 */
const MedicoForm = ({ medico, onSave, onCancel, navigation }) => {
  // 1. Inicializa o estado com base na prop 'medico'
  const [formData, setFormData] = useState(medico || initialMedicoState);
  
  // 2. Estado para rastrear erros de validação
  const [errors, setErrors] = useState({});

  // 3. Estado para controlar o carregamento durante o salvamento (evita duplo toque)
  const [salvando, setSalvando] = useState(false);

  // 4. Define o título do botão e o modo do formulário
  const isEditing = !!medico;
  const buttonTitle = isEditing ? 'Concluir Edição' : 'Concluir Cadastro';

  // Campos obrigatórios
  const requiredFields = [
    'nome', 'especialidade', 'crm', 'email', 'telefone', 
    'logradouro', 'numero', 'cidade', 'uf', 'cep'
  ];

  // Atualiza o formData quando o prop 'medico' muda (útil se o componente for reutilizado)
  useEffect(() => {
    setFormData(medico || initialMedicoState);
  }, [medico]);

  // Função genérica para atualizar o estado do formulário
  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    // Remove o erro assim que o usuário começa a digitar
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Função de Validação
  const validate = () => {
    let valid = true;
    const newErrors = {};

    requiredFields.forEach(field => {
      // Verifica se o campo está vazio ou é apenas espaço em branco
      if (!formData[field] || String(formData[field]).trim() === '') {
        newErrors[field] = 'Campo Obrigatório';
        valid = false;
      }
    });

    setErrors(newErrors);
    return valid;
  };

  // Função de submissão do formulário
  const handleSubmit = async () => {
    if (!validate()) {
      showAlert('Erro', 'Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      // onSave faz a chamada à API (POST ou PUT) e lança erro se falhar
      await onSave(formData);
      showAlert(
        isEditing ? 'Sucesso' : 'Cadastro Concluído',
        isEditing ? 'Dados do médico atualizados.' : 'Novo médico cadastrado com sucesso!'
      );
      navigation.goBack();
    } catch (erro) {
      showAlert('Erro', erro.message || 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        
        <Text style={styles.title}>{isEditing ? 'Editar Perfil' : 'Novo Cadastro'}</Text>

        {/* ====================================
            1. PROFISSIONAL
            ==================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>1. Profissional</Text>
          <ValidatedInput 
            label="Nome Completo" 
            name="nome" 
            placeholder="Ex: Ana Maria da Silva" 
            value={formData.nome}
            error={errors.nome}
            onChangeText={(text) => handleChange('nome', text)}
          />
          
          {/* Campo Especialidade (Lista de Seleção) */}
          <View style={formStyles.inputGroup}>
            <Text style={formStyles.label}>Especialidade</Text>
            <View style={[formStyles.pickerWrapper, errors.especialidade && formStyles.inputError]}>
              <Picker
                selectedValue={formData.especialidade}
                onValueChange={(itemValue) => handleChange('especialidade', itemValue)}
                style={formStyles.picker}
              >
                {especialidades.map(esp => (
                  <Picker.Item key={esp} label={esp} value={esp} />
                ))}
              </Picker>
            </View>
            {errors.especialidade && <Text style={formStyles.errorText}>{errors.especialidade}</Text>}
          </View>

          <ValidatedInput 
            label="CRM" 
            name="crm" 
            placeholder="Ex: 12345/MG" 
            value={formData.crm}
            error={errors.crm}
            onChangeText={(text) => handleChange('crm', text)}
          />
        </View>

        {/* ====================================
            2. CONTATOS
            ==================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>2. Contatos</Text>
          <ValidatedInput 
            label="Email" 
            name="email" 
            placeholder="email@exemplo.com" 
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            error={errors.email}
            onChangeText={(text) => handleChange('email', text)}
          />
          <ValidatedInput 
            label="Telefone Celular" 
            name="telefone" 
            placeholder="(XX) XXXXX-XXXX" 
            keyboardType="phone-pad"
            value={formData.telefone}
            error={errors.telefone}
            onChangeText={(text) => handleChange('telefone', text)}
          />
        </View>

        {/* ====================================
            3. ENDEREÇO PROFISSIONAL
            ==================================== */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>3. Endereço Profissional</Text>
          <ValidatedInput 
            label="Logradouro" 
            name="logradouro" 
            placeholder="Ex: Rua das Flores" 
            value={formData.logradouro}
            error={errors.logradouro}
            onChangeText={(text) => handleChange('logradouro', text)}
          />
          <View style={formStyles.row}>
            <ValidatedInput 
              label="Número" 
              name="numero" 
              placeholder="Nº" 
              keyboardType="numeric"
              style={formStyles.inputHalf}
              value={formData.numero}
              error={errors.numero}
              onChangeText={(text) => handleChange('numero', text)}
            />
            <ValidatedInput 
              label="Complemento" 
              name="complemento" 
              placeholder="Apto/Sala (Opcional)"
              style={formStyles.inputHalf}
              value={formData.complemento}
              error={errors.complemento}
              onChangeText={(text) => handleChange('complemento', text)}
            />
          </View>
          <ValidatedInput 
            label="Cidade" 
            name="cidade" 
            placeholder="Ex: Belo Horizonte" 
            value={formData.cidade}
            error={errors.cidade}
            onChangeText={(text) => handleChange('cidade', text)}
          />
          <View style={formStyles.row}>
            <ValidatedInput 
              label="UF" 
              name="uf" 
              placeholder="Ex: MG" 
              maxLength={2}
              autoCapitalize="characters"
              style={formStyles.inputQuarter}
              value={formData.uf}
              error={errors.uf}
              onChangeText={(text) => handleChange('uf', text)}
            />
            <ValidatedInput 
              label="CEP" 
              name="cep" 
              placeholder="XXXXX-XXX" 
              keyboardType="numeric"
              maxLength={9}
              style={formStyles.inputThreeQuarter}
              value={formData.cep}
              error={errors.cep}
              onChangeText={(text) => handleChange('cep', text)}
            />
          </View>
        </View>
      </ScrollView>

      {/* BOTÕES FIXOS NA PARTE INFERIOR */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[formStyles.button, formStyles.cancelButton]}
          onPress={onCancel || (() => navigation.goBack())}
          disabled={salvando}
          activeOpacity={0.8}
        >
          <Text style={formStyles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[formStyles.button, formStyles.saveButton, salvando && formStyles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={salvando}
          activeOpacity={0.8}
        >
          <Text style={formStyles.buttonText}>
            {salvando ? 'Salvando...' : buttonTitle}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// =========================================================================
// ESTILOS DO FORMULÁRIO
// =========================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f2f4f7',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110, // Espaço para os botões fixos
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1a1d29',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
    // sombra suave (iOS)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    // sombra (Android)
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e6e8ec',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
});

const formStyles = StyleSheet.create({
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
    color: '#4a5063',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#dfe3ea',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#1a1d29',
    backgroundColor: '#f9fafb',
    height: 48,
  },
  inputError: {
    borderColor: '#e5484d',
    backgroundColor: '#fff2f2',
  },
  errorText: {
    fontSize: 12,
    color: '#e5484d',
    marginTop: 4,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  inputHalf: {
    flex: 1,
  },
  inputQuarter: {
    flex: 0.3,
  },
  inputThreeQuarter: {
    flex: 0.7,
  },
  // Estilo específico para o Picker
  pickerWrapper: {
    borderWidth: 1.5,
    borderColor: '#dfe3ea',
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    height: 48,
    overflow: 'hidden',
  },
  picker: {
    height: Platform.OS === 'ios' ? undefined : 48,
    width: '100%',
    color: '#1a1d29',
  },
  // Estilos dos Botões de Ação
  button: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: '#9fc6f5',
    shadowOpacity: 0,
    elevation: 0,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#dfe3ea',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButtonText: {
    color: '#4a5063',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default MedicoForm;