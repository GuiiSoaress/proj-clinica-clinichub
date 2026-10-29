// src/components/FotoPerfilCampo.js
// Componente reaproveitável para captura e exibição de foto de perfil (Aula 6).
// Evita copiar e colar a lógica de permissão/câmera entre o perfil do paciente
// e formulários de cadastro.

import React from 'react';
import { View, Text, Image, Pressable, Alert, Platform, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Icon from './Icons';
import { iniciais } from './Layout';
import { colors, fonts } from '../theme';

function avisar(titulo, mensagem) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(`${titulo}\n\n${mensagem}`);
  } else {
    Alert.alert(titulo, mensagem);
  }
}

/**
 * Solicita permissão da câmera e abre a captura quadrada (1:1) com compressão.
 * Retorna a URI da foto escolhida, ou `null` se o usuário cancelar ou negar.
 */
export async function capturarFotoComCamera() {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();

  if (permissao.status !== 'granted') {
    avisar(
      'Permissão necessária',
      'O acesso à câmera foi negado. Libere a câmera nas configurações do aparelho para tirar a foto de perfil.'
    );
    return null;
  }

  const resultado = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.6,
  });

  if (resultado.canceled) {
    return null;
  }

  return resultado.assets?.[0]?.uri || null;
}

export default function FotoPerfilCampo({
  fotoUri,
  nome,
  onAlterarFoto,
  tamanho = 96,
  rotuloBotao = 'Tirar foto',
  claro = false,
}) {
  const aoTocar = async () => {
    try {
      const novaUri = await capturarFotoComCamera();
      if (novaUri && onAlterarFoto) {
        onAlterarFoto(novaUri);
      }
    } catch (e) {
      avisar('Erro na câmera', 'Não foi possível abrir a câmera neste dispositivo.');
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={rotuloBotao}
        onPress={aoTocar}
        style={({ pressed }) => [styles.avatarWrapper, { opacity: pressed ? 0.85 : 1 }]}
      >
        {fotoUri ? (
          <Image
            source={{ uri: fotoUri }}
            style={[
              styles.imagem,
              {
                width: tamanho,
                height: tamanho,
                borderRadius: tamanho / 2,
                borderColor: claro ? colors.bg : colors.mint,
              },
            ]}
          />
        ) : (
          <View
            style={[
              styles.placeholder,
              {
                width: tamanho,
                height: tamanho,
                borderRadius: tamanho / 2,
                backgroundColor: claro ? colors.coral : colors.mint,
                borderColor: claro ? colors.bg : colors.white,
              },
            ]}
          >
            {nome ? (
              <Text
                style={[
                  styles.iniciaisTexto,
                  {
                    fontSize: tamanho * 0.36,
                    color: claro ? colors.ink : colors.green,
                  },
                ]}
              >
                {iniciais(nome)}
              </Text>
            ) : (
              <Icon name="camera" size={tamanho * 0.36} color={colors.green} />
            )}
          </View>
        )}

        <View style={styles.seloCamera}>
          <Icon name="camera" size={16} color={colors.white} />
        </View>
      </Pressable>

      <Pressable accessibilityRole="button" onPress={aoTocar} style={styles.botaoTextoTouch}>
        <Text style={[styles.botaoTexto, claro && { color: colors.heroText }]}>
          {fotoUri ? 'Trocar foto' : rotuloBotao}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  imagem: {
    borderWidth: 4,
    backgroundColor: colors.mint,
  },
  placeholder: {
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iniciaisTexto: {
    fontFamily: fonts.title,
  },
  seloCamera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.green,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTextoTouch: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginTop: 4,
  },
  botaoTexto: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.green,
  },
});
