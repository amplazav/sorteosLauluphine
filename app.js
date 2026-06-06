(function(){
  // Start with UI hidden so only background shows; reveal after small delay
  try{ document.documentElement.classList.add('ui-hidden'); }catch(e){}
  // Config
  const SMALL_THRESHOLD = 150;
  const ANIM_MIN = 3000;
  const ANIM_MAX = 5000;
  const dropArea = document.getElementById('drop-area');
  const fileInput = document.getElementById('file-input');
  const sampleBtn = document.getElementById('sample-btn');
  const prizeInput = document.getElementById('prize-input');
  const countEl = document.getElementById('count');
  const fileNameEl = document.getElementById('file-name');
  const centerName = document.getElementById('center-name');
  const subline = document.getElementById('subline');
  const pickBtn = document.getElementById('pick-btn');
  const previewBtn = document.getElementById('preview-btn');
  const clearBtn = document.getElementById('clear-btn');
  const downloadBtn = document.getElementById('download-btn');
  const dynamicArea = document.getElementById('dynamic-area');
  const modeLabel = document.getElementById('mode-label');
  const overlay = document.getElementById('overlay');
  const winnerName = document.getElementById('winner-name');
  const winnerMsg = document.getElementById('winner-msg');
  const winnerPrize = document.getElementById('winner-prize');
  const closeWinner = document.getElementById('close-winner');
  const againBtn = document.getElementById('again-btn');

  let participants = [];
  let currentMode = 'idle';
  let animating = false;
  let lastWinner = null;
  let emoteTimers = [];

  const setCount = (n) => {
    if(n === 0) countEl.textContent = `0 participantes`;
    else if(n === 1) countEl.textContent = `1 participante`;
    else countEl.textContent = `${n} participantes`;
  };
  const setFileName = (s) => { fileNameEl.textContent = s ? s : 'Ningún archivo cargado'; };
  const enableControls = (enabled) => {
    pickBtn.disabled = !enabled;
    previewBtn.disabled = !enabled;
    downloadBtn.disabled = !enabled;
    clearBtn.disabled = !enabled;
  };

  ['dragenter','dragover'].forEach(ev=>{ dropArea.addEventListener(ev, (e)=>{ e.preventDefault(); dropArea.classList.add('drag'); }); });
  ['dragleave','drop'].forEach(ev=>{ dropArea.addEventListener(ev,(e)=>{ e.preventDefault(); dropArea.classList.remove('drag'); }); });
  dropArea.addEventListener('drop', (e)=>{ const dt = e.dataTransfer; if(dt && dt.files && dt.files.length) handleFiles(dt.files); });

  fileInput.addEventListener('change', (e)=> { if(fileInput.files && fileInput.files.length) handleFiles(fileInput.files); });

  // Background handled via assets/fondo.jpg in CSS (place your image in assets/)

  sampleBtn.addEventListener('click', ()=> {
    const sample = ['Luna','Mimi_cosplay','ShadowKitty','NekoChan','PlayerOne','HollowHeart','Cereza','GothGamer','Aoi','Sakura-san','Lilac','Kira'];
    let arr = [];
    for(let i=0;i<20;i++) arr = arr.concat(sample.map(s=> s + (i?('#'+i):'')));
    loadParticipants(arr, 'Lista de ejemplo');
  });

  clearBtn.addEventListener('click', ()=> { participants = []; updateState(); });

  downloadBtn.addEventListener('click', ()=> {
    if(!participants.length) return;
    const blob = new Blob([participants.join('\n')], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'participants.txt'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  previewBtn.addEventListener('click', ()=> { if(!participants.length || animating) return; playAnimation({preview:true}); });
  pickBtn.addEventListener('click', ()=> { if(!participants.length || animating) return; playAnimation({preview:false}); });

  // sound toggle button
  const soundToggleBtn = document.getElementById('sound-toggle');
  if(soundToggleBtn){
    window.LauluSorteos = Object.assign(window.LauluSorteos || {}, { soundEnabled: true });
    soundToggleBtn.addEventListener('click', ()=>{
      window.LauluSorteos.soundEnabled = !window.LauluSorteos.soundEnabled;
      soundToggleBtn.textContent = `Sonido: ${window.LauluSorteos.soundEnabled? 'Activado' : 'Desactivado'}`;
    });
  }

  closeWinner.addEventListener('click', () => { overlay.classList.remove('show'); removeAllConfetti(); });
  againBtn.addEventListener('click', () => { overlay.classList.remove('show'); removeAllConfetti(); setTimeout(()=> playAnimation({preview:false}), 220); });

  function handleFiles(files){ if(!files || files.length===0) return; const f = files[0]; if(!f.name.toLowerCase().endsWith('.txt')){ alert('Por favor selecciona un archivo .txt'); return; } setFileName(f.name); const reader = new FileReader(); reader.onload = (ev) => { const text = ev.target.result; const arr = text.split(/\r?\n/).map(s=> s.trim()).filter(s=> s.length>0); loadParticipants(arr, f.name); }; reader.onerror = () => { alert('Error leyendo el archivo'); }; reader.readAsText(f, 'UTF-8'); }

  function loadParticipants(arr, label){ const normalized = arr.map(s => s.replace(/\s+/g,' ').trim()).filter(Boolean); const seen = new Set(); const unique = []; for(const n of normalized){ if(!seen.has(n)){ seen.add(n); unique.push(n); } } participants = unique; setFileName(label || 'Lista cargada'); updateState(); }

  function updateState(){
    setCount(participants.length);
    enableControls(participants.length>0);
    if(participants.length===0){
      currentMode = 'idle';
      modeLabel.textContent = 'Modo: esperando lista';
      centerName.textContent = 'Carga la lista de participantes';
      subline.textContent = 'Cuando esté lista, selecciona al ganador con claridad.';
      dynamicArea.innerHTML = '';
      return;
    }
    if(participants.length <= SMALL_THRESHOLD){
      currentMode = 'ruleta';
      modeLabel.textContent = `Modo: ruleta — ${participants.length} participantes`;
      centerName.textContent = `${participants.length} participantes listos`;
      subline.textContent = 'Modo visual para listas pequeñitas.';
      renderSmallMode();
    } else {
      currentMode = 'digital';
      modeLabel.textContent = `Modo: digital — ${participants.length} participantes`;
      centerName.textContent = `${participants.length} participantes listos`;
      subline.textContent = 'Visualización optimizada para listas grandes.';
      renderLargeMode();
    }
  }

  function renderSmallMode(){ const feedCount = Math.min(participants.length, 30); const wrapper = document.createElement('div'); wrapper.className = 'spinner'; for(let i=0;i<feedCount;i++){ const chip = document.createElement('div'); chip.className = 'chip'; chip.textContent = participants[(i) % participants.length]; wrapper.appendChild(chip); } dynamicArea.innerHTML = ''; dynamicArea.appendChild(wrapper); }
  function renderLargeMode(){ const m = document.createElement('div'); m.className = 'matrix'; m.textContent = 'Visualización optimizada para listas grandes.'; dynamicArea.innerHTML = ''; dynamicArea.appendChild(m); }
  

  function playAnimation({preview=false} = {}){
    if(animating) return;
    animating = true;
    pickBtn.disabled = true; previewBtn.disabled = true; clearBtn.disabled = true; downloadBtn.disabled = true;
    const duration = preview ? 1200 : randomBetween(ANIM_MIN, ANIM_MAX);
    // start emotes
    spawnEmotes(duration);
    if(currentMode === 'ruleta'){
      animateRuleta(duration).then((winner)=>{ endAnimation(winner, preview); });
    } else if(currentMode === 'digital'){
      animateDigital(duration).then((winner)=>{ endAnimation(winner, preview); });
    } else {
      animating = false; enableControls(true);
    }
  }


  // EMOTES: show floating emotes during animation
  function spawnEmotes(duration){
    stopEmotes();
    const emotes = ['💖','🌸','👾','🎮','👻','✨','🩷','💫'];
    const displayEl = document.getElementById('display');
    if(!displayEl) return;
    let elapsed = 0;
    const interval = 180; // ms create emote
    const start = performance.now();
    const timer = setInterval(()=>{
      elapsed = performance.now() - start;
      if(elapsed > duration) { clearInterval(timer); return; }
      createEmote(emotes[(Math.random()*emotes.length)|0]);
    }, interval);
    emoteTimers.push(timer);
  }

  function stopEmotes(){ emoteTimers.forEach(t=>clearInterval(t)); emoteTimers = []; document.querySelectorAll('.emote').forEach(e=>e.remove()); }

  function createEmote(char){
    const layer = document.querySelector('.emote-layer') || (function(){ const l = document.createElement('div'); l.className='emote-layer'; const displayEl = document.getElementById('display'); displayEl.appendChild(l); return l; })();
    const el = document.createElement('div'); el.className='emote'; el.textContent = char;
    // random start position inside display
    const w = layer.clientWidth || 600;
    const x = Math.random()*w;
    el.style.left = x + 'px';
    el.style.top = (30 + Math.random()*120) + 'px';
    layer.appendChild(el);
    // animate
    requestAnimationFrame(()=>{ el.style.opacity='1'; const dx = (Math.random()*120-60); const dy = -160 - Math.random()*80; el.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(${1+Math.random()*0.15})`; el.style.transition = `transform ${900+Math.random()*600}ms cubic-bezier(.2,.8,.2,1), opacity ${900+Math.random()*600}ms linear`; });
    setTimeout(()=>{ el.style.opacity='0'; }, 900);
    setTimeout(()=>{ el.remove(); }, 2200);
  }

  function animateRuleta(duration){ return new Promise((resolve)=>{ const center = centerName; center.classList.add('pulse'); const startTime = performance.now(); let speed = 60; let index = Math.floor(Math.random()*participants.length); const step = () => { const elapsed = performance.now() - startTime; const t = elapsed / duration; if(t > 0.7){ speed += 12 * (t - 0.7); } else { speed *= 0.9998; if(speed < 30) speed = 30; } index = (index + 1) % participants.length; center.textContent = participants[index]; if(elapsed >= duration){ center.classList.remove('pulse'); const winner = participants[Math.floor(Math.random()*participants.length)]; resolve(winner); } else { setTimeout(step, Math.max(20, speed)); } }; step(); }); }


  function animateDigital(duration){ return new Promise((resolve)=>{ const matrix = dynamicArea.querySelector('.matrix') || (()=>{ const m=document.createElement('div');m.className='matrix';dynamicArea.innerHTML='';dynamicArea.appendChild(m);return m; })(); matrix.classList.add('pulse'); const startTime = performance.now(); let rafId; function tick(){ const elapsed = performance.now() - startTime; const batch = []; const countToShow = Math.min(6, Math.max(3, Math.floor(participants.length/1000)+3)); for(let i=0;i<countToShow;i++){ const r = participants[(Math.random()*participants.length)|0]; batch.push(r); } matrix.textContent = batch.join('   •   '); if(elapsed >= duration){ cancelAnimationFrame(rafId); matrix.classList.remove('pulse'); const winner = participants[(Math.random()*participants.length)|0]; resolve(winner); } else { rafId = requestAnimationFrame(tick); } } tick(); }); }

  function endAnimation(winner, preview){
    animating = false; pickBtn.disabled = false; previewBtn.disabled = false; clearBtn.disabled = false; downloadBtn.disabled = false; lastWinner = winner;
    stopEmotes();
    const prize = (prizeInput && prizeInput.value && prizeInput.value.trim()) ? prizeInput.value.trim() : 'el premio';
    if(preview){
      centerName.textContent = winner || '—';
      setTimeout(()=> { updateState(); }, 800);
      return;
    }
    winnerName.textContent = winner || '—';
    winnerMsg.textContent = `Ha sido seleccionado(a) como ganador(a).`;
    if(winnerPrize) winnerPrize.textContent = `Premio: ${prize}`;
    overlay.classList.add('show');
    // play winner sound if enabled
    if(window.LauluSorteos && window.LauluSorteos.soundEnabled) playWinnerJingle();
    spawnHearts();
  }

  let confettiTimers = [];
  function spawnHearts(){
    removeAllConfetti();
    const display = document.getElementById('display');
    if(!display) return;
    const total = 32;
    for(let i=0;i<total;i++){
      const el = document.createElement('div');
      el.className = 'heart-piece';
      // heart svg
      el.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#ff4da6" d="M12 21s-8-5.6-10-9.3C-0.5 6 4 3 7.3 5.2 9 6.5 12 9 12 9s3-2.5 4.7-3.8C20 3 24.5 6 22 11.7 20 15.4 12 21 12 21z"/></svg>`;
      const left = 20 + Math.random()*60; // percent inside display
      el.style.left = left + '%';
      el.style.top = (60 + Math.random()*20) + '%';
      display.appendChild(el);
      // animate upward and fade
      const delay = Math.random()*300;
      const dur = 1200 + Math.random()*1000;
      setTimeout(()=>{
        el.style.opacity = '1';
        const dx = (Math.random()*80-40);
        el.style.transform = `translate3d(${dx}px, -180px, 0) scale(${1+Math.random()*0.25})`;
      }, delay);
      const t = setTimeout(()=>{ el.style.opacity='0'; el.remove(); }, dur + delay + 300);
      confettiTimers.push(t);
    }
  }
  function removeAllConfetti(){ confettiTimers.forEach(t=>clearTimeout(t)); confettiTimers = []; document.querySelectorAll('.confetti-piece, .heart-piece').forEach(e=>e.remove()); }

  // Soft winner jingle via WebAudio
  function playWinnerJingle(){
    try{
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      const freqs = [880, 1100, 1320];
      freqs.forEach((f,i)=>{
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = f;
        g.gain.value = 0.0001;
        o.connect(g); g.connect(ctx.destination);
        o.start(now + i*0.08);
        g.gain.exponentialRampToValueAtTime(0.12, now + i*0.08 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i*0.08 + 0.28);
        o.stop(now + i*0.08 + 0.3);
      });
    }catch(e){ /* ignore on browsers that block autoplay */ }
  }

  function randomBetween(a,b){ return Math.floor(Math.random()*(b-a))+a; }

  updateState();
  // Reveal UI after 5 seconds (if page loaded). This shows only the background first.
  window.addEventListener('DOMContentLoaded', ()=>{
    setTimeout(()=>{
      try{ document.documentElement.classList.remove('ui-hidden'); }catch(e){}
      // small entrance effect
      const c = document.querySelector('.container');
      if(c){ c.style.opacity = '1'; c.style.transform = 'translateY(0)'; }
    }, 5000);
  });

  window.addEventListener('keydown', (e)=>{ if(e.code === 'Space' && !e.repeat && !pickBtn.disabled){ e.preventDefault(); playAnimation({preview:false}); } });

  dropArea.addEventListener('paste', (e)=>{ const txt = (e.clipboardData || window.clipboardData).getData('text'); if(!txt) return; const arr = txt.split(/\r?\n/).map(s=>s.trim()).filter(Boolean); loadParticipants(arr, 'Pegado desde portapapeles'); });

  window.LauluSorteos = { getParticipants: ()=>participants.slice(), setParticipants: (arr)=>{ loadParticipants(arr, 'Manual set'); } };

})();
