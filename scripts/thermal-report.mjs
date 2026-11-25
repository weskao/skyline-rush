// A completed probe must contain measurements, not merely a successfully resolved browser call.
export function validateThermalRecord(record, { id, phase }, frames) {
  const key = `${phase === 'racing' ? 'racing' : 'home'}/${id}`;
  const report = record?.diagnostics?.reports?.[key];
  const requireEvidence = (condition, reason) => {
    if (!condition) throw Error(`Missing thermal evidence for ${phase}/${id}: ${reason}`);
  };
  requireEvidence(record?.track === id && record.scenario === phase && record.seed === 12345 && record.requestedFrames === frames, 'scenario identity');
  requireEvidence(Number.isInteger(record.drawnCount) && record.drawnCount >= 2 && record.drawnCount <= frames, 'presented frames');
  requireEvidence(Number.isFinite(record.startDistance) && Number.isFinite(record.endDistance) && (phase !== 'racing' || (record.endPhase === 'racing' && record.endDistance > record.startDistance)), 'continuous driving');
  requireEvidence(record.diagnostics?.current === key && report && !report.mixedConfig && report.config?.targetWidth > 0 && report.config?.targetHeight > 0 && report.config?.targetFps === 60, 'stable render config');
  requireEvidence(report.load?.drawCalls > 0 && report.load?.triangles > 0, 'renderer counters');
  for (const metric of ['cpuSimulationMs', 'cpuRenderSubmissionMs', 'frameIntervalMs']) {
    requireEvidence(report.metrics?.[metric]?.count > 0, metric);
  }
  requireEvidence(['available', 'unsupported', 'disjoint', 'context-lost'].includes(record.diagnostics.gpuStatus), 'GPU query status');
}
