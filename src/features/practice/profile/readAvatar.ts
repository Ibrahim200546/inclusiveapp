export function readAvatar(file: File, signal: AbortSignal): Promise<string> {
  if (file.size > 2 * 1024 * 1024) return Promise.reject(new Error('image-size'));
  if (!file.type.startsWith('image/')) return Promise.reject(new Error('image-type'));
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const cleanup = () => signal.removeEventListener('abort', abort);
    const abort = () => { reader.abort(); cleanup(); reject(new DOMException('Aborted', 'AbortError')); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    reader.onload = () => { cleanup(); resolve(String(reader.result)); };
    reader.onerror = () => { cleanup(); reject(new Error('image-read')); };
    reader.readAsDataURL(file);
  });
}
