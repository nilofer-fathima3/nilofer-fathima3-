/* js/app.js - shared across pages */

/* ---------- Product list (real Unsplash / studio-style) ---------- */
const PRODUCTS = [
  { id:1, name:"Dell Inspiron 15", category:"Laptop", price:55999, img:"https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&w=1200&q=60", popular:true },
  { id:2, name:"HP Pavilion 14", category:"Laptop", price:47999, img:"https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&w=1200&q=60", popular:true },
  { id:3, name:"iPhone 14", category:"Smartphone",price:35499,img:"shopping.jpg", popular:true },
  { id:4, name:"Samsung Galaxy S23 Ultra", category:"Smartphone", price:99999, img:"samsung.jpg", popular:true },
  { id:5, name:"Sony WH-1000XM5", category:"Accessories", price:29999, img:"https://images.unsplash.com/photo-1585386959984-a4155224a1ad?auto=format&w=1200&q=60", popular:true },
  { id:6, name:"Apple Watch Series 9", category:"Accessories", price:32999, img:"https://images.unsplash.com/photo-1608029941403-c9a7fdd0b5b2?auto=format&w=1200&q=60", popular:false },
  { id:7, name:"Logitech MX Master 3S", category:"Accessories", price:12999, img:"https://images.unsplash.com/photo-1589578527966-fdac0f44566c?auto=format&w=1200&q=60", popular:false },
  { id:8, name:"MacBook Air M2", category:"Laptop", price:99999, img:"MAC.jfif", popular:true }
];

/* ---------- localStorage helpers & state ---------- */
const LS = {
  get(k, def){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }catch{ return def; } },
  set(k,v){ localStorage.setItem(k, JSON.stringify(v)); },
  remove(k){ localStorage.removeItem(k); }
};

let state = {
  products: PRODUCTS.slice(),
  cart: LS.get('fe_cart', []),      // [{id, qty}]
  users: LS.get('fe_users', []),    // [{username, password}]
  currentUser: LS.get('fe_user', null), // string username or display name
  dark: LS.get('fe_dark', false)
};

/* ---------- DOM refs (may be null on some pages) ---------- */
const dom = {
  productGrid: document.getElementById('productGrid'),
  searchInput: document.getElementById('searchInput'),
  priceFilter: document.getElementById('priceFilter'),
  sortSelect: document.getElementById('sortSelect'),
  resetFilters: document.getElementById('resetFilters'),
  categoryList: document.getElementById('categoryList'),
  resultCount: document.getElementById('resultCount'),
  modal: document.getElementById('modal'),
  modalCard: document.getElementById('modalCard'),
  cartBadge: document.getElementById('cartBadge'),
  authArea: document.getElementById('authArea'),
  authAreaCart: document.getElementById('authAreaCart'),
  darkToggle: document.getElementById('darkToggle'),
  cartItems: document.getElementById('cartItems'),
  cartTotal: document.getElementById('cartTotal'),
  clearCart: document.getElementById('clearCart'),
  checkoutBtn: document.getElementById('checkoutBtn'),
  googleBtn: document.getElementById('googleBtn'),
  btnSignup: document.getElementById('btnSignup'),
  btnLogin: document.getElementById('btnLogin'),
  signupUser: document.getElementById('signupUser'),
  signupPass: document.getElementById('signupPass'),
  loginUser: document.getElementById('loginUser'),
  loginPass: document.getElementById('loginPass'),
  placeOrder: document.getElementById('placeOrder'),
  orderSummary: document.getElementById('orderSummary')
};

/* ---------- Utilities ---------- */
function numberWithCommas(x){ return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
function escapeHtml(s){ return (s+'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }
function toast(msg){ /* lightweight toast: console + optional visual later */ console.log(msg); }

/* ---------- Dark mode ---------- */
function applyDark() {
  if(state.dark) document.body.classList.add('dark');
  else document.body.classList.remove('dark');
  LS.set('fe_dark', state.dark);
}
if(dom.darkToggle){
  dom.darkToggle.addEventListener('click', ()=>{
    state.dark = !state.dark;
    applyDark();
    dom.darkToggle.textContent = state.dark ? '☀️' : '🌙';
  });
}
applyDark();

/* ---------- Auth rendering ---------- */
function renderAuthAreas(){
  [dom.authArea, dom.authAreaCart].forEach(area => {
    if(!area) return;
    if(state.currentUser){
      area.innerHTML = `<div class="small">Hi, <strong>${escapeHtml(state.currentUser)}</strong></div>
                        <button class="btn-ghost" id="logoutBtn">Logout</button>`;
      const btn = area.querySelector('#logoutBtn');
      if(btn) btn.addEventListener('click', logout);
    } else {
      area.innerHTML = `<a href="login.html" class="btn-ghost">Login / Signup</a>`;
    }
  });
}

/* ---------- Cart badge ---------- */
function updateCartBadge(){
  if(!dom.cartBadge) return;
  const total = state.cart.reduce((s,i)=>s+i.qty,0);
  dom.cartBadge.textContent = total;
  dom.cartBadge.style.display = total>0 ? 'inline-block' : 'none';
}

/* ---------- Category list ---------- */
function loadCategories(){
  if(!dom.categoryList) return;
  const cats = ['All', ...Array.from(new Set(state.products.map(p=>p.category)))];
  dom.categoryList.innerHTML = '';
  cats.forEach((c,i)=>{
    const div = document.createElement('div');
    div.className = 'cat' + (i===0 ? ' active' : '');
    div.dataset.cat = c;
    div.textContent = c;
    div.addEventListener('click', ()=> {
      document.querySelectorAll('.cat').forEach(x=>x.classList.remove('active'));
      div.classList.add('active');
      applyFilters();
    });
    dom.categoryList.appendChild(div);
  });
}

/* ---------- Filters & render products ---------- */
function applyFilters(){
  if(!dom.productGrid) return;
  const qText = (dom.searchInput?.value||'').trim().toLowerCase();
  const catEl = document.querySelector('.cat.active');
  const cat = catEl ? catEl.dataset.cat : 'All';
  const price = dom.priceFilter?.value || 'all';
  const sort = dom.sortSelect?.value || 'popular';

  let list = state.products.filter(p => {
    const matchesText = qText === '' || p.name.toLowerCase().includes(qText) || p.category.toLowerCase().includes(qText);
    const matchesCat = (cat === 'All') || p.category === cat;
    let matchesPrice = true;
    if(price !== 'all'){ const [min,max] = price.split('-').map(Number); matchesPrice = p.price >= min && p.price <= max; }
    return matchesText && matchesCat && matchesPrice;
  });

  if(sort === 'low') list.sort((a,b)=>a.price-b.price);
  if(sort === 'high') list.sort((a,b)=>b.price-a.price);
  if(sort === 'alpha') list.sort((a,b)=>a.name.localeCompare(b.name));
  if(sort === 'popular') list = list.filter(p => p.popular);

  renderProducts(list);
}

function renderProducts(list){
  dom.productGrid.innerHTML = '';
  if(dom.resultCount) dom.resultCount.textContent = `${list.length} results`;
  if(list.length === 0){ dom.productGrid.innerHTML = `<div class="card">No products found</div>`; return; }
  list.forEach(p => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="img"><img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy"></div>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="small muted">${escapeHtml(p.category)}</div>
      <div class="price">₹${numberWithCommas(p.price)}</div>
      <div class="card-actions">
        <button onclick="viewProduct(${p.id})">View</button>
        <button class="add" onclick="addToCart(${p.id})">Add to cart</button>
      </div>
    `;
    dom.productGrid.appendChild(card);
  });
}

/* ---------- Modal ---------- */
function viewProduct(id){
  const p = state.products.find(x=>x.id===id);
  if(!p || !dom.modalCard) return;
  dom.modalCard.innerHTML = `
    <img src="${p.img}" alt="${escapeHtml(p.name)}">
    <div>
      <h2>${escapeHtml(p.name)}</h2>
      <div class="small muted">${escapeHtml(p.category)}</div>
      <div class="price">₹${numberWithCommas(p.price)}</div>
      <p class="muted" style="margin-top:12px">This is a demo description for ${escapeHtml(p.name)}.</p>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button class="add" onclick="addToCart(${p.id}); closeModal();">Add to cart</button>
        <button class="btn-ghost" onclick="closeModal()">Close</button>
      </div>
    </div>
  `;
  if(dom.modal) dom.modal.style.display = 'grid';
}
function closeModal(){ if(dom.modal) dom.modal.style.display = 'none'; }
if(dom.modal) dom.modal.addEventListener('click', (e)=> { if(e.target===dom.modal) closeModal(); });

/* ---------- Cart operations ---------- */
function addToCart(id){
  const existing = state.cart.find(x=>x.id===id);
  if(existing) existing.qty += 1;
  else state.cart.push({id, qty:1});
  LS.set('fe_cart', state.cart);
  updateCartBadge();
  toast('Added to cart');
}
function removeFromCart(id){
  state.cart = state.cart.filter(x=>x.id!==id);
  LS.set('fe_cart', state.cart);
  renderCartPage();
  updateCartBadge();
}
function changeQty(id, delta){
  const it = state.cart.find(x=>x.id===id);
  if(!it) return;
  it.qty += delta;
  if(it.qty <= 0) state.cart = state.cart.filter(x=>x.id!==id);
  LS.set('fe_cart', state.cart);
  renderCartPage();
  updateCartBadge();
}

/* ---------- Cart page rendering ---------- */
function renderCartPage(){
  if(!dom.cartItems) return;
  const cartItemsContainer = dom.cartItems;
  const totalEl = dom.cartTotal;
  if(state.cart.length === 0){
    cartItemsContainer.innerHTML = `<div class="card">Your cart is empty.</div>`;
    if(totalEl) totalEl.textContent = '0';
    return;
  }
  let total = 0;
  cartItemsContainer.innerHTML = '';
  state.cart.forEach(ci=>{
    const p = state.products.find(x=>x.id===ci.id);
    if(!p) return;
    const subtotal = p.price * ci.qty;
    total += subtotal;
    const el = document.createElement('div');
    el.className = 'cart-item';
    el.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${p.img}" style="width:88px;height:64px;object-fit:cover;border-radius:8px">
        <div>
          <div style="font-weight:700">${escapeHtml(p.name)}</div>
          <div class="small muted">${escapeHtml(p.category)}</div>
          <div class="small">₹${numberWithCommas(p.price)}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn-ghost" onclick="changeQty(${p.id}, -1)">−</button>
        <div>${ci.qty}</div>
        <button class="btn-ghost" onclick="changeQty(${p.id}, 1)">+</button>
        <div style="width:12px"></div>
        <div>₹${numberWithCommas(subtotal)}</div>
        <button class="btn-ghost" onclick="removeFromCart(${p.id})">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(el);
  });
  if(totalEl) totalEl.textContent = numberWithCommas(total);
}

/* ---------- Auth (login page handlers) ---------- */
function initAuthUI(){
  // Google UI (simulate)
  if(dom.googleBtn){
    dom.googleBtn.addEventListener('click', ()=>{
      const name = prompt('Simulate Google sign-in — enter display name:', 'Rihanaa');
      if(name){
        state.currentUser = name.trim();
        LS.set('fe_user', state.currentUser);
        renderAuthAreas();
        alert('Signed in as ' + state.currentUser + ' (simulated)');
        window.location.href = 'index.html';
      }
    });
  }

  // signup
  if(dom.btnSignup){
    dom.btnSignup.addEventListener('click', ()=>{
      const u = (dom.signupUser?.value || '').trim();
      const p = (dom.signupPass?.value || '');
      if(!u || u.includes(' ')){ alert('Enter valid username (no spaces)'); return; }
      if(p.length < 4){ alert('Password must be >=4 chars'); return; }
      const exists = state.users.find(x=>x.username===u);
      if(exists){ alert('Username exists — login instead'); return; }
      state.users.push({username:u, password:p});
      LS.set('fe_users', state.users);
      state.currentUser = u; LS.set('fe_user', state.currentUser);
      renderAuthAreas();
      alert('Signed up & logged in as ' + u);
      window.location.href = 'index.html';
    });
  }

  // login
  if(dom.btnLogin){
    dom.btnLogin.addEventListener('click', ()=>{
      const u = (dom.loginUser?.value || '').trim();
      const p = (dom.loginPass?.value || '');
      if(!u || !p){ alert('Enter credentials'); return; }
      const user = state.users.find(x=>x.username===u && x.password===p);
      if(!user){ alert('Invalid credentials'); return; }
      state.currentUser = user.username; LS.set('fe_user', state.currentUser);
      renderAuthAreas();
      toast('Logged in');
      window.location.href = 'index.html';
    });
  }
}

/* ---------- Clear cart + checkout handlers ---------- */
function initCartPageHandlers(){
  if(dom.clearCart) dom.clearCart.addEventListener('click', ()=> {
    if(confirm('Clear all items?')){ state.cart = []; LS.set('fe_cart', state.cart); renderCartPage(); updateCartBadge(); }
  });
  if(dom.checkoutBtn) dom.checkoutBtn.addEventListener('click', ()=> {
    if(!state.currentUser){ if(confirm('Login required to checkout. Go to login?')) window.location.href='login.html'; return; }
    if(state.cart.length===0){ alert('Cart empty'); return; }
    window.location.href = 'checkout.html';
  });
}

/* ---------- Checkout page ---------- */
function renderCheckout(){
  if(!dom.orderSummary) return;
  if(state.cart.length===0){ dom.orderSummary.innerHTML = `<div class="card">No items in cart.</div>`; return; }
  let total = 0;
  let html = `<div class="card" style="padding:12px">`;
  html += `<h3>Order Summary</h3>`;
  html += `<ul style="list-style:none;padding:0">`;
  state.cart.forEach(ci=>{
    const p = state.products.find(x=>x.id===ci.id);
    const subtotal = p.price * ci.qty;
    total += subtotal;
    html += `<li style="display:flex;justify-content:space-between;padding:6px 0">
      <span>${escapeHtml(p.name)} x ${ci.qty}</span>
      <strong>₹${numberWithCommas(subtotal)}</strong>
    </li>`;
  });
  html += `</ul>`;
  html += `<div style="margin-top:12px;font-weight:700">Total: ₹${numberWithCommas(total)}</div>`;
  html += `</div>`;
  dom.orderSummary.innerHTML = html;

  if(dom.placeOrder){
    dom.placeOrder.addEventListener('click', ()=>{
      if(!confirm(`Place order for ₹${numberWithCommas(total)}? (Demo)`)) return;
      state.cart = [];
      LS.set('fe_cart', state.cart);
      updateCartBadge();
      alert('Order placed (demo). Thank you!');
      window.location.href = 'index.html';
    });
  }
}

/* ---------- Logout ---------- */
function logout(){
  if(!confirm('Logout?')) return;
  state.currentUser = null;
  LS.remove('fe_user');
  renderAuthAreas();
  // refresh pages to update UI
  window.location.href = 'index.html';
}

/* ---------- Initialize on DOMContentLoaded ---------- */
document.addEventListener('DOMContentLoaded', ()=>{
  // hydrate state
  state.users = LS.get('fe_users', state.users);
  state.cart = LS.get('fe_cart', state.cart);
  state.currentUser = LS.get('fe_user', state.currentUser);
  state.dark = LS.get('fe_dark', state.dark);

  renderAuthAreas();
  updateCartBadge();
  loadCategories();
  applyFilters();
  initAuthUI();
  initCartPageHandlers();
  renderCartPage();
  renderCheckout();

  // wire filter inputs (if present)
  if(dom.searchInput) dom.searchInput.addEventListener('input', applyFilters);
  if(dom.priceFilter) dom.priceFilter.addEventListener('change', applyFilters);
  if(dom.sortSelect) dom.sortSelect.addEventListener('change', applyFilters);
  if(dom.resetFilters) dom.resetFilters.addEventListener('click', ()=> {
    if(dom.searchInput) dom.searchInput.value=''; if(dom.priceFilter) dom.priceFilter.value='all';
    if(dom.sortSelect) dom.sortSelect.value='popular';
    document.querySelectorAll('.cat').forEach(x=>x.classList.remove('active'));
    const firstCat = document.querySelector('.cat'); if(firstCat) firstCat.classList.add('active');
    applyFilters();
  });
});
/* expose functions used inline */
window.viewProduct = viewProduct;
window.addToCart = addToCart;
window.changeQty = changeQty;
window.removeFromCart = removeFromCart;
window.closeModal = closeModal;




