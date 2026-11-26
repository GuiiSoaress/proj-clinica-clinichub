// src/services/camera.test.js
// O service de câmera traduz as respostas da biblioteca em algo simples para
// as telas. Aqui a biblioteca (expo-image-picker) é que vira falsa.
import * as ImagePicker from 'expo-image-picker';
import { tirarFoto, CameraPermissaoNegada } from './camera';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'granted' });
});

describe('service da câmera', () => {
  it('usuário cancela a captura ({ canceled: true }): devolve null sem lançar erro', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({ canceled: true });
    await expect(tirarFoto()).resolves.toBeNull();
  });

  it('permissão negada: lança CameraPermissaoNegada e nem abre a câmera', async () => {
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false });
    await expect(tirarFoto()).rejects.toBeInstanceOf(CameraPermissaoNegada);
    expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('captura sem nenhuma imagem no retorno: devolve null', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [] });
    await expect(tirarFoto()).resolves.toBeNull();
  });

  it('foto tirada: devolve a URI da imagem', async () => {
    ImagePicker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///a.jpg' }] });
    await expect(tirarFoto()).resolves.toBe('file:///a.jpg');
  });
});
