// Enhanced frontend-only chatbot widget with auto-open and menu system
(function(){
  const toggle = document.getElementById('chatbotToggle');
  const panel = document.getElementById('chatbotPanel');
  const closeBtn = document.getElementById('chatbotClose');
  const minimizeBtn = document.getElementById('chatbotMinimize');
  const form = document.getElementById('chatbotForm');
  const input = document.getElementById('chatbotInput');
  const messages = document.getElementById('chatbotMessages');

  if(!toggle || !panel || !form || !input || !messages) return;

  let minimized = false;
  let userInMenu = false; // track if user is in the menu system
  // Password recovery flow state
  const recovery = {
    active: false,
    step: 0, // 0=idle,1=awaiting name,2=awaiting email
    name: '',
    email: ''
  };

  function openChat(){
    // Se estava minimizado, restaura primeiro
    if(minimized){
      minimized = false;
      panel.style.height = '';
      panel.querySelector('.chatbot-messages').style.display = '';
      panel.querySelector('.chatbot-form').style.display = '';
    }
    panel.setAttribute('aria-hidden', 'false');
    document.getElementById('chatbot').setAttribute('aria-hidden','false');
    // Add fade-in animation
    panel.style.animation = 'fadeIn 0.4s ease-in';
    input.focus();
  }

  function closeChat(){
    panel.setAttribute('aria-hidden', 'true');
    document.getElementById('chatbot').setAttribute('aria-hidden','true');
    // Reset minimized state when closing
    minimized = false;
    panel.style.height = '';
    panel.querySelector('.chatbot-messages').style.display = '';
    panel.querySelector('.chatbot-form').style.display = '';
  }

  function toggleChat(){
    const hidden = panel.getAttribute('aria-hidden') === 'true';
    if(hidden) openChat(); else closeChat();
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChat();
  });

  closeBtn.addEventListener('click', () => closeChat());
  
  minimizeBtn.addEventListener('click', () => {
    minimized = !minimized;
    if(minimized){
      // Apenas minimiza visualmente, mas mantém o chatbot "aberto" (aria-hidden = false)
      panel.style.height = '56px';
      panel.querySelector('.chatbot-messages').style.display = 'none';
      panel.querySelector('.chatbot-form').style.display = 'none';
    } else {
      // Restaura o tamanho completo
      panel.style.height = '';
      panel.querySelector('.chatbot-messages').style.display = '';
      panel.querySelector('.chatbot-form').style.display = '';
    }
  });

  // helper to add messages - EXPORTED GLOBALLY
  function pushMessage(text, who='bot', extraClass=''){
    const el = document.createElement('div');
    const base = (who === 'user' ? 'user' : 'bot');
    el.className = 'msg ' + base + (extraClass ? (' ' + extraClass) : '');
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
  }

  // Export pushMessage globally for main.js integration
  window.pushMessage = pushMessage;
  // Export open/close for external triggers (e.g., support form)
  window.openChatWidget = openChat;
  window.closeChatWidget = closeChat;
  // Start a guided password recovery flow (exported)
  function startPasswordRecovery(){
    openChat();
    recovery.active = true;
    recovery.step = 1;
    recovery.name = '';
    recovery.email = '';
    userInMenu = false; // suspend menu during flow
    pushMessage('🔒 Vamos recuperar sua senha. Informe seus dados para recuperação:', 'bot');
    pushMessage('Nome:', 'bot');
    input.focus();
  }
  window.startPasswordRecovery = startPasswordRecovery;

  // Display the main menu
  function showMainMenu(){
    userInMenu = true;
    const menuText = "Selecione uma opção:\n1️⃣ Ajuda com compras\n2️⃣ Acompanhar ticket de suporte\n3️⃣ Recomendações de jogos\n4️⃣ Falar com suporte humano";
    pushMessage(menuText, 'bot');
  }

  // Handle menu option selection
  function handleMenuOption(option){
    const responses = {
      '1': '🛒 Claro! Você pode clicar em "Comprar" no card do jogo para ver o preço e finalizar sua compra.',
      '2': '📩 Para acompanhar um ticket, informe o número do protocolo (ex: #294919).',
      '3': '🎮 Jogos em destaque esta semana: GTA V, Elden Ring, e Baldur\'s Gate 3!',
      '4': '💬 Ok! Um atendente humano será notificado. Aguarde alguns instantes.'
    };

    if(responses[option]){
      pushMessage(responses[option], 'bot');
      // Stay in menu after response
      setTimeout(() => showMainMenu(), 1200);
    } else {
      pushMessage('🤔 Não entendi. Digite apenas o número da opção desejada (1, 2, 3 ou 4).', 'bot');
    }
  }

  // small simulated bot reply (for free-form messages outside menu)
  function botReply(userText){
    const text = userText.toLowerCase().trim();
    
    // If in menu mode, check for numeric options
    if(userInMenu){
      // Check if input is a single digit 1-4
      if(/^[1-4]$/.test(text)){
        handleMenuOption(text);
        return;
      } else if(/^\d+$/.test(text) || text.length > 0){
        // Non-menu numeric or text input while in menu
        pushMessage('🤔 Não entendi. Digite apenas o número da opção desejada (1, 2, 3 ou 4).', 'bot');
        return;
      }
    }

    // Generic responses (outside menu)
    if(text.includes('preço') || text.includes('preco') || text.includes('quanto')){
      pushMessage('Os preços variam por jogo. Clique em "Comprar" no card do jogo desejado para ver o preço.', 'bot');
    } else if(text.includes('gta')){
      pushMessage('GTA V está disponível com desconto às vezes! Verifique o card do jogo para preço e plataformas.', 'bot');
    } else if(text.includes('ajuda') || text.includes('suporte')){
      pushMessage('Posso ajudar com dúvidas sobre compras, devoluções e recomendações. O que você precisa?', 'bot');
    } else {
      pushMessage('Legal! Recebi sua mensagem: "' + userText + '". Ainda estou aprendendo — para comprar, utilize o botão "Comprar" nos cards.', 'bot');
    }
  }

  // handle form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = input.value && input.value.trim();
    if(!value) return;
    pushMessage(value, 'user');
    input.value = '';
    // Handle password recovery flow if active
    if(recovery.active){
      if(recovery.step === 1){
        recovery.name = value;
        recovery.step = 2;
        setTimeout(() => { pushMessage('Email:', 'bot'); }, 300);
        return;
      }
      if(recovery.step === 2){
        const email = value.trim();
        const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if(!ok){
          setTimeout(() => { pushMessage('⚠️ Email inválido. Tente novamente.\nEmail:', 'bot'); }, 250);
          return;
        }
        recovery.email = email;
        recovery.active = false;
        recovery.step = 0;
        setTimeout(() => {
          pushMessage('✅ Dados recebidos. Verifique seu e-mail e siga as instruções para recuperar sua senha.', 'bot', 'success');
          setTimeout(() => { showMainMenu(); }, 800);
        }, 400);
        return;
      }
    }
    // simulate thinking
    setTimeout(() => botReply(value), 700 + Math.random()*800);
  });

  // Auto-open chatbot on page load with welcome sequence
  let welcomed = false;
  
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      // Open chat automatically
      openChat();
      welcomed = true;

      // Send welcome message after a short delay
      setTimeout(() => {
        // Context-aware greeting by page
        const path = (window.location.pathname || '').toLowerCase();
        const page = path.split('/').pop() || '';
        const ctx = (() => {
          if(page.includes('checkout')){
            return '🧾 Vejo que você está no checkout. Posso ajudar com formas de pagamento, cupons ou detalhes da entrega por e-mail.';
          }
          if(page.includes('login')){
            return '🔐 Bem-vindo à área de login. Precisa de ajuda para entrar ou criar sua conta? Posso orientar o cadastro.';
          }
          if(page.includes('minha-conta') || page.includes('minha_conta') || page.includes('conta')){
            return '👤 Esta é sua página de conta. Posso ajudar a revisar seus dados ou localizar suas últimas compras.';
          }
          return null;
        })();

        if(ctx){
          pushMessage(ctx, 'bot');
        } else {
          pushMessage('👋 Olá! Eu sou Mago, o assistente virtual. Como posso ajudar hoje?', 'bot');
        }
      }, 500);

      // Show menu after welcome
      setTimeout(() => {
        showMainMenu();
      }, 1500);
    }, 800);
  });

  // Also handle the toggle click for manual open (if not already welcomed)
  toggle.addEventListener('click', () => {
    if(!welcomed && userInMenu === false){
      setTimeout(() => {
        pushMessage('👋 Olá! Eu sou Mago, o assistente virtual. Como posso ajudar hoje?', 'bot');
      }, 300);
      welcomed = true;
      setTimeout(() => {
        showMainMenu();
      }, 1200);
    }
  });

  // close chat clicking outside panel
  window.addEventListener('click', (e) => {
    const container = document.getElementById('chatbot');
    if(!container) return;
    if(!container.contains(e.target) && panel.getAttribute('aria-hidden') === 'false'){
      closeChat();
    }
  });

})();
