# CLAUDE.md (front)

Guia do app mobile em `front/` (`app_clinica`). Contexto geral do projeto em [../CLAUDE.md](../CLAUDE.md).

## Stack

Expo SDK 54, React Native 0.81, React 19, `@react-navigation/stack`, `react-native-svg`, fontes via `@expo-google-fonts` (Fraunces e DM Sans) carregadas com `expo-font`. JavaScript puro (sem TypeScript).

> Os ADRs (`../Docs/`) preveem Google Maps (`react-native-maps`), Expo Push Service e SMS por gateway. O push exige **development build (EAS)**, então o app deixará de rodar no Expo Go padrão no Android. Integrações de terceiros devem ficar isoladas em um único módulo (ex.: `src/services/`), sem acoplar as telas ao provedor. Credenciais de SMS nunca vão para o app.


## Arquitetura

- [App.js](App.js): carrega as fontes, envolve tudo em `SafeAreaProvider` e `AppProvider`, e registra as 7 telas num único `Stack.Navigator` sem header. Rota inicial: `Login`.
- `src/screens/<Tela>/<Tela>.js`: uma pasta por tela.
  - `Login` → `Inicio` (via `replace`).
  - `Inicio`, `Agendar` e `Perfil` são as abas da barra inferior.
  - Fluxo de agendamento: `Agendar` → `Confirmar` → `Confirmada` (recebe `route.params.id`).
  - `Consultas` (Minhas Consultas) é aberta pelo Início/Perfil; os cards levam a `Confirmada`.
  - `Perfil` → "Sair" faz `navigation.reset` para `Login`.
- `src/components/`:
  - `Layout.js`: `Screen` (rolagem, safe area, `tab` para a barra inferior, `footer` para botão fixo), `TabBar`, `Botao` (variantes `primario`, `branco`, `perigo`), `MedicoAvatar`, `iniciais`.
  - `Icons.js`: ícones SVG (`<Icon name=... />`) e `MiniMap`.
  - `ConsultaCard.js`: card de consulta (variantes `home` e `lista`).
- `src/context/AppContext.js`: estado global (`consultas`, `medicoSelecionado`, `agendar`, `cancelar`) e helpers de data (`MESES`, `MESES_ABREV`, `pad`, `formatarData`). Estado só em memória, sem persistência.
- `src/data/mock.js`: especialidades, médicos, horários, unidade, paciente e consultas iniciais. É a única fonte de dados das telas.
- `src/theme.js`: `colors`, `fonts` (nomes das famílias carregadas) e sombra da barra. Use sempre estes tokens em vez de valores soltos.
- `src/services/api.js`: `BASE_URL` (`http://localhost:3000`). Hoje sem uso; em celular físico troque `localhost` pelo IP da máquina.
- `mockup/db_clinica.json`: base para `json-server` (`medicos`, `pacientes`), ainda não ligada ao app.

## Modelo de dados (em memória)

Consulta: `{ id, medico, especialidade, data: Date, hora: 'HH:mm', unidade, status: 'proxima' | 'concluida' | 'cancelada' }`.
Médico: `{ id, nome, especialidade, crm }`. O status não é derivado da data; só muda via `cancelar`.

## Design

Origem: protótipo "ClinicHub — Telas do Paciente" (Figma em `../Docs/Link Figma.txt`). Paleta: bege `#f6f2ea`, verde `#1f4a42`, coral `#ff7f5f`, menta `#dcebe4`. Títulos em Fraunces, texto em DM Sans. Alvos de toque de pelo menos 44px.

## Pendências conhecidas

- Login e biometria não autenticam de fato; "Exames", "Dados pessoais" e "Notificações" mostram só um aviso.
- Distância da clínica é texto fixo (sem GPS); mini mapa é ilustrativo.
- Sem telas de médico/recepção (o CRUD antigo de médicos foi removido; consulte o histórico do Git).

## Ao adicionar telas

Crie `src/screens/<Nome>/<Nome>.js`, use `Screen` de `Layout.js` e os tokens de `theme.js`, registre a rota em `App.js` e atualize este arquivo.
