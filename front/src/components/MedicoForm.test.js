// src/components/MedicoForm.test.js
// Cenários de falha da CÂMERA no cadastro de médico, sem câmera nenhuma.
// O formulário usa src/services/camera.js; o teste troca esse service por um
// falso que se comporta como a câmera com "defeito".
import { Alert } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import MedicoForm from './MedicoForm';
import { tirarFoto, CameraPermissaoNegada } from '../services/camera';

jest.mock('../services/camera', () => ({
  ...jest.requireActual('../services/camera'),
  tirarFoto: jest.fn(),
}));

let onSave;
let navigation;

beforeEach(() => {
  tirarFoto.mockReset();
  onSave = jest.fn(async (dados) => ({ ...dados, id: 99 }));
  navigation = { goBack: jest.fn() };
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function preencherObrigatorios() {
  await fireEvent.changeText(screen.getByTestId('campo-nome'), 'Dra Paula Teste');
  await fireEvent.changeText(screen.getByTestId('campo-crm'), '123456-SP');
}

describe('Cadastro de médico — câmera com defeito', () => {
  it('usuário cancela a câmera: o formulário não quebra e o cadastro é concluído sem foto', async () => {
    tirarFoto.mockResolvedValue(null); // equivale a { canceled: true } da biblioteca

    await render(<MedicoForm onSave={onSave} navigation={navigation} />);
    await fireEvent.press(screen.getByTestId('botao-tirar-foto'));

    expect(tirarFoto).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('foto-medico')).toBeNull();
    expect(Alert.alert).not.toHaveBeenCalled(); // cancelar não é erro

    await preencherObrigatorios();
    await fireEvent.press(screen.getByTestId('botao-salvar-medico'));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ nome: 'Dra Paula Teste', crm: '123456-SP', fotoUri: null })
    );
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('permissão da câmera negada: avisa o motivo e o cadastro continua possível', async () => {
    tirarFoto.mockRejectedValue(new CameraPermissaoNegada());

    await render(<MedicoForm onSave={onSave} navigation={navigation} />);
    await fireEvent.press(screen.getByTestId('botao-tirar-foto'));

    expect(Alert.alert).toHaveBeenCalledWith('Permissão necessária', expect.stringMatching(/câmera/));

    await preencherObrigatorios();
    await fireEvent.press(screen.getByTestId('botao-salvar-medico'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ fotoUri: null }));
  });

  it('câmera indisponível no aparelho: mostra erro amigável sem travar o formulário', async () => {
    tirarFoto.mockRejectedValue(new Error('Camera not available on simulator'));

    await render(<MedicoForm onSave={onSave} navigation={navigation} />);
    await fireEvent.press(screen.getByTestId('botao-tirar-foto'));

    expect(Alert.alert).toHaveBeenCalledWith('Erro na câmera', expect.any(String));
    expect(screen.getByTestId('botao-salvar-medico')).toBeEnabled();
  });

  it('formulário incompleto é barrado antes de salvar', async () => {
    await render(<MedicoForm onSave={onSave} navigation={navigation} />);
    await fireEvent.press(screen.getByTestId('botao-salvar-medico'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('erro-campo-nome')).toBeOnTheScreen();
    expect(screen.getByTestId('erro-campo-crm')).toBeOnTheScreen();
  });

  it('telefone opcional inválido é apontado no campo', async () => {
    await render(<MedicoForm onSave={onSave} navigation={navigation} />);
    await preencherObrigatorios();
    await fireEvent.changeText(screen.getByTestId('campo-telefone'), '1234');
    await fireEvent.press(screen.getByTestId('botao-salvar-medico'));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByTestId('erro-campo-telefone')).toBeOnTheScreen();
  });

  it('com a câmera funcionando: mostra a foto e salva a URI junto com o médico', async () => {
    tirarFoto.mockResolvedValue('file:///fotos/medico.jpg');

    await render(<MedicoForm onSave={onSave} navigation={navigation} />);
    await fireEvent.press(screen.getByTestId('botao-tirar-foto'));

    expect(await screen.findByTestId('foto-medico')).toBeOnTheScreen();

    await preencherObrigatorios();
    await fireEvent.press(screen.getByTestId('botao-salvar-medico'));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ fotoUri: 'file:///fotos/medico.jpg' }));
  });
});
