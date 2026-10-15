# 004: Bluetooth (sinais vitais): como passar do modo simulado para o modo real

| | |
|---|---|
| **Squad** | Clinic Hub |
| **Aula** | 7: Comunicação via Bluetooth (BLE) |
| **Situação** | Implementado em **modo simulado**. O modo real já está pronto no código, mas ainda não foi testado em aparelho |
| **Arquivos envolvidos** | `front/src/services/bluetooth.js`, `front/src/screens/Consulta/SinaisVitais.js`, `front/src/screens/Confirmada/Confirmada.js`, `front/src/services/api.js`, `front/servidor/auth-api.js`, `front/app.json` |

---

## 1. Como a funcionalidade está organizada

```
Consulta (tela Confirmada)
   └── botão "Importar sinais vitais"
         └── SinaisVitais.js  ── só conhece ──▶  services/bluetooth.js
                    │                               ├── criarServicoBleSimulado()  (MODO_SIMULADO = true)
                    │                               └── criarServicoBleReal()      (MODO_SIMULADO = false)
                    └── post('/sinais-vitais') ──▶  servidor/auth-api.js (prontuário em memória)
```

- **A tela não sabe se o aparelho é real ou simulado.** Ela só chama a interface do service:
  - `procurar(aoEncontrar)`;
  - `pararBusca()`;
  - `conectar(id)`;
  - `monitorarFrequencia(aoReceber)`;
  - `desconectar()`.
- **A decisão entre os dois modos fica em uma única linha:** a constante `MODO_SIMULADO` no topo de `front/src/services/bluetooth.js`.
- **A biblioteca `react-native-ble-plx` só é carregada no modo real.** O `require` dela está dentro de `criarServicoBleReal()`, e é por isso que o app abre no Expo Go enquanto estiver no modo simulado.
- **A biblioteca já está instalada e configurada.** As dependências `react-native-ble-plx` e `buffer` estão no `package.json`, e o plugin `react-native-ble-plx` já está em `app.json`. O plugin adiciona as permissões de Bluetooth no Android e no iOS quando o build nativo é gerado.

> **Importante:** o modo real **NÃO funciona no Expo Go**. A biblioteca usa código nativo, e o Expo Go só traz um conjunto fixo de bibliotecas nativas. Para o modo real é obrigatório um **development build**, que é um app próprio instalado no celular no lugar do Expo Go. O push notification (ADR 002) também vai exigir esse build, então ele serve para os dois recursos.

---

## 2. Passo a passo para ativar o modo real

### 2.1. O que é preciso

| Item | Observação |
|---|---|
| Celular **Android físico** com Bluetooth | O emulador do Android **não tem Bluetooth**. No iOS é preciso um Mac com Xcode e conta Apple. |
| Um **periférico de frequência cardíaca** | Veja a seção 3. O aparelho precisa anunciar o serviço padrão *Heart Rate* (`0x180D`). |
| Conta no Expo (para EAS) **ou** Android Studio com o SDK instalado (para build local) | Escolha um dos dois caminhos do item 2.3. |
| A API rodando (`npm run auth-api`) | É a API que grava no prontuário. |

### 2.2. Trocar a constante

Em `front/src/services/bluetooth.js`:

```js
// antes
export const MODO_SIMULADO = true;

// depois
export const MODO_SIMULADO = false;
```

Não há mais nada para mudar no código. As telas continuam iguais.

> O bloco `FALHAS_SIMULADAS`, logo abaixo da constante, só vale no modo simulado. No modo real ele é ignorado.

### 2.3. Gerar o development build

Rode tudo dentro de `front/`. No PowerShell deste ambiente, use `npx.cmd` no lugar de `npx`.

Primeiro, instale o cliente de desenvolvimento. Isso é feito **uma vez só**:

```bash
npx.cmd expo install expo-dev-client
```

**Caminho A: EAS Build (na nuvem, não exige Android Studio)**

```bash
npm.cmd install -g eas-cli
eas login                       # conta gratuita em expo.dev
eas build:configure             # cria o eas.json (aceite as opções padrão)
eas build --profile development --platform android
```

1. No fim, o EAS mostra um link e um QR Code para baixar o **APK**. Instale esse APK no celular.
2. Depois, sempre que for desenvolver:

   ```bash
   npx.cmd expo start --dev-client
   ```

3. Abra o app **ClinicHub** instalado (não o Expo Go) e conecte ao servidor que aparece na lista ou pelo QR Code.

**Caminho B: build local (exige Android Studio, JDK 17 e o celular com depuração USB ligada)**

```bash
npx.cmd expo run:android
```

Esse comando gera a pasta `android/`, compila o projeto e instala o app direto no celular conectado por USB.

> **Atenção:** a pasta `android/` é gerada automaticamente. Ela não precisa ir para o Git, desde que o projeto continue usando o *prebuild* do Expo.

> **Atenção:** sempre que mudar `app.json` ou instalar outra biblioteca nativa, é preciso **gerar o build de novo**. Mudanças só de JavaScript não exigem isso: o development build recarrega o código normalmente.

### 2.4. Apontar o app para a API

No celular físico, `localhost` aponta para o próprio celular. Em `front/src/services/api.js`, troque o endereço pelo IP do computador que está rodando a API. O celular e o computador precisam estar na mesma rede Wi-Fi.

```js
const BASE_URL = 'http://192.168.0.X:3001';
```

No Windows, o IP aparece com o comando `ipconfig`, no campo "Endereço IPv4". Se o celular não conseguir acessar a API, libere a porta 3001 no Firewall do Windows.

### 2.5. Testar

1. Ligue o Bluetooth do celular e o periférico.
2. Abra o app, faça login e vá em **Minhas Consultas**.
3. Abra uma consulta **próxima**.
4. Toque em **Importar sinais vitais**.
5. Toque em **Procurar aparelhos** e **aceite as permissões** que o Android pedir.
6. Toque no aparelho encontrado e espere pelo menos 3 leituras.
7. Toque em **Importar para o prontuário**.
8. A tela da consulta deve mostrar a frequência cardíaca média.
9. No terminal da API, deve aparecer `sinal vital #N gravado`.

---

## 3. Sem um monitor cardíaco: o que usar como periférico

O escaneamento procura **apenas** aparelhos que anunciam o serviço *Heart Rate* (`0x180D`). Fones, TVs e outros aparelhos Bluetooth por perto não aparecem na lista, e isso é de propósito.

| Opção | Como usar |
|---|---|
| Cinta cardíaca (Polar H10, Garmin HRM, Coospo, Magene etc.) | Coloque a cinta no corpo. A maioria só começa a anunciar quando detecta batimento. |
| Relógio com "transmitir frequência cardíaca" (Garmin, Amazfit, alguns Xiaomi) | Ative a função de transmissão (*broadcast HR*) no relógio. |
| **nRF Connect for Mobile** (app gratuito da Nordic) em **outro** celular Android | Vá em *Configure GATT server* e adicione o serviço *Heart Rate*. Depois, em *Advertiser*, anuncie esse serviço. Serve para testar a conexão; os valores são enviados manualmente pelo app. |

---

## 4. Permissões (já tratadas no código)

`pedirPermissoes()`, em `bluetooth.js`, pede as permissões conforme a versão do Android:

| Versão do Android | Permissões pedidas |
|---|---|
| 12 ou mais nova (API 31+) | `BLUETOOTH_SCAN` e `BLUETOOTH_CONNECT` |
| 11 ou mais antiga | `ACCESS_FINE_LOCATION`. Antes do Android 12, escanear aparelhos Bluetooth exigia permissão de localização. |

| Situação | Comportamento do app |
|---|---|
| Permissão negada | A tela mostra "Sem permissão de Bluetooth... libere nas configurações ou digite os valores manualmente". |
| Bluetooth desligado | A busca termina sem aparelhos e mostra a mensagem que pede para ligar o Bluetooth. |
| Usuário negou a permissão com "não perguntar de novo" | O Android não mostra mais o pedido. É preciso liberar em *Configurações → Apps → ClinicHub → Permissões*. |

**Opcional:** os textos das permissões no iOS podem ser personalizados em `app.json`, trocando a entrada do plugin por:

```json
["react-native-ble-plx", {
  "isBackgroundEnabled": false,
  "bluetoothAlwaysPermission": "O ClinicHub usa o Bluetooth para importar seus sinais vitais antes da consulta."
}]
```

---

## 5. Testes de falha (Passo 4 da atividade)

No modo simulado, as falhas são ligadas no bloco `FALHAS_SIMULADAS` de `bluetooth.js`:

```js
export const FALHAS_SIMULADAS = {
  semAparelhos: false,       // a busca termina sem encontrar nada
  erroAoConectar: false,     // conectar() lança erro
  perderConexaoApos: 0,      // para de emitir após N leituras (0 = nunca)
};
```

| # | Cenário | Como provocar | Comportamento esperado |
|---|---|---|---|
| 20 | Busca sem resultado | `semAparelhos: true` | Depois de 8 s, a tela mostra **"Nenhum aparelho encontrado"**, explica o que verificar (aparelho ligado, bateria, distância, Bluetooth do celular) e oferece "Procurar novamente" e "Digitar os valores manualmente". |
| 21 | Falha ao conectar | `erroAoConectar: true` | Depois de 1,2 s de "Conectando...", a tela volta para a lista e mostra o erro com orientação ("Verifique se ele está ligado, com bateria e perto do celular"), não apenas "erro". |
| 22 | Conexão perdida no meio | `perderConexaoApos: 4` | Depois da 4ª leitura, as leituras param. Em até 5 s, o valor vira **"--"**, o coração fica cinza e aparece **"Sinal perdido"** com orientação. O último valor não fica na tela como se fosse atual. |
| 23 | Sair da tela conectado | Conectar e tocar em voltar | O console do Metro mostra `[bluetooth simulado] desconectar() chamado`. O `useEffect` da tela libera o aparelho ao desmontar. |
| 24 | Permissão negada | Só no modo real: negar no diálogo do Android | A tela avisa que não há permissão e indica como resolver. Não falha em silêncio. |
| extra | API desligada na hora de importar | Parar o `npm run auth-api` | A tela mostra "Não foi possível falar com o servidor..." e as leituras continuam na tela para tentar de novo. |
| extra | Sessão expirada | Reiniciar a API (os tokens são guardados em memória) | A tela avisa que a sessão expirou e o app volta para o login. |

**Lembre-se de voltar todas as flags para `false` / `0` antes do commit.**

---

## 6. Problemas comuns no modo real

| Sintoma | Causa provável | Solução |
|---|---|---|
| App fecha ao abrir a tela, ou mensagem "O Bluetooth não está disponível nesta versão do app" | Rodando no **Expo Go** com `MODO_SIMULADO = false` | Use o development build (item 2.3) ou volte para `true`. |
| `BleManager` is null / native module not found | O build foi gerado antes de instalar a biblioteca | Gere o development build de novo. |
| Nenhum aparelho aparece | O periférico não anuncia `0x180D`, o Bluetooth ou a localização do celular estão desligados, ou a permissão foi negada | Teste com o nRF Connect. Em Android ≤ 11, ligue também a **localização** do celular. |
| Conecta, mas não chega leitura | O aparelho não envia notificações da característica `0x2A37` | Confira no nRF Connect se a característica *Heart Rate Measurement* tem a propriedade *Notify*. |
| "Não foi possível falar com o servidor" | `BASE_URL` com `localhost` no celular físico, ou firewall bloqueando | Veja o item 2.4. |

---

## 7. Para voltar ao modo simulado

Em `bluetooth.js`, volte a constante para `MODO_SIMULADO = true`. O app volta a funcionar no Expo Go normalmente. Não precisa desinstalar nada.

## 8. Próximas melhorias possíveis (Passo 6, extensão)

- Ler o nível de bateria do periférico (serviço `0x180F`, característica `0x2A19`) e mostrar ao lado do nome. Basta acrescentar um método ao service, sem mexer na lógica da tela.
- Reconectar sozinho quando a conexão cair, com limite de tentativas (por exemplo, 3) para não entrar em laço infinito.
- Teste unitário de `decodificarFrequencia()`. A função é pura e não depende de hardware, então adianta a Aula 14.
