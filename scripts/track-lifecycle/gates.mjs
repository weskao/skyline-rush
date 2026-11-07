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
