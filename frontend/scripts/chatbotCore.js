// Chatbot core with intent routing and compatibility layer
(function(){
  const toggle = document.getElementById('chatbotToggle');
  const panel = document.getElementById('chatbotPanel');
  const closeBtn = document.getElementById('chatbotClose');
  const minimizeBtn = document.getElementById('chatbotMinimize');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');

  if(!toggle || !panel || !form || !input || !messages){ return; }

  const Intents = window.ChatbotIntents; // provided by chatbotIntents.js

  // Helpers
  function getUser(){ try{ return JSON.parse(sessionStorage.getItem('userData') || 'null'); }catch(_){ return null; } }
  function getToken(){ try{ return sessionStorage.getItem('token') || ''; }catch(_){ return ''; } }

  function pushMessage(text, who='bot', extraClass=''){
    const el = document.createElement('div');
    el.className = 'msg ' + (who === 'user' ? 'user' : 'bot') + (extraClass ? (' ' + extraClass) : '');
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  function openChat(){
    if(panel.getAttribute('aria-hidden') === 'false'){ return; }
    // restore state if minimized previously
    panel.style.height = '';
    const msgs = panel.querySelector('.chatbot-messages'); if(msgs) msgs.style.display='';
    const frm = panel.querySelector('.chatbot-form'); if(frm) frm.style.display='';
    panel.setAttribute('aria-hidden','false');
    document.getElementById('chatbot')?.setAttribute('aria-hidden','false');
    panel.style.animation = 'fadeIn 0.4s ease-in';
    input.focus();
  }
  function closeChat(){
    panel.setAttribute('aria-hidden','true');
    document.getElementById('chatbot')?.setAttribute('aria-hidden','true');
    panel.style.height = '';
    const msgs = panel.querySelector('.chatbot-messages'); if(msgs) msgs.style.display='';
    const frm = panel.querySelector('.chatbot-form'); if(frm) frm.style.display='';
  }
  function toggleChat(){ const hidden = panel.getAttribute('aria-hidden') === 'true'; if(hidden) openChat(); else closeChat(); }

  // Export compatibility layer
  window.pushMessage = pushMessage;
  window.openChatWidget = openChat;
  window.closeChatWidget = closeChat;

  // Password recovery mini-flow (kept for compatibility)
  const recovery = { active:false, step:0, name:'', email:'' };
  function startPasswordRecovery(){
    openChat();
    recovery.active = true; recovery.step = 1; recovery.name = ''; recovery.email = '';
    pushMessage('🔒 Vamos recuperar sua senha. Informe seus dados para recuperação:','bot');
    pushMessage('Nome:','bot');
    input.focus();
  }
  window.startPasswordRecovery = startPasswordRecovery;

  // Ticket tracking mini-flow
  const ticketFlow = { active:false };
  function startTicketTracking(){
    openChat();
    ticketFlow.active = true;
    pushMessage('Por favor, informe o número do seu ticket.', 'bot');
    input.focus();
  }
  window.startTicketTracking = startTicketTracking;

  // Simple generic reply fallback
  function genericReply(text){
    const t = (text||'').toLowerCase();
    if(t.includes('preço') || t.includes('preco') || t.includes('quanto')){
      pushMessage('Os preços variam por jogo. Clique em "Comprar" no card do jogo desejado para ver o preço.','bot'); return;
    }
    if(t.includes('gta')){ pushMessage('GTA V está disponível com desconto às vezes! Verifique o card do jogo para preço e plataformas.','bot'); return; }
    if(t.includes('ajuda') || t.includes('suporte')){ pushMessage('Posso ajudar com dúvidas sobre compras, devoluções e recomendações. O que você precisa?','bot'); return; }
    pushMessage('Legal! Recebi sua mensagem: "' + text + '". Ainda estou aprendendo — para comprar, utilize o botão "Comprar" nos cards.','bot');
  }

  // Menu
  function showMainMenu(){
    const menuText = "Selecione uma opção:\n1️⃣ Ajuda com compras\n2️⃣ Acompanhar ticket de suporte\n3️⃣ Recomendações de jogos\n4️⃣ Falar com suporte humano";
    pushMessage(menuText, 'bot');
  }

  // UI events
  toggle.addEventListener('click', (e)=>{ e.stopPropagation(); toggleChat(); });
  closeBtn.addEventListener('click', ()=> closeChat());
  minimizeBtn.addEventListener('click', ()=>{
    const msgs = panel.querySelector('.chatbot-messages');
    const frm = panel.querySelector('.chatbot-form');
    if(panel.style.height){ panel.style.height=''; if(msgs) msgs.style.display=''; if(frm) frm.style.display=''; }
    else { panel.style.height='56px'; if(msgs) msgs.style.display='none'; if(frm) frm.style.display='none'; }
  });

  // Submit handler (routes to intents, then fallback)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = (input.value || '').trim();
    if(!value) return;
    pushMessage(value, 'user');
    input.value = '';

    // Handle ongoing ticket tracking flow
    if(ticketFlow.active){
      ticketFlow.active = false;
      setTimeout(() => {
        pushMessage('Seu ticket está em análise pela equipe de suporte. Você receberá atualizações por e-mail.', 'bot');
        setTimeout(showMainMenu, 700);
      }, 250);
      return;
    }

    // Handle ongoing recovery flow
    if(recovery.active){
      if(recovery.step === 1){ recovery.name = value; recovery.step = 2; setTimeout(()=> pushMessage('Email:','bot'), 250); return; }
      if(recovery.step === 2){
        const email = value.trim();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if(!ok){ setTimeout(()=> pushMessage('⚠️ Email inválido. Tente novamente.\nEmail:','bot'), 250); return; }
        recovery.email = email; recovery.active = false; recovery.step = 0;
        setTimeout(()=>{ pushMessage('✅ Dados recebidos. Verifique seu e-mail e siga as instruções para recuperar sua senha.','bot','success'); setTimeout(showMainMenu, 700); }, 350);
        return;
      }
    }

    // Try intents
    if(Intents && typeof Intents.match === 'function'){
      const intent = Intents.match(value);
      if(intent && typeof intent.handler === 'function'){
        return void intent.handler({
          push: (t)=> pushMessage(t, 'bot'),
          pushHtml: (html)=>{ const el = document.createElement('div'); el.className='msg bot'; el.innerHTML = html; messages.appendChild(el); messages.scrollTop = messages.scrollHeight; },
          open: openChat,
          getUser,
          getToken,
          startTicketFlow: startTicketTracking
        });
      }
    }

    // Fallback
    setTimeout(()=> genericReply(value), 500);
  });

  // Auto-open and greet (with user name if available)
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      openChat();
      const user = getUser();
      const baseGreet = user && (user.nome_completo || user.username) ? `👋 Olá, ${user.nome_completo || user.username}! Como posso ajudar?` : '👋 Olá! Eu sou Mago, o assistente virtual. Como posso ajudar hoje?';
      setTimeout(()=> pushMessage(baseGreet, 'bot'), 300);

      // Context-aware hint
      setTimeout(() => {
        const page = (window.location.pathname || '').toLowerCase();
        if(page.includes('checkout')){ pushMessage('🧾 Vejo que você está no checkout. Posso ajudar com formas de pagamento, cupons ou detalhes da entrega por e-mail.','bot'); }
        else if(page.includes('login')){ pushMessage('🔐 Bem-vindo à área de login. Precisa de ajuda para entrar ou criar sua conta? Posso orientar o cadastro.','bot'); }
        else if(page.includes('minha-conta') || page.includes('conta')){ pushMessage('👤 Esta é sua página de conta. Posso ajudar a revisar seus dados ou localizar suas últimas compras.','bot'); }
      }, 900);

      setTimeout(showMainMenu, 1500);
    }, 800);
  });

  // Close on outside click
  window.addEventListener('click', (e) => {
    const container = document.getElementById('chatbot');
    if(!container) return;
    if(!container.contains(e.target) && panel.getAttribute('aria-hidden') === 'false'){
      closeChat();
    }
  });
})();
