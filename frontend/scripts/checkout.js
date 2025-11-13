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

  let selectedPayment = null;
  let appliedCoupon = '';

  function openModal(){
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

    // prepare payload (simplificado); include selected game id if available
    const payload = { formaPagamento };
    if(appliedCoupon) payload.cupom = appliedCoupon;
    if(window.selectedGameId) payload.gameId = window.selectedGameId;

    try{
      confirmBtn.disabled = true;
      msgEl.innerHTML = '<div style="color:#00bfff">Processando compra...</div>';
      const res = await fetch(`${API_BASE}/checkout`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await res.json();
      if(res.ok && (data.sucesso || data.success)){
        successEl.textContent = `✅ Compra realizada com sucesso! Protocolo: ${data.protocolo}.`;
        successEl.classList.add('show');
        msgEl.innerHTML = '<div style="color:#bfffc1">Um e-mail com os detalhes da compra será enviado para você 📩</div>';
        // auto-close after 3s
        setTimeout(()=>{ closeModal(); }, 3000);
      } else {
        msgEl.innerHTML = `<div style=\"color:#ffb4b4;font-weight:700\">❌ ${data.mensagem || data.message || 'Erro ao processar compra.'}</div>`;
      }
    }catch(err){
      console.error('checkout error', err);
      msgEl.innerHTML = '<div style="color:#ffb4b4;font-weight:700">❌ Erro ao processar compra. Tente novamente.</div>';
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

