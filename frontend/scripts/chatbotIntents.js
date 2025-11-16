(function(){
  const API = 'http://localhost:3000/api';

  // Helper formatters
  function fmtDate(iso){
    try{ return new Date(iso).toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }); }catch(_){ return iso || '—'; }
  }
  function fmtPrice(v){ try{ return 'R$ ' + Number(v||0).toFixed(2).replace('.', ','); }catch(_){ return 'R$ 0,00'; } }

  // Intent registry
  const intents = [];

  function addIntent(name, patterns, handler){
    intents.push({ name, patterns, handler });
  }

  function match(text){
    const t = (text || '').trim().toLowerCase();
    for(const it of intents){
      if(it.patterns.some(re => re.test(t))){ return it; }
    }
    return null;
  }

  // Intent: Histórico de compras
  addIntent('HISTORICO', [
    /\bmeu historico\b/i,
    /\bmeu histórico\b/i,
    /\bminhas compras\b/i,
    /\bhistorico de compras\b/i,
    /\bhistórico de compras\b/i,
    /\bhistorico\b/i,
  ], async (ctx) => {
    const { push, getToken, open, pushHtml } = ctx;
    const token = getToken();
    open();
    if(!token){
      push('🔐 Para ver seu histórico, faça login primeiro.');
      return;
    }
    try{
      push('⏳ Buscando seu histórico de compras...');
      const res = await fetch(`${API}/compras/historico`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.status === 401){ push('❌ Sessão expirada. Faça login novamente.'); return; }
      if(!res.ok){ push('❌ Erro ao carregar seu histórico. Tente novamente.'); return; }
      const data = await res.json();
      const list = data.purchases || [];
      if(list.length === 0){ push('Você ainda não fez nenhuma compra 😢'); return; }
      // Render all items (nome + valor)
      list.forEach(p => {
        const title = p.produto || 'Produto';
        const price = fmtPrice(p.valor);
        const line = `• ${title} — ${price}`;
        push(line);
      });
    }catch(err){
      console.error('Historico intent error', err);
      push('❌ Não foi possível carregar seu histórico no momento.');
    }
  });

  // Intent: 1 - Ajuda com compras (mesmo comportamento: listar histórico completo)
  addIntent('MENU_1_AJUDA_COMPRAS', [
    /^1\b/,
    /^1️⃣$/,
    /\bajuda com compras\b/i
  ], async (ctx) => {
    const { push, getToken, open } = ctx;
    const token = getToken();
    open();
    if(!token){ push('🔐 Para ver seu histórico, faça login primeiro.'); return; }
    try{
      push('⏳ Buscando seu histórico de compras...');
      const res = await fetch(`${API}/compras/historico`, { headers: { 'Authorization': `Bearer ${token}` } });
      if(res.status === 401){ push('❌ Sessão expirada. Faça login novamente.'); return; }
      if(!res.ok){ push('❌ Erro ao carregar seu histórico. Tente novamente.'); return; }
      const data = await res.json();
      const list = data.purchases || [];
      if(list.length === 0){ push('Você ainda não fez nenhuma compra 😢'); return; }
      list.forEach(p => { const title = p.produto || 'Produto'; const price = fmtPrice(p.valor); push(`• ${title} — ${price}`); });
    }catch(err){ console.error('menu1/historico', err); push('❌ Não foi possível carregar seu histórico no momento.'); }
  });

  // Intent: 2 - Acompanhar ticket de suporte (simulado)
  addIntent('MENU_2_TICKET', [
    /^2\b/,
    /^2️⃣$/,
    /\bacompanhar ticket\b/i,
    /\bticket de suporte\b/i
  ], async (ctx) => {
    const { push, open, startTicketFlow } = ctx;
    open();
    // inicia fluxo simples: perguntar número e aguardar próxima entrada
    if(typeof startTicketFlow === 'function'){
      startTicketFlow();
    } else {
      push('Por favor, informe o número do seu ticket.');
    }
  });

  // Intent: 3 - Recomendações de jogos (busca um aleatório do banco)
  addIntent('MENU_3_RECOMENDACAO', [
    /^3\b/,
    /^3️⃣$/,
    /\brecomendac\w*o\b/i, // recomendação/recomendacoes
    /\brecomendacoes de jogos\b/i
  ], async (ctx) => {
    const { push, pushHtml, open } = ctx;
    open();
    try{
      push('🎲 Buscando uma recomendação pra você...');
      const res = await fetch(`${API}/jogos/recomendado`);
      if(!res.ok){ push('❌ Não consegui buscar uma recomendação agora.'); return; }
      const g = await res.json();
      const price = fmtPrice(g.price);
      const text = `Recomendação de hoje: ${g.title} – ${price}`;
      if(g.image){
        pushHtml(`<div><div>${text}</div><img src="${g.image}" alt="${g.title}" style="max-width: 180px; border-radius: 6px; margin-top: 6px;"/></div>`);
      } else {
        push(text);
      }
    }catch(err){ console.error('recomendado', err); push('❌ Erro ao obter recomendação.'); }
  });

  // Intent: 4 - Falar com suporte humano (simulação)
  addIntent('MENU_4_SUPORTE_HUMANO', [
    /^4\b/,
    /^4️⃣$/,
    /\bsuporte humano\b/i,
    /\bfalar com suporte\b/i
  ], async (ctx) => {
    const { push, open } = ctx;
    open();
    push('Certo! Vou acionar um atendente humano. Tempo médio de resposta: 2 minutos ⏳');
  });

  // Export API
  window.ChatbotIntents = { add: addIntent, match };
})();
