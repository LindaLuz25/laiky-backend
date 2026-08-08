const API_BASE = window.LAIKY_CONFIG.API_BASE_URL;

const state = {
  restaurants: [],
  selectedRestaurant: null,
  products: [],
  cart: [], // { productId, name, price, quantity }
};

const els = {
  restaurantsGrid: document.getElementById("restaurants-grid"),
  productsSection: document.getElementById("products-section"),
  productsGrid: document.getElementById("products-grid"),
  restaurantsSection: document.getElementById("restaurants-section"),
  selectedRestaurantName: document.getElementById("selected-restaurant-name"),
  backBtn: document.getElementById("back-btn"),
  cartFab: document.getElementById("cart-fab"),
  cartCount: document.getElementById("cart-count"),
  cartDrawer: document.getElementById("cart-drawer"),
  cartItems: document.getElementById("cart-items"),
  cartTotal: document.getElementById("cart-total"),
  closeCartBtn: document.getElementById("close-cart-btn"),
  overlay: document.getElementById("overlay"),
  checkoutBtn: document.getElementById("checkout-btn"),
  checkoutModal: document.getElementById("checkout-modal"),
  checkoutForm: document.getElementById("checkout-form"),
  cancelCheckoutBtn: document.getElementById("cancel-checkout-btn"),
  checkoutAlert: document.getElementById("checkout-alert"),
};

async function fetchJSON(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function loadRestaurants() {
  els.restaurantsGrid.innerHTML = `<p class="empty-state">Cargando restaurantes...</p>`;
  try {
    state.restaurants = await fetchJSON(`${API_BASE}/restaurants`);
    renderRestaurants();
  } catch (err) {
    els.restaurantsGrid.innerHTML = `<p class="empty-state">No se pudo cargar el catalogo: ${err.message}</p>`;
  }
}

function renderRestaurants() {
  if (state.restaurants.length === 0) {
    els.restaurantsGrid.innerHTML = `<p class="empty-state">Todavia no hay restaurantes disponibles.</p>`;
    return;
  }
  els.restaurantsGrid.innerHTML = state.restaurants
    .map(
      (r) => `
      <div class="card" data-id="${r.id}">
        <h3>${escapeHtml(r.name)}</h3>
        <p>${escapeHtml(r.address || "")}</p>
      </div>
    `
    )
    .join("");

  els.restaurantsGrid.querySelectorAll(".card").forEach((card) => {
    card.addEventListener("click", () => openRestaurant(card.dataset.id));
  });
}

async function openRestaurant(id) {
  const restaurant = state.restaurants.find((r) => r.id === id);
  state.selectedRestaurant = restaurant;
  els.selectedRestaurantName.textContent = restaurant.name;
  els.restaurantsSection.style.display = "none";
  els.productsSection.style.display = "block";
  els.productsGrid.innerHTML = `<p class="empty-state">Cargando productos...</p>`;

  try {
    state.products = await fetchJSON(`${API_BASE}/products?restaurantId=${id}`);
    renderProducts();
  } catch (err) {
    els.productsGrid.innerHTML = `<p class="empty-state">No se pudo cargar los productos: ${err.message}</p>`;
  }
}

function quantityInCart(productId) {
  const item = state.cart.find((i) => i.productId === productId);
  return item ? item.quantity : 0;
}

function renderProducts() {
  if (state.products.length === 0) {
    els.productsGrid.innerHTML = `<p class="empty-state">Este restaurante no tiene productos disponibles.</p>`;
    return;
  }
  els.productsGrid.innerHTML = state.products
    .map((p) => {
      const qty = quantityInCart(p.id);
      const image = p.imageUrl
        ? `<img class="card-image" src="/${p.imageUrl}" alt="${escapeAttr(p.name)}" />`
        : `<div class="card-image placeholder">🍽️</div>`;
      return `
      <div class="card" data-id="${p.id}">
        ${image}
        <div class="card-body">
          <h3>${escapeHtml(p.name)}</h3>
          ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ""}
          <p class="price">S/ ${Number(p.price).toFixed(2)}</p>
          <div class="card-footer">
            <span></span>
            <button class="add-btn" data-add="${p.id}">
              Agregar
              ${qty > 0 ? `<span class="qty-badge">${qty}</span>` : ""}
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");

  els.productsGrid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      const product = state.products.find((p) => p.id === btn.dataset.add);
      addToCart(product);
    });
  });
}

function addToCart(product) {
  const existing = state.cart.find((i) => i.productId === product.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
  }
  renderCart();
  renderProducts();
  openCart();
}

function changeQuantity(productId, delta) {
  const item = state.cart.find((i) => i.productId === productId);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    state.cart = state.cart.filter((i) => i.productId !== productId);
  }
  renderCart();
  renderProducts();
}

function cartTotal() {
  return state.cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

function renderCart() {
  const count = state.cart.reduce((sum, i) => sum + i.quantity, 0);
  els.cartCount.textContent = count;

  if (state.cart.length === 0) {
    els.cartItems.innerHTML = `<p class="empty-state">Tu carrito esta vacio.</p>`;
  } else {
    els.cartItems.innerHTML = state.cart
      .map(
        (i) => `
        <div class="cart-item">
          <div>
            <strong>${escapeHtml(i.name)}</strong><br/>
            <span>S/ ${Number(i.price).toFixed(2)} x ${i.quantity}</span>
          </div>
          <div class="row-actions">
            <button class="secondary" data-action="minus" data-id="${i.productId}">-</button>
            <button class="secondary" data-action="plus" data-id="${i.productId}">+</button>
          </div>
        </div>
      `
      )
      .join("");

    els.cartItems.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const delta = btn.dataset.action === "plus" ? 1 : -1;
        changeQuantity(btn.dataset.id, delta);
      });
    });
  }

  els.cartTotal.textContent = `S/ ${cartTotal().toFixed(2)}`;
}

function openCart() {
  els.cartDrawer.classList.add("open");
  els.overlay.classList.add("open");
}

function closeCart() {
  els.cartDrawer.classList.remove("open");
  els.overlay.classList.remove("open");
}

function openCheckout() {
  if (state.cart.length === 0) return;
  els.checkoutModal.classList.add("open");
}

function closeCheckout() {
  els.checkoutModal.classList.remove("open");
  els.checkoutAlert.innerHTML = "";
}

async function submitOrder(evt) {
  evt.preventDefault();
  const formData = new FormData(els.checkoutForm);
  const order = {
    restaurantId: state.selectedRestaurant.id,
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    address: formData.get("address"),
    items: state.cart.map((i) => ({ name: i.name, quantity: i.quantity })),
  };

  try {
    await fetchJSON(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(order),
    });
    els.checkoutAlert.innerHTML = `<div class="alert success">Pedido enviado. Nos comunicaremos contigo pronto.</div>`;
    state.cart = [];
    renderCart();
    renderProducts();
    els.checkoutForm.reset();
    setTimeout(() => {
      closeCheckout();
      closeCart();
    }, 1800);
  } catch (err) {
    els.checkoutAlert.innerHTML = `<div class="alert error">${err.message}</div>`;
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str ?? "").replace(/"/g, "&quot;");
}

els.backBtn.addEventListener("click", () => {
  els.productsSection.style.display = "none";
  els.restaurantsSection.style.display = "block";
});
els.cartFab.addEventListener("click", openCart);
els.closeCartBtn.addEventListener("click", closeCart);
els.overlay.addEventListener("click", () => {
  closeCart();
  closeCheckout();
});
els.checkoutBtn.addEventListener("click", openCheckout);
els.cancelCheckoutBtn.addEventListener("click", closeCheckout);
els.checkoutForm.addEventListener("submit", submitOrder);

loadRestaurants();
renderCart();
