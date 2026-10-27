const synth = window.speechSynthesis;
const chapters = [...document.querySelectorAll('[data-chapter]')];
const playAllButton = document.querySelector('#play-all');
const pauseButton = document.querySelector('#pause');
const stopButton = document.querySelector('#stop');
const rateSelect = document.querySelector('#speech-rate');
const voiceStatus = document.querySelector('#voice-status');
let preferredVoice = null;
let queue = [];
let activeChapter = null;

function selectSpanishVoice() {
  const voices = synth.getVoices();
  const spanish = voices.filter(voice => voice.lang.toLowerCase().startsWith('es'));
  preferredVoice = spanish.find(voice => voice.lang.toLowerCase() === 'es-es' && /natural|microsoft|google|premium|enhanced/i.test(voice.name))
    || spanish.find(voice => voice.lang.toLowerCase() === 'es-es')
    || spanish[0]
    || null;
  voiceStatus.textContent = preferredVoice
    ? `Voz seleccionada: ${preferredVoice.name} (${preferredVoice.lang}).`
    : 'No encontramos una voz española. El navegador usará su voz predeterminada.';
}

selectSpanishVoice();
if ('onvoiceschanged' in synth) synth.onvoiceschanged = selectSpanishVoice;

function cleanText(element) {
  const clone = element.cloneNode(true);
  clone.querySelectorAll('button').forEach(button => button.remove());
  return clone.innerText.replace(/\s+/g, ' ').trim();
}

function clearHighlight() {
  chapters.forEach(chapter => chapter.classList.remove('speaking'));
  activeChapter = null;
}

function stopReading() {
  synth.cancel();
  queue = [];
  clearHighlight();
  pauseButton.textContent = '⏸ Pausar';
}

function speakNext() {
  if (!queue.length) {
    clearHighlight();
    playAllButton.textContent = '▶ Leer todo';
    return;
  }
  const chapter = queue.shift();
  clearHighlight();
  activeChapter = chapter;
  chapter.classList.add('speaking');
  chapter.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const utterance = new SpeechSynthesisUtterance(cleanText(chapter.querySelector('.chapter-text')));
  utterance.lang = 'es-ES';
  utterance.rate = Number(rateSelect.value);
  utterance.pitch = 1;
  if (preferredVoice) utterance.voice = preferredVoice;
  utterance.onend = speakNext;
  utterance.onerror = event => {
    if (event.error !== 'canceled' && event.error !== 'interrupted') voiceStatus.textContent = 'No fue posible reproducir la lectura en este navegador.';
    clearHighlight();
  };
  synth.speak(utterance);
}

function startReading(items) {
  stopReading();
  queue = [...items];
  playAllButton.textContent = '🔊 Leyendo…';
  speakNext();
}

playAllButton.addEventListener('click', () => startReading(chapters));
document.querySelectorAll('.listen-part').forEach((button, index) => button.addEventListener('click', () => startReading([chapters[index]])));

pauseButton.addEventListener('click', () => {
  if (!synth.speaking) return;
  if (synth.paused) {
    synth.resume();
    pauseButton.textContent = '⏸ Pausar';
  } else {
    synth.pause();
    pauseButton.textContent = '▶ Continuar';
  }
});
stopButton.addEventListener('click', stopReading);
window.addEventListener('beforeunload', () => synth.cancel());

const dateInput = document.querySelector('#lesson-date');
dateInput.value = new Date().toLocaleDateString('en-CA');

const form = document.querySelector('#lesson-form');
const formStatus = document.querySelector('#form-status');
form.addEventListener('submit', async event => {
  event.preventDefault();
  formStatus.textContent = 'Enviando respuestas…';
  const nameInput = document.querySelector('#student-name');
  if (!nameInput.value.trim()) {
    formStatus.textContent = 'Escribe tu nombre antes de enviar.';
    nameInput.focus();
    return;
  }
  const payload = new FormData(form);
  payload.set('nombre', nameInput.value.trim());
  payload.set('fecha', dateInput.value);
  try {
    const response = await fetch(form.action, {method:'POST', body:payload});
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error('submit failed');
    formStatus.textContent = '¡Respuestas enviadas correctamente!';
  } catch {
    formStatus.textContent = 'No fue posible enviar ahora. Revisa la conexión e inténtalo de nuevo.';
  }
});
