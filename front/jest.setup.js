// jest.setup.js
// Preparação comum a TODOS os testes (roda antes de cada arquivo de teste).
// Aqui só trocamos o que não existe fora do aparelho (cofre, armazenamento,
// fontes). Os periféricos (GPS, câmera, biometria, Bluetooth, notificações)
// são simulados dentro de cada teste, para que cada cenário de falha fique
// visível no próprio arquivo.

import 'react-native-gesture-handler/jestSetup';

// AsyncStorage em memória (mock oficial da biblioteca).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Cofre (SecureStore) em memória: cada arquivo de teste começa vazio.
jest.mock('expo-secure-store', () => {
  const cofre = new Map();
  return {
    setItemAsync: jest.fn(async (chave, valor) => {
      cofre.set(chave, valor);
    }),
    getItemAsync: jest.fn(async (chave) => (cofre.has(chave) ? cofre.get(chave) : null)),
    deleteItemAsync: jest.fn(async (chave) => {
      cofre.delete(chave);
    }),
    __limpar: () => cofre.clear(),
  };
});

// Fontes: no teste não há o que carregar; responde "carregadas".
jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: () => [true, null],
  loadAsync: jest.fn(async () => {}),
  isLoaded: () => true,
}));
