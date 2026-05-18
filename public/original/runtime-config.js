(function configureInclusiveRuntime() {
  var nativeApiBaseUrl = 'https://edu-corex.kz';

  function normalizeBaseUrl(value) {
    return String(value || '').trim().replace(/\/+$/, '');
  }

  function isCapacitorNative() {
    try {
      return Boolean(
        window.Capacitor &&
          (window.Capacitor.isNativePlatform?.() ||
            (window.Capacitor.getPlatform?.() && window.Capacitor.getPlatform() !== 'web'))
      );
    } catch (error) {
      return false;
    }
  }

  function isNativeBundle() {
    var protocol = window.location.protocol;
    var hostname = window.location.hostname;

    return (
      protocol === 'capacitor:' ||
      protocol === 'ionic:' ||
      protocol === 'file:' ||
      protocol === 'edu-corex:' ||
      (isCapacitorNative() && (hostname === 'localhost' || hostname === '127.0.0.1'))
    );
  }

  window.INCLUSIVE_SUPABASE_URL =
    window.INCLUSIVE_SUPABASE_URL || 'https://mmugalgqdapidqqxekqt.supabase.co';
  window.INCLUSIVE_SUPABASE_ANON_KEY =
    window.INCLUSIVE_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tdWdhbGdxZGFwaWRxcXhla3F0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5MDQzMTMsImV4cCI6MjA4NjQ4MDMxM30.b96o0Z-24rs2pczsPSDG8jP1UwbCuCCxxQEiZ_6wil8';
  window.INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY =
    window.INCLUSIVE_SUPABASE_AUTH_STORAGE_KEY || 'sb-mmugalgqdapidqqxekqt-auth-token';
  window.INCLUSIVE_API_BASE_URL =
    normalizeBaseUrl(window.INCLUSIVE_API_BASE_URL) || (isNativeBundle() ? nativeApiBaseUrl : '');

  if (!window.INCLUSIVE_API_BASE_URL || !window.fetch || window.fetch.__inclusiveApiBasePatched) {
    return;
  }

  var originalFetch = window.fetch.bind(window);
  var apiBaseUrl = window.INCLUSIVE_API_BASE_URL;

  function resolveApiInput(input) {
    if (typeof input === 'string' && input.startsWith('/api/')) {
      return apiBaseUrl + input;
    }

    if (input instanceof URL && input.pathname.startsWith('/api/')) {
      return new URL(input.pathname + input.search + input.hash, apiBaseUrl);
    }

    return input;
  }

  window.fetch = function inclusiveRuntimeFetch(input, init) {
    return originalFetch(resolveApiInput(input), init);
  };
  window.fetch.__inclusiveApiBasePatched = true;
})();
