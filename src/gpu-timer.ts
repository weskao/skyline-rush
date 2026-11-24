/** Non-blocking WebGL2 timer queries. Never read QUERY_RESULT before availability. */
type TimerExtension = { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number };
export type GpuTimerStatus = 'available' | 'unsupported' | 'disjoint' | 'context-lost' | 'disposed';
export function createGpuTimer(gl: WebGL2RenderingContext, limit = 32) {
  let ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
  let status: GpuTimerStatus = ext ? 'available' : 'unsupported';
  let active = false;
  const pending: { query: WebGLQuery; receive: (ms: number) => void }[] = [];
  function clear() {
    if (!gl.isContextLost()) for (const { query } of pending) gl.deleteQuery(query);
    pending.length = 0;
  }
  function valid(): boolean {
    if (status === 'disposed') return false;
    if (gl.isContextLost()) { clear(); status = 'context-lost'; return false; }
    if (status === 'context-lost') return false;
    if (!ext) return false;
    if (gl.getParameter(ext.GPU_DISJOINT_EXT)) { clear(); status = 'disjoint'; return false; }
    status = 'available'; return true;
  }
  return {
    get status() { return status; },
    poll() {
      if (!valid()) return;
      while (pending.length) {
        const item = pending[0]!;
        if (!gl.getQueryParameter(item.query, gl.QUERY_RESULT_AVAILABLE)) break;
        if (!valid()) return;
        pending.shift();
        const ns = Number(gl.getQueryParameter(item.query, gl.QUERY_RESULT));
        gl.deleteQuery(item.query);
        if (Number.isFinite(ns) && ns >= 0) item.receive(ns / 1e6);
      }
    },
    measure(receive: (ms: number) => void, draw: () => void) {
      if (active || pending.length >= limit || !valid() || !ext) { draw(); return; }
      const query = gl.createQuery();
      if (!query) { draw(); return; }
      const target = ext.TIME_ELAPSED_EXT;
      gl.beginQuery(target, query); active = true;
      let completed = false;
      try { draw(); completed = true; }
      finally {
        active = false;
        if (!gl.isContextLost()) {
          gl.endQuery(target);
          if (completed) pending.push({ query, receive }); else gl.deleteQuery(query);
        } else { clear(); status = 'context-lost'; }
      }
    },
    contextLost() { clear(); status = 'context-lost'; },
    restore() {
      if (status === 'disposed') return;
      clear(); ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExtension | null;
      status = ext ? 'available' : 'unsupported';
    },
    dispose() { clear(); status = 'disposed'; },
  };
}
