const API_BASE_URL = "https://warehouse-inventory-production-ed36.up.railway.app";

async function loadLocations() {
  const res = await fetch(API_BASE + '/locations');
  const locations = await res.json();
  const select = document.getElementById('location-select');

  locations.forEach(loc => {
    const option = document.createElement('option');
    option.value = loc.id;
    option.textContent = loc.name;
    select.appendChild(option);
  });
}

async function fetchAdminItems(query = '') {
  const url = new URL(API_BASE + '/items');
  if (query) url.searchParams.set('query', query);
  const res = await fetch(`${API_BASE}/api/items`);
  const items = await res.json();
  renderAdminItems(items);
}

function renderAdminItems(items) {
  const container = document.getElementById('admin-items');
  container.innerHTML = '';

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.innerHTML = `
      <div class="item-image">
        ${item.image_path ? `<img src="${item.image_path}" alt="${item.name}">` : '<div class="placeholder">No Image</div>'}
      </div>
      <div class="item-info">
        <strong>${item.name}</strong><br>
        <small>Kode: ${item.code || '-'}</small><br>
        <small>Stok: ${item.quantity}</small><br>
        <small>Lokasi: ${item.location_name || '-'}</small><br>
        <button data-id="${item.id}" class="btn-in">+ Stok</button>
        <button data-id="${item.id}" class="btn-out">- Stok</button>
      </div>
    `;
    container.appendChild(div);
  });

  container.querySelectorAll('.btn-in').forEach(btn => {
    btn.addEventListener('click', () => updateStock(btn.dataset.id, 'IN'));
  });
  container.querySelectorAll('.btn-out').forEach(btn => {
    btn.addEventListener('click', () => updateStock(btn.dataset.id, 'OUT'));
  });
}

async function updateStock(id, type) {
  const qty = prompt(`Jumlah yang akan ${type === 'IN' ? 'ditambahkan' : 'dikurangi'}:`);
  if (!qty) return;
  const note = prompt('Catatan (opsional):') || '';

  await fetch(`${API_BASE}/items/${id}/stock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quantity_change: Number(qty),
      type,
      note
    })
  });

  fetchAdminItems(document.getElementById('admin-search').value.trim());
}

document.getElementById('item-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  await fetch(`${API_BASE_URL}/api/items`, {
    method: 'POST',
    body: formData
});


  form.reset();
  fetchAdminItems();
});

document.getElementById('admin-search-btn').addEventListener('click', () => {
  const q = document.getElementById('admin-search').value.trim();
  fetchAdminItems(q);
});

document.getElementById('admin-search').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    fetchAdminItems(q);
  }
});

loadLocations();
fetchAdminItems();
