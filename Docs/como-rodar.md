# Guia: Como Rodar o ClinicHub

Este guia detalha o passo a passo para configurar e executar o projeto **ClinicHub** localmente.

---

## 1. Pré-requisitos

- **Node.js** (versão 18 ou superior instalada).
- **Gerenciador de pacotes npm**.
- App **Expo Go** instalado no celular (Android/iOS) ou um navegador moderno para testes web.

---

## 2. Instalação das dependências

Todas as dependências da aplicação ficam concentradas dentro da pasta `front/`.

Abra o terminal e execute:

```powershell
cd front
npm install
```

> [!TIP]
> **Atenção no Windows (PowerShell):**  
> Se você receber o erro `O arquivo npm.ps1 não pode ser carregado porque a execução de scripts foi desabilitada neste sistema`, utilize o executável direto:
> ```powershell
> npm.cmd install
> ```

---

## 3. Executando o Projeto

O projeto depende de **dois serviços rodando simultaneamente**:

### 3.1. Terminal 1: Servidor de Autenticação e Mock (API)

O aplicativo consome uma API local em Node.js para autenticação, listagem de médicos e registro de sinais vitais na porta **3001**.

No primeiro terminal, acesse a pasta `front/` e inicie a API:

```powershell
cd front
npm run auth-api
```
*(No PowerShell com restrição de scripts: `npm.cmd run auth-api`)*

O terminal indicará: `API de autenticação da clínica ouvindo em http://0.0.0.0:3001`.

#### Credenciais de Teste:
| Perfil | E-mail | Senha |
|---|---|---|
| Recepção | `recepcao@clinica.com` | `clinica123` |
| Médico | `joao@clinica.com` | `medico123` |

---

### 3.2. Terminal 2: Servidor Expo / Metro Bundler (Front-end)

Em um segundo terminal, acesse a pasta `front/` e inicie o Metro Bundler do Expo:

```powershell
cd front
npx expo start
```
*(No PowerShell com restrição de scripts: `npx.cmd expo start`)*

---

## 4. Visualizando o Aplicativo

Com o Expo em execução no Terminal 2, escolha uma das formas abaixo para abrir o app:

### Opção A: No Navegador Web
- Pressione a tecla **`w`** no terminal do Expo, ou abra diretamente no navegador:  
  **`http://localhost:8081`**

### Opção B: No Celular Físico (Expo Go)
1. Conecte o celular na mesma rede Wi-Fi do computador.
2. Descubra o IP local da sua máquina (via `ipconfig` no terminal, ex.: `192.168.1.15`).
3. Abra o arquivo `front/src/services/api.js` e aponte a URL para o seu IP:
   ```javascript
   const BASE_URL = 'http://192.168.1.15:3001';
   ```
4. No terminal do Expo, escaneie o QR Code com a câmera (iOS) ou com o app Expo Go (Android).

### Opção C: No Emulador Android
- Com o emulador do Android Studio já aberto e em execução, pressione a tecla **`a`** no terminal do Expo.

---

## 5. Resolução de Problemas Frequentes

### 1. `PluginError: Failed to resolve plugin for module "react-native-ble-plx"`
- **Causa:** O pacote `react-native-ble-plx` está declarado no `app.json`, mas não foi baixado na pasta `node_modules`.
- **Solução:** Rode `npm.cmd install` na pasta `front/`.

### 2. `ExecutionPolicy / PSSecurityException` no PowerShell
- **Causa:** O Windows bloqueia scripts `.ps1` não assinados por padrão.
- **Solução:** Adicione a extensão `.cmd` aos comandos (`npm.cmd install`, `npm.cmd run auth-api`, `npx.cmd expo start`).

### 3. Falha de Login no Celular (`Network request failed`)
- **Causa:** O app no celular está tentando conectar em `localhost:3001`, que no celular aponta para o próprio aparelho e não para o computador.
- **Solução:** Atualize `BASE_URL` em `front/src/services/api.js` com o endereço IPv4 da sua máquina na rede local.
