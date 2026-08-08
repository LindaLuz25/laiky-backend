const API_BASE = window.LAIKY_CONFIG.API_BASE_URL;
const COGNITO_REGION = window.LAIKY_CONFIG.COGNITO_REGION;
const COGNITO_CLIENT_ID = window.LAIKY_CONFIG.COGNITO_CLIENT_ID;
const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

const state = {
  token: sessionStorage.getItem("laiky_admin_token") || null,
  tab: "restaurants",
  restaurants: [],
  products: [],
  orders: [],
};

const els = {
  loginScreen: document.getElementById("login-screen"),
  adminScreen: document.getElementById("admin-screen"),
  loginForm: document.getElementById("login-form"),
  loginAlert: document.getElementById("login-alert"),
  logoutBtn: document.getElementById("logout-btn"),
  tabs: document.querySelectorAll(".tab"),
  panelRestaurants: document.getElementById("panel-restaurants"),
  panelProducts: document.getElementById("panel-products"),
  panelOrders: document.getElementById("panel-orders"),
  restaurantsTableBody: document.querySelector("#restaurants-table tbody"),
  productsTableBody: document.querySelector("#products-table tbody"),
  ordersTableBody: document.querySelector("#orders-table tbody"),
  newRestaurantBtn: document.getElementById("new-restaurant-btn"),
  newProductBtn: document.getElementById("new-product-btn"),
  modalBackdrop: document.getElementById("modal-backdrop"),
  modalTitle: document.getElementById("modal-title"),
  modalBody: document.getElementById("modal-body"),
  modalSaveBtn: document.getElementById("modal-save-btn"),
  modalCancelBtn: document.getElementById("modal-cancel-btn"),
};

// ---------- Auth ----------

function isLoggedIn() {
  if (!state.token) return false;
  try {
    const payload = JSON.parse(atob(state.token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

async function login(username, password) {
  const res = await fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: { USERNAME: username, PASSWORD: password },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "No se pudo iniciar sesion");
  }
  if (data.ChallengeName) {
    throw new Error(
      "Tu cuenta requiere completar un cambio de contrasena inicial. Contacta al administrador."
    );
  }

  state.token = data.AuthenticationResult.IdToken;
  sessionStorage.setItem("laiky_admin_token", state.token);
}

function logout() {
  state.token = null;
  sessionStorage.removeItem("laiky_admin_token");
  showLogin();
}

function showLogin() {
  els.loginScreen.style.display = "flex";
  els.adminScreen.style.display = "none";
  els.logoutBtn.style.display = "none";
}

function showAdmin() {
  els.loginScreen.style.display = "none";
  els.adminScreen.style.display = "block";
  els.logoutBtn.style.display = "inline-block";
  loadAll();
}

// ---------- API helper ----------

async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: state.token,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    logout();
    throw new Error("Sesion expirada, vuelve a iniciar sesion");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Error ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------- Data loading ----------

async function loadAll() {
  await Promise.all([loadRestaurants(), loadProducts(), loadOrders()]);
}

async function loadRestaurants() {
  state.restaurants = await apiFetch("/admin/restaurants");
  renderRestaurants();
  renderProducts(); // por si cambia el nombre de restaurante referenciado
}

async function loadProducts() {
  state.products = await apiFetch("/admin/products");
  renderProducts();
}

async function loadOrders() {
  state.orders = await apiFetch("/admin/orders");
  state.orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  renderOrders();
}

// ---------- Render: Restaurants ----------

function renderRestaurants() {
  els.restaurantsTableBody.innerHTML = state.restaurants
    .map(
      (r) => `
      <tr>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.address || "-")}</td>
        <td>${r.active ? "Activo" : "Inactivo"}</td>
        <td class="row-actions">
          <button class="secondary" data-action="edit-restaurant" data-id="${r.id}">Editar</button>
          <button class="secondary" data-action="delete-restaurant" data-id="${r.id}">Eliminar</button>
        </td>
      </tr>
    `
    )
    .join("");

  els.restaurantsTableBody.querySelectorAll("[data-action='edit-restaurant']").forEach((btn) =>
    btn.addEventListener("click", () => openRestaurantModal(btn.dataset.id))
  );
  els.restaurantsTableBody.querySelectorAll("[data-action='delete-restaurant']").forEach((btn) =>
    btn.addEventListener("click", () => deleteRestaurant(btn.dataset.id))
  );
}

function openRestaurantModal(id) {
  const restaurant = id ? state.restaurants.find((r) => r.id === id) : null;
  els.modalTitle.textContent = restaurant ? "Editar restaurante" : "Nuevo restaurante";
  els.modalBody.innerHTML = `
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="f-name" value="${restaurant ? escapeAttr(restaurant.name) : ""}" />
    </div>
    <div class="form-group">
      <label>Direccion</label>
      <input type="text" id="f-address" value="${restaurant ? escapeAttr(restaurant.address || "") : ""}" />
    </div>
    ${
      restaurant
        ? `<div class="form-group">
             <label><input type="checkbox" id="f-active" ${restaurant.active ? "checked" : ""} /> Activo</label>
           </div>`
        : ""
    }
  `;
  openModal(async () => {
    const name = document.getElementById("f-name").value.trim();
    const address = document.getElementById("f-address").value.trim();
    if (!name) return alert("El nombre es requerido");

    if (restaurant) {
      const active = document.getElementById("f-active").checked;
      await apiFetch(`/admin/restaurants/${restaurant.id}`, {
        method: "PUT",
        body: JSON.stringify({ name, address, active }),
      });
    } else {
      await apiFetch("/admin/restaurants", {
        method: "POST",
        body: JSON.stringify({ name, address }),
      });
    }
    await loadRestaurants();
  });
}

async function deleteRestaurant(id) {
  if (!confirm("¿Eliminar este restaurante?")) return;
  await apiFetch(`/admin/restaurants/${id}`, { method: "DELETE" });
  await loadRestaurants();
}

// ---------- Render: Products ----------

function restaurantName(id) {
  const r = state.restaurants.find((r) => r.id === id);
  return r ? r.name : "(desconocido)";
}

function renderProducts() {
  els.productsTableBody.innerHTML = state.products
    .map(
      (p) => `
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${escapeHtml(restaurantName(p.restaurantId))}</td>
        <td>S/ ${Number(p.price).toFixed(2)}</td>
        <td>${p.available ? "Disponible" : "No disponible"}</td>
        <td class="row-actions">
          <button class="secondary" data-action="edit-product" data-id="${p.id}">Editar</button>
          <button class="secondary" data-action="delete-product" data-id="${p.id}">Eliminar</button>
        </td>
      </tr>
    `
    )
    .join("");

  els.productsTableBody.querySelectorAll("[data-action='edit-product']").forEach((btn) =>
    btn.addEventListener("click", () => openProductModal(btn.dataset.id))
  );
  els.productsTableBody.querySelectorAll("[data-action='delete-product']").forEach((btn) =>
    btn.addEventListener("click", () => deleteProduct(btn.dataset.id))
  );
}

function openProductModal(id) {
  const product = id ? state.products.find((p) => p.id === id) : null;
  const restaurantOptions = state.restaurants
    .map(
      (r) =>
        `<option value="${r.id}" ${product && product.restaurantId === r.id ? "selected" : ""}>${escapeHtml(r.name)}</option>`
    )
    .join("");

  els.modalTitle.textContent = product ? "Editar producto" : "Nuevo producto";
  els.modalBody.innerHTML = `
    <div class="form-group">
      <label>Restaurante</label>
      <select id="f-restaurant">${restaurantOptions}</select>
    </div>
    <div class="form-group">
      <label>Nombre</label>
      <input type="text" id="f-name" value="${product ? escapeAttr(product.name) : ""}" />
    </div>
    <div class="form-group">
      <label>Precio (S/)</label>
      <input type="number" step="0.01" id="f-price" value="${product ? product.price : ""}" />
    </div>
    <div class="form-group">
      <label>URL de imagen (opcional)</label>
      <input type="text" id="f-image" value="${product ? escapeAttr(product.imageUrl || "") : ""}" />
    </div>
    ${
      product
        ? `<div class="form-group">
             <label><input type="checkbox" id="f-available" ${product.available ? "checked" : ""} /> Disponible</label>
           </div>`
        : ""
    }
  `;
  openModal(async () => {
    const restaurantId = document.getElementById("f-restaurant").value;
    const name = document.getElementById("f-name").value.trim();
    const price = parseFloat(document.getElementById("f-price").value);
    const imageUrl = document.getElementById("f-image").value.trim() || null;
    if (!restaurantId || !name || isNaN(price)) return alert("Completa restaurante, nombre y precio");

    if (product) {
      const available = document.getElementById("f-available").checked;
      await apiFetch(`/admin/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ name, price, imageUrl, available }),
      });
    } else {
      await apiFetch("/admin/products", {
        method: "POST",
        body: JSON.stringify({ restaurantId, name, price, imageUrl }),
      });
    }
    await loadProducts();
  });
}

async function deleteProduct(id) {
  if (!confirm("¿Eliminar este producto?")) return;
  await apiFetch(`/admin/products/${id}`, { method: "DELETE" });
  await loadProducts();
}

// ---------- Render: Orders ----------

const ESTADOS = ["PENDIENTE", "CONFIRMADO", "EN_CAMINO", "ENTREGADO", "CANCELADO"];

function renderOrders() {
  els.ordersTableBody.innerHTML = state.orders
    .map((o) => {
      const itemsText = o.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");
      const options = ESTADOS.map(
        (e) => `<option value="${e}" ${o.status === e ? "selected" : ""}>${e}</option>`
      ).join("");
      return `
        <tr>
          <td>${escapeHtml(o.customerName)}<br/><small>${escapeHtml(o.customerPhone)}</small></td>
          <td>${escapeHtml(restaurantName(o.restaurantId))}</td>
          <td>${escapeHtml(itemsText)}</td>
          <td>${escapeHtml(o.address)}</td>
          <td><span class="badge ${o.status}">${o.status}</span></td>
          <td>
            <select data-id="${o.id}" class="order-status-select">${options}</select>
          </td>
        </tr>
      `;
    })
    .join("");

  els.ordersTableBody.querySelectorAll(".order-status-select").forEach((select) => {
    select.addEventListener("change", async () => {
      try {
        await apiFetch(`/admin/orders/${select.dataset.id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status: select.value }),
        });
        await loadOrders();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

// ---------- Modal helper ----------

let modalSaveHandler = null;

function openModal(onSave) {
  modalSaveHandler = onSave;
  els.modalBackdrop.classList.add("open");
}

function closeModal() {
  els.modalBackdrop.classList.remove("open");
  modalSaveHandler = null;
}

els.modalSaveBtn.addEventListener("click", async () => {
  if (!modalSaveHandler) return;
  try {
    await modalSaveHandler();
    closeModal();
  } catch (err) {
    alert(err.message);
  }
});
els.modalCancelBtn.addEventListener("click", closeModal);

// ---------- Tabs ----------

els.tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    state.tab = tab.dataset.tab;
    els.tabs.forEach((t) => t.classList.toggle("active", t === tab));
    els.panelRestaurants.style.display = state.tab === "restaurants" ? "block" : "none";
    els.panelProducts.style.display = state.tab === "products" ? "block" : "none";
    els.panelOrders.style.display = state.tab === "orders" ? "block" : "none";
  });
});

// ---------- Utils ----------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return (str ?? "").replace(/"/g, "&quot;");
}

// ---------- Wire up ----------

els.loginForm.addEventListener("submit", async (evt) => {
  evt.preventDefault();
  els.loginAlert.innerHTML = "";
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    await login(username, password);
    showAdmin();
  } catch (err) {
    els.loginAlert.innerHTML = `<div class="alert error">${err.message}</div>`;
  }
});

els.logoutBtn.addEventListener("click", logout);
els.newRestaurantBtn.addEventListener("click", () => openRestaurantModal(null));
els.newProductBtn.addEventListener("click", () => openProductModal(null));

if (isLoggedIn()) {
  showAdmin();
} else {
  showLogin();
}
