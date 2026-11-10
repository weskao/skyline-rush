export const R_GATES = Object.freeze(['R1','R2','R3','R4','R5','R6']);

/** Read JPEG dimensions without decoding the image or requiring dependencies. */
export function jpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let pos = 2;
  while (pos + 3 < bytes.length) {
    if (bytes[pos++] !== 0xff) return null;
    while (bytes[pos] === 0xff) pos++;
    const marker = bytes[pos++];
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (pos + 1 >= bytes.length) return null;
    const length = bytes[pos] * 256 + bytes[pos + 1];
    if (length < 2 || pos + length > bytes.length) return null;
    if ((marker >= 0xc0 && marker <= 0xcf) && ![0xc4,0xc8,0xcc].includes(marker)) {
      if (length < 7) return null;
      return { width: bytes[pos + 5] * 256 + bytes[pos + 6], height: bytes[pos + 3] * 256 + bytes[pos + 4] };
    }
    pos += length;
  }
  return null;
}

const validSha = sha => typeof sha === 'string' && /^[a-f\d]{7,40}$/i.test(sha);

export function parseEvidence(markdown) {
  const gates = Object.fromEntries(R_GATES.map(id => [id, { ticked: false, sha: null }]));
  for (const line of markdown.split(/\r?\n/)) {
    const match = /^\s*- \[([xX ])\] (R[1-6])(?:\s|$)/.exec(line);
    if (!match) continue;
    const sha = /(?:^|\s)sha:\s*([^\s]+)/.exec(line)?.[1] ?? null;
    gates[match[2]] = { ticked: match[1].toLowerCase() === 'x', sha: validSha(sha) ? sha : null };
  }
  const stamp = /^released-at:\s*([^\s]+)\s*$/m.exec(markdown)?.[1];
  return { gates, releasedAt: validSha(stamp) ? stamp : null };
}

export function parseApprovals(todoMarkdown) {
  const approved = new Set();
  let inSection = false;
  for (const line of todoMarkdown.split(/\r?\n/)) {
    if (/^##\s/.test(line)) inSection = line.trim() === '## Track release approvals';
    if (!inSection) continue;
    const match = /^\s*- \[[xX]\] RELEASE APPROVED:\s*([a-z0-9]+(?:-[a-z0-9]+)*)\s*$/.exec(line);
    if (match) approved.add(match[1]);
  }
  return approved;
}


/** Validate one course against the requirements of its declared stage. */
export function checkCourse(c) {
  const out = [];
  const push = (gate, ok, reason) => out.push(ok ? { id:c.id, gate, ok:true } : { id:c.id, gate, ok:false, reason });
  const size = c.teaserJpeg && jpegSize(c.teaserJpeg);
  push('P1', !!size && size.width === 568 && size.height === 205, 'teaser must be JPEG 568x205');
  push('P2', !!c.routeSvgExists, 'route SVG is missing');
  push('P3', !!c.hasEnvironment, '3D preview environment is missing');
  push('P4', !!c.names?.en?.trim() && !!c.names?.['zh-TW']?.trim(), 'English and zh-TW names required');
  push('P5', !c.productionEnterable && !c.productionAvailableWithStaleUnlock, 'production or stale saves unlock the course');
  push('P6', Array.isArray(c.homeStatuses) && c.homeStatuses.length > 0 && c.homeStatuses.every(s=>s==='coming-soon'), 'upcoming card not Coming Soon');
  if (c.stage === 'playable' || c.stage === 'ready') {
    push('D1', !!c.raceTrackDefined && !!c.devModeCompatible, 'registered dev-mode-compatible course outside release catalog required');
    push('D2', !!c.unitTestExists && !!c.browserSpecExists, 'START-to-FINISH test specs required');
    push('D3', !!c.developmentEnterable, 'development-only START must be enabled');
  }
  if (c.stage === 'ready') {
    for (const gate of R_GATES) {
      const item=c.evidence?.gates?.[gate];
      push(gate, !!item?.ticked && !!item?.sha && /^[a-f\d]{7,40}$/i.test(item.sha), 'ticked evidence and valid commit sha required');
    }
  }
  return out;
}

export function nextGates(c) {
  if (c.stage === 'ready') return ['RELEASE'];
  const next = c.stage === 'playable' ? 'ready' : c.stage === 'development' ? 'playable' : 'development';
  const nextResults = checkCourse({ ...c, stage:next });
  const prefix = c.stage === 'playable' ? 'R' : c.stage === 'development' ? 'D' : 'P';
  return nextResults.filter(result=>!result.ok && result.gate.startsWith(prefix)).map(result=>result.gate);
}

/** Released before lifecycle enforcement; this list must never grow. */
export const LEGACY_RELEASED_TRACKS = Object.freeze(['coast','neon','canyon','aurora','spiral','taipei','tokyo','alpine','coastal','cosmic']);

export function checkCatalog({raceTrackIds,upcomingIds,evidenceById,approvals}) {
  const out=[];
  const legacy=new Set(LEGACY_RELEASED_TRACKS), upcoming=new Set(upcomingIds);
  for(const id of raceTrackIds) {
    const evidence=evidenceById.get(id);
    const ok=!upcoming.has(id) && (legacy.has(id) || approvals.has(id) && !!evidence?.releasedAt);
    out.push({id,gate:'CATALOG',ok,...(ok?{}:{reason:'released catalog requires signed approval, stamp and no Coming Soon entry'})});
  }
  for(const id of upcoming) if(evidenceById.get(id)?.releasedAt)
    out.push({id,gate:'CATALOG',ok:false,reason:'stamped released course remains Coming Soon'});
  return out;
}

export function checkRelease(id,course,approvals) {
  const results=checkCourse({...course,stage:'ready'});
  const ok=course.stage==='ready' && approvals.has(id) && results.every(x=>x.ok);
  return [{id,gate:'RELEASE',ok,...(ok?{}:{reason:'ready stage, all six verified R gates and explicit user approval required'})}];
}
