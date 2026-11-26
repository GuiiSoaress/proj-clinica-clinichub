# CLAUDE.md

Guia do repositório **ClinicHub** (`proj-clinica-clinichub`). Detalhes do app mobile estão em [front/CLAUDE.md](front/CLAUDE.md).

## Visão geral

ClinicHub é um app mobile de agendamento de consultas para clínica médica. É o projeto integrador da UC *Aplicações Mobile* (Tecnologia em Análise e Desenvolvimento de Sistemas, turma STADS, prof. Maurício Falvo), construído ao longo de 16 aulas por uma squad de três pessoas (Guilherme Soares da Silva, Guilherme dos Anjos Silva e João Vitor Colleto).

**Escopo do desafio** (checklist completo em [README.md](README.md)):
- CRUD de pacientes, médicos, especialidades, horários e consultas, consumindo uma API RESTful (HTTPS).
- Recursos nativos: câmera (foto de perfil), biometria (login), GPS (distância até a clínica) e Bluetooth (sinais vitais).
- Recursos de plataforma: push/notificações, mapas, SMS e processamento em background.
- Entrega final na Aula 16: nenhum campo "[a preencher]" pode restar no README.

## Estrutura do repositório

| Pasta/arquivo | Conteúdo |
|---|---|
| `front/` | App Expo / React Native (único código existente hoje). |
| `back/` | Só um `README.md` vazio; backend ainda não existe. |
| `Docs/` | ADRs em `.docx` (001 serviço de mapas, 002 push notifications, 003 SMS), `004-bluetooth-modo-real.md` (como ativar o BLE real), `Link Figma.txt` e imagem do protótipo. |
| `README.md` | Descrição do projeto, squad e checklist de funcionalidades (com registros de decisões e auditorias). |
| `package-lock.json` (raiz) | Resquício; as dependências reais ficam em `front/`. |

## Decisões arquiteturais (ADRs em `Docs/`)

Os ADRs são do squad "Clinic Hub", datados de 03/09/2026. Todos seguem o mesmo modelo: contexto, opções, decisão, consequências, plano B e sinais de falha.

| ADR | Decisão | Pré-requisitos / riscos | Responsável | Prazo |
|---|---|---|---|---|
| 001 — Serviço de mapas | `react-native-maps` com **Google Maps** (Android) e **Apple Maps** (iOS). Rota delegada via `Linking.openURL` ao app de mapas nativo. | Projeto no Google Cloud, Maps SDK, chave Android e faturamento cadastrado. No Expo Go usa chave própria/embutida; build de produção exige chave em `app.config.js`. | Guilherme Soares | Implementado na Aula 12 |
| 002 — Push notifications | **Expo Push Service** para o lembrete de consulta (alternativas: FCM direto, OneSignal). | Exige **development build via EAS Build**: o app deixa de rodar no Expo Go padrão no Android. Coletar o token de push por paciente. Dependência de serviço externo. | Guilherme dos Anjos | Implementado na Aula 9 |
| 003 — SMS | **Gateway** (Twilio ou Zenvia, a definir) para confirmar/cancelar consulta automaticamente pelo backend; `expo-sms` descartado por exigir envio manual. | Conta e número verificado no gateway; custo por SMS após a cota de teste. **Credenciais ficam só no servidor, nunca no app.** | João Colleto | Aula 13 |

**Planos B:**
- Mapa: mostrar o endereço da clínica em texto (preservado como princípio de acessibilidade no painel inferior).
- Push: exibir o lembrete dentro do app, na lista de consultas (ou migrar para FCM).
- SMS: notificação interna avisando que o SMS não pôde ser enviado.

**Regra de arquitetura comum:** cada serviço de terceiro fica isolado em um único arquivo/módulo (integração de mapas, serviço de SMS), para que trocar de provedor não afete as telas.

**Implicações para o backend:** o SMS e a entrega de lembretes dependem de um servidor (a API da clínica tem as datas, mas não entrega notificações nem renderiza mapas). O `back/` precisará existir para o SMS automático.


## Estado atual

- **Concluído:** projeto configurado e versionado no Git; as telas do paciente e médico implementadas a partir do protótipo; login com token via `front/servidor/auth-api.js` (porta 3001, `npm run auth-api`) e sessão no `expo-secure-store`.
- **Periféricos (Aula 6):**
  - **Câmera (`expo-image-picker`):** foto de perfil no cadastro/edição de médico (`MedicoForm.js` / `CadastroEdicaoMedicoScreen.js`) e no avatar do paciente (`Perfil.js` via `FotoPerfilCampo.js`).
  - **Biometria (`expo-local-authentication`):** tela `LoginBiometrico.js` que destranca o token já salvo no `SecureStore` (com fallback sempre visível para e-mail e senha).
  - **GPS (`expo-location`):** service isolado `front/src/services/localizacao.js` (Haversine + `Accuracy.Balanced` + erro `PermissaoNegada`).
- **Bluetooth (Aula 7):** tela `SinaisVitais` (aberta pelo card "Sinais vitais" da `Confirmada`, só em consultas `proxima`) + service `front/src/services/bluetooth.js` com modo simulado (ativo) e real (`react-native-ble-plx`, exige development build). A média vai para `POST /sinais-vitais` da auth-api. Guia de troca de modo: `Docs/004-bluetooth-modo-real.md`.
- **Notificações Locais e Push (Aulas 8 e 9):** gerenciador de lembretes locais `lembretes.js` + push service `push.js` com persistência de token e navegação condicional ao tocar no lembrete.
- **Multithreading (Aula 10):** detecção de conflitos de agenda cooperativa em fatias sem travar a interface (`processamento.js` e `useTarefaPesada.js`).
- **Mapas (Aula 12):** tela `MapaClinica.js` (`react-native-maps`), initialRegion, fitToCoordinates com edgePadding, pinColor, acessibilidade via leitor de tela (accessibilityLabel, selectable) e delegação de rotas para o app nativo via deep linking (`geo:` / `maps:`).
- **Em mock:** consultas, médicos iniciais e horários vêm de `front/src/data/mock.js` e do estado local em `front/src/context/AppContext.js`.
- **Não iniciado:** CRUD completo na API REST, SMS (Aula 13), testes E2E (Aula 14), build de produção (Aula 15).
- **Legado:** `front/mockup/db_clinica.json` (base do `json-server`, com `medicos` e `pacientes`).

## Comandos

Rodar sempre dentro de `front/`:

```
npm install
npm start          # expo start (a: Android, w: web)
npm run android | ios | web
```

No PowerShell deste ambiente a política de execução bloqueia `npx`; use `npx.cmd` (ex.: `npx.cmd expo install <pacote>`). Para dependências Expo, prefira `expo install` para obter versões compatíveis.

Não há testes nem linter configurados. Verificação rápida de que tudo compila: `npx.cmd expo export --platform web --output-dir <pasta-temporária>` (apague a pasta depois).

## Convenções

- Idioma: código de domínio, textos de UI e comentários em **português** (pt-BR); identificadores de infraestrutura em inglês.
- Preserve comentários existentes que não tenham relação com a mudança.
- Mudanças de dependência devem passar por `expo install` / `npm install` e manter `front/package.json` e `front/package-lock.json` coerentes.
- Decisões de arquitetura (mapas, push, SMS) estão nos ADRs de `Docs/`; consulte-os antes de escolher provedores.
- Ao concluir uma funcionalidade do checklist, marque-a no `README.md`.

## Próximos passos prováveis

1. SMS (ADR 003, Aula 13): gateway Twilio/Zenvia acionado pelo backend.
2. Testes end-to-end (Aula 14).
3. Build de produção com EAS Build e chave do Google Maps ativada (Aula 15).
4. Apresentação final e encerramento do projeto (Aula 16).
