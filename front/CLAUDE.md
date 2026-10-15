# CLAUDE.md (front)

Guia do app mobile em `front/` (`app_clinica`). Contexto geral do projeto em [../CLAUDE.md](../CLAUDE.md).

## Stack

Expo SDK 54, React Native 0.81, React 19, `@react-navigation/stack`, `react-native-svg`, fontes via `@expo-google-fonts` (Fraunces e DM Sans) carregadas com `expo-font`. JavaScript puro (sem TypeScript).

> Os ADRs (`../Docs/`) preveem Google Maps (`react-native-maps`), Expo Push Service e SMS por gateway. O push exige **development build (EAS)**, então o app deixará de rodar no Expo Go padrão no Android. Integrações de terceiros devem ficar isoladas em um único módulo (ex.: `src/services/`), sem acoplar as telas ao provedor. Credenciais de SMS nunca vão para o app.


## Arquitetura

- [App.js](App.js): carrega as fontes, envolve tudo em `SafeAreaProvider` e `AppProvider`. Gerencia navegação condicional por token:
  - Públicas: `Login`.
  - Privadas: `Inicio`, `Agendar`, `Confirmar`, `Confirmada`, `Consultas`, `Perfil`, `SinaisVitais`.
- `src/screens/<Tela>/<Tela>.js`:
  - `Login` → autentica via API e salva token no SecureStore.
  - `Inicio`, `Agendar` e `Perfil` são as abas da barra inferior.
  - Fluxo de agendamento: `Agendar` → `Confirmar` → `Confirmada` (recebe `route.params.id`).
  - `Consultas` (Minhas Consultas) é aberta pelo Início/Perfil; os cards levam a `Confirmada`.
  - `Confirmada`: detalhes da consulta; para consultas `proxima`, exibe o card de **Sinais vitais** e botão para importar ou medir novamente.
  - `Consulta/SinaisVitais.js`: tela de leitura de frequência cardíaca via BLE (importa média para o prontuário via `post('/sinais-vitais')` ou permite digitação manual).
  - `Perfil` → "Sair" limpa a sessão e desloga.
- `src/components/`:
  - `Layout.js`: `Screen` (rolagem, safe area, `tab` para a barra inferior, `footer` para botão fixo), `TabBar`, `Botao` (variantes `primario`, `branco`, `perigo`), `MedicoAvatar`, `iniciais`.
  - `Icons.js`: ícones SVG (`<Icon name=... />`, incluindo `heart`) e `MiniMap`.
  - `ConsultaCard.js`: card de consulta (variantes `home` e `lista`).
- `src/context/AppContext.js`: estado global (`consultas`, `medicoSelecionado`, `usuario`, `token`, `agendar`, `cancelar`, `registrarSinaisVitais`, `login`, `logout`) e helpers de data.
- `src/services/`:
  - `api.js`: `BASE_URL` (`http://localhost:3001`), `apiFetch` (com Bearer token) e helper `post(endpoint, corpo)`.
  - `sessao.js`: persistência da sessão no `expo-secure-store`.
  - `bluetooth.js`: interface isolada para BLE (`procurar`, `pararBusca`, `conectar`, `monitorarFrequencia`, `desconectar`). Controlado por `MODO_SIMULADO` e `FALHAS_SIMULADAS`.
- `servidor/auth-api.js`: servidor HTTP mock na porta 3001 com autenticação (`POST /login`), perfil, médicos e prontuário em memória (`POST /sinais-vitais`).
- `src/data/mock.js`: especialidades, médicos, horários, unidade, paciente e consultas iniciais.
- `src/theme.js`: `colors`, `fonts` e sombra da barra.

## Modelo de dados (em memória)

Consulta: `{ id, medico, especialidade, data: Date, hora: 'HH:mm', unidade, status: 'proxima' | 'concluida' | 'cancelada', sinaisVitais?: { frequenciaMedia, quantidadeLeituras, origem, registradoEm } }`.
Médico: `{ id, nome, especialidade, crm }`.

## Design

Origem: protótipo "ClinicHub — Telas do Paciente" (Figma em `../Docs/Link Figma.txt`). Paleta: bege `#f6f2ea`, verde `#1f4a42`, coral `#ff7f5f`, menta `#dcebe4`. Títulos em Fraunces, texto em DM Sans. Alvos de toque de pelo menos 44px.

## Pendências conhecidas

- Biometria não autentica de fato no Login; "Exames", "Dados pessoais" e "Notificações" mostram aviso.
- Distância da clínica é texto fixo (sem GPS); mini mapa é ilustrativo.
- Bluetooth roda em modo simulado no Expo Go; modo real exige development build nativo (guia em `../Docs/004-bluetooth-modo-real.md`).
- Sem telas de médico/recepção.

## Ao adicionar telas

Crie `src/screens/<Nome>/<Nome>.js`, use `Screen` de `Layout.js` e os tokens de `theme.js`, registre a rota em `App.js` e atualize este arquivo.
