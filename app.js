const { PDFDocument, StandardFonts, rgb } = PDFLib;

const STORAGE_KEY = "patrika-members-v1";
const TEMPLATE_URL = "./assets/patrika-template.jpg";
const FONT_URL = "./assets/NotoSansGujarati-Bold.ttf";

// PDF page is the same 414 x 630 pt size as the original invitation.
const PAGE_W = 414;
const PAGE_H = 630;

// Name area tuned to the supplied invitation: after "સ્નેહી,".
const NAME_LEFT = 58;
const NAME_RIGHT = 216;
const NAME_Y = 360;
const NAME_FONT_SIZE = 16;
const NAME_LINE_GAP = 18;
const NAME_MAX_LINES = 2;
const NAME_TOO_LONG_MESSAGE = "નામ બે લાઇનમાં ફિટ થતું નથી. કૃપા કરીને ટૂંકું નામ દાખલ કરો.";

// Color taken from the invitation's dark reddish-purple text.
const NAME_COLOR = rgb(0.46, 0.08, 0.28);

const nameInput = document.getElementById("nameInput");
const generateBtn = document.getElementById("generateBtn");
const previewCanvas = document.getElementById("previewCanvas");
const previewWrap = document.querySelector(".preview-wrap");
const previewStatus = document.getElementById("previewStatus");
const emptyPreview = document.getElementById("emptyPreview");
const membersBody = document.getElementById("membersBody");
const tableEmpty = document.getElementById("tableEmpty");
const countBadge = document.getElementById("countBadge");
const toast = document.getElementById("toast");
const clearAllBtn = document.getElementById("clearAllBtn");
const downloadAllBtn = document.getElementById("downloadAllBtn");

let members = loadMembers();
let currentRecord = null;
let fontBytes = null;
let templateBytes = null;
let previewRequestId = 0;
let previewTimer = null;
let previewRenderQueue = Promise.resolve();

function loadMembers() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveMembers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(members));
  renderTable();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2400);
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]/g, "_").trim() || "Member";
}

async function getAssets() {
  if (!fontBytes) {
    fontBytes = await fetch(FONT_URL).then(r => {
      if (!r.ok) throw new Error("Gujarati font load failed");
      return r.arrayBuffer();
    });
  }
  if (!templateBytes) {
    templateBytes = await fetch(TEMPLATE_URL).then(r => {
      if (!r.ok) throw new Error("Patrika template load failed");
      return r.arrayBuffer();
    });
  }
}

function wrapWords(font, text, maxWidth, size) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let line = "";

  for (const word of words) {
    if (font.widthOfTextAtSize(word, size) > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }

      const graphemes = typeof Intl.Segmenter === "function"
        ? Array.from(new Intl.Segmenter("gu", { granularity: "grapheme" }).segment(word), x => x.segment)
        : Array.from(word);
      let fragment = "";

      for (const grapheme of graphemes) {
        const candidate = fragment + grapheme;
        if (fragment && font.widthOfTextAtSize(candidate, size) > maxWidth) {
          lines.push(fragment);
          fragment = grapheme;
        } else {
          fragment = candidate;
        }
      }

      line = fragment;
      continue;
    }

    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

async function createPdf(name) {
  await getAssets();

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);

  const bg = await pdfDoc.embedJpg(templateBytes);
  page.drawImage(bg, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });

  const isEnglishName = /^[\x20-\x7E]+$/.test(name);
  const font = isEnglishName
    ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
    : await pdfDoc.embedFont(fontBytes, { subset: true });
  const maxWidth = NAME_RIGHT - NAME_LEFT;
  const lines = wrapWords(font, name, maxWidth, NAME_FONT_SIZE);

  if (lines.length > NAME_MAX_LINES) {
    const error = new Error(NAME_TOO_LONG_MESSAGE);
    error.name = "NameTooLongError";
    throw error;
  }

  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, NAME_FONT_SIZE);
    page.drawText(line, {
      x: index === 0 ? NAME_LEFT : NAME_LEFT + (maxWidth - lineWidth) / 2,
      y: NAME_Y - index * NAME_LINE_GAP,
      size: NAME_FONT_SIZE,
      font,
      color: NAME_COLOR,
    });
  });

  return await pdfDoc.save();
}

function blobUrl(bytes) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}

function downloadBytes(bytes, name) {
  const url = blobUrl(bytes);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

async function renderPreview(bytes) {
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  const page = await pdf.getPage(1);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(
    (previewWrap.clientWidth - 24) / baseViewport.width,
    (previewWrap.clientHeight - 24) / baseViewport.height,
  );
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const viewport = page.getViewport({ scale: scale * pixelRatio });
  const context = previewCanvas.getContext("2d");

  previewCanvas.width = Math.ceil(viewport.width);
  previewCanvas.height = Math.ceil(viewport.height);
  previewCanvas.style.width = `${viewport.width / pixelRatio}px`;
  previewCanvas.style.height = `${viewport.height / pixelRatio}px`;

  await page.render({ canvasContext: context, viewport }).promise;
}

function queuePreviewRender(bytes, requestId) {
  const render = previewRenderQueue
    .catch(() => {})
    .then(async () => {
      if (requestId !== previewRequestId) return false;
      await renderPreview(bytes);
      return requestId === previewRequestId;
    });

  previewRenderQueue = render;
  return render;
}

async function updateLivePreview(requestId, name) {
  try {
    const bytes = await createPdf(name);
    if (requestId !== previewRequestId) return;

    if (await queuePreviewRender(bytes, requestId)) {
      previewCanvas.style.display = "block";
      emptyPreview.style.display = "none";
      previewStatus.textContent = "Ready";
    }
  } catch (e) {
    if (requestId !== previewRequestId) return;
    console.error(e);
    previewCanvas.style.display = "none";
    emptyPreview.style.display = "grid";
    previewStatus.textContent = "Error";
    showToast(e.name === "NameTooLongError" ? e.message : "Preview બનાવવામાં સમસ્યા આવી. ફરી પ્રયાસ કરો.");
  }
}

function scheduleLivePreview() {
  const requestId = ++previewRequestId;
  const name = nameInput.value.trim();
  clearTimeout(previewTimer);

  if (!name) {
    previewCanvas.style.display = "none";
    emptyPreview.style.display = "grid";
    previewStatus.textContent = "Ready";
    return;
  }

  previewStatus.textContent = "Updating...";
  previewTimer = setTimeout(() => updateLivePreview(requestId, name), 300);
}

async function generate(name, { save = true, download = true } = {}) {
  name = String(name || "").trim();
  if (!name) {
    showToast("કૃપા કરીને ગુજરાતી નામ દાખલ કરો.");
    nameInput.focus();
    return null;
  }

  const requestId = ++previewRequestId;
  clearTimeout(previewTimer);
  generateBtn.disabled = true;
  previewStatus.textContent = "Generating...";

  try {
    const bytes = await createPdf(name);
    if (await queuePreviewRender(bytes, requestId)) {
      previewCanvas.style.display = "block";
      emptyPreview.style.display = "none";
      previewStatus.textContent = "Ready";
    }

    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name,
      createdAt: new Date().toISOString(),
    };

    currentRecord = record;

    if (save) {
      // Store the name and metadata in localStorage. The PDF is regenerated on demand,
      // which avoids filling localStorage with large binary files.
      members = [record, ...members.filter(x => x.name !== name)];
      saveMembers();
    }

    if (download) {
      downloadBytes(bytes, `Patrika_${sanitizeFileName(name)}.pdf`);
    }

    showToast(`${name} માટે PDF તૈયાર છે.`);
    return bytes;
  } catch (e) {
    if (requestId !== previewRequestId) return null;
    console.error(e);
    previewStatus.textContent = "Error";
    showToast(e.name === "NameTooLongError" ? e.message : "PDF બનાવવામાં સમસ્યા આવી. ફરી પ્રયાસ કરો.");
    return null;
  } finally {
    generateBtn.disabled = false;
  }
}

function shareLinkFor(name) {
  const url = new URL(window.location.href);
  url.searchParams.set("name", name);
  return url.toString();
}

async function copyLink(name) {
  name = String(name || nameInput.value || "").trim();
  if (!name) {
    showToast("પહેલા નામ દાખલ કરો.");
    return;
  }

  const link = shareLinkFor(name);
  await navigator.clipboard.writeText(link);
  showToast("Share link copy થઈ ગઈ.");
}

async function sharePdf(name) {
  const bytes = await createPdf(name);
  const file = new File([bytes], `Patrika_${sanitizeFileName(name)}.pdf`, { type: "application/pdf" });

  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      title: `Patrika - ${name}`,
      text: `Patrika for ${name}`,
      files: [file],
    });
    return;
  }

  await copyLink(name);
  showToast("આ device પર direct file share ઉપલબ્ધ નથી. Share link copy થઈ ગઈ.");
}

async function regenerateFor(name) {
  nameInput.value = name;
  await generate(name, { save: false, download: false });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTable() {
  membersBody.innerHTML = "";
  countBadge.textContent = String(members.length);
  tableEmpty.style.display = members.length ? "none" : "block";

  members.forEach((member, i) => {
    const tr = document.createElement("tr");

    const n = document.createElement("td");
    n.textContent = String(i + 1);

    const name = document.createElement("td");
    name.className = "name-cell";
    const shareNameBtn = document.createElement("button");
    shareNameBtn.type = "button";
    shareNameBtn.className = "name-share-button";
    shareNameBtn.textContent = member.name;
    shareNameBtn.setAttribute("aria-label", `Share PDF for ${member.name}`);
    shareNameBtn.onclick = () => sharePdf(member.name);
    name.appendChild(shareNameBtn);

    const actions = document.createElement("td");
    actions.className = "row-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "secondary";
    openBtn.textContent = "Preview";
    openBtn.onclick = () => regenerateFor(member.name);

    const downloadBtn = document.createElement("button");
    downloadBtn.className = "secondary";
    downloadBtn.textContent = "Download";
    downloadBtn.onclick = async () => {
      const bytes = await createPdf(member.name);
      downloadBytes(bytes, `Patrika_${sanitizeFileName(member.name)}.pdf`);
    };

    const shareBtn = document.createElement("button");
    shareBtn.className = "secondary";
    shareBtn.textContent = "Share";
    shareBtn.onclick = () => sharePdf(member.name);

    const linkBtn = document.createElement("button");
    linkBtn.className = "secondary";
    linkBtn.textContent = "Link";
    linkBtn.onclick = () => copyLink(member.name);

    actions.append(shareBtn, openBtn, downloadBtn, linkBtn);
    tr.append(n, name, actions);
    membersBody.appendChild(tr);
  });
}

generateBtn.addEventListener("click", () => generate(nameInput.value));

nameInput.addEventListener("input", scheduleLivePreview);

nameInput.addEventListener("keydown", e => {
  if (e.key === "Enter") generate(nameInput.value);
});

clearAllBtn.addEventListener("click", () => {
  if (!members.length) return;
  if (!confirm("બધા saved member records દૂર કરવા છે?")) return;
  members = [];
  saveMembers();
  showToast("બધા records દૂર થઈ ગયા.");
});

downloadAllBtn.addEventListener("click", async () => {
  if (!members.length) {
    showToast("Download કરવા માટે કોઈ record નથી.");
    return;
  }

  downloadAllBtn.disabled = true;
  for (const member of members) {
    const bytes = await createPdf(member.name);
    downloadBytes(bytes, `Patrika_${sanitizeFileName(member.name)}.pdf`);
    await new Promise(r => setTimeout(r, 250));
  }
  downloadAllBtn.disabled = false;
  showToast(`${members.length} PDF તૈયાર છે.`);
});

(async function init() {
  renderTable();

  const url = new URL(window.location.href);
  const sharedName = url.searchParams.get("name");
  if (sharedName) {
    nameInput.value = sharedName;
    await generate(sharedName, { save: false, download: false });
  } else if (members[0]) {
    nameInput.value = members[0].name;
    await generate(members[0].name, { save: false, download: false });
  }
})();
