// Keep one local inference runtime across the landing page and practice pages.
// Model progress is public; recognition results are returned only to their caller.
const ports = new Set(), requests = new Map();
let counter = 0, modulePromise, inferenceQueue = Promise.resolve();
function send(port, data) {
  try { port.postMessage(data); } catch { ports.delete(port); }
}
self.postMessage = data => {
  if (data.type === 'download') {
    for (const port of ports) send(port,data);
    return;
  }
  const request = requests.get(data.id); if (!request) return;
  requests.delete(data.id);
  if (ports.has(request.port)) send(request.port,{ ...data, id:request.id });
};
self.onconnect = event => {
  const port = event.ports[0]; ports.add(port);
  const disconnect = () => {
    ports.delete(port);
    for (const [id, request] of requests) if (request.port === port) requests.delete(id);
  };
  port.addEventListener('close',disconnect);
  port.onmessageerror = disconnect;
  port.onmessage = event => {
    const data = event.data;
    if (data.type === 'disconnect') { disconnect(); port.close(); return; }
    const id = ++counter;
    requests.set(id,{ port, id:data.id });
    const invoke = async () => {
      try {
        modulePromise ||= import('./phoneme-worker.js?v=7');
        await modulePromise;
        await self.onmessage({ data:{ ...data, id } });
      } catch (error) {
        modulePromise = undefined;
        self.postMessage({ id, error:String(error.message || error) });
      }
    };
    // ONNX inference is serialized so two tabs cannot race the same WASM session.
    if (data.type === 'load') void invoke();
    else inferenceQueue = inferenceQueue.then(invoke);
  };
  port.start();
};
