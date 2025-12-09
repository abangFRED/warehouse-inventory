const API_BASE = 'http://localhost:4000/api';
const API_BASE_URL = "https://warehouse-inventory-production-ed36.up.railway.app"; 
// ganti pakai URL punyamu sendiri

async function fetchItems(query = '') {
  const url = new URL(API_BASE + '/items');
  if (query) url.searchParams.set('query', query);

  const res = await fetch(`${API_BASE_URL}/api/items`);
  const data = await res.json();
  renderItems(data);
}

function renderItems(items) {
  const container = document.getElementById('items-container');
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p>Tidak ada barang.</p>';
    return;
  }

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
        <small>Kategori: ${item.category || '-'}</small><br>
        <small>Stok: ${item.quantity}</small><br>
        <small>Lokasi: ${item.location_name || '-'}</small>
      </div>
    `;
    container.appendChild(div);
  });
}

document.getElementById('search-btn').addEventListener('click', () => {
  const q = document.getElementById('search-input').value.trim();
  fetchItems(q);
});

document.getElementById('search-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    const q = e.target.value.trim();
    fetchItems(q);
  }
});

// load awal
fetchItems();
