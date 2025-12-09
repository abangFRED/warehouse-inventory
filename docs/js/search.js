const API_BASE_URL = "https://warehouse-inventory-production-ed36.up.railway.app"; 
// ganti pakai URL punyamu sendiri

async function fetchItems(query = '') {
  const url = new URL(API_BASE + '/items');
  if (query) url.searchParams.set('query', query);

  const res = await fetch(`${API_BASE_URL}/api/items`);
  const data = await res.json();
  renderItems(data);
}

function renderAdminItems(items) {
  const container = document.getElementById('admin-items');
  container.innerHTML = '';

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'item-card';

    // kalau di DB disimpan 'uploads/xxx.png'
    const imageUrl = item.image_path 
      ? `${API_BASE_URL}/uploads/${item.image_path}` 
      : null;

    div.innerHTML = `
      <div class="item-image">
        ${imageUrl 
          ? `<img src="${imageUrl}" alt="${item.name}">` 
          : '<div class="placeholder">No Image</div>'}
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
