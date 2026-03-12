const sources = {
  s1: {
    id: "s1",
    title: "Agnes Martin, Beauty Is the Mystery of Life",
    side: "top",
    file: "Agnes Martin_ _Beauty Is the Mystery of Life_.pdf"
  },
  s2: {
    id: "s2",
    title: "Trinh, Speaking Nearby (1983)",
    side: "left",
    file: "Trinh-Speaking-Nearby-1983.pdf"
  },
  s3: {
    id: "s3",
    title: "Blue (Derek Jarman)",
    side: "right",
    file: "cd_blue_derek-jarman_0.pdf"
  },
  s4: {
    id: "s4",
    title: "I and Thou",
    side: "bottom",
    file: "iandthou.pdf"
  }
};

const WRITING_FILE = "WritingProject.md";
const TRANSITION_MS = 420;
const EDGE_TRIGGER_DELTA = 220;
const EDGE_TRIGGER_COOLDOWN_MS = 420;

const passageNode = document.getElementById("passage");
const passageCount = document.getElementById("passage-count");
const nextBtn = document.getElementById("next-btn");
const prevBtn = document.getElementById("prev-btn");

let passages = [];
let index = 0;
let activeLayer = 0;
let isAnimating = false;
let queuedDirection = 0;
let edgeScrollAccumulator = 0;
let lastEdgeTriggerAt = 0;
let reducedMotion = false;
let expandedSourceId = null;

const passageLayers = [document.createElement("div"), document.createElement("div")];
passageLayers.forEach((layer, idx) => {
  layer.className = `passage-layer${idx === 0 ? " active" : ""}`;
  passageNode.appendChild(layer);
});

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToParagraphs(markdown) {
  return markdown
    .split(/\n\s*\n/g)
    .map((block) => block.replace(/\n+/g, " ").trim())
    .filter((block) => block.length > 0)
    .filter((block) => block.toLowerCase() !== "discussions");
}

function paragraphToHtml(paragraph) {
  return `<p>${escapeHtml(paragraph)}</p>`;
}

function buildPassages(markdown) {
  const paragraphs = markdownToParagraphs(markdown);
  const html = paragraphs.map(paragraphToHtml).join("");
  return html.length > 0
    ? [{ html }]
    : [{ html: "<p>No writing loaded yet.</p>" }];
}

function updateNavigationVisibility() {
  if (!nextBtn || !prevBtn || !passageCount) return;
  const hasMultiplePassages = passages.length > 1;
  nextBtn.disabled = !hasMultiplePassages;
  prevBtn.disabled = !hasMultiplePassages;
  passageCount.style.visibility = hasMultiplePassages ? "visible" : "hidden";
}

function renderPassage() {
  if (passages.length === 0) {
    passageLayers[activeLayer].innerHTML = "<p>No writing loaded yet.</p>";
    if (passageCount) passageCount.textContent = "0/0";
    updateNavigationVisibility();
    return;
  }

  passageLayers[activeLayer].innerHTML = passages[index].html;
  if (passageCount) passageCount.textContent = `${index + 1}/${passages.length}`;
  updateNavigationVisibility();
  wireFootnotes(passageLayers[activeLayer]);
}

function setActiveSource(sourceId) {
  document.querySelectorAll(".source-box").forEach((box) => {
    box.classList.toggle("active", box.dataset.sourceId === sourceId);
  });
}

function openSource(sourceId, page = 1) {
  const source = sources[sourceId];
  if (!source) return;

  const frame = document.getElementById(`frame-${sourceId}`);
  if (frame) {
    frame.src = `${encodeURI(source.file)}#page=${page}&view=FitH`;
  }

  setActiveSource(sourceId);
}

function setExpandedButtonState(sourceId, expanded) {
  const btn = document.querySelector(`.expand-btn[data-source-id="${sourceId}"]`);
  if (!btn) return;
  btn.textContent = expanded ? "Collapse" : "Expand";
  btn.setAttribute("aria-expanded", expanded ? "true" : "false");
}

function collapseExpandedSource() {
  if (!expandedSourceId) return;

  const expandedBox = document.querySelector(`.source-box[data-source-id="${expandedSourceId}"]`);
  if (expandedBox) {
    expandedBox.classList.remove("expanded");
  }
  setExpandedButtonState(expandedSourceId, false);
  expandedSourceId = null;
  document.body.classList.remove("has-expanded-source");
}

function toggleSourceExpanded(sourceId) {
  const box = document.querySelector(`.source-box[data-source-id="${sourceId}"]`);
  if (!box) return;

  if (expandedSourceId === sourceId) {
    collapseExpandedSource();
    return;
  }

  if (expandedSourceId) {
    collapseExpandedSource();
  }

  expandedSourceId = sourceId;
  box.classList.add("expanded");
  setExpandedButtonState(sourceId, true);
  document.body.classList.add("has-expanded-source");
}

function wireFootnotes(root) {
  const notes = root.querySelectorAll(".footnote");
  notes.forEach((note) => {
    note.addEventListener("click", (event) => {
      event.preventDefault();
      const sourceId = note.dataset.source;
      const page = Number(note.dataset.page || 1);
      openSource(sourceId, page);
    });
  });
}

function updatePassageCount() {
  if (!passageCount) return;
  passageCount.textContent = passages.length > 0 ? `${index + 1}/${passages.length}` : "0/0";
}

function finalizeTransition(nextIndex, incomingLayerIndex) {
  const outgoingLayer = passageLayers[activeLayer];
  const incomingLayer = passageLayers[incomingLayerIndex];

  outgoingLayer.classList.remove("active");
  outgoingLayer.classList.add("inactive");
  outgoingLayer.style.transform = "";
  outgoingLayer.style.opacity = "";
  outgoingLayer.style.pointerEvents = "none";

  incomingLayer.classList.remove("inactive");
  incomingLayer.classList.add("active");
  incomingLayer.style.transform = "";
  incomingLayer.style.opacity = "";
  incomingLayer.style.pointerEvents = "auto";

  index = nextIndex;
  activeLayer = incomingLayerIndex;
  isAnimating = false;
  updatePassageCount();

  if (queuedDirection !== 0) {
    const direction = queuedDirection;
    queuedDirection = 0;
    requestPassageChange(direction);
  }
}

function requestPassageChange(direction) {
  if (passages.length === 0) return;
  if (isAnimating) {
    queuedDirection = direction;
    return;
  }

  const nextIndex = (index + direction + passages.length) % passages.length;
  if (nextIndex === index) return;

  if (reducedMotion) {
    index = nextIndex;
    renderPassage();
    return;
  }

  isAnimating = true;

  const outgoingLayer = passageLayers[activeLayer];
  const incomingLayerIndex = activeLayer === 0 ? 1 : 0;
  const incomingLayer = passageLayers[incomingLayerIndex];

  incomingLayer.innerHTML = passages[nextIndex].html;
  wireFootnotes(incomingLayer);
  incomingLayer.scrollTop = 0;

  outgoingLayer.classList.add("active");
  incomingLayer.classList.remove("inactive");
  incomingLayer.classList.add("active");

  const incomingStart = direction > 0 ? "translateY(100%)" : "translateY(-100%)";
  const outgoingEnd = direction > 0 ? "translateY(-18%)" : "translateY(18%)";

  incomingLayer.style.transform = incomingStart;
  incomingLayer.style.opacity = "0";
  incomingLayer.style.pointerEvents = "none";
  outgoingLayer.style.pointerEvents = "none";

  requestAnimationFrame(() => {
    outgoingLayer.style.transform = outgoingEnd;
    outgoingLayer.style.opacity = "0";
    incomingLayer.style.transform = "translateY(0%)";
    incomingLayer.style.opacity = "1";
  });

  window.setTimeout(() => {
    finalizeTransition(nextIndex, incomingLayerIndex);
  }, TRANSITION_MS + 40);
}

function nextPassage() {
  requestPassageChange(1);
}

function previousPassage() {
  requestPassageChange(-1);
}

function initializeSources() {
  Object.values(sources).forEach((source) => {
    const title = document.getElementById(`title-${source.id}`);
    const frame = document.getElementById(`frame-${source.id}`);

    if (title) title.textContent = source.title;
    if (frame) frame.src = `${encodeURI(source.file)}#page=1&view=FitH`;
  });

  document.querySelectorAll(".source-box").forEach((box) => {
    box.addEventListener("click", () => {
      const sourceId = box.dataset.sourceId;
      openSource(sourceId, 1);
    });
  });

  document.querySelectorAll(".expand-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const sourceId = button.dataset.sourceId;
      toggleSourceExpanded(sourceId);
    });
  });

  document.querySelectorAll(".close-btn").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      collapseExpandedSource();
    });
  });

  document.querySelectorAll(".source-header").forEach((header) => {
    header.addEventListener("click", (event) => {
      if (event.target.closest(".expand-btn")) return;
      const box = header.closest(".source-box");
      if (!box) return;
      toggleSourceExpanded(box.dataset.sourceId);
    });
  });

  setActiveSource("s1");
}

async function initializeWriting() {
  try {
    const response = await fetch(WRITING_FILE);
    if (!response.ok) {
      throw new Error(`Could not load ${WRITING_FILE}`);
    }

    const markdown = await response.text();
    passages = buildPassages(markdown);
    index = 0;
    renderPassage();
  } catch (error) {
    passages = [{ html: "<p>Unable to load WritingProject.md.</p>" }];
    index = 0;
    renderPassage();
  }
}

function initializeMotionPreferences() {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion = media.matches;
  media.addEventListener("change", (event) => {
    reducedMotion = event.matches;
  });
}

if (nextBtn) nextBtn.addEventListener("click", nextPassage);
if (prevBtn) prevBtn.addEventListener("click", previousPassage);

passageNode.addEventListener(
  "wheel",
  (event) => {
    const layer = passageLayers[activeLayer];
    if (!layer || isAnimating) {
      event.preventDefault();
      return;
    }

    const atTop = layer.scrollTop <= 1;
    const atBottom = layer.scrollTop + layer.clientHeight >= layer.scrollHeight - 1;
    const goingDown = event.deltaY > 0;
    const goingUp = event.deltaY < 0;
    const now = Date.now();

    if ((goingDown && atBottom) || (goingUp && atTop)) {
      if (edgeScrollAccumulator !== 0 && Math.sign(edgeScrollAccumulator) !== Math.sign(event.deltaY)) {
        edgeScrollAccumulator = 0;
      }

      edgeScrollAccumulator += event.deltaY;

      if (
        Math.abs(edgeScrollAccumulator) >= EDGE_TRIGGER_DELTA &&
        now - lastEdgeTriggerAt >= EDGE_TRIGGER_COOLDOWN_MS
      ) {
        event.preventDefault();
        lastEdgeTriggerAt = now;
        const direction = edgeScrollAccumulator > 0 ? 1 : -1;
        edgeScrollAccumulator = 0;
        requestPassageChange(direction);
      }
      return;
    }

    edgeScrollAccumulator = 0;
  },
  { passive: false }
);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && expandedSourceId) {
    collapseExpandedSource();
    return;
  }

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    event.preventDefault();
    nextPassage();
  }
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    event.preventDefault();
    previousPassage();
  }
});

document.addEventListener("click", (event) => {
  if (!expandedSourceId) return;
  const expandedBox = document.querySelector(".source-box.expanded");
  if (!expandedBox) return;

  if (!expandedBox.contains(event.target)) {
    collapseExpandedSource();
  }
});

initializeSources();
initializeMotionPreferences();
initializeWriting();
