// TecnoStore frontend app
// Funciones clave: carga de productos, render dinámico, filtros/orden/paginación, carrito (localStorage), auth simulada, toasts.

(function(){
  'use strict';

  // Estado global
  const state = {
    products: [],
    filtered: [],
    currentPage: 1,
    pageSize: 8,
    filters: { category: '', brand: '', maxPrice: 10000000, inStock: false, search: '' },
    sort: 'relevancia',
    cart: loadCart(),
    user: loadUser()
  };

  // Elementos
  const el = {
    year: document.getElementById('year'),
    productGrid: document.getElementById('productGrid'),
    pagination: document.getElementById('pagination'),
    resultCount: document.getElementById('resultCount'),
    filterCategory: document.getElementById('filterCategory'),
    filterBrand: document.getElementById('filterBrand'),
    priceRange: document.getElementById('priceRange'),
    priceRangeValue: document.getElementById('priceRangeValue'),
    switchStock: document.getElementById('switchStock'),
    btnClearFilters: document.getElementById('btnClearFilters'),
    sortSelect: document.getElementById('sortSelect'),
    searchInput: document.getElementById('searchInput'),
    searchSuggestions: document.getElementById('searchSuggestions'),
    cartBadge: document.getElementById('cartBadge'),
    cartItems: document.getElementById('cartItems'),
    cartSubtotal: document.getElementById('cartSubtotal'),
    cartShipping: document.getElementById('cartShipping'),
    cartTotal: document.getElementById('cartTotal'),
    btnClearCart: document.getElementById('btnClearCart'),
    btnCheckout: document.getElementById('btnCheckout'),
    toastEl: document.getElementById('toast'),
    toastMsg: document.getElementById('toastMsg'),
    btnUser: document.getElementById('btnUser'),
    userStateText: document.getElementById('userStateText'),
    // Modal producto
    productModal: document.getElementById('productModal'),
    modalTitle: document.getElementById('modalTitle'),
    modalBadges: document.getElementById('modalBadges'),
    modalStars: document.getElementById('modalStars'),
    modalDesc: document.getElementById('modalDesc'),
    modalPrice: document.getElementById('modalPrice'),
    modalPriceOld: document.getElementById('modalPriceOld'),
    modalVariants: document.getElementById('modalVariants'),
    modalAddToCart: document.getElementById('modalAddToCart'),
    modalSpecs: document.getElementById('modalSpecs'),
    modalReviews: document.getElementById('modalReviews'),
    // Auth
    authModal: document.getElementById('authModal'),
    loginForm: document.getElementById('loginForm'),
    loginEmail: document.getElementById('loginEmail'),
    loginPassword: document.getElementById('loginPassword'),
    btnLogout: document.getElementById('btnLogout'),
    registerForm: document.getElementById('registerForm'),
    regName: document.getElementById('regName'),
    regEmail: document.getElementById('regEmail'),
    regPassword: document.getElementById('regPassword'),
    regPassword2: document.getElementById('regPassword2')
  };

  // Bootstrap instances
  const toast = el.toastEl ? new bootstrap.Toast(el.toastEl) : null;
  const productModal = el.productModal ? new bootstrap.Modal(el.productModal) : null;
  const authModal = el.authModal ? new bootstrap.Modal(el.authModal) : null;

  // Init
  document.addEventListener('DOMContentLoaded', init);

  function init(){
    if (el.year) el.year.textContent = String(new Date().getFullYear());
    updateUserUI();

    wireFilters();
    wireSearch();
    wireCart();
    wireAuth();

    fetch('data/products.json')
      .then(r => r.json())
      .then(data => {
        state.products = data;
        populateBrands();
        applyFilters();
        // Mostrar destacados iniciales (primeros 8)
        renderProducts();
        renderPagination();
        updateCartUI();
      })
      .catch(err => {
        console.error('Error cargando productos', err);
        showToast('No se pudieron cargar los productos');
      });

    // Click en categorías de la sección categorías / navbar dropdown
    document.querySelectorAll('[data-filter-cat]')
      .forEach(link => link.addEventListener('click', (e)=>{
        e.preventDefault();
        const cat = link.getAttribute('data-filter-cat') || '';
        el.filterCategory.value = cat;
        state.filters.category = cat;
        state.currentPage = 1;
        applyFilters();
        renderProducts();
        renderPagination();
        document.getElementById('productos')?.scrollIntoView({behavior:'smooth'});
      }));
  }

  // ===== Utilities =====
  function currency(n){ return new Intl.NumberFormat('es-PY', { style:'currency', currency:'PYG' }).format(n); }

  function showToast(msg){
    if (!toast) return;
    el.toastMsg.textContent = msg;
    toast.show();
  }

  function loadCart(){
    try{ return JSON.parse(localStorage.getItem('ts_cart')||'{}'); }catch{ return {}; }
  }
  function saveCart(){ localStorage.setItem('ts_cart', JSON.stringify(state.cart)); }

  function loadUser(){
    try{ return JSON.parse(localStorage.getItem('ts_user')||'null'); }catch{ return null; }
  }
  function saveUser(){ localStorage.setItem('ts_user', JSON.stringify(state.user)); }

  // ===== Filters & Sorting =====
  function wireFilters(){
    if (!el.filterCategory) return;
    el.priceRangeValue.textContent = currency(Number(el.priceRange.value));
    el.filterCategory.addEventListener('change', ()=>{ state.filters.category = el.filterCategory.value; state.currentPage=1; applyFilters(); renderProducts(); renderPagination(); });
    el.filterBrand.addEventListener('change', ()=>{ state.filters.brand = el.filterBrand.value; state.currentPage=1; applyFilters(); renderProducts(); renderPagination(); });
    el.priceRange.addEventListener('input', ()=>{ state.filters.maxPrice = Number(el.priceRange.value); el.priceRangeValue.textContent = currency(state.filters.maxPrice); });
    el.priceRange.addEventListener('change', ()=>{ state.currentPage=1; applyFilters(); renderProducts(); renderPagination(); });
    el.switchStock.addEventListener('change', ()=>{ state.filters.inStock = el.switchStock.checked; state.currentPage=1; applyFilters(); renderProducts(); renderPagination(); });
    el.btnClearFilters.addEventListener('click', ()=>{
      el.filterCategory.value = '';
      el.filterBrand.value = '';
      el.priceRange.value = '3000'; el.priceRangeValue.textContent = currency(3000);
      el.switchStock.checked = false;
      state.filters = { category:'', brand:'', maxPrice:3000, inStock:false, search: state.filters.search };
      state.currentPage = 1;
      applyFilters(); renderProducts(); renderPagination();
    });
    el.sortSelect.addEventListener('change', ()=>{ state.sort = el.sortSelect.value; state.currentPage=1; applyFilters(); renderProducts(); renderPagination(); });
  }

  function populateBrands(){
    const brands = Array.from(new Set(state.products.map(p=>p.marca))).sort();
    el.filterBrand.innerHTML = '<option value="">Todas</option>' + brands.map(b=>`<option>${b}</option>`).join('');
  }

  function applyFilters(){
    let arr = state.products.slice();
    const f = state.filters;
    if (f.category) arr = arr.filter(p=>p.categoria===f.category);
    if (f.brand) arr = arr.filter(p=>p.marca===f.brand);
    if (f.maxPrice) arr = arr.filter(p=>p.precio <= f.maxPrice);
    if (f.inStock) arr = arr.filter(p=>p.stock>0);
    if (f.search){
      const q = f.search.toLowerCase();
      arr = arr.filter(p=> p.titulo.toLowerCase().includes(q) || p.marca.toLowerCase().includes(q));
    }

    // Sorting
    switch(state.sort){
      case 'precio-asc': arr.sort((a,b)=>a.precio-b.precio); break;
      case 'precio-desc': arr.sort((a,b)=>b.precio-a.precio); break;
      case 'novedades': arr.sort((a,b)=> (b.id>a.id?1:-1)); break; // mock
      default: /* relevancia */ arr.sort((a,b)=> (b.rating - a.rating));
    }

    state.filtered = arr;
    el.resultCount.textContent = String(arr.length);
  }

  // ===== Render =====
  function renderProducts(){
    const start = (state.currentPage-1)*state.pageSize;
    const slice = state.filtered.slice(start, start+state.pageSize);
    el.productGrid.innerHTML = slice.map(cardHtml).join('');

    // Wire buttons
    el.productGrid.querySelectorAll('[data-action="add"]')
      .forEach(btn=> btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        addToCart(id, 1);
        showToast('Producto agregado al carrito');
      }));
    el.productGrid.querySelectorAll('[data-action="detail"]')
      .forEach(btn=> btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-id');
        openProductModal(id);
      }));
  }

  function cardHtml(p){
    const badgeHtml = (p.etiquetas||[]).map(t=>`<span class="badge text-bg-${badgeColor(t)}">${t}</span>`).join(' ');
    const old = p.precioAnterior && p.precioAnterior>p.precio ? `<small class="text-secondary text-decoration-line-through ms-2">${currency(p.precioAnterior)}</small>` : '';
    return `
      <div class="col">
        <div class="card h-100">
          <img src="${(p.imagenes&&p.imagenes[0])||'https://picsum.photos/seed/'+p.id+'/600/600'}" class="card-img-top product-img" alt="${escapeHtml(p.titulo)}" loading="lazy">
          <div class="card-body d-flex flex-column">
            <div class="d-flex align-items-start justify-content-between mb-1">
              <span class="small text-secondary">${escapeHtml(p.marca)}</span>
              <div>${badgeHtml}</div>
            </div>
            <h6 class="card-title mb-1">${escapeHtml(p.titulo)}</h6>
            <p class="card-text text-secondary small flex-grow-1">${escapeHtml(p.descripcion)}</p>
            <div class="mb-2">
              <span class="fw-bold">${currency(p.precio)}</span>
              ${old}
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-primary btn-sm flex-fill" data-action="add" data-id="${p.id}"><i class="bi bi-cart-plus me-1"></i>Agregar</button>
              <button class="btn btn-outline-light btn-sm" data-action="detail" data-id="${p.id}">Ver</button>
            </div>
          </div>
        </div>
      </div>`;
  }

  function badgeColor(tag){
    const t = (tag||'').toLowerCase();
    if (t.includes('nuevo')) return 'success';
    if (t.includes('oferta')) return 'danger';
    if (t.includes('top')) return 'warning';
    return 'secondary';
  }

  function renderPagination(){
    const total = state.filtered.length;
    const pages = Math.max(1, Math.ceil(total/state.pageSize));
    const current = Math.min(state.currentPage, pages);
    state.currentPage = current;
    const items = [];
    function li(page, label=page, disabled=false, active=false){
      return `<li class="page-item ${disabled?'disabled':''} ${active?'active':''}"><a class="page-link" href="#" data-page="${page}">${label}</a></li>`;
    }
    items.push(li(current-1,'«', current===1));
    for(let p=Math.max(1,current-2); p<=Math.min(pages,current+2); p++) items.push(li(p,String(p),false,p===current));
    items.push(li(current+1,'»', current===pages));
    el.pagination.innerHTML = items.join('');
    el.pagination.querySelectorAll('a[data-page]')
      .forEach(a=> a.addEventListener('click', (e)=>{ e.preventDefault(); const p = Number(a.getAttribute('data-page')); if (!Number.isNaN(p)){ state.currentPage = Math.max(1, Math.min(p, pages)); renderProducts(); renderPagination(); window.scrollTo({top:0, behavior:'smooth'}); } }));
  }

  // ===== Search with autocomplete =====
  function wireSearch(){
    if (!el.searchInput) return;
    el.searchInput.addEventListener('input', ()=>{
      const q = el.searchInput.value.trim();
      state.filters.search = q;
      state.currentPage = 1;
      applyFilters(); renderProducts(); renderPagination();
      renderSuggestions(q);
    });
    el.searchInput.addEventListener('focus', ()=> renderSuggestions(el.searchInput.value.trim()));
    document.addEventListener('click', (e)=>{ if (!el.searchSuggestions.contains(e.target) && e.target!==el.searchInput){ el.searchSuggestions.classList.add('d-none'); } });
  }

  function renderSuggestions(q){
    if (!q){ el.searchSuggestions.classList.add('d-none'); el.searchSuggestions.innerHTML=''; return; }
    const list = state.products.filter(p=> p.titulo.toLowerCase().includes(q.toLowerCase()) || p.marca.toLowerCase().includes(q.toLowerCase())).slice(0,8);
    if (!list.length){ el.searchSuggestions.classList.add('d-none'); el.searchSuggestions.innerHTML=''; return; }
    el.searchSuggestions.innerHTML = list.map(p=> `<button type="button" class="list-group-item list-group-item-action bg-dark text-light" role="option" data-id="${p.id}">${escapeHtml(p.marca)} – ${escapeHtml(p.titulo)}</button>`).join('');
    el.searchSuggestions.classList.remove('d-none');
    el.searchSuggestions.querySelectorAll('button').forEach(b=> b.addEventListener('click', ()=>{ openProductModal(b.getAttribute('data-id')); el.searchSuggestions.classList.add('d-none'); }));
  }

  // ===== Product Modal =====
  function openProductModal(id){
    const p = state.products.find(x=>x.id===id);
    if (!p || !productModal) return;
    el.modalTitle.textContent = p.titulo;
    el.modalDesc.textContent = p.descripcion;
    el.modalPrice.textContent = currency(p.precio);
    el.modalPriceOld.textContent = (p.precioAnterior && p.precioAnterior>p.precio) ? currency(p.precioAnterior) : '';
    el.modalBadges.innerHTML = (p.etiquetas||[]).map(t=>`<span class="badge text-bg-${badgeColor(t)}">${t}</span>`).join('');
    el.modalStars.innerHTML = stars(p.rating);
    // Gallery
    const imgs = p.imagenes && p.imagenes.length ? p.imagenes : [ `https://picsum.photos/seed/${p.id}/600/600` ];
    el.modalVariants.innerHTML = '';
    el.modalReviews.innerHTML = mockReviewsHtml();
    el.modalSpecs.innerHTML = Object.entries(p.especificaciones||{}).map(([k,v])=> `<tr><th class="w-25">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join('');
    const inner = imgs.map((src,idx)=> `<div class="carousel-item ${idx===0?'active':''}"><img src="${src}" class="d-block w-100" alt="${escapeHtml(p.titulo)} imagen ${idx+1}" loading="lazy"></div>`).join('');
    document.getElementById('productGalleryInner').innerHTML = inner;
    el.modalAddToCart.onclick = ()=>{ addToCart(p.id,1); showToast('Producto agregado al carrito'); };
    productModal.show();
  }

  function stars(r){
    const full = Math.floor(r); const half = r-full>=0.5; let html='';
    for(let i=0;i<full;i++) html += '<i class="bi bi-star-fill text-warning"></i>';
    if (half) html += '<i class="bi bi-star-half text-warning"></i>';
    for(let i=full+(half?1:0); i<5; i++) html += '<i class="bi bi-star text-warning"></i>';
    return html;
  }
  function mockReviewsHtml(){
    return [
      {n:'Ana',t:'Excelente calidad',r:5},
      {n:'Luis',t:'Buen precio y rendimiento',r:4},
      {n:'María',t:'Llegó rápido, recomendable',r:5}
    ].map(rv=> `<div class="border rounded p-2"><div class="d-flex justify-content-between"><strong>${escapeHtml(rv.n)}</strong><span>${stars(rv.r)}</span></div><p class="small mb-0 text-secondary">${escapeHtml(rv.t)}</p></div>`).join('');
  }

  // ===== Cart =====
  function wireCart(){
    if (el.btnClearCart) el.btnClearCart.addEventListener('click', ()=>{ state.cart = {}; saveCart(); updateCartUI(); });
    if (el.cartItems) el.cartItems.addEventListener('click', (e)=>{
      const target = e.target.closest('[data-action]'); if (!target) return;
      const action = target.getAttribute('data-action');
      const id = target.getAttribute('data-id');
      if (action==='inc') addToCart(id,1);
      if (action==='dec') addToCart(id,-1);
      if (action==='del') { delete state.cart[id]; saveCart(); }
      updateCartUI();
    });
    if (el.btnCheckout) el.btnCheckout.addEventListener('click', ()=>{
      if (!state.user){
        // requiere login
        if (authModal) authModal.show();
        showToast('Inicia sesión para finalizar la compra');
        return;
      }
      // Mock confirmación
      showToast('¡Pedido confirmado! Gracias por tu compra');
      state.cart = {}; saveCart(); updateCartUI();
    });
  }

  function addToCart(id, delta){
    if (!state.cart[id]) state.cart[id] = 0;
    state.cart[id] += delta;
    if (state.cart[id] <= 0) delete state.cart[id];
    saveCart();
    updateCartUI();
  }

  function updateCartUI(){
    const entries = Object.entries(state.cart);
    const items = entries.map(([id, qty])=>{
      const p = state.products.find(x=>x.id===id);
      if (!p) return '';
      return `
        <div class="d-flex gap-2 align-items-center">
          <img src="${(p.imagenes&&p.imagenes[0])||'https://picsum.photos/seed/'+p.id+'/80/80'}" alt="${escapeHtml(p.titulo)}" width="56" height="56" class="rounded object-fit-cover">
          <div class="flex-grow-1">
            <div class="small">${escapeHtml(p.titulo)}</div>
            <div class="text-secondary small">${currency(p.precio)} c/u</div>
            <div class="d-flex align-items-center gap-2 mt-1">
              <button class="btn btn-outline-light btn-sm" data-action="dec" data-id="${p.id}" aria-label="Disminuir">-</button>
              <span aria-live="polite">${qty}</span>
              <button class="btn btn-outline-light btn-sm" data-action="inc" data-id="${p.id}" aria-label="Aumentar">+</button>
              <button class="btn btn-link link-danger small ms-2" data-action="del" data-id="${p.id}">Eliminar</button>
            </div>
          </div>
          <div class="fw-bold">${currency(p.precio*qty)}</div>
        </div>`;
    }).join('');
    el.cartItems.innerHTML = items || '<div class="text-secondary small">Tu carrito está vacío</div>';
    const subtotal = entries.reduce((acc,[id,qty])=>{
      const p = state.products.find(x=>x.id===id); return acc + (p? p.precio*qty : 0);
    },0);
    const shipping = subtotal>0 ? 5 : 0; // mock
    el.cartSubtotal.textContent = currency(subtotal);
    el.cartShipping.textContent = currency(shipping);
    el.cartTotal.textContent = currency(subtotal+shipping);
    el.cartBadge.textContent = String(entries.reduce((a, [,q])=>a+q,0));
  }

  // ===== Auth =====
  function wireAuth(){
    if (el.loginForm) el.loginForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (!validateForm(el.loginForm)) return;
      const email = el.loginEmail.value.trim();
      const password = el.loginPassword.value.trim();
      // mock: cualquier combinación válida "loguea"
      state.user = { name: email.split('@')[0], email };
      saveUser();
      updateUserUI();
      showToast('Sesión iniciada');
      el.loginForm.reset();
      if (authModal) authModal.hide();
    });
    if (el.registerForm) el.registerForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      if (!validateForm(el.registerForm)) return;
      if (el.regPassword.value !== el.regPassword2.value){ el.regPassword2.setCustomValidity('no-match'); el.registerForm.classList.add('was-validated'); return; }
      state.user = { name: el.regName.value.trim(), email: el.regEmail.value.trim() };
      saveUser();
      updateUserUI();
      showToast('Cuenta creada e inicio de sesión');
      el.registerForm.reset();
      if (authModal) authModal.hide();
    });
    if (el.btnLogout) el.btnLogout.addEventListener('click', ()=>{ state.user = null; saveUser(); updateUserUI(); showToast('Sesión cerrada'); });
  }

  function updateUserUI(){
    if (!el.btnUser || !el.userStateText) return;
    if (state.user){
      el.btnUser.setAttribute('data-bs-target','#authModal');
      el.userStateText.textContent = 'Mi cuenta';
      el.btnUser.innerHTML = '<i class="bi bi-person-check"></i>';
      if (el.btnLogout) el.btnLogout.classList.remove('d-none');
    } else {
      el.userStateText.textContent = 'Iniciar sesión';
      el.btnUser.innerHTML = '<i class="bi bi-person"></i>';
      if (el.btnLogout) el.btnLogout.classList.add('d-none');
    }
  }

  function validateForm(form){
    // Bootstrap validation
    if (!form.checkValidity()){
      form.classList.add('was-validated');
      return false;
    }
    form.classList.remove('was-validated');
    return true;
  }

  // ===== Helpers =====
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, (c)=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c] )); }

})();


