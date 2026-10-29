// src/polyfills.js
// React Native 0.88+ (Expo SDK 58) removeu InteractionManager do core com um
// getter configurável que dispara erro em modo de desenvolvimento (__DEV__),
// mas bibliotecas de navegação (@react-navigation/stack) ainda o consultam.

const ReactNative = require('react-native');

const interactionManagerShim = {
  Events: {
    interactionStart: 'interactionStart',
    interactionComplete: 'interactionComplete',
  },
  runAfterInteractions(task) {
    let cancelado = false;
    const timer = setTimeout(() => {
      if (cancelado) return;
      if (typeof task === 'function') {
        task();
      } else if (task && typeof task.gen === 'function') {
        task.gen();
      }
    }, 0);

    const promessa = Promise.resolve();
    return {
      then: promessa.then.bind(promessa),
      done: promessa.then.bind(promessa),
      cancel() {
        cancelado = true;
        clearTimeout(timer);
      },
    };
  },
  createInteractionHandle() {
    return 1;
  },
  clearInteractionHandle() {},
  setDeadline() {},
};

try {
  Object.defineProperty(ReactNative, 'InteractionManager', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: interactionManagerShim,
  });
} catch (e) {
  // Ignora caso a propriedade não possa ser redefinida
}
