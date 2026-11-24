'use strict';

/* ========== Helper & State ========== */
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage penuh/diblokir */ } };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const byId = (id) => PRODUCTS.find((p) => p.id === id);

const K = { cart: 'ktp_cart', wish: 'ktp_wish', orders: 'ktp_orders', promo: 'ktp_promo' };
let cart = load(K.cart, []);      // [{id, variant, qty}]
let wish = load(K.wish, []);      // [productId]
let orders = load(K.orders, []);  // [order]
let promo = load(K.promo, false); // true jika KATAPEDIA10 aktif
const S = { cat: 'Semua', q: '', sort: 'popular', pid: null, qty: 1, variant: '', courier: 'jne' };

const SHIP = { jne: { n: 'JNE Reguler', c: 15000 }, jnt: { n: 'J&T Express', c: 17000 }, sicepat: { n: 'SiCepat', c: 14000 } };
const PAY = { qris: 'QRIS', va: 'Virtual Account Bank', ewallet: 'E-Wallet (GoPay/OVO/DANA)' };
const FALLBACK = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#F1F5F9"/><text x="50%" y="50%" fill="#94A3B8" font-family="sans-serif" font-size="28" text-anchor="middle">KATAPEDIA</text></svg>');
const img = (src, cls) => `<img src="${src}" alt="" loading="lazy" class="${cls}" onerror="this.onerror=null;this.src='${FALLBACK}'">`;
const disc = (p) => (p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);
const heart = (id) => (wish.includes(id) ? '♥' : '♡');

/* ========== UI dasar: toast, modal, drawer ========== */
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'bg-ink text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg transition-all duration-300 opacity-0 translate-y-2';
  t.textContent = msg;
  $('#toasts').appendChild(t);
  requestAnimationFrame(() => t.classList.remove('opacity-0', 'translate-y-2'));
  setTimeout(() => { t.classList.add('opacity-0'); setTimeout(() => t.remove(), 300); }, 2600);
}
function lock() {
  const open = $('.modal:not(.hidden)') || !$('#drawer').classList.contains('translate-x-full');
  document.body.classList.toggle('overflow-hidden', !!open);
}
const openM = (id) => { $('#' + id).classList.remove('hidden'); lock(); };
const closeM = (id) => { $('#' + id).classList.add('hidden'); lock(); };
const openDrawer = () => { renderCart(); $('#drawer').classList.remove('translate-x-full'); $('#drawer-ov').classList.remove('hidden'); lock(); };
const closeDrawer = () => { $('#drawer').classList.add('translate-x-full'); $('#drawer-ov').classList.add('hidden'); lock(); };

/* ========== Katalog ========== */
function renderTabs() {
  $('#tabs').innerHTML = CATS.map((c) =>
    `<button data-act="cat" data-v="${c}" class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition ${S.cat === c ? 'bg-brand text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:border-brand hover:text-brand'}">${c}</button>`).join('');
}
function card(p) {
  return `<article data-act="detail" data-id="${p.id}" class="group bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition duration-300">
    <div class="relative aspect-square overflow-hidden bg-soft">
      ${img(p.image, 'w-full h-full object-cover group-hover:scale-105 transition duration-500')}
      ${disc(p) ? `<span class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">-${disc(p)}%</span>` : ''}
      <button data-act="wish" data-id="${p.id}" aria-label="Wishlist" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 shadow flex items-center justify-center text-lg ${wish.includes(p.id) ? 'text-red-500' : 'text-slate-400'} hover:scale-110 transition">${heart(p.id)}</button>
    </div>
    <div class="p-3">
      <p class="text-xs text-brand font-semibold">${p.category}</p>
      <h3 class="text-sm font-semibold text-ink line-clamp-2 min-h-[2.5rem]">${esc(p.name)}</h3>
      <p class="mt-1 font-bold text-ink">${rp(p.price)}</p>
      ${p.oldPrice ? `<p class="text-xs text-slate-400 line-through">${rp(p.oldPrice)}</p>` : ''}
      <p class="mt-1 text-xs text-slate-500"><span class="text-amber-400">★</span> ${p.rating} &middot; ${p.sold.toLocaleString('id-ID')} terjual</p>
    </div>
  </article>`;
}
function renderGrid() {
  const list = PRODUCTS.filter((p) =>
    (S.cat === 'Semua' || p.category === S.cat) && (p.name + ' ' + p.description).toLowerCase().includes(S.q));
  if (S.sort === 'low') list.sort((a, b) => a.price - b.price);
  else if (S.sort === 'high') list.sort((a, b) => b.price - a.price);
  else list.sort((a, b) => b.sold - a.sold);
  $('#grid').innerHTML = list.map(card).join('');
  $('#empty').classList.toggle('hidden', list.length > 0);
  $('#count').textContent = list.length + ' produk ditemukan';
}

/* ========== Badge ========== */
const setB = (sel, n) => { const e = $(sel); e.textContent = n; e.classList.toggle('hidden', !n); };
function badges() {
  setB('#b-cart', cart.reduce((a, i) => a + i.qty, 0));
  setB('#b-wish', wish.length);
  setB('#b-hist', orders.length);
}
function persist() {
  save(K.cart, cart); save(K.wish, wish); save(K.orders, orders); save(K.promo, promo);
  badges(); renderCart();
}

/* ========== Detail produk ========== */
function openDetail(id) {
  const p = byId(id);
  S.pid = id; S.qty = 1; S.variant = p.variants.options[0];
  renderDetail(); openM('m-detail');
}
function renderDetail() {
  const p = byId(S.pid);
  $('#detail-body').innerHTML = `<div class="grid md:grid-cols-2 gap-6 p-5 md:p-6">
    <div class="rounded-xl overflow-hidden bg-soft aspect-square">${img(p.image, 'w-full h-full object-cover')}</div>
    <div class="flex flex-col">
      <p class="text-xs font-semibold text-brand">${p.category}</p>
      <h2 class="text-xl font-extrabold text-ink mt-1 pr-8">${esc(p.name)}</h2>
      <p class="text-sm text-slate-500 mt-1"><span class="text-amber-400">★</span> ${p.rating} &middot; ${p.sold.toLocaleString('id-ID')} terjual</p>
      <div class="mt-3 flex items-baseline gap-2 flex-wrap">
        <span class="text-2xl font-extrabold text-brand">${rp(p.price)}</span>
        ${p.oldPrice ? `<span class="text-sm text-slate-400 line-through">${rp(p.oldPrice)}</span><span class="text-xs font-bold bg-red-50 text-red-500 px-2 py-0.5 rounded-md">-${disc(p)}%</span>` : ''}
      </div>
      <p class="text-sm text-slate-600 mt-3 leading-relaxed">${esc(p.description)}</p>
      <p class="mt-4 text-sm font-semibold">${p.variants.label}</p>
      <div class="flex flex-wrap gap-2 mt-2">${p.variants.options.map((o) =>
        `<button data-act="variant" data-v="${esc(o)}" class="px-3 py-1.5 rounded-lg border text-sm transition ${o === S.variant ? 'border-brand bg-emerald-50 text-brand font-semibold' : 'border-slate-200 text-slate-600 hover:border-brand'}">${esc(o)}</button>`).join('')}</div>
      <p class="mt-4 text-sm font-semibold">Jumlah</p>
      <div class="mt-2 inline-flex items-center border border-slate-200 rounded-lg w-fit">
        <button data-act="dq" data-d="-1" aria-label="Kurangi" class="w-9 h-9 text-lg hover:bg-soft rounded-l-lg">−</button>
        <span class="w-10 text-center font-semibold">${S.qty}</span>
        <button data-act="dq" data-d="1" aria-label="Tambah" class="w-9 h-9 text-lg hover:bg-soft rounded-r-lg">+</button>
      </div>
      <div class="mt-auto pt-6 flex gap-2">
        <button data-act="wish" data-id="${p.id}" aria-label="Wishlist" class="w-12 h-12 shrink-0 rounded-xl border border-slate-200 text-xl hover:bg-soft ${wish.includes(p.id) ? 'text-red-500' : 'text-slate-400'}">${heart(p.id)}</button>
        <button data-act="add" class="flex-1 h-12 rounded-xl bg-brand hover:bg-brand-dark text-white font-bold transition">Tambah ke Keranjang</button>
      </div>
    </div>
  </div>`;
}

/* ========== Wishlist ========== */
function toggleWish(id) {
  const i = wish.indexOf(id);
  if (i > -1) wish.splice(i, 1); else wish.push(id);
  persist();
  toast(i > -1 ? 'Dihapus dari wishlist' : '♥ Ditambahkan ke wishlist');
  renderGrid();
  if (!$('#m-detail').classList.contains('hidden')) renderDetail();
  if (!$('#m-wish').classList.contains('hidden')) renderWish();
}
function renderWish() {
  $('#wish-body').innerHTML = wish.length ? wish.map((id) => {
    const p = byId(id);
    return `<div class="flex gap-3 items-center py-3 border-b border-slate-100">
      <div class="w-16 h-16 rounded-lg overflow-hidden bg-soft shrink-0">${img(p.image, 'w-full h-full object-cover')}</div>
      <div class="flex-1 min-w-0"><p class="text-sm font-semibold line-clamp-1">${esc(p.name)}</p><p class="text-sm font-bold text-brand">${rp(p.price)}</p></div>
      <button data-act="detail" data-id="${p.id}" class="text-xs px-3 py-1.5 rounded-lg bg-brand hover:bg-brand-dark text-white font-semibold">Lihat</button>
      <button data-act="wish" data-id="${p.id}" aria-label="Hapus" class="text-xl text-red-500">♥</button>
    </div>`;
  }).join('') : '<p class="text-center text-slate-400 py-12 text-sm">Belum ada produk favorit. Tap ikon hati pada produk untuk menyimpannya.</p>';
}

/* ========== Keranjang & promo ========== */
function addCart(id, variant, qty) {
  const f = cart.find((i) => i.id === id && i.variant === variant);
  if (f) f.qty += qty; else cart.push({ id, variant, qty });
  persist();
  toast('✓ ' + byId(id).name + ' masuk keranjang');
}
function totals() {
  const sub = cart.reduce((a, i) => a + byId(i.id).price * i.qty, 0);
  const disc = promo ? Math.round(sub * 0.1) : 0;
  const ship = cart.length ? SHIP[S.courier].c : 0;
  return { sub, disc, ship, total: sub - disc + ship };
}
const row = (a, b, c = '') => `<div class="flex justify-between text-sm ${c}"><span>${a}</span><span>${b}</span></div>`;
const sumHTML = (t) =>
  row('Subtotal', rp(t.sub)) +
  (t.disc ? row('Diskon (KATAPEDIA10)', '-' + rp(t.disc), 'text-brand font-semibold') : '') +
  row('Biaya Pengiriman', rp(t.ship)) +
  row('Total Pembayaran', rp(t.total), 'font-extrabold text-base text-ink pt-2 mt-2 border-t border-slate-200');

function renderCart() {
  $('#cart-items').innerHTML = cart.length ? cart.map((i, x) => {
    const p = byId(i.id);
    return `<div class="flex gap-3 py-3 border-b border-slate-100">
      <div class="w-20 h-20 rounded-lg overflow-hidden bg-soft shrink-0">${img(p.image, 'w-full h-full object-cover')}</div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-semibold text-ink line-clamp-2">${esc(p.name)}</p>
        <p class="text-xs text-slate-500">${p.variants.label}: ${esc(i.variant)}</p>
        <p class="text-sm font-bold text-brand mt-1">${rp(p.price)}</p>
        <div class="mt-2 flex items-center justify-between">
          <div class="inline-flex items-center border border-slate-200 rounded-lg">
            <button data-act="cq" data-x="${x}" data-d="-1" aria-label="Kurangi" class="w-7 h-7 hover:bg-soft rounded-l-lg">−</button>
            <span class="w-8 text-center text-sm font-semibold">${i.qty}</span>
            <button data-act="cq" data-x="${x}" data-d="1" aria-label="Tambah" class="w-7 h-7 hover:bg-soft rounded-r-lg">+</button>
          </div>
          <button data-act="rm" data-x="${x}" class="text-xs text-red-500 hover:underline">Hapus</button>
        </div>
      </div>
    </div>`;
  }).join('') : '<div class="text-center text-slate-400 py-20"><p class="text-5xl">🛍️</p><p class="mt-3 text-sm font-semibold text-slate-600">Keranjang masih kosong</p><p class="text-sm">Yuk pilih produk favoritmu.</p></div>';
  $('#sum').innerHTML = sumHTML(totals());
  $('#btn-checkout').disabled = !cart.length;
  $('#promo-msg').textContent = promo ? '✓ Voucher KATAPEDIA10 aktif (diskon 10%)' : '';
}
function applyPromo() {
  const v = $('#promo-in').value.trim().toUpperCase();
  if (!v) return toast('Masukkan kode promo dulu');
  if (v !== 'KATAPEDIA10') return toast('✕ Kode promo tidak valid');
  if (promo) return toast('Voucher sudah diterapkan');
  promo = true; persist();
  toast('🎉 Voucher KATAPEDIA10 diterapkan, diskon 10%');
}

/* ========== Checkout & invoice ========== */
function openCheckout() {
  if (!cart.length) return;
  closeDrawer();
  $('#co-courier').value = S.courier;
  renderCo();
  openM('m-checkout');
}
function renderCo() {
  S.courier = $('#co-courier').value;
  $('#co-sum').innerHTML = sumHTML(totals());
  renderCart();
}
function invHTML(o) {
  return `<div class="p-6">
    <div class="text-center border-b border-dashed border-slate-300 pb-4">
      <p class="text-xl font-extrabold text-brand">KATAPEDIA</p>
      <p class="text-xs text-slate-500">Struk Pembelian Digital</p>
      <p class="mt-2 font-bold text-sm">${o.no}</p>
      <p class="text-xs text-slate-500">${new Date(o.date).toLocaleString('id-ID')}</p>
    </div>
    <div class="py-4 text-sm space-y-1 border-b border-dashed border-slate-300">
      <p><b>Penerima:</b> ${esc(o.name)}</p><p><b>WhatsApp:</b> ${esc(o.wa)}</p><p><b>Alamat:</b> ${esc(o.addr)}</p>
      <p><b>Ekspedisi:</b> ${esc(o.courier)}</p><p><b>Pembayaran:</b> ${esc(o.pay)}</p>
    </div>
    <div class="py-4 space-y-2 border-b border-dashed border-slate-300">${o.items.map((i) =>
      `<div class="flex justify-between gap-3 text-sm"><div><p class="font-semibold">${esc(i.name)}</p><p class="text-xs text-slate-500">${esc(i.variant)} &middot; ${i.qty} x ${rp(i.price)}</p></div><span class="font-semibold whitespace-nowrap">${rp(i.price * i.qty)}</span></div>`).join('')}</div>
    <div class="pt-4">${sumHTML(o)}</div>
    <p class="text-center text-xs text-slate-400 mt-5">Terima kasih sudah belanja di KATAPEDIA 💚<br>Ini hanya simulasi, bukan transaksi sungguhan.</p>
  </div>`;
}
function showInvoice(o) {
  $('#inv-body').innerHTML = invHTML(o);
  closeM('m-history');
  openM('m-invoice');
}
function renderHistory() {
  $('#hist-body').innerHTML = orders.length ? orders.map((o, x) =>
    `<div class="border border-slate-100 rounded-xl p-4 mb-3">
      <div class="flex justify-between items-start gap-2">
        <div><p class="font-bold text-sm">${o.no}</p><p class="text-xs text-slate-500">${new Date(o.date).toLocaleString('id-ID')} &middot; ${o.items.reduce((a, i) => a + i.qty, 0)} item</p></div>
        <span class="text-xs font-semibold bg-emerald-50 text-brand px-2 py-1 rounded-lg">Berhasil</span>
      </div>
      <div class="mt-3 flex justify-between items-center"><span class="font-extrabold">${rp(o.total)}</span><button data-act="inv" data-x="${x}" class="text-sm font-semibold text-brand hover:underline">Lihat Struk</button></div>
    </div>`).join('') : '<p class="text-center text-slate-400 py-12 text-sm">Belum ada riwayat pesanan.</p>';
}

$('#co-form').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!cart.length) return;
  const t = totals();
  const o = {
    no: `INV/KTP/${new Date().getFullYear()}/${Date.now().toString().slice(-7)}`,
    date: new Date().toISOString(),
    name: $('#co-name').value.trim(), wa: $('#co-wa').value.trim(), addr: $('#co-addr').value.trim(),
    courier: SHIP[S.courier].n, pay: PAY[$('#co-pay').value],
    items: cart.map((i) => { const p = byId(i.id); return { name: p.name, variant: p.variants.label + ': ' + i.variant, price: p.price, qty: i.qty }; }),
    ...t
  };
  orders.unshift(o);
  cart = []; promo = false;
  persist();
  e.target.reset();
  closeM('m-checkout');
  showInvoice(o);
  toast('✅ Pesanan berhasil dibuat!');
});

/* ========== Event delegation ========== */
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const d = el.dataset;
  switch (d.act) {
    case 'cat': S.cat = d.v; renderTabs(); renderGrid(); break;
    case 'detail': closeM('m-wish'); openDetail(+d.id); break;
    case 'wish': toggleWish(+d.id); break;
    case 'variant': S.variant = d.v; renderDetail(); break;
    case 'dq': S.qty = Math.max(1, Math.min(99, S.qty + +d.d)); renderDetail(); break;
    case 'add': addCart(S.pid, S.variant, S.qty); closeM('m-detail'); break;
    case 'cq': {
      const it = cart[+d.x]; if (!it) break;
      it.qty += +d.d;
      if (it.qty <= 0) cart.splice(+d.x, 1);
      persist(); break;
    }
    case 'rm': cart.splice(+d.x, 1); persist(); break;
    case 'open':
      if (d.v === 'cart') openDrawer();
      else if (d.v === 'wish') { renderWish(); openM('m-wish'); }
      else { renderHistory(); openM('m-history'); }
      break;
    case 'close': d.v === 'drawer' ? closeDrawer() : closeM(d.v); break;
    case 'promo': applyPromo(); break;
    case 'checkout': openCheckout(); break;
    case 'inv': showInvoice(orders[+d.x]); break;
    case 'print': window.print(); break;
  }
});

$('#search').addEventListener('input', (e) => { S.q = e.target.value.trim().toLowerCase(); renderGrid(); });
$('#sort').addEventListener('change', (e) => { S.sort = e.target.value; renderGrid(); });
$('#co-courier').addEventListener('change', renderCo);
$('#promo-in').addEventListener('keydown', (e) => { if (e.key === 'Enter') applyPromo(); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  $$('.modal').forEach((m) => m.classList.add('hidden'));
  closeDrawer(); lock();
});

/* ========== Init ========== */
renderTabs();
renderGrid();
badges();
renderCart();
