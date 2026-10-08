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
| `Docs/` | ADRs em `.docx` (001 serviço de mapas, 002 push notifications, 003 SMS), `Link Figma.txt` e imagem do protótipo. |
| `README.md` | Descrição do projeto, squad e checklist de funcionalidades (ainda com trechos do template). |
| `package-lock.json` (raiz) | Resquício; as dependências reais ficam em `front/`. |

## Decisões arquiteturais (ADRs em `Docs/`)

Os três ADRs são do squad "Clinic Hub", datados de 03/09/2026, com situação **Proposta** (ainda não implementados). Todos seguem o mesmo modelo: contexto, opções, decisão, consequências, plano B e sinais de falha.

| ADR | Decisão | Pré-requisitos / riscos | Responsável | Prazo |
|---|---|---|---|---|
| 001 — Serviço de mapas | `react-native-maps` com **Google Maps** (alternativas: Mapbox, deep link para o app de mapas). | Projeto no Google Cloud, Maps SDK, chave Android e faturamento cadastrado. Cobrança acima da cota gratuita; vazamento da chave gera uso indevido. | Guilherme Soares | Aula 12 |
| 002 — Push notifications | **Expo Push Service** para o lembrete de consulta (alternativas: FCM direto, OneSignal). | Exige **development build via EAS Build**: o app deixa de rodar no Expo Go padrão no Android. Coletar o token de push por paciente. Dependência de serviço externo. | Guilherme dos Anjos | Aula 9 |
| 003 — SMS | **Gateway** (Twilio ou Zenvia, a definir) para confirmar/cancelar consulta automaticamente pelo backend; `expo-sms` descartado por exigir envio manual. | Conta e número verificado no gateway; custo por SMS após a cota de teste. **Credenciais ficam só no servidor, nunca no app.** | João Colleto | Aula 13 |

**Planos B:**
- Mapa: mostrar o endereço da clínica em texto (ou migrar para Mapbox).
- Push: exibir o lembrete dentro do app, na lista de consultas (ou migrar para FCM).
- SMS: notificação interna avisando que o SMS não pôde ser enviado.

**Regra de arquitetura comum:** cada serviço de terceiro fica isolado em um único arquivo/módulo (integração de mapas, serviço de SMS), para que trocar de provedor não afete as telas.

**Implicações para o backend:** o SMS e a entrega de lembretes dependem de um servidor (a API da clínica tem as datas, mas não entrega notificações nem renderiza mapas). O `back/` precisará existir para o SMS automático.


## Estado atual

- **Concluído:** projeto configurado e versionado no Git; as 7 telas do paciente (Login, Início, Agendar, Confirmar, Confirmada, Minhas Consultas, Perfil) implementadas a partir do protótipo.
- **Em mock:** todos os dados vêm de `front/src/data/mock.js` e do estado local em `front/src/context/AppContext.js`. Não há chamada de API nas telas.
- **Não iniciado:** backend/API, autenticação real, câmera, biometria real, GPS, Bluetooth, push, SMS, mapas, background, telas de médico/recepção.
- **Legado:** `front/mockup/db_clinica.json` (base do `json-server`, com `medicos` e `pacientes`) e `front/src/services/api.js` (`BASE_URL`, hoje sem uso). As telas e o CRUD de médicos anteriores foram removidos; estão no histórico do Git.

## Comandos

Rodar sempre dentro de `front/`:

```
npm install
npm start          # expo start (a: Android, w: web)
npm run android | ios | web
```

No PowerShell deste ambiente a política de execução bloqueia `npx`; use `npx.cmd` (ex.: `npx.cmd expo install <pacote>`). Para dependências Expo, prefira `expo install` para obter versões compatíveis com o SDK 54.

Não há testes nem linter configurados. Verificação rápida de que tudo compila: `npx.cmd expo export --platform web --output-dir <pasta-temporária>` (apague a pasta depois).

## Convenções

- Idioma: código de domínio, textos de UI e comentários em **português** (pt-BR); identificadores de infraestrutura em inglês.
- Preserve comentários existentes que não tenham relação com a mudança.
- Mudanças de dependência devem passar por `expo install` e manter `front/package.json` e `front/package-lock.json` coerentes.
- Decisões de arquitetura (mapas, push, SMS) estão nos ADRs de `Docs/`; consulte-os antes de escolher provedores.
- Ao concluir uma funcionalidade do checklist, marque-a no `README.md`.

## Próximos passos prováveis

1. Subir uma API (ou `json-server` sobre `db_clinica.json`) e trocar `mock.js` por chamadas via `services/api.js`.
2. Autenticação real e biometria no Login.
3. Push (ADR 002, Aula 9): gerar development build com EAS Build e coletar o token por paciente.
4. Mapas (ADR 001, Aula 12): chave do Google Maps + `react-native-maps` na tela Confirmar, em módulo isolado.
5. SMS (ADR 003, Aula 13): gateway Twilio/Zenvia acionado pelo backend.
6. Foto de perfil (câmera), GPS para a distância até a clínica.
7. Preencher o README final e atualizar esta documentação.

