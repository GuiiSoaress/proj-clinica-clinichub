<!--
TEMPLATE — cada squad deve copiar este arquivo para a RAIZ do próprio
repositório do projeto (o app da clínica) e ir preenchendo os campos entre
colchetes [ ] ao longo do semestre, conforme cada funcionalidade é
implementada. Não deixe nenhum "[a preencher]" na versão final (Aula 16).

-->

# Clinic Hub — Sistema de Agendamento para Clínica Médica

> Projeto integrador da Unidade Curricular **Aplicações Mobile**, construído ao longo de 16 aulas.

**Squad:** Guilherme Soares da Silva --- Guilherme dos Anjos Silva --- João Vitor Colleto

**Curso:** Superior de Tecnologia em Análise e Desenvolvimento de Sistemas — Turma STADS
**Professor:** Prof. Dr. Maurício Falvo

---

## Sobre o desafio

Este projeto é a resposta à Situação de Aprendizagem Desafiadora da unidade curricular:
criar a aplicação mobile de um sistema de agendamento de consultas para uma clínica
médica, atendendo pacientes e médicos com um aplicativo que vai além do CRUD básico.

O aplicativo consome a API RESTful da clínica (cadastro de pacientes, médicos,
especialidades, horários, agendamento e cancelamento de consultas — toda a comunicação
ocorre via HTTPS por lidar com dados sensíveis de pacientes) e integra:

- **Recursos nativos do dispositivo:** câmera, Bluetooth, GPS e biometria.
- **Recursos de plataforma:** notificações locais/push, mapas, SMS e processamento em
  segundo plano (background), com uso de multithread para não travar a interface.
- **Web Services de terceiros:** notificação push, gateway de SMS e provedor de mapas.

## Funcionalidades

Checklist dos entregáveis previstos na Situação de Aprendizagem Desafiadora do Plano de
Ensino. Marque conforme cada item for implementado pela squad — cada aula do curso avança
alguns destes itens.

- [ ] Protótipo wireframe das interfaces da aplicação (Figma)
- [x] Projeto do aplicativo configurado e versionado no Git 
- [x] Cadastro de foto de perfil (paciente e médico) via câmera do dispositivo 
- [x] Login com biometria implementado para médico/recepção 
- [x] Geolocalização (GPS) com cálculo de distância/tempo até a clínica 
- [x] Importação de sinais vitais de um periférico via Bluetooth antes da consulta
      (modo simulado; modo real pronto, exige development build: ver `Docs/004-bluetooth-modo-real.md`)
- [ ] Implementação das interfaces de listagem (leitura) para pacientes, médicos,
      especialidades e horários, consumindo a API RESTful
- [ ] Operações de escrita (cadastro/edição/exclusão) para pacientes, médicos,
      especialidades e horários 
- [ ] Integração inicial com os endpoints de usuários e login, via HTTPS
- [ ] Identificação dos recursos que dependem de Web Services de terceiros
- [x] Notificação local/push como lembrete de consulta agendada (Aulas 8 e 9)
- [x] Processamento multithread para tarefas pesadas não travarem a interface (Aula 10)
- [ ] Sincronização da agenda em segundo plano (tarefa/serviço background)
- [x] Mapa exibindo a localização da clínica dentro do aplicativo (Aula 12)
- [ ] Confirmação/cancelamento de consulta enviado por SMS
- [x] Funcionalidade de agendamento de consultas (paciente)
- [x] Funcionalidade de listagem das consultas agendadas
- [x] Funcionalidade de cancelamento de consulta
- [ ] Funcionalidade de visualização de agenda para o médico
- [ ] Aplicação com testes end-to-end rodando com sucesso 
- [ ] Documentação do sistema — guia do usuário e técnica 
- [ ] Build de produção gerado e documentação dos passos de publicação nas lojas (App
      Store/Google Play)
- [ ] Versão final do aplicativo pronta para apresentação 

## Telas principais

<!-- Documentem cada tela conforme forem construindo, descrevendo função e navegação. -->

| Tela | Funcionalidade | Navega para |
|---|---|---|
| Splash | [a preencher] | Menu |
| Menu | [a preencher] | Médicos, Pacientes, Consultas |
| Médicos (listagem) | [a preencher] | Cadastro/Edição de Médico |
| Cadastro/Edição de Médico | Cadastro e edição de dados do médico com foto de perfil via câmera (`expo-image-picker`) | Agendar (volta) |
| Login Biométrico | Destranca o token salvo no cofre do dispositivo via digital/biometria (`expo-local-authentication`) | Início, Login (e-mail/senha) |
| Como Chegar / Mapa da Clínica (`MapaClinica.js`) | Exibe a localização da unidade em mapa interativo (`react-native-maps`), enquadra usuário e clínica (`fitToCoordinates`), calcula distância/tempo (GPS) e delega a rota ao app nativo (`Linking.openURL`) | — |
| Sincronizar Agenda (Recepção) | Sincroniza a agenda da clínica e detecta conflitos de horários em fatias sem travar a interface (restrita à recepção) | — |
| [adicionar novas telas conforme implementadas] | | |

## Tecnologias

- [React Native](https://reactnative.dev/) com [Expo](https://expo.dev/)
- React Navigation (`@react-navigation/native`, `@react-navigation/stack`)
- Mapas nativos: `react-native-maps` (Google Maps no Android, Apple Maps no iOS)
- Periféricos e armazenamento seguro: `expo-image-picker`, `expo-local-authentication`, `expo-location`, `expo-secure-store`, `react-native-ble-plx`
- Comunicação e notificações: `expo-notifications`, `expo-device`
- [a preencher: bibliotecas das próximas aulas — expo-task-manager, etc.]
- API RESTful da clínica (mock local via `json-server` / `auth-api.js` durante o desenvolvimento)

## Pré-requisitos

- [Node.js](https://nodejs.org/) (versão LTS recomendada)
- npm
- [Expo Go](https://expo.dev/go) instalado no celular físico, **ou** um emulador
  Android/iOS configurado
- Git

## Instalação e configuração

```bash
git clone [url-do-repositorio-da-squad]
cd proj-clinica-clinichub/front
npm install
```

### Variáveis de configuração

O endereço da API é definido em `src/services/api.js`:

```js
const BASE_URL = "http://localhost:3001";
```

> Em dispositivo físico (Expo Go), `localhost` não funciona — use o IP da máquina que
> está rodando a API/mock, na mesma rede Wi-Fi.

### Subindo a API mock (durante o desenvolvimento)

```bash
cd front
npm run auth-api
```

## Como executar

```bash
cd front
npm start
```

Escaneie o QR Code com o app Expo Go, ou pressione `a`/`i` no terminal para abrir em um
emulador Android/iOS.

### Bluetooth (sinais vitais)

A importação de sinais vitais usa `react-native-ble-plx`, que **não funciona no Expo Go**
(precisa de código nativo). Por isso o service `front/src/services/bluetooth.js` tem dois modos,
escolhidos pela constante `MODO_SIMULADO`:

- `true` (padrão): periférico simulado, roda no Expo Go.
- `false`: Bluetooth real, exige **development build** (`npx expo run:android` ou EAS Build).

Passo a passo para trocar de modo e testes de falha: [Docs/004-bluetooth-modo-real.md](Docs/004-bluetooth-modo-real.md).

## Permissões necessárias

O aplicativo solicita acesso aos seguintes recursos do dispositivo:

| Recurso | Quando é solicitado | Comportamento se negado |
|---|---|---|
| Câmera | Ao tocar em "Tirar foto de perfil" no formulário de médico (`MedicoForm`) ou no avatar da tela `Perfil` | Exibe um `Alert` explicando que a câmera é necessária para a foto de perfil; o cadastro/edição continua funcionando normalmente sem foto |
| Biometria | Ao tocar em "Entrar com biometria" na tela `LoginBiometrico` (somente quando há sensor, biometria cadastrada e token salvo no cofre) | Cancelamento (`user_cancel`) é tratado como escolha sem erro; em falha ou ausência de sensor/biometria, o link "Entrar com e-mail e senha" permanece sempre visível |
| Localização (GPS) | Ao abrir ou tocar em "Onde estou?" na tela `Como chegar / Mapa da clínica` (`requestForegroundPermissionsAsync`) | O mapa e o endereço da clínica permanecem sempre visíveis; se puder perguntar de novo (`canAskAgain: true`), oferece tentar novamente; se negado permanentemente (`canAskAgain: false`), oferece atalho direto para `Linking.openSettings()` |
| Bluetooth | Ao tocar em "Procurar aparelhos" na tela Sinais vitais (só no modo real). Android 12+: `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT`; Android ≤ 11: localização precisa | A tela avisa que não há permissão, explica como liberar nas configurações e oferece "Digitar os valores manualmente" |
| Notificações | Ao agendar consulta ou acessar a tela de Notificações (`garantirPermissao`) | Se negada, o agendamento conclui normalmente e a tela Confirmada avisa que o lembrete não será disparado; se `canAskAgain: false`, devolve `false` sem insistir e oferece atalho para `Linking.openSettings()` |

### Decisão de Privacidade: Texto do Lembrete na Tela Bloqueada (Aula 8 — Passo 6)

Em discussão da squad sobre privacidade e proteção de dados sensíveis de saúde (LGPD):
- **Problema:** A notificação local é exibida na tela de bloqueio do celular, visível para qualquer pessoa próxima.
- **Risco:** Um texto como *"Consulta com Dr. Fulano, oncologista, às 14h"* expõe publicamente o tratamento de saúde do paciente.
- **Decisão adotada:** O texto do lembrete é estritamente neutro:
  - **Título:** `Lembrete de consulta`
  - **Corpo:** `Você tem uma consulta agendada às HH:mm.`
  - Os dados completos (especialidade, médico, unidade) ficam protegidos e só são visualizados quando o usuário desbloqueia o aparelho e toca na notificação para abrir a tela da consulta.

### Contrato de Notificação Push (App ↔ Servidor da Clínica — Aula 9, Passo 4)

O aplicativo e o servidor da clínica comunicam-se via Expo Push Service segundo o seguinte contrato de dados (`content.data`):

| Campo | Tipo | Obrigatório | Descrição |
|---|---|:---:|---|
| `consultaId` | `string` ou `number` | Sim | Identificador único da consulta no sistema da clínica (ex.: `"c1"` ou `42`). |
| `tela` | `string` | Sim | Rota de destino no aplicativo: deve ser `"Confirmada"` (ou o alias retrocompatível `"DetalheConsulta"`). |

Exemplo de carga enviada pelo servidor da clínica (`POST https://exp.host/--/api/v2/push/send`):
```json
{
  "to": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "Lembrete de consulta",
  "body": "Você tem uma consulta agendada às 14:00.",
  "sound": "default",
  "channelId": "lembretes-consulta",
  "data": {
    "consultaId": "c1",
    "tela": "Confirmada"
  }
}
```

### Arquitetura Combinada: Notificações Locais + Push Remoto (Aula 9 — Passo 7)
- **Lembrete de 1 hora antes:** Fica agendado localmente no próprio aparelho (`src/services/lembretes.js`). Vantagem: funciona offline (mesmo sem internet ou em modo avião).
- **Avisos dinâmicos da clínica:** Chegam via Push Notifications disparados pelo servidor (`src/services/push.js` e scripts de envio). Vantagem: permite que a recepção avise em tempo real sobre atrasos, cancelamentos ou alterações na agenda.
- **Degradação graciosa:** Se o aparelho for um emulador (`Device.isDevice === false`) ou a permissão for negada, o aplicativo continua operando 100% sem falhas, avisando claramente na interface que o paciente continuará recebendo o lembrete local, mas não avisos dinâmicos da clínica.

### Processamento Multithread — Detecção de Conflitos da Agenda (Aula 10)

A conferência de conflitos de horários da clínica foi implementada como uma funcionalidade restrita ao perfil `recepcao` (`GET /agenda/consultas`, `src/services/processamento.js`, `src/hooks/useTarefaPesada.js` e `src/screens/Agenda/SincronizarAgenda.js`), evitando qualquer bloqueio da thread de UI.

#### Medições comparativas (`node front/servidor/medir-processamento.js`, 4.000 consultas / 10 médicos / 2.175 conflitos)

| Estratégia | Tempo medido | Comparações | Atualizações de progresso | Observação |
|---|---|---|---|---|
| `detectarConflitosIngenuo` ($O(n^2)$ síncrono) | **325 ms** | **7.998.000** ($n(n-1)/2$) | 0 (bloqueante) | Congela a thread principal durante o cálculo |
| `detectarConflitosOrdenado` (`Map` + ordenação + sweep-line) | **9 ms** | **6.161** | 0 (síncrono) | ~99,92% menos comparações; saída 100% idêntica à ingênua |
| `detectarConflitos` fatiado (`tamanhoFatia = 100`) | **1.268 ms** | **6.161** | 50 | Fatia pequena demais desperdiça tempo com dezenas de `setTimeout(0)` |
| `detectarConflitos` fatiado (`tamanhoFatia = 500`, **escolhido**) | **211 ms** | **6.161** | 18 | Melhor equilíbrio entre fluidez da UI, feedback de progresso e tempo total |
| `detectarConflitos` fatiado (`tamanhoFatia = 5000`) | **141 ms** | **6.161** | 11 | Agrupa tudo em uma única fatia; volta a concentrar trabalho síncrono em bases maiores |

- **Tamanho de fatia escolhido (`500` itens + `cederAVez()` por médico):** com `100` itens o overhead de agendar dezenas de macrotasks elevou o tempo total para `1.268 ms`; com `5000` itens todo o agrupamento ocorre de uma só vez sem ceder à UI. `500` itens mantém cada bloco rápido, entrega 18 atualizações reais para a barra de progresso e permite cancelamento imediato pelo botão **Cancelar verificação** ou ao sair da tela.
- **Sobre `react-native-worklets`:** `react-native-worklets` seria justificável no desafio se precisássemos processar fluxos contínuos em alta frequência fora da JS thread (como quadros de câmera em tempo real ou streams contínuos de sensores BLE a dezenas de Hz). Para a verificação sob demanda de 4.000 consultas, o algoritmo $O(n \log n)$ agrupado por médico combinado ao fatiamento cooperativo com `setTimeout(0)` já executa em ~211 ms sem adicionar dependências nativas.
- **Preparação para a Aula 11 (Background):** `detectarConflitos` foi escrita em JavaScript puro em `src/services/processamento.js` (sem dependências de React ou UI) e recebe `onProgresso` e `sinal` opcionais, permitindo executar exatamente a mesma lógica em segundo plano quando não houver tela montada.

---

### Mapas na Prática — Mapa da Clínica e Acessibilidade (Aula 12)

A tela `Como chegar` (criada na Aula 6) evoluiu para `MapaClinica.js`, apresentando a localização da unidade em um mapa interativo nativo (`react-native-maps`) na parte superior e mantendo o painel de texto acessível na parte inferior.

#### 1. Registro de Decisão Arquitetural (ADR 001 — Adendo Aula 12): Delegar o traçado de rotas ao app de mapas nativo

- **Contexto:** Os pacientes precisam saber como se deslocar até a clínica. Uma alternativa seria traçar o trajeto passo a passo (turn-by-turn) com polilinhas dentro da própria tela do aplicativo.
- **Decisão:** O ClinicHub **NÃO** traça rotas dentro do aplicativo. A ação "Como chegar" dispara um deep link (`Linking.openURL`) delegando a navegação ao aplicativo padrão de mapas do sistema operacional (`geo:` no Android, `maps:` no iOS).
- **O que se ganha:**
  1. **Custo zero e sem cotas de API:** serviços de rotas (como Google Directions API ou Mapbox Directions) são pagos, cobrados por requisição e exigem faturamento ativo e chaves de API restritas. Delegar ao SO tem custo zero.
  2. **Qualidade e trânsito em tempo real:** aplicativos nativos (Google Maps, Waze, Apple Maps) já possuem navegação por voz, rotas dinâmicas recalculadas com base em acidentes e trânsito ao vivo, além de opções de transporte público, pedestre e carro.
  3. **Privacidade e comodidade para o paciente:** o aplicativo do aparelho já mantém o histórico de locais salvos e preferências de locomoção do usuário.
  4. **Código enxuto e robusto:** a integração é resolvida em poucas linhas com `Linking.openURL` e `Platform.select`.
- **O que se perde:** O paciente sai momentaneamente da interface do ClinicHub para abrir o aplicativo de mapas externo.
- **Por quê:** O ganho em experiência de navegação em tempo real e a eliminação de custos recorrentes de infraestrutura superam amplamente qualquer conveniência de manter o paciente em uma visualização estática e limitada dentro do app.

#### 2. Chave de API de Mapas (Google Maps SDK for Android) e Procedimento para o Build de Produção

- **Responsável na squad:** Guilherme Soares (conforme definido na Aula 5 / ADR 001).
- **Configuração segura fora do Git:** A chave é injetada dinamicamente via `front/app.config.js` consumindo a variável `GOOGLE_MAPS_API_KEY` (definida em `.env`), garantindo que nenhuma chave secreta seja commitada no repositório.
- **Expo Go × Build de Produção:**
  - No **Expo Go**, o Android utiliza chaves embutidas do cliente Expo (no iOS o Apple Maps não requer chave alguma).
  - No **Build próprio de produção** (Aula 15 via EAS Build), a ausência de chave própria ativa causa o sintoma clássico de **"mapa cinza"** (apenas o logo do Google e marcadores são visíveis, sem os tiles das ruas).
- **Pendência explícita para a Aula 15:** A geração e validação da chave com o serviço *Maps SDK for Android* ativado no Google Cloud Console com faturamento habilitado está registrada formalmente como pré-requisito da squad para o build final na Aula 15.

#### 3. Auditoria e Correções de Acessibilidade (Momento 4 — Leitor de Tela TalkBack / VoiceOver)

A squad realizou testes completos de acessibilidade simulando usuários com deficiência visual e ambientes com conectividade degradada:

- **Regra de ouro da arquitetura:** *A informação vive no TEXTO; o mapa é a forma agradável de exibi-la — nunca o contrário.*
- **Correções efetuadas pós-teste com leitor de tela:**
  1. **`accessibilityLabel` no `MapView`:** Sem esse atributo, leitores de tela tratavam a área do mapa como uma imagem muda ou ignoravam o componente. Foi adicionado o anúncio: `"Mapa mostrando a localização da Clínica Centro"`.
  2. **`accessibilityRole="button"` e labels compreensíveis fora de contexto:** Botões como "Onde estou?" foram enriquecidos para o leitor de tela anunciar `"Mostrar minha localização no mapa e enquadrar a clínica"`, e o botão "Ver a clínica" anuncia `"Centralizar mapa na clínica"`.
  3. **Texto copiável (`selectable`):** O endereço completo e o número de telefone receberam a propriedade `selectable`, permitindo que pacientes copiem facilmente os dados para colar em apps de mensagens, chamadas ou transporte.
  4. **Teste sem rede (Modo Avião / Wi-Fi desligado):** Ao desativar a rede, os tiles de imagem do mapa não carregam, deixando a área gráfica cinza. No entanto, o painel inferior em texto garante que o paciente consulte endereço, complementos, telefone e horário de funcionamento normalmente, sem que o app quebre ou fique inutilizável.
  5. **Enquadramento com margem (`edgePadding`):** A chamada a `fitToCoordinates` utiliza `edgePadding: { top: 70, right: 70, bottom: 70, left: 70 }`, evitando que o marcador do usuário ou da clínica fiquem cortados nas bordas do visor.

#### 4. Respostas para Arguição de Fechamento (Momento 4)

1. **O que são latitudeDelta e longitudeDelta? O que acontece se colocar 0.5 em cada um?**
   Representam a amplitude da área visível em graus (altura e largura da "câmera"), funcionando como o inverso do zoom: quanto menor o delta, mais próximo o zoom (ex.: 0.002 = rua; 0.01 = algumas quadras). Se colocarmos 0.5, a câmera afasta bruscamente, enquadrando uma região metropolitana inteira ou estado, perdendo a visão de ruas e bairros próximos.
2. **O mapa funciona agora no Expo Go. Vai funcionar no build de produção da Aula 15? O que precisa acontecer antes?**
   Não funcionará automaticamente no Android se não tiver uma chave própria. No Expo Go o Android usa uma chave embutida do Expo, mas o build de produção exige que a squad cadastre um projeto no Google Cloud com faturamento ativo, ative a API *Maps SDK for Android*, gere a chave restrita ao pacote da aplicação (`app_clinica`) e a configure via `app.config.js` (`GOOGLE_MAPS_API_KEY`).
3. **Um colega escreveu `coordinate={{ latitude: u.lat, longitude: u.lon }}` direto no JSX dentro de um map com 200 marcadores. Qual é o problema e com qual aula se parece?**
   O problema é que objetos literais criados no render geram novas referências na memória a cada ciclo. O `MapView` interpreta que todas as coordenadas mudaram e força o redesenho completo de todos os marcadores, sobrecarregando a thread de JavaScript e congelando a tela ao arrastar o mapa. Esse problema se parece com a **Aula 10** (trabalho excessivo na JS thread bloqueando a UI). A correção é memorizar as coordenadas com `useMemo` e preferir `pinColor` em vez de Views customizadas dentro dos Markers.
4. **Uma paciente cega quer saber o endereço da clínica pelo app. Descreva o caminho que ela percorre. Ele funciona?**
   Sim, funciona com 100% de precisão. Ao abrir o aplicativo com o leitor de tela (TalkBack ou VoiceOver), a usuária navega pelos atalhos e acessa "Como chegar". O leitor anuncia o título da tela e descreve o mapa ("Mapa mostrando a localização da Clínica Centro"). Em seguida, o leitor percorre o painel de texto estruturado, anunciando com clareza o nome da unidade ("Clínica Centro"), o endereço completo ("Av. Paulista, 1200, Bela Vista, São Paulo - SP"), o horário de atendimento e o telefone da recepção. Além disso, a paciente pode dar dois toques no botão "Como chegar" para abrir a navegação guiada por voz do Google Maps ou Apple Maps.

---

## Testes

<!-- Preencher na Aula 14 -->

```bash
[comando para rodar os testes end-to-end]
```

## Build de produção e publicação

<!-- Preencher na Aula 16 -->

[a preencher: passos de geração do build com EAS Build e submissão às lojas]

## Equipe e colaboração

Consulte o combinado de colaboração da squad definido na Aula 1 (branches, padrão de
commit, revisão em pares) para saber como contribuir com este repositório.

## Licença

[a definir pela squad, se aplicável]
