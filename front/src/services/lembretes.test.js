// src/services/lembretes.test.js
// Cenários de falha da NOTIFICAÇÃO local (Aula 8), sem permissão de verdade.
// As partes de expo-notifications usadas pelo service são trocadas por falsas.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { agendarLembrete, cancelarLembrete, sincronizarLembretes, converterParaDataHora } from './lembretes';

jest.mock('expo-notifications/build/NotificationPermissions', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
}));
jest.mock('expo-notifications/build/scheduleNotificationAsync', () => ({
  scheduleNotificationAsync: jest.fn(),
}));
jest.mock('expo-notifications/build/cancelScheduledNotificationAsync', () => ({
  cancelScheduledNotificationAsync: jest.fn(),
}));
// Só para não poluir a saída: o push remoto não é usado por este service.
jest.mock('expo-notifications/build/getExpoPushTokenAsync', () => ({
  getExpoPushTokenAsync: jest.fn(),
}));

// Consulta daqui a 2 dias: o lembrete (1 h antes) ainda está no futuro.
const daquiADoisDias = () => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d;
};
const consulta = (extra = {}) => ({
  id: 'c10',
  medico: 'Dra Camila Rocha',
  especialidade: 'Cardiologia',
  data: daquiADoisDias(),
  hora: '14:00',
  ...extra,
});

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  scheduleNotificationAsync.mockResolvedValue('notif-1');
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('lembrete de consulta — notificação com defeito', () => {
  it('permissão negada definitivamente: não insiste, não agenda e devolve o motivo', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false });

    const r = await agendarLembrete(consulta());

    expect(r).toEqual({ agendado: false, motivo: 'permissao_negada' });
    expect(requestPermissionsAsync).not.toHaveBeenCalled();
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('usuário recusa quando o app pede: não agenda e devolve o motivo', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'undetermined', canAskAgain: true });
    requestPermissionsAsync.mockResolvedValue({ status: 'denied', canAskAgain: false });

    const r = await agendarLembrete(consulta());

    expect(requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(r.motivo).toBe('permissao_negada');
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('sistema falha ao agendar: devolve agendado=false em vez de fingir que deu certo', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    scheduleNotificationAsync.mockRejectedValue(new Error('falha no sistema'));

    const r = await agendarLembrete(consulta());

    expect(r.agendado).toBe(false);
    expect(r.motivo).toBe('erro_agendamento');
  });

  it('consulta em menos de 1 hora: não promete um aviso que já passou', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    const daquiA30min = new Date(Date.now() + 30 * 60 * 1000);
    const hora = `${String(daquiA30min.getHours()).padStart(2, '0')}:${String(daquiA30min.getMinutes()).padStart(2, '0')}`;

    const r = await agendarLembrete(consulta({ data: daquiA30min, hora }));

    expect(r.agendado).toBe(false);
    expect(r.motivo).toBe('horario_passado');
    expect(scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it('com permissão: agenda 1 hora antes com texto neutro (sem médico nem especialidade)', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });

    const r = await agendarLembrete(consulta());

    expect(r.agendado).toBe(true);
    const { content, trigger } = scheduleNotificationAsync.mock.calls[0][0];
    expect(content.body).toBe('Você tem uma consulta agendada às 14:00.');
    expect(content.body).not.toMatch(/Camila|Cardiologia/);
    expect(content.data).toEqual({ consultaId: 'c10', tela: 'Confirmada' });
    const umaHoraAntes = converterParaDataHora(consulta().data, '13:00');
    expect(trigger.date.getTime()).toBe(umaHoraAntes.getTime());
  });

  it('cancelar a consulta cancela o lembrete que estava agendado', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await agendarLembrete(consulta());

    await expect(cancelarLembrete('c10')).resolves.toBe(true);
    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
  });

  it('reagendar substitui o lembrete anterior em vez de acumular', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    scheduleNotificationAsync.mockResolvedValueOnce('notif-1').mockResolvedValueOnce('notif-2');

    await agendarLembrete(consulta());
    await agendarLembrete(consulta({ hora: '16:00' }));

    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
  });

  it('sincronização cancela lembretes de consultas que não estão mais ativas', async () => {
    getPermissionsAsync.mockResolvedValue({ status: 'granted' });
    await agendarLembrete(consulta());

    await sincronizarLembretes([{ ...consulta(), status: 'cancelada' }]);

    expect(cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif-1');
  });
});
