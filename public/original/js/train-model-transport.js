(function (root) {
  'use strict';
  const base = document.currentScript?.src || new URL('/original/js/train-model-transport.js', document.baseURI).href;
  let dedicatedOnly = false;
  function create() {
    if (!dedicatedOnly && typeof root.SharedWorker === 'function') {
      try {
        const shared = new root.SharedWorker(new URL('phoneme-shared-worker.js?v=1',base), {
          type:'module', name:'corex-phoneme-v7', extendedLifetime:true,
        });
        const port = shared.port;
        const client = {
          shared:true,
          postMessage(data, transfer) { port.postMessage(data,transfer); },
          terminate() { try { port.postMessage({ type:'disconnect' }); } catch { /* A crashed port may already be closed. */ } port.close(); },
          set onmessage(handler) { port.onmessage = handler; },
          set onerror(handler) { shared.onerror = handler; port.onmessageerror = handler; },
        };
        port.start(); return client;
      } catch { dedicatedOnly = true; }
    }
    return new root.Worker(new URL('phoneme-worker.js?v=7',base), { type:'module' });
  }
  root.TrainModelTransport = { create, fallback() { dedicatedOnly = true; } };
})(window);
