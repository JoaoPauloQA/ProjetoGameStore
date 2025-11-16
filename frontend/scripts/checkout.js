// Checkout flow JS
(function(){
  const API_BASE = 'http://localhost:3000/api';
  const CART_KEY = 'cart';
  const modal = document.getElementById('checkoutFlowModal');
  const openClass = 'open';
  const form = document.getElementById('checkoutForm');
  const payRadios = Array.from(document.querySelectorAll('input[name="paymentMethod"]'));
  const confirmBtn = document.getElementById('confirmCheckoutBtn');
  const closeBtn = document.getElementById('closeCheckoutFlow');
  const msgEl = document.getElementById('checkoutMessage');
  const successEl = document.getElementById('checkoutSuccess');
  const orderSummary = document.getElementById('orderSummary');

  if(!modal || !form) return;

  // Guard: se estiver na página de checkout e não logado, redireciona para login
  try{
    const userData = JSON.parse(sessionStorage.getItem('userData') || 'null');
    if((window.location.pathname || '').toLowerCase().endsWith('checkout.html') && (!userData || !userData.id)){
      alert('Você precisa estar logado para finalizar a compra.');
      window.location.href = 'login.html';
      return;
    }
  }catch(_e){}

  // Renderiza o resumo imediatamente na página dedicada
  if(orderSummary){
    try{ renderOrderSummary(); }catch(_e){}
  }

  let selectedPayment = null;
  let appliedCoupon = '';

  function openModal(){
    // Verificar se o usuário está logado antes de abrir o checkout
    const userData = JSON.parse(sessionStorage.getItem('userData') || 'null');
    if(!userData || !userData.id){
      alert('Você precisa estar logado para finalizar a compra.');
      // novo fluxo: redireciona para a página de login
      window.location.href = 'login.html';
      return;
    }
    modal.classList.add(openClass);
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    renderOrderSummary();
  }
  function closeModal(){
    modal.classList.remove(openClass);
    modal.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
    // reset form and messages
    form.reset();
  // reset radios
  payRadios.forEach(r => { r.checked = false; });
    selectedPayment = null;
    msgEl.innerHTML = '';
    successEl.textContent = '';
    successEl.classList.remove('show');
    if(orderSummary){ orderSummary.innerHTML = ''; }
  }

  // select payment via radios
  payRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      if(radio.checked){ selectedPayment = radio.value; }
    });
  });

  closeBtn.addEventListener('click', () => closeModal());

  // Apply coupon
  const applyCouponBtn = document.getElementById('applyCouponBtn');
  if(applyCouponBtn){
    applyCouponBtn.addEventListener('click', () => {
      const code = document.getElementById('couponCode')?.value?.trim() || '';
      if(!code){
        msgEl.innerHTML = '<div style="color:#ffb4b4;font-weight:700">❌ Informe um cupom para aplicar.</div>';
        return;
      }
      appliedCoupon = code;
      msgEl.innerHTML = `<div style="color:#bfffc1">✅ Cupom "${code}" aplicado!</div>`;
    });
  }

  async function confirmPurchase(){
    const formaPagamento = selectedPayment;

    if(!formaPagamento){
      msgEl.innerHTML = '<div style="color:#ffb4b4;font-weight:700">❌ Selecione uma forma de pagamento.</div>';
      return;
    }

    // ========================================
    // PREPARA PAYLOAD COM CARRINHO COMPLETO
    // ========================================
    // Busca token JWT para autenticação
    const token = sessionStorage.getItem('token');
    if(!token){
      msgEl.innerHTML = '<div style="color:#ffb4b4;font-weight:700">❌ Você precisa estar logado para finalizar a compra.</div>';
      setTimeout(() => { window.location.href = 'login.html'; }, 1500);
      return;
    }

    // Monta o payload com carrinho completo
    const payload = { formaPagamento };
    if(appliedCoupon) payload.cupom = appliedCoupon;
    
    // Inclui o carrinho completo do sessionStorage
    const cart = _getCart();
    if(Array.isArray(cart) && cart.length > 0){
      payload.cart = cart;
      console.log('Enviando carrinho com', cart.length, 'item(ns)');
    } else if(window.selectedGameId) {
      // Fallback: compra individual (fluxo legado)
      payload.gameId = window.selectedGameId;
      console.log('Enviando compra individual (ID:', window.selectedGameId, ')');
    }

    try{
      confirmBtn.disabled = true;
      msgEl.innerHTML = '<div style="color:#00bfff">Processando compra...</div>';
      
      // Log para debug
      console.log('[CHECKOUT] Iniciando compra...');
      console.log('[CHECKOUT] Token existe:', !!token);
      console.log('[CHECKOUT] Payload:', JSON.stringify(payload, null, 2));
      
      // ========================================
      // ENVIA REQUISIÇÃO COM TOKEN JWT
      // ========================================
      const res = await fetch(`${API_BASE}/checkout`, { 
        method:'POST', 
        headers:{
          'Content-Type':'application/json',
          'Authorization': `Bearer ${token}` // NOVO: Envia token JWT
        }, 
        body: JSON.stringify(payload) 
      });
      
      console.log('[CHECKOUT] Status da resposta:', res.status);
      
      // Tenta fazer parse do JSON
      let data;
      try {
        data = await res.json();
        console.log('[CHECKOUT] Resposta do servidor:', data);
      } catch (parseError) {
        console.error('[CHECKOUT] Erro ao fazer parse da resposta:', parseError);
        msgEl.innerHTML = '<div style="color:#ffb4b4;font-weight:700">❌ Erro na resposta do servidor. Verifique se o backend está rodando.</div>';
        return;
      }
      
      // Tratamento de sucesso
      if(res.ok && (data.sucesso || data.success)){
        successEl.textContent = `✅ Compra realizada com sucesso! Protocolo: ${data.protocolo}.`;
        successEl.classList.add('show');
        msgEl.innerHTML = '<div style="color:#bfffc1">Um e-mail com os detalhes da compra será enviado para você 📩</div>';

        // LIMPA O CARRINHO após compra bem-sucedida
        sessionStorage.removeItem('cart');
        console.log('[CHECKOUT] Carrinho limpo após compra bem-sucedida');

        // Abre chatbot e envia mensagem de confirmação
        try{
          if(typeof window.openChatWidget === 'function'){
            window.openChatWidget();
          }
          if(typeof window.pushMessage === 'function'){
            const proto = data.protocolo || data.protocol || '#';
            window.pushMessage(`✅ Compra realizada com sucesso! Protocolo: ${proto}.`, 'bot', 'success');
            window.pushMessage('Siga as instruções no seu e-mail cadastrado!', 'bot', 'notice');
          }
        }catch(_e){ /* ignore chatbot errors */ }

        // Auto-fecha modal após 3s
        setTimeout(()=>{ 
          closeModal();
          // Atualiza contador do carrinho se existir
          if(typeof window.updateCartCount === 'function'){
            window.updateCartCount();
          }
        }, 3000);
      } 
      // Tratamento de erro de autenticação
      else if(res.status === 401){
        console.error('[CHECKOUT] Erro 401 - Não autorizado');
        msgEl.innerHTML = '<div style="color:#ffb4b4;font-weight:700">❌ Sessão expirada. Faça login novamente.</div>';
        setTimeout(() => { 
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('userData');
          window.location.href = 'login.html'; 
        }, 2000);
      }
      // Erro 400 - Bad Request
      else if(res.status === 400){
        console.error('[CHECKOUT] Erro 400 - Requisição inválida:', data);
        const errorMsg = data.mensagem || data.message || data.error || 'Dados inválidos';
        msgEl.innerHTML = `<div style="color:#ffb4b4;font-weight:700">❌ ${errorMsg}</div>`;
      }
      // Erro 500 - Erro interno do servidor
      else if(res.status === 500){
        console.error('[CHECKOUT] Erro 500 - Erro no servidor:', data);
        const errorMsg = data.mensagem || data.message || data.error || 'Erro no servidor';
        msgEl.innerHTML = `<div style="color:#ffb4b4;font-weight:700">❌ ${errorMsg}</div>`;
        msgEl.innerHTML += '<div style="color:#94a3b8;font-size:12px;margin-top:8px">Verifique se as tabelas do banco foram criadas corretamente.</div>';
      }
      // Outros erros
      else {
        console.error('[CHECKOUT] Erro desconhecido:', res.status, data);
        msgEl.innerHTML = `<div style="color:#ffb4b4;font-weight:700">❌ ${data.mensagem || data.message || data.error || 'Erro ao processar compra.'}</div>`;
      }
    }catch(err){
      console.error('[CHECKOUT] Exceção durante checkout:', err);
      msgEl.innerHTML = '<div style="color:#ffb4b4;font-weight:700">❌ Erro de conexão. Verifique se o servidor está rodando.</div>';
    }finally{
      confirmBtn.disabled = false;
    }
  }

  confirmBtn.addEventListener('click', confirmPurchase);

  // expose abrirCheckout globally
  window.abrirCheckout = function(){
    openModal();
  };

})();

// Helpers for order summary
function _getCart(){
  try{ return JSON.parse(sessionStorage.getItem('cart') || '[]'); }catch(_){ return []; }
}
function _fmt(num){ return 'R$ ' + Number(num||0).toFixed(2); }

function renderOrderSummary(){
  const box = document.getElementById('orderSummary');
  if(!box) return;
  box.innerHTML = '';
  const cart = _getCart();
  if(Array.isArray(cart) && cart.length > 0){
    // Multiple or single items from cart
    let total = 0;
    cart.forEach(it => { total += (it.price * (it.qty||1)); });
    // List items (limited visual noise): up to 4 lines
    cart.slice(0,4).forEach(it => {
      const row = document.createElement('div');
      row.className = 'order-item';
      const left = document.createElement('div');
      left.className = 'order-left';
      if(it.image){
        const img = document.createElement('img');
        img.className = 'order-thumb';
        img.src = it.image;
        img.alt = it.title || 'Item';
        left.appendChild(img);
      }
      const title = document.createElement('div');
      title.className = 'order-title';
      title.textContent = `${it.qty||1}x ${it.title}`;
      left.appendChild(title);
      const right = document.createElement('div');
      right.className = 'order-price';
      right.textContent = _fmt((it.price||0) * (it.qty||1));
      row.appendChild(left); row.appendChild(right);
      box.appendChild(row);
    });
    if(cart.length > 4){
      const more = document.createElement('div');
      more.className = 'order-item';
      more.textContent = `+${cart.length - 4} itens`;
      box.appendChild(more);
    }
    const totalRow = document.createElement('div');
    totalRow.className = 'order-total';
    const tLabel = document.createElement('div'); tLabel.textContent = 'Total';
    const tValue = document.createElement('div'); tValue.textContent = _fmt(total);
    totalRow.appendChild(tLabel); totalRow.appendChild(tValue);
    box.appendChild(totalRow);
    return;
  }

  // Single item flow (from quick buy): try to read last selection from the other modal labels
  const name = document.getElementById('checkoutGameName')?.textContent?.trim();
  const priceText = document.getElementById('checkoutGamePrice')?.textContent?.trim();
  if(name && priceText){
    const row = document.createElement('div'); row.className = 'order-item';
    const left = document.createElement('div'); left.className = 'order-title'; left.textContent = `Produto: ${name}`;
    const right = document.createElement('div'); right.className = 'order-price'; right.textContent = priceText;
    row.appendChild(left); row.appendChild(right);
    box.appendChild(row);
  }
}

