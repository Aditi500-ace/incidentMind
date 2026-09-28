export async function retainResolution(r: Resolution) {
  const content = [
    `Service: ${r.service}`,
    `Confirmed root cause: ${r.confirmedRootCause}`,
    `Mitigation that worked: ${r.mitigation}`,
    r.detectionGap && `Earlier signal we missed: ${r.detectionGap}`,
  ].filter(Boolean).join("\n");

  await hindsight.retain(bankFor(r.service), content, {
    documentId: `incident:${r.incidentId}`,   // idempotent re-retain
    timestamp: r.resolvedAt,                  // lets temporal recall work
  });
  await db.update(resolutions)
    .set({ retainedAt: new Date() })
    .where(eq(resolutions.id, r.id));
}