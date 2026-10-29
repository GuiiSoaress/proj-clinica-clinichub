// src/services/localizacao.js
// Isola o acesso ao GPS (expo-location) e os cálculos geográficos (Aula 6).
// Nenhuma tela deve importar 'expo-location' diretamente: se o provedor ou a
// estratégia de leitura mudar, só este arquivo muda.

import * as Location from 'expo-location';

// Coordenadas fixas da unidade principal (Av. Paulista, 1200 - São Paulo/SP).
// Pendência consciente: na Aula 5 vimos como obter coordenadas via geocoding
// e na Aula 12 este endereço será exibido em um mapa real (ADR 001).
export const COORDENADAS_CLINICA = {
  latitude: -23.5632,
  longitude: -46.6544,
};

const RAIO_TERRA_KM = 6371;

// Velocidades médias urbanas usadas apenas para estimativa simples em linha reta.
const VELOCIDADE_CARRO_KMH = 25;
const VELOCIDADE_CAMINHADA_KMH = 4.8;

/**
 * Erro lançado quando o usuário nega a permissão de localização.
 * Guarda `canAskAgain` para a tela decidir se oferece "Tentar novamente"
 * ou um atalho para as configurações do sistema (`Linking.openSettings()`).
 */
export class PermissaoNegada extends Error {
  constructor(canAskAgain) {
    super(
      canAskAgain
        ? 'Permissão de localização não concedida.'
        : 'Permissão de localização negada permanentemente.'
    );
    this.name = 'PermissaoNegada';
    this.canAskAgain = Boolean(canAskAgain);
  }
}

function grausParaRadianos(graus) {
  return (graus * Math.PI) / 180;
}

/**
 * Calcula a distância em linha reta entre dois pontos na superfície da Terra
 * usando a fórmula de Haversine (retorno em quilômetros).
 * @param {{ latitude: number, longitude: number }} origem
 * @param {{ latitude: number, longitude: number }} destino
 * @returns {number} Distância em km.
 */
export function distanciaKm(origem, destino) {
  const dLat = grausParaRadianos(destino.latitude - origem.latitude);
  const dLon = grausParaRadianos(destino.longitude - origem.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(grausParaRadianos(origem.latitude)) *
      Math.cos(grausParaRadianos(destino.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return RAIO_TERRA_KM * c;
}

/**
 * Formata uma distância em km para exibição amigável:
 * abaixo de 1 km mostra em metros; a partir de 1 km mostra com 1 casa decimal.
 * @param {number} km
 * @returns {string}
 */
export function formatarDistancia(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1).replace('.', ',')} km`;
}

/**
 * Calcula uma estimativa aproximada de tempo de deslocamento a partir da
 * distância em linha reta (não substitui um serviço de rotas real).
 * @param {number} km
 * @returns {{ carroMin: number, caminhadaMin: number, resumo: string }}
 */
export function estimarTempo(km) {
  const carroMin = Math.max(1, Math.round((km / VELOCIDADE_CARRO_KMH) * 60));
  const caminhadaMin = Math.max(1, Math.round((km / VELOCIDADE_CAMINHADA_KMH) * 60));

  const formatarMin = (min) => {
    if (min < 60) return `~${min} min`;
    const h = Math.floor(min / 60);
    const resto = min % 60;
    return resto > 0 ? `~${h}h ${resto}min` : `~${h}h`;
  };

  const resumo =
    km <= 1.5
      ? `${formatarMin(caminhadaMin)} a pé · ${formatarMin(carroMin)} de carro`
      : `${formatarMin(carroMin)} de carro · ${formatarMin(caminhadaMin)} a pé`;

  return { carroMin, caminhadaMin, resumo };
}

/**
 * Solicita permissão em primeiro plano e lê a posição atual do aparelho.
 * Usa `Accuracy.Balanced` para poupar bateria e responder rápido sem perder
 * utilidade na estimativa até a clínica.
 *
 * @returns {Promise<{ latitude: number, longitude: number, precisao: number | null }>}
 * @throws {PermissaoNegada} Quando o usuário recusa a permissão.
 */
export async function obterPosicaoAtual() {
  const permissao = await Location.requestForegroundPermissionsAsync();

  if (permissao.status !== 'granted') {
    throw new PermissaoNegada(permissao.canAskAgain);
  }

  const atual = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: atual.coords.latitude,
    longitude: atual.coords.longitude,
    precisao: atual.coords.accuracy ?? null,
  };
}
