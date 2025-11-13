// Clean main JS: fetch games, render cards, wire checkout modal
const API_BASE = 'http://localhost:3000/api';
const CART_KEY = 'cart';

let selectedGameId = null;
let selectedGameDetails = null; // {id,title,price,image}

// Small helper to safely escape text inserted into the DOM
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[s]);
}

function openModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.add('open');
  el.setAttribute('aria-hidden','false');
  // Não bloquear scroll quando a modal possuir a classe 'no-scroll-lock'
  if(!el.classList.contains('no-scroll-lock')){
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id){
  const el = document.getElementById(id);
  if(!el) return;
  el.classList.remove('open');
  el.setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

// Trailer and streamers functionality removed per user request

async function handleCheckout(gameId){
  try{
    const res = await fetch(`${API_BASE}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId })
    });
    const data = await res.json();
    const msgEl = document.getElementById('checkoutMessage');
    if(res.ok){
      if(msgEl){ msgEl.textContent = '✅ ' + data.message; msgEl.className = 'checkout-message success'; }
      setTimeout(()=>{ closeModal('checkoutModal'); if(msgEl) msgEl.textContent = ''; }, 1500);
    } else {
      if(msgEl){ msgEl.textContent = '❌ ' + (data.error || 'Erro'); msgEl.className = 'checkout-message error'; }
    }
  }catch(err){
    console.error('Checkout error', err);
    const msgEl = document.getElementById('checkoutMessage');
    if(msgEl){ msgEl.textContent = '❌ Erro de conexão'; msgEl.className = 'checkout-message error'; }
  }
}

async function loadGames(){
  const container = document.getElementById('gamesContainer');
  const noResults = document.getElementById('noResults');
  if(!container) return;
  container.innerHTML = '<div class="loading">Carregando jogos... 🎮</div>';
  try{
    const res = await fetch(`${API_BASE}/games`);
    const games = await res.json();
    // Excluir produtos de Game Pass do catálogo principal da loja
    const catalog = (games || []).filter(g => !String(g.title || g.name || '').toLowerCase().includes('gamepass'));
    container.innerHTML = '';
    if(!catalog || catalog.length === 0){
      if(noResults) { noResults.style.display = ''; noResults.textContent = 'Nenhum jogo disponível.'; }
      return;
    }
    // render cards
    catalog.forEach((game, i) => {
      const card = document.createElement('div');
      card.className = 'game-card' + (i===0? ' destaque' : '');
      card.dataset.gameId = game.id;
      card.dataset.platform = game.platform || '';
      card.innerHTML = `
        <button class="wish-btn" aria-pressed="false" aria-label="Adicionar aos desejos">☆</button>
        <img src="${game.image}" alt="${game.title}">
        ${i===0? '<span class="badge">Destaque</span>' : ''}
        <h3>${game.title}</h3>
        <p>R$ ${Number(game.price).toFixed(2)}</p>
        <button class="buy-btn" data-game-id="${game.id}">Comprar</button>
      `;
      container.appendChild(card);
    });
    // attach delegation for buy buttons (ensure binding only once)
    if(!container.dataset.clickBound){
      container.addEventListener('click', onContainerClick);
      container.dataset.clickBound = 'true';
    }
    // also load top played
    loadTopPlayed();
  }catch(err){
    console.error('Erro ao carregar jogos', err);
    if(container) container.innerHTML = '';
    if(noResults) { noResults.style.display = ''; noResults.textContent = 'Erro ao carregar jogos.'; }
  }
}

// Load top played games
async function loadTopPlayed(limit = 5){
  const container = document.getElementById('topPlayedContainer');
  if(!container) return;
  container.innerHTML = '<div class="loading">Carregando os mais jogados...</div>';
  try{
    const res = await fetch(`${API_BASE}/top-played?limit=${limit}`);
    if(!res.ok){
      // If endpoint not implemented (404) fallback to local /api/games
      if(res.status === 404){
        console.warn('/api/top-played not found, falling back to /api/games');
        const localRes = await fetch(`${API_BASE}/games`);
        const local = await localRes.json();
        // excluir Game Pass dos cálculos
        const baseOnly = (local || []).filter(g => !String(g.title || g.name || '').toLowerCase().includes('gamepass'));
        // sort by plays if present or keep original order
        const top = baseOnly.slice().sort((a,b)=> (b.plays||0)-(a.plays||0)).slice(0, limit);
        // render fallback
        container.innerHTML = '';
        if(!top || top.length === 0){ container.innerHTML = '<div class="no-results">Nenhum resultado.</div>'; return; }
        top.forEach((game, i) =>{
          const card = document.createElement('div');
          card.className = 'game-card';
          card.dataset.gameId = game.id;
          card.innerHTML = `
            <img src="${game.image}" alt="${game.title}">
            <h3>${escapeHtml(game.title || game.name || '')}</h3>
            <p>R$ ${Number(game.price||0).toFixed(2)}</p>
            <div class="plays">🔥 ${Number(game.plays||0).toLocaleString()} plays</div>
            <button class="buy-btn" data-game-id="${game.id}">Comprar</button>
          `;
          container.appendChild(card);
        });
        if(!container.dataset.clickBound){
          container.addEventListener('click', onContainerClick);
          container.dataset.clickBound = 'true';
        }
        return;
      }
      const text = await res.text().catch(()=> 'no body');
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
    }
    const top = await res.json();
    container.innerHTML = '';
    if(!top || top.length === 0){ container.innerHTML = '<div class="no-results">Nenhum resultado.</div>'; return; }
    top.forEach((game, i) =>{
      const card = document.createElement('div');
      card.className = 'game-card';
      card.dataset.gameId = game.id;
      card.innerHTML = `
        <img src="${game.image}" alt="${game.title}">
        <h3>${game.title}</h3>
        <p>R$ ${Number(game.price).toFixed(2)}</p>
        <div class="plays">🔥 ${game.plays.toLocaleString()} plays</div>
        <button class="buy-btn" data-game-id="${game.id}">Comprar</button>
      `;
      container.appendChild(card);
    });
    // delegate clicks (bind once)
    if(!container.dataset.clickBound){
      container.addEventListener('click', onContainerClick);
      container.dataset.clickBound = 'true';
    }
  }catch(err){
    console.error('Erro ao carregar top-played', err);
    container.innerHTML = `<div class="no-results">Erro ao carregar: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

// Load popular games from backend (which proxies RAWG)
async function loadPopularGames(){
  const container = document.getElementById('popularGamesContainer');
  if(!container) return;
  container.innerHTML = '<div class="loading">Carregando jogos populares...</div>';
  try{
    const res = await fetch(`${API_BASE}/games/popular`);
    if(!res.ok){
      // fallback to local games if popular endpoint not found
      if(res.status === 404){
        console.warn('/api/games/popular not found, falling back to /api/games');
        const localRes = await fetch(`${API_BASE}/games`);
        const local = await localRes.json();
        const games = (local || []).slice(0,10).map(g => ({ id: g.id, name: g.title || g.name, background_image: g.image, rating: g.rating || 0 }));
        container.innerHTML = '';
        if(!games || games.length === 0){ container.innerHTML = '<div class="no-results">Nenhum jogo popular encontrado.</div>'; return; }
        games.forEach(g => {
          const card = document.createElement('div');
          card.className = 'game-card popular-card';
          card.dataset.gameId = g.id;
          card.innerHTML = `
            <img src="${g.background_image}" alt="${escapeHtml(g.name)}">
            <h3>${escapeHtml(g.name)}</h3>
            <p class="rating">⭐ ${Number(g.rating||0).toFixed(1)}</p>
            <button class="buy-btn" data-game-id="${g.id}">Comprar</button>
          `;
          container.appendChild(card);
        });
        container.addEventListener('click', onContainerClick);
        return;
      }
      const text = await res.text().catch(()=> 'no body');
      throw new Error(`HTTP ${res.status} ${res.statusText} - ${text}`);
    }
  const games = await res.json();
  // por segurança, filtra caso o endpoint inclua algo indesejado
  const filtered = (games || []).filter(g => !String(g.title || g.name || '').toLowerCase().includes('gamepass'));
  container.innerHTML = '';
  if(!filtered || filtered.length === 0){ container.innerHTML = '<div class="no-results">Nenhum jogo popular encontrado.</div>'; return; }
  filtered.forEach(g => {
      const card = document.createElement('div');
      card.className = 'game-card popular-card';
      card.dataset.gameId = g.id;
      card.innerHTML = `
        <img src="${g.background_image}" alt="${escapeHtml(g.name)}">
        <h3>${escapeHtml(g.name)}</h3>
        <p class="rating">⭐ ${g.rating.toFixed(1)}</p>
        <button class="buy-btn" data-game-id="${g.id}">Comprar</button>
      `;
      container.appendChild(card);
    });
    if(!container.dataset.clickBound){
      container.addEventListener('click', onContainerClick);
      container.dataset.clickBound = 'true';
    }
  }catch(err){
    console.error('Erro ao carregar jogos populares', err);
    container.innerHTML = `<div class="no-results">Erro ao carregar populares: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

// Load Game Pass products from backend
async function loadGamePass(){
  const container = document.getElementById('gamepassContainer');
  if(!container) return;
  container.innerHTML = '<div class="loading">Carregando Game Pass...</div>';
  try{
    const res = await fetch(`${API_BASE}/gamepass`);
    if(!res.ok){ throw new Error('HTTP '+res.status); }
    const items = await res.json();
    container.innerHTML = '';
    if(!items || items.length === 0){ container.innerHTML = '<div class="no-results">Nenhuma opção de Game Pass disponível.</div>'; return; }
    items.slice(0,4).forEach(it => {
      const card = document.createElement('div');
      card.className = 'game-card';
      card.dataset.gameId = it.id;
      card.dataset.platform = 'xbox';
      card.innerHTML = `
        <img src="${it.image}" alt="${escapeHtml(it.title)}">
        <h3>${escapeHtml(it.title)}</h3>
        <p>R$ ${Number(it.price||0).toFixed(2)}</p>
        <button class="buy-btn" data-game-id="${it.id}">Comprar</button>
      `;
      container.appendChild(card);
    });
    if(!container.dataset.clickBound){
      container.addEventListener('click', onContainerClick);
      container.dataset.clickBound = 'true';
    }
  }catch(err){
    console.error('Erro ao carregar Game Pass', err);
    container.innerHTML = `<div class=\"no-results\">Erro ao carregar: ${escapeHtml(err.message || String(err))}</div>`;
  }
}

function onContainerClick(e){
  const buy = e.target.closest('.buy-btn');
  if(buy){
    const gameId = parseInt(buy.dataset.gameId);
    selectedGameId = gameId;
    const gameTitle = document.getElementById('checkoutGameName');
    const gamePrice = document.getElementById('checkoutGamePrice');
    const gameImg = document.getElementById('checkoutGameImage');
    const genresEl = document.getElementById('checkoutGenres');
    const platsEl = document.getElementById('checkoutPlatforms');
    const ratingEl = document.getElementById('checkoutRating');
    const descEl = document.getElementById('checkoutDescription');

    // find price from card
    const card = buy.closest('.game-card');
  const title = card.querySelector('h3')?.textContent || '';
  const priceText = card.querySelector('p')?.textContent || '';
  const imgSrc = card.querySelector('img')?.src || '';
    if(gameTitle) gameTitle.textContent = title;
    if(gamePrice) gamePrice.textContent = priceText;
  if(gameImg){ gameImg.src = imgSrc; gameImg.alt = title; }

  // prepara detalhes para adicionar ao carrinho
  const priceNumber = Number((priceText||'').replace(/[^0-9,\.]/g,'').replace(',','.')) || 0;
  selectedGameDetails = { id: gameId, title, price: priceNumber, image: imgSrc };

    // loading placeholders
    if(genresEl) genresEl.textContent = 'Carregando...';
    if(platsEl) platsEl.textContent = 'Carregando...';
    if(ratingEl) ratingEl.textContent = '—';
    if(descEl) descEl.textContent = 'Carregando detalhes...';

    openModal('checkoutModal');

    // fetch details from backend RAWG proxy
    (async ()=>{
      try{
        const res = await fetch(`${API_BASE}/games/${gameId}/details`);
        if(!res.ok){
          console.warn('Detalhes RAWG não disponíveis', res.status);
          if(genresEl) genresEl.textContent = '—';
          if(platsEl) platsEl.textContent = '—';
          if(ratingEl) ratingEl.textContent = '—';
          if(descEl) descEl.textContent = 'Detalhes indisponíveis no momento';
          return;
        }
        const data = await res.json();
        if(genresEl) genresEl.textContent = (data.genres && data.genres.length) ? data.genres.join(', ') : '—';
        if(platsEl) platsEl.textContent = (data.platforms && data.platforms.length) ? data.platforms.join(', ') : '—';
        if(ratingEl) ratingEl.textContent = (data.rating != null) ? Number(data.rating).toFixed(1) : '—';
        if(descEl){
          const d = data.description_raw || '';
          const short = d.length > 250 ? d.slice(0,250).trim() + '…' : d;
          descEl.textContent = short || '—';
        }
      }catch(err){
        console.error('Erro ao buscar detalhes', err);
        if(genresEl) genresEl.textContent = '—';
        if(platsEl) platsEl.textContent = '—';
        if(ratingEl) ratingEl.textContent = '—';
        if(descEl) descEl.textContent = 'Detalhes indisponíveis no momento';
      }
    })();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Migração legada: remover chaves antigas de autenticação salvas no localStorage
  try { localStorage.removeItem('loggedUser'); localStorage.removeItem('userData'); } catch(_) {}

  loadGames();
  // load popular games section (RAWG)
  loadPopularGames();
  // load Game Pass products from DB
  loadGamePass();

  // ============================
  // Barra de pesquisa com sugestões
  // ============================
  const searchFormEl = document.getElementById('searchForm');
  const searchInputEl = document.getElementById('searchInput');
  const searchSugEl = document.getElementById('searchSuggestions');

  function debounce(fn, delay=300){
    let t; return (...args) => { clearTimeout(t); t = setTimeout(()=> fn(...args), delay); };
  }
  let abortCtrl = null;
  let activeIndex = -1;

  function clearSuggestions(){ if(searchSugEl){ searchSugEl.innerHTML = ''; searchSugEl.classList.remove('open'); } }
  function openSuggestions(){ if(searchSugEl && searchSugEl.children.length){ searchSugEl.classList.add('open'); } }
  function getItems(){ return Array.from(searchSugEl?.querySelectorAll('.suggest-item') || []); }
  function setActive(index){
    const items = getItems();
    items.forEach((el,i)=> el.classList.toggle('active', i===index));
    activeIndex = index;
    if(items[index]){
      items[index].scrollIntoView({ block: 'nearest' });
    }
  }

  async function fetchSuggestions(q){
    try{
      if(!q || q.trim().length < 1){ clearSuggestions(); return; }
      if(abortCtrl){ try{ abortCtrl.abort(); }catch(_){} }
      abortCtrl = new AbortController();
      const res = await fetch(`${API_BASE}/games/search?q=${encodeURIComponent(q)}&limit=8`, { signal: abortCtrl.signal });
      if(!res.ok){ throw new Error('HTTP '+res.status); }
      const items = await res.json();
      renderSuggestions(items || []);
    }catch(err){ if(err.name !== 'AbortError'){ console.debug('suggest error', err.message||err); } }
  }

  function renderSuggestions(items){
    if(!searchSugEl) return;
    searchSugEl.innerHTML = '';
    if(!Array.isArray(items) || items.length === 0){ searchSugEl.classList.remove('open'); return; }
    activeIndex = -1;
    for(const g of items){
      const row = document.createElement('div');
      row.className = 'suggest-item';
      row.dataset.gameId = g.id;
      row.innerHTML = `
        <img class="suggest-thumb" src="${g.image||''}" alt="${escapeHtml(g.title||'')}"/>
        <div class="suggest-title">${escapeHtml(g.title||'')}</div>
        <div class="suggest-price">R$ ${Number(g.price||0).toFixed(2)}</div>
      `;
      row.addEventListener('mousedown', (e) => { // mousedown para disparar antes do blur
        e.preventDefault();
        handleSuggestionSelect(g);
      });
      searchSugEl.appendChild(row);
    }
    openSuggestions();
  }

  function handleSuggestionSelect(game){
    if(searchInputEl){ searchInputEl.value = game.title || ''; }
    clearSuggestions();
    
    // Abrir o modal de checkout diretamente com o jogo selecionado
    selectedGameId = game.id;
    const gameTitle = document.getElementById('checkoutGameName');
    const gamePrice = document.getElementById('checkoutGamePrice');
    const gameImg = document.getElementById('checkoutGameImage');
    const genresEl = document.getElementById('checkoutGenres');
    const platsEl = document.getElementById('checkoutPlatforms');
    const ratingEl = document.getElementById('checkoutRating');
    const descEl = document.getElementById('checkoutDescription');

    // Preencher com dados da busca
    const title = game.title || '';
    const priceNumber = Number(game.price || 0);
    const priceText = `R$ ${priceNumber.toFixed(2)}`;
    const imgSrc = game.image || '';
    
    if(gameTitle) gameTitle.textContent = title;
    if(gamePrice) gamePrice.textContent = priceText;
    if(gameImg){ gameImg.src = imgSrc; gameImg.alt = title; }

    // Prepara detalhes para adicionar ao carrinho
    selectedGameDetails = { id: game.id, title, price: priceNumber, image: imgSrc };

    // Loading placeholders
    if(genresEl) genresEl.textContent = 'Carregando...';
    if(platsEl) platsEl.textContent = 'Carregando...';
    if(ratingEl) ratingEl.textContent = '—';
    if(descEl) descEl.textContent = 'Carregando detalhes...';

    openModal('checkoutModal');

    // Fetch details from backend RAWG proxy
    (async ()=>{
      try{
        const res = await fetch(`${API_BASE}/games/${game.id}/details`);
        if(!res.ok){
          console.warn('Detalhes RAWG não disponíveis', res.status);
          if(genresEl) genresEl.textContent = '—';
          if(platsEl) platsEl.textContent = '—';
          if(ratingEl) ratingEl.textContent = '—';
          if(descEl) descEl.textContent = 'Detalhes indisponíveis no momento';
          return;
        }
        const data = await res.json();
        if(genresEl) genresEl.textContent = (data.genres && data.genres.length) ? data.genres.join(', ') : '—';
        if(platsEl) platsEl.textContent = (data.platforms && data.platforms.length) ? data.platforms.join(', ') : '—';
        if(ratingEl) ratingEl.textContent = (data.rating != null) ? Number(data.rating).toFixed(1) : '—';
        if(descEl){
          const d = data.description_raw || '';
          const short = d.length > 250 ? d.slice(0,250).trim() + '…' : d;
          descEl.textContent = short || '—';
        }
      }catch(err){
        console.error('Erro ao buscar detalhes', err);
        if(genresEl) genresEl.textContent = '—';
        if(platsEl) platsEl.textContent = '—';
        if(ratingEl) ratingEl.textContent = '—';
        if(descEl) descEl.textContent = 'Detalhes indisponíveis no momento';
      }
    })();
  }

  if(searchInputEl){
    searchInputEl.addEventListener('input', debounce((e) => fetchSuggestions(e.target.value), 280));
    searchInputEl.addEventListener('keydown', (e) => {
      if(e.key === 'Escape'){ clearSuggestions(); return; }
      if(e.key === 'ArrowDown' || e.key === 'Down'){
        const items = getItems(); if(!items.length) return;
        e.preventDefault();
        const next = Math.min(activeIndex + 1, items.length - 1);
        setActive(next);
        return;
      }
      if(e.key === 'ArrowUp' || e.key === 'Up'){
        const items = getItems(); if(!items.length) return;
        e.preventDefault();
        const prev = Math.max(activeIndex - 1, 0);
        setActive(prev);
        return;
      }
      if(e.key === 'Enter'){
        const items = getItems();
        if(items.length && activeIndex >= 0){
          e.preventDefault();
          const el = items[activeIndex];
          const id = el?.dataset?.gameId;
          const title = el?.querySelector('.suggest-title')?.textContent || '';
          const priceText = el?.querySelector('.suggest-price')?.textContent || '';
          handleSuggestionSelect({ id, title, price: Number((priceText||'').replace(/[^0-9,\.]/g,'').replace(',','.')) });
          return;
        }
      }
    });
    searchInputEl.addEventListener('blur', () => setTimeout(clearSuggestions, 120));
  }
  if(searchFormEl){
    searchFormEl.addEventListener('submit', async (e) => {
      e.preventDefault();
      const q = (searchInputEl?.value || '').trim();
      if(q.length < 1){ return; }
      // Busca rápida e foca no primeiro resultado
      try{
        const res = await fetch(`${API_BASE}/games/search?q=${encodeURIComponent(q)}&limit=1`);
        if(res.ok){
          const arr = await res.json();
          if(arr && arr[0]){ handleSuggestionSelect(arr[0]); return; }
        }
      }catch(_){ /* ignore */ }
      // fallback: rolar até a loja
      const store = document.getElementById('store');
      if(store){ store.scrollIntoView({ behavior: 'smooth' }); }
    });
  }

  // Add to cart from checkout
  const addToCartBtn = document.getElementById('addToCartFromCheckout');
  if(addToCartBtn){
    addToCartBtn.addEventListener('click', () => {
      if(!selectedGameDetails){ return; }
      addToCart(selectedGameDetails);
      const msgEl = document.getElementById('checkoutMessage');
      if(msgEl){ msgEl.textContent = '✅ Adicionado ao carrinho'; msgEl.className = 'checkout-message success';
        setTimeout(()=>{ msgEl.textContent=''; msgEl.className='checkout-message'; }, 1500);
      }
    });
  }

  // Close checkout
  document.getElementById('closeCheckout')?.addEventListener('click', () => closeModal('checkoutModal'));

  // Trailer/streams modal handlers removed (feature disabled)

  // Support form submission
  const supportForm = document.getElementById('supportForm');
  if(supportForm){
    supportForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('supportName')?.value || '';
      const email = document.getElementById('supportEmail')?.value || '';
      const subject = document.getElementById('supportSubject')?.value || '';
      const message = document.getElementById('supportMessage')?.value || '';

      try{
        const res = await fetch(`${API_BASE}/support/ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, subject, message })
        });

        if(!res.ok){
          alert('Erro ao abrir o ticket. Tente novamente.');
          return;
        }

        const data = await res.json();
        const protocolo = data.protocolo || '#000000';

        // Clear form fields
        supportForm.reset();

        // Open chatbot and show auto-message
        const chatbot = document.getElementById('chatbot');
        const chatbotPanel = document.getElementById('chatbotPanel');
        const chatbotToggle = document.getElementById('chatbotToggle');
        const messagesContainer = document.getElementById('chatbotMessages');

        if(chatbotPanel){
          chatbotPanel.setAttribute('aria-hidden', 'false');
        }
        if(chatbot){
          chatbot.setAttribute('aria-hidden', 'false');
        }
        if(chatbotToggle){
          chatbotToggle.style.display = 'none'; // hide toggle button when open
        }

        // Add bot auto-message with protocol
        if(messagesContainer){
          const botMsg = document.createElement('div');
          botMsg.className = 'msg bot';
          botMsg.textContent = `✅ Seu ticket foi aberto com sucesso! Protocolo: ${protocolo}. Em breve nossa equipe entrará em contato.`;
          messagesContainer.appendChild(botMsg);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }catch(err){
        console.error('Erro ao enviar ticket', err);
        alert('Erro ao abrir o ticket. Tente novamente.');
      }
    });
  }

  // Cookie alert (keep simple)
  const accept = document.getElementById('acceptCookies');
  const cookieAlert = document.getElementById('cookieAlert');
  if(accept){ accept.addEventListener('click', () => { localStorage.setItem('cookiesAccepted','true'); if(cookieAlert) cookieAlert.style.display = 'none'; }); }
  if(!localStorage.getItem('cookiesAccepted') && cookieAlert){ setTimeout(()=> cookieAlert.style.display = 'block', 2000); }

  // ========================================
  // MODAL DE LOGIN
  // ========================================
  const loginBtn = document.getElementById('loginBtn');
  const userMenuBtn = document.getElementById('userMenuBtn');
  const loginModal = document.getElementById('loginModal');
  const closeLoginModal = document.getElementById('closeLoginModal');
  const loginForm = document.getElementById('loginForm');
  const loginMessage = document.getElementById('loginMessage');
  const accountModal = document.getElementById('accountModal');
  const closeAccountModal = document.getElementById('closeAccountModal');
  const closeAccount = document.getElementById('closeAccount');
  const logoutBtn = document.getElementById('logoutBtn');
  const accName = document.getElementById('accName');
  const accEmail = document.getElementById('accEmail');
  const purchasesList = document.getElementById('purchasesList');

  // Abrir modal
  if(loginBtn){
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const userData = JSON.parse(sessionStorage.getItem('userData') || 'null');
      if(userData && userData.id){
        // Abre modal imediatamente e carrega dados com cache/guard
        openModal('accountModal');
        await loadAccount(userData.id);
      } else {
        // Não logado: abre modal de login
        openModal('loginModal');
      }
    });
  }

  // Fechar modal
  if(closeLoginModal){
    closeLoginModal.addEventListener('click', () => {
      closeModal('loginModal');
      // Limpa o formulário e mensagens ao fechar
      if(loginForm) loginForm.reset();
      if(loginMessage) {
        loginMessage.textContent = '';
        loginMessage.className = 'login-message';
      }
    });
  }

  // Fechar ao clicar fora do conteúdo
  if(loginModal){
    loginModal.addEventListener('click', (e) => {
      if(e.target === loginModal){
        closeModal('loginModal');
        if(loginForm) loginForm.reset();
        if(loginMessage) {
          loginMessage.textContent = '';
          loginMessage.className = 'login-message';
        }
      }
    });
  }

  // Submeter formulário de login
  if(loginForm){
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value.trim();

      if(!email || !password){
        if(loginMessage){
          loginMessage.textContent = '⚠️ Por favor, preencha todos os campos.';
          loginMessage.className = 'login-message error';
        }
        return;
      }

      // Mostra mensagem de carregamento
      if(loginMessage){
        loginMessage.textContent = '🔄 Autenticando...';
        loginMessage.className = 'login-message';
      }

      try {
        // Faz requisição à API de login
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

  if(response.ok && data.success){
          // Login bem-sucedido
          if(loginMessage){
            loginMessage.textContent = '✅ ' + data.message;
            loginMessage.className = 'login-message success';
          }

          // Salva os dados do usuário na sessão (sessionStorage)
          sessionStorage.setItem('loggedUser', data.user.username || data.user.email);
          sessionStorage.setItem('userData', JSON.stringify(data.user));

          // Fecha o modal após 1.5s
          setTimeout(() => {
            closeModal('loginModal');
            if(loginForm) loginForm.reset();
            if(loginMessage) {
              loginMessage.textContent = '';
              loginMessage.className = 'login-message';
            }
            
            // Atualiza o botão para mostrar o nome do usuário
            if(loginBtn){
              const label = data.user.nome_completo || data.user.username || data.user.email;
              loginBtn.textContent = `👤 ${label}`;
            }
          }, 1500);
        } else {
          // Erro de autenticação
          if(loginMessage){
            loginMessage.textContent = '❌ ' + (data.message || 'Erro ao fazer login');
            loginMessage.className = 'login-message error';
          }
        }
      } catch(error){
        console.error('Erro ao fazer login:', error);
        if(loginMessage){
          loginMessage.textContent = '❌ Erro de conexão. Tente novamente.';
          loginMessage.className = 'login-message error';
        }
      }
    });
  }

  // Verifica se já está logado ao carregar a página e ajusta o rótulo do botão
  const loggedUser = sessionStorage.getItem('loggedUser');
  if(loginBtn){
    if(loggedUser){
      const userData = JSON.parse(sessionStorage.getItem('userData') || '{}');
      loginBtn.textContent = `👤 ${userData.nome_completo || loggedUser}`;
    } else {
      loginBtn.textContent = 'Entrar';
    }
  }

  // Mostrar/ocultar botão de menu do usuário conforme sessão
  if(userMenuBtn){
    if(loggedUser){ userMenuBtn.classList.remove('hidden'); }
    else { userMenuBtn.classList.add('hidden'); }
  }

  // Fechar modal da conta
  if(closeAccountModal){ closeAccountModal.addEventListener('click', () => closeModal('accountModal')); }
  if(closeAccount){ closeAccount.addEventListener('click', () => closeModal('accountModal')); }

  // Logout
  if(logoutBtn){
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('loggedUser');
      sessionStorage.removeItem('userData');
      if(loginBtn){ loginBtn.textContent = 'Entrar'; }
      if(userMenuBtn){ userMenuBtn.classList.add('hidden'); }
      // Garante que qualquer popout de perfil também seja fechado
      closeModal('profileModal');
      closeModal('accountModal');
    });
  }

  // Cache e guard para evitar fetch múltiplo e travamentos
  const ACCOUNT_CACHE_TTL = 10000; // 10s
  let accountCache = { userId: null, data: null, ts: 0 };
  let accountLoading = false;

  function renderAccount(data){
    if(accName) accName.textContent = data.user?.nome_completo || data.user?.username || '—';
    if(accEmail) accEmail.textContent = data.user?.email || '—';
    if(purchasesList){
      purchasesList.innerHTML = '';
      const items = Array.isArray(data.purchases) ? data.purchases : [];
      if(items.length === 0){
        const li = document.createElement('li');
        li.className = 'muted';
        li.textContent = 'Sem compras registradas.';
        purchasesList.appendChild(li);
      } else {
        items.forEach(p => {
          const li = document.createElement('li');
          const title = document.createElement('div');
          title.className = 'title';
          title.textContent = p.title || `Compra #${p.id}`;
          const meta = document.createElement('div');
          meta.className = 'meta';
          const valor = typeof p.valor === 'number' ? p.valor.toFixed(2) : p.valor;
          const when = p.created_at ? new Date(p.created_at).toLocaleString() : '';
          meta.textContent = `R$ ${valor} ${when ? '— ' + when : ''}`;
          li.appendChild(title);
          li.appendChild(meta);
          purchasesList.appendChild(li);
        });
      }
    }
  }

  // Carrega dados da conta e compras com cache
  async function loadAccount(userId, { force = false } = {}){
    try{
      const now = Date.now();
      if(!force && accountCache.userId === userId && accountCache.data && (now - accountCache.ts) < ACCOUNT_CACHE_TTL){
        renderAccount(accountCache.data);
        return;
      }
      if(accountLoading) return; // evita múltiplos fetch simultâneos
      accountLoading = true;
      if(purchasesList){ purchasesList.innerHTML = '<li class="muted">Carregando...</li>'; }
      const res = await fetch(`${API_BASE}/account/${userId}`);
      if(!res.ok) throw new Error('Falha ao buscar conta');
      const data = await res.json();
      accountCache = { userId, data, ts: Date.now() };
      renderAccount(data);
    }catch(err){
      console.error('Erro ao carregar conta', err);
      if(purchasesList){
        purchasesList.innerHTML = '<li class="muted">Erro ao carregar dados.</li>';
      }
    } finally {
      accountLoading = false;
    }
  }
  // ========================================
  // MODAL DE CADASTRO
  // ========================================
  const registerModal = document.getElementById('registerModal');
  const closeRegisterModal = document.getElementById('closeRegisterModal');
  const registerForm = document.getElementById('registerForm');
  const registerMessage = document.getElementById('registerMessage');
  const openRegisterLink = document.getElementById('openRegisterLink');
  const openLoginLink = document.getElementById('openLoginLink');

  // Abrir modal de cadastro a partir do link no login
  if(openRegisterLink){
    openRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('loginModal');
      if(loginForm) loginForm.reset();
      setTimeout(() => openModal('registerModal'), 300);
    });
  }

  // Abrir modal de login a partir do link no cadastro
  if(openLoginLink){
    openLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal('registerModal');
      if(registerForm) registerForm.reset();
      setTimeout(() => openModal('loginModal'), 300);
    });
  }

  // Fechar modal de cadastro
  if(closeRegisterModal){
    closeRegisterModal.addEventListener('click', () => {
      closeModal('registerModal');
      if(registerForm) registerForm.reset();
      if(registerMessage) {
        registerMessage.textContent = '';
        registerMessage.className = 'login-message';
      }
    });
  }

  // Fechar ao clicar fora do conteúdo
  if(registerModal){
    registerModal.addEventListener('click', (e) => {
      if(e.target === registerModal){
        closeModal('registerModal');
        if(registerForm) registerForm.reset();
        if(registerMessage) {
          registerMessage.textContent = '';
          registerMessage.className = 'login-message';
        }
      }
    });
  }

  // Submeter formulário de cadastro
  if(registerForm){
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const username = document.getElementById('registerUsername').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value.trim();
      const nome_completo = document.getElementById('registerNome').value.trim();

      if(!username || !email || !password){
        if(registerMessage){
          registerMessage.textContent = '⚠️ Por favor, preencha todos os campos obrigatórios.';
          registerMessage.className = 'login-message error';
        }
        return;
      }

      // Mostra mensagem de carregamento
      if(registerMessage){
        registerMessage.textContent = '🔄 Criando sua conta...';
        registerMessage.className = 'login-message';
      }

      try {
        // Faz requisição à API de cadastro
        const response = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password, nome_completo })
        });

        const data = await response.json();

        if(response.ok && data.success){
          // Cadastro bem-sucedido
          if(registerMessage){
            registerMessage.textContent = '✅ ' + data.message + ' Redirecionando para login...';
            registerMessage.className = 'login-message success';
          }
          if(userMenuBtn){ userMenuBtn.classList.remove('hidden'); }

          // Fecha o modal de cadastro e abre o de login após 2s
          setTimeout(() => {
            closeModal('registerModal');
            if(registerForm) registerForm.reset();
            if(registerMessage) {
              registerMessage.textContent = '';
              registerMessage.className = 'login-message';
            }
            
            // Abre o modal de login
            openModal('loginModal');
            // Pre-preenche o username (se existir campo de username no login)
            if(document.getElementById('loginUsername')){
              document.getElementById('loginUsername').value = username;
            }
          }, 2000);
        } else {
          // Erro no cadastro
          if(registerMessage){
            registerMessage.textContent = '❌ ' + (data.message || 'Erro ao cadastrar usuário');
            registerMessage.className = 'login-message error';
          }
        }
      } catch(error){
        console.error('Erro ao cadastrar:', error);
        if(registerMessage){
          registerMessage.textContent = '❌ Erro de conexão. Tente novamente.';
          registerMessage.className = 'login-message error';
        }
      }
    });
  }

  // ===== Novo: Perfil do usuário (menu hamburguer) =====
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  const closeProfile = document.getElementById('closeProfile');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');

  if(userMenuBtn){
    userMenuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const data = JSON.parse(sessionStorage.getItem('userData') || 'null');
      if(data){
        if(profileName) profileName.textContent = data.nome_completo || data.username || '—';
        if(profileEmail) profileEmail.textContent = data.email || '—';
        openModal('profileModal');
      } else {
        // sem sessão: redireciona para login
        openModal('loginModal');
      }
    });
  }

  if(closeProfileModal){ closeProfileModal.addEventListener('click', () => closeModal('profileModal')); }
  if(closeProfile){ closeProfile.addEventListener('click', () => closeModal('profileModal')); }
  if(profileModal){
    profileModal.addEventListener('click', (e) => {
      if(e.target === profileModal){ closeModal('profileModal'); }
    });
  }
});

// ==========================
// Carrinho - utilitários
// ==========================
function getCart(){
  try{ return JSON.parse(sessionStorage.getItem(CART_KEY) || '[]'); }catch(_){ return []; }
}
function saveCart(cart){ sessionStorage.setItem(CART_KEY, JSON.stringify(cart)); }
function cartCount(){ return getCart().reduce((sum,i)=> sum + (i.qty||0), 0); }
function updateCartBadge(){ const el = document.getElementById('cartCount'); if(el){ el.textContent = String(cartCount()); } }
function addToCart(item){
  const cart = getCart();
  const idx = cart.findIndex(i => i.id === item.id);
  if(idx >= 0){ cart[idx].qty = (cart[idx].qty||1) + 1; }
  else { cart.push({ id:item.id, title:item.title, price:item.price, image:item.image, qty:1 }); }
  saveCart(cart);
  updateCartBadge();
}

function renderCart(){
  const list = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  const cart = getCart();
  if(list){
    list.innerHTML = '';
    if(cart.length === 0){ list.innerHTML = '<div class="no-results">Seu carrinho está vazio.</div>'; }
    cart.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'cart-row';
      row.dataset.index = String(idx);
      row.innerHTML = `
        <img class="cart-thumb" src="${it.image}" alt="${escapeHtml(it.title)}"/>
        <div class="cart-title">${escapeHtml(it.title)}</div>
        <div class="cart-qty">
          <button class="qty-minus" aria-label="Diminuir">−</button>
          <span class="qty">${it.qty||1}</span>
          <button class="qty-plus" aria-label="Aumentar">+</button>
        </div>
        <div class="cart-price">R$ ${(it.price * (it.qty||1)).toFixed(2)}</div>
        <button class="remove-item" aria-label="Remover">×</button>
      `;
      list.appendChild(row);
    });
  }
  const total = cart.reduce((s,i)=> s + (i.price * (i.qty||1)), 0);
  if(totalEl){ totalEl.textContent = `Total: R$ ${total.toFixed(2)}`; }
}

// Abrir carrinho via header button
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();
  const cartBtn = document.getElementById('cartBtn');
  const closeCart = document.getElementById('closeCart');
  const cartCheckout = document.getElementById('checkoutBtn');
  const list = document.getElementById('cartItems');
  if(cartBtn){
    cartBtn.addEventListener('click', () => { renderCart(); openModal('cartModal'); });
  }
  if(closeCart){ closeCart.addEventListener('click', () => closeModal('cartModal')); }
  if(cartCheckout){
    cartCheckout.addEventListener('click', () => {
      const hasItems = getCart().length > 0;
      if(!hasItems){
        alert('Seu carrinho está vazio. Adicione um produto antes de finalizar.');
        return;
      }
      // abrir fluxo de checkout e fechar carrinho
      closeModal('cartModal');
      // opcionalmente limpar gameId único; vamos indicar que é compra de múltiplos
      window.selectedGameId = undefined;
      if(window.abrirCheckout){ window.abrirCheckout(); }
    });
  }
  if(list){
    list.addEventListener('click', (e) => {
      const row = e.target.closest('.cart-row');
      if(!row) return;
      const idx = parseInt(row.dataset.index);
      const cart = getCart();
      if(Number.isNaN(idx) || !cart[idx]) return;
      if(e.target.closest('.qty-plus')){ cart[idx].qty = (cart[idx].qty||1) + 1; }
      else if(e.target.closest('.qty-minus')){ cart[idx].qty = Math.max(1, (cart[idx].qty||1) - 1); }
      else if(e.target.closest('.remove-item')){ cart.splice(idx,1); }
      saveCart(cart);
      updateCartBadge();
      renderCart();
    });
  }
});
