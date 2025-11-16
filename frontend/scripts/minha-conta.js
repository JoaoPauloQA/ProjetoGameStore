'use strict';
(function(){
  const API_BASE = 'http://localhost:3000/api';

  // ========================================
  // FUNÇÕES AUXILIARES
  // ========================================
  // Formata data no padrão brasileiro
  function fmtDate(iso){
    try{ 
      return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }); 
    }catch(_){ 
      return iso || '—'; 
    }
  }

  // Formata valor monetário
  function fmtPrice(value){
    try{
      return 'R$ ' + Number(value).toFixed(2).replace('.', ',');
    }catch(_){
      return 'R$ 0,00';
    }
  }

  // Obtém dados do usuário do sessionStorage
  function getUserFromSession(){
    try{ return JSON.parse(sessionStorage.getItem('userData') || 'null'); }catch(_){ return null; }
  }

  // ========================================
  // CARREGA DADOS BÁSICOS DO USUÁRIO
  // ========================================
  async function loadMe(){
    const user = getUserFromSession();
    const token = sessionStorage.getItem('token');
    const err = document.getElementById('accountError');
    const nomeEl = document.getElementById('accNome');
    const emailEl = document.getElementById('accEmail');
    const createdEl = document.getElementById('accCreated');
    const nomeHeader = document.getElementById('accNomeHeader');
    const emailHeader = document.getElementById('accEmailHeader');

    // Validação: usuário precisa estar logado
    if(!user || !user.id || !token){
      if(err){
        err.style.display = '';
        err.textContent = 'Você precisa estar logado para acessar sua conta. Volte à loja e faça login.';
      }
      // Limpa estados de carregamento
      if(nomeEl) nomeEl.textContent = '—';
      if(emailEl) emailEl.textContent = '—';
      if(createdEl) createdEl.textContent = '—';
      if(nomeHeader) nomeHeader.textContent = '—';
      if(emailHeader) emailHeader.textContent = '—';
      return;
    }

    try{
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const res = await fetch(`${API_BASE}/user/me`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Tratamento de erros HTTP
      if(!res.ok){
        // Se token inválido/expirado, limpa sessão e pede login
        if(res.status === 401){
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('userData');
          sessionStorage.removeItem('loggedUser');
          if(err){ 
            err.style.display = ''; 
            err.textContent = 'Sessão expirada. Volte à loja e faça login novamente.'; 
          }
          return;
        }
        const text = await res.text().catch(()=> '');
        if(err){ err.style.display = ''; err.textContent = `Erro ao carregar dados: ${text || res.status}`; }
        return;
      }

      const data = await res.json();
      const nome = data.nome || '—';
      const email = data.email || '—';
      
      // Atualiza DOM em batch para melhor performance
      requestAnimationFrame(() => {
        if(nomeEl) nomeEl.textContent = nome;
        if(emailEl) emailEl.textContent = email;
        if(nomeHeader) nomeHeader.textContent = nome;
        if(emailHeader) emailHeader.textContent = email;
        if(createdEl) createdEl.textContent = data.created_at ? fmtDate(data.created_at) : '—';
      });
    }catch(e){
      if(e.name === 'AbortError'){
        if(err){ err.style.display = ''; err.textContent = 'Tempo esgotado ao carregar dados. Tente novamente.'; }
      } else {
        if(err){ err.style.display = ''; err.textContent = 'Erro de conexão ao carregar seus dados.'; }
      }
      console.error('Load error:', e);
    }
  }

  // ========================================
  // CARREGA HISTÓRICO DE COMPRAS
  // ========================================
  async function loadOrderHistory(){
    const user = getUserFromSession();
    const token = sessionStorage.getItem('token');
    const container = document.getElementById('ordersContainer');

    // Validação: usuário precisa estar logado
    if(!user || !user.id || !token){
      if(container){
        container.innerHTML = '<div class="history-empty">Faça login para ver seu histórico de compras.</div>';
      }
      return;
    }

    try{
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const res = await fetch(`${API_BASE}/orders/user/${user.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      // Tratamento de erros HTTP
      if(!res.ok){
        if(res.status === 401){
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('userData');
          sessionStorage.removeItem('loggedUser');
          if(container){
            container.innerHTML = '<div class="history-empty">Sessão expirada. Faça login novamente.</div>';
          }
          return;
        }
        const text = await res.text().catch(()=> '');
        if(container){
          container.innerHTML = `<div class="history-empty">Erro ao carregar histórico: ${text || res.status}</div>`;
        }
        return;
      }

      const data = await res.json();
      const orders = data.orders || [];

      // Se não houver compras, exibe mensagem amigável
      if(orders.length === 0){
        if(container){
          container.innerHTML = '<div class="history-empty">📦 Você ainda não realizou nenhuma compra.<br><a href="index.html" style="color:var(--gold);text-decoration:underline;margin-top:8px;display:inline-block">Explorar jogos disponíveis</a></div>';
        }
        return;
      }

      // ========================================
      // RENDERIZA HISTÓRICO DE COMPRAS
      // ========================================
      let html = '';
      orders.forEach(order => {
        const orderId = order.orderId || '—';
        const totalPrice = fmtPrice(order.totalPrice || 0);
        const createdAt = fmtDate(order.createdAt);
        const items = order.items || [];

        html += `
          <div class="order-card">
            <div class="order-header">
              <div class="order-info">
                <div class="order-id">Pedido #${orderId}</div>
                <div class="order-date">${createdAt}</div>
              </div>
              <div class="order-total">${totalPrice}</div>
            </div>
            <div class="order-items">
        `;

        // Renderiza cada jogo da compra
        items.forEach(item => {
          const title = item.title || 'Produto';
          const image = item.image || 'https://via.placeholder.com/50x50?text=Game';
          const quantity = item.quantity || 1;
          const price = fmtPrice(item.price || 0);

          html += `
            <div class="order-item">
              <img class="order-item-img" src="${image}" alt="${title}" loading="lazy">
              <div class="order-item-info">
                <div class="order-item-title">${title}</div>
                <div class="order-item-details">Quantidade: ${quantity} • Preço unitário: ${price}</div>
              </div>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      });

      if(container){
        container.innerHTML = html;
      }

    }catch(e){
      if(e.name === 'AbortError'){
        if(container){
          container.innerHTML = '<div class="history-empty">Tempo esgotado ao carregar histórico. Tente novamente.</div>';
        }
      } else {
        if(container){
          container.innerHTML = '<div class="history-empty">Erro de conexão ao carregar histórico de compras.</div>';
        }
      }
      console.error('Order history error:', e);
    }
  }

  // ========================================
  // INICIALIZAÇÃO
  // ========================================
  // Carrega dados básicos e histórico quando a página estiver pronta
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', () => {
      loadMe();
      loadOrderHistory();
    });
  } else {
    loadMe();
    loadOrderHistory();
  }
})();