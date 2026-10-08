// src/data/mock.js
// Dados locais usados enquanto a API da clínica não está integrada.

export const ESPECIALIDADES = [
  'Cardiologia',
  'Ginecologia',
  'Pneumologia',
  'Clínico Geral',
  'Urologia',
  'Dermatologia',
];

export const MEDICOS = [
  { id: 1, nome: 'Dra Camila Rocha', especialidade: 'Cardiologia', crm: '513115-SP' },
  { id: 2, nome: 'Dr Roberto Mendes', especialidade: 'Cardiologia', crm: '402887-SP' },
  { id: 3, nome: 'Dra Ana Lima', especialidade: 'Cardiologia', crm: '377210-SP' },
  { id: 4, nome: 'Dra Beatriz Souza', especialidade: 'Ginecologia', crm: '298114-SP' },
  { id: 5, nome: 'Dr Carlos Santos', especialidade: 'Pneumologia', crm: '310552-SP' },
  { id: 6, nome: 'Dr João de Oliveira', especialidade: 'Clínico Geral', crm: '120934-SP' },
  { id: 7, nome: 'Dr Paulo Ferraz', especialidade: 'Urologia', crm: '445871-SP' },
  { id: 8, nome: 'Dra Helena Duarte', especialidade: 'Dermatologia', crm: '267300-SP' },
];

export const HORARIOS = ['12:00', '14:00', '15:30'];

export const UNIDADE = {
  nome: 'Clínica Centro',
  endereco: 'Av. Paulista, 1200',
  distancia: 'a 2,4 km de você',
};

export const PACIENTE = { nome: 'Guilherme Soares', papel: 'Paciente' };

export const CONSULTAS_INICIAIS = [
  {
    id: 'c1',
    medico: 'Dra Camila Rocha',
    especialidade: 'Cardiologia',
    data: new Date(2026, 7, 8),
    hora: '14:30',
    unidade: 'Clínica Centro',
    status: 'proxima',
  },
  {
    id: 'c2',
    medico: 'Dr Roberto Mendes',
    especialidade: 'Cardiologia',
    data: new Date(2026, 7, 15),
    hora: '09:00',
    unidade: 'Clínica Centro',
    status: 'proxima',
  },
  {
    id: 'c3',
    medico: 'Dra Ana Lima',
    especialidade: 'Dermatologia',
    data: new Date(2026, 7, 22),
    hora: '16:00',
    unidade: 'Clínica Norte',
    status: 'proxima',
  },
];
