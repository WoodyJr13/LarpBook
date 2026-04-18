const state = {
  pdfDoc: null,
  questions: [],
  currentIndex: 0,
  zoom: 1.2,
};

const pdfInput = document.getElementById('pdfInput');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const questionPicker = document.getElementById('questionPicker');
const status = document.getElementById('status');
const pdfCanvas = document.getElementById('pdfCanvas');
const questionTitle = document.getElementById('questionTitle');
const questionCard = document.getElementById('questionCard');
const questionStem = document.getElementById('questionStem');
const answersEl = document.getElementById('answers');
const crossOutQuestionBtn = document.getElementById('crossOutQuestionBtn');
const markReviewBtn = document.getElementById('markReviewBtn');

const ctx = pdfCanvas.getContext('2d');

pdfInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  const data = await file.arrayBuffer();
  const pdfjsLib = globalThis.pdfjsLib;
  state.pdfDoc = await pdfjsLib.getDocument({ data }).promise;
  status.textContent = `Loaded ${file.name}. Parsing questions...`;

  state.questions = await parseQuestions(state.pdfDoc);
  state.currentIndex = 0;
  buildQuestionPicker();
  setControlsEnabled(true);
  await renderCurrentQuestion();
});

prevBtn.addEventListener('click', async () => {
  if (state.currentIndex > 0) {
    state.currentIndex -= 1;
    await renderCurrentQuestion();
  }
});

nextBtn.addEventListener('click', async () => {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex += 1;
    await renderCurrentQuestion();
  }
});

zoomInBtn.addEventListener('click', async () => {
  state.zoom = Math.min(2.4, state.zoom + 0.15);
  await renderStimulus();
});

zoomOutBtn.addEventListener('click', async () => {
  state.zoom = Math.max(0.6, state.zoom - 0.15);
  await renderStimulus();
});

questionPicker.addEventListener('change', async () => {
  state.currentIndex = Number(questionPicker.value);
  await renderCurrentQuestion();
});

crossOutQuestionBtn.addEventListener('click', () => {
  const q = state.questions[state.currentIndex];
  q.crossedOut = !q.crossedOut;
  renderQuestionPanel(q);
});

markReviewBtn.addEventListener('click', () => {
  const q = state.questions[state.currentIndex];
  q.markedForReview = !q.markedForReview;
  renderQuestionPanel(q);
  buildQuestionPicker();
});

async function parseQuestions(pdfDoc) {
  const parsed = [];
  const questionRegex = /^(\d{1,3})[\.)]\s+/;
  const choiceRegex = /^([A-E])[\.)]\s+/;

  for (let pageNumber = 1; pageNumber <= pdfDoc.numPages; pageNumber += 1) {
    const page = await pdfDoc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = textContent.items.map((item) => item.str.trim()).filter(Boolean);

    let active = null;
    for (const line of lines) {
      if (questionRegex.test(line)) {
        if (active) parsed.push(active);
        active = {
          id: Number(line.match(questionRegex)[1]),
          stem: line.replace(questionRegex, ''),
          choices: [],
          pageNumber,
          markedForReview: false,
          crossedOut: false,
        };
        continue;
      }

      if (active && choiceRegex.test(line)) {
        const label = line.match(choiceRegex)[1];
        active.choices.push({
          label,
          text: line.replace(choiceRegex, ''),
          crossedOut: false,
        });
        continue;
      }

      if (active) {
        if (active.choices.length === 0) {
          active.stem += ` ${line}`;
        } else {
          const last = active.choices[active.choices.length - 1];
          last.text += ` ${line}`;
        }
      }
    }

    if (active) parsed.push(active);
  }

  if (parsed.length > 0) return parsed;

  // Fallback: one question placeholder per page when parsing fails.
  const fallback = [];
  for (let i = 1; i <= pdfDoc.numPages; i += 1) {
    fallback.push({
      id: i,
      stem: 'Could not parse structured MCQ text on this page. Use this page as free-response/stimulus view.',
      choices: [],
      pageNumber: i,
      markedForReview: false,
      crossedOut: false,
    });
  }
  return fallback;
}

function buildQuestionPicker() {
  questionPicker.innerHTML = '';
  state.questions.forEach((q, index) => {
    const opt = document.createElement('option');
    const review = q.markedForReview ? ' • Review' : '';
    opt.value = String(index);
    opt.textContent = `Q${q.id}${review}`;
    questionPicker.appendChild(opt);
  });
  questionPicker.value = String(state.currentIndex);
}

async function renderCurrentQuestion() {
  if (!state.questions.length) return;

  const question = state.questions[state.currentIndex];
  questionPicker.value = String(state.currentIndex);
  prevBtn.disabled = state.currentIndex === 0;
  nextBtn.disabled = state.currentIndex === state.questions.length - 1;
  status.textContent = `Question ${state.currentIndex + 1}/${state.questions.length} • Page ${question.pageNumber}`;

  renderQuestionPanel(question);
  await renderStimulus();
}

function renderQuestionPanel(question) {
  questionTitle.textContent = `Question ${question.id}`;
  questionStem.textContent = question.stem;

  questionCard.classList.toggle('crossed-out', question.crossedOut);
  markReviewBtn.textContent = question.markedForReview ? 'Unmark review' : 'Mark for review';
  const reviewTagId = 'review-tag';
  let existingTag = document.getElementById(reviewTagId);
  if (existingTag) existingTag.remove();
  if (question.markedForReview) {
    existingTag = document.createElement('span');
    existingTag.id = reviewTagId;
    existingTag.className = 'tag review';
    existingTag.textContent = 'Marked for review';
    questionTitle.after(existingTag);
  }

  answersEl.innerHTML = '';
  if (question.choices.length === 0) {
    const note = document.createElement('p');
    note.className = 'tag';
    note.textContent = 'No parsed choices on this question/page.';
    answersEl.appendChild(note);
    return;
  }

  question.choices.forEach((choice, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'answer-option';
    if (choice.crossedOut) wrap.classList.add('crossed-out');

    const left = document.createElement('div');
    left.className = 'answer-left';
    left.innerHTML = `<strong>${choice.label}</strong><span>${choice.text}</span>`;

    const btn = document.createElement('button');
    btn.textContent = choice.crossedOut ? 'Undo cross out' : 'Cross out';
    btn.addEventListener('click', () => {
      question.choices[idx].crossedOut = !question.choices[idx].crossedOut;
      renderQuestionPanel(question);
    });

    wrap.appendChild(left);
    wrap.appendChild(btn);
    answersEl.appendChild(wrap);
  });
}

async function renderStimulus() {
  const question = state.questions[state.currentIndex];
  const page = await state.pdfDoc.getPage(question.pageNumber);
  const viewport = page.getViewport({ scale: state.zoom });

  pdfCanvas.width = viewport.width;
  pdfCanvas.height = viewport.height;

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;
}

function setControlsEnabled(enabled) {
  prevBtn.disabled = !enabled;
  nextBtn.disabled = !enabled;
  zoomInBtn.disabled = !enabled;
  zoomOutBtn.disabled = !enabled;
  questionPicker.disabled = !enabled;
  crossOutQuestionBtn.disabled = !enabled;
  markReviewBtn.disabled = !enabled;
}
