import { state, updateState, addGuest, deleteGuest, addTable, deleteTable, unseatGuest } from './state.js';
import { db, syncState } from './firebase.js';
import { initHall, renderHall } from './ui/hall.js';

const weddingId = new URLSearchParams(window.location.search).get('id') || 'default-wedding';

const app = {
  init() {
    this.bindEvents();
    initHall();
    
    syncState(weddingId, (data) => {
      if (data) {
        updateState(data, true);
        this.render();
      }
    });

    window.app = this;
  },

  bindEvents() {
    document.getElementById('zoom-in').onclick = () => this.setZoom(state.zoom + 0.1);
    document.getElementById('zoom-out').onclick = () => this.setZoom(state.zoom - 0.1);
    document.getElementById('zoom-reset').onclick = () => this.setZoom(1);

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.sidebar-content').forEach(c => c.style.display = 'none');
        document.getElementById(`sidebar-${btn.dataset.tab}`).style.display = 'block';
      };
    });

    document.getElementById('add-guest-btn').onclick = () => {
      this.openGuestModal();
    };

    document.getElementById('print-btn').onclick = () => window.print();
    document.getElementById('export-excel-btn').onclick = () => this.exportToExcel();

    window.closeModal = () => {
      document.getElementById('modal-overlay').style.display = 'none';
      document.getElementById('table-modal').style.display = 'none';
      document.getElementById('guest-modal').style.display = 'none';
    };
  },

  setZoom(val) {
    state.zoom = Math.max(0.5, Math.min(2, val));
    const container = document.querySelector('.canvas-container');
    container.style.transform = `scale(${state.zoom})`;
  },

  render() {
    this.renderGuests();
    renderHall();
  },

  renderGuests() {
    const list = document.getElementById('guests-list');
    list.innerHTML = '';
    state.guests.sort((a, b) => a.name.localeCompare(b.name)).forEach(g => {
      const card = document.createElement('div');
      card.className = `guest-card ${g.seated ? 'seated' : ''}`;
      card.innerHTML = `
        <div class="guest-info">
          <h4>${g.name}</h4>
          <p>${g.group} ${g.label ? `<br><small>${g.label}</small>` : ''}</p>
        </div>
        <div class="guest-actions">
           <button onclick="app.editGuest('${g.id}')">✏️</button>
        </div>
      `;
      
      const startDrag = (e) => {
        if (g.seated) return;
        state.draggedGuest = g;
        const ghost = document.getElementById('drag-ghost');
        ghost.textContent = g.name;
        ghost.style.display = 'block';
        ghost.style.left = (e.clientX || e.touches[0].clientX) + 10 + 'px';
        ghost.style.top = (e.clientY || e.touches[0].clientY) + 10 + 'px';
      };

      card.onmousedown = startDrag;
      card.ontouchstart = startDrag;
      list.appendChild(card);
    });
  },

  // Modals
  openTableModal(id) {
    const table = state.tables.find(t => t.id === id);
    if (!table) return;
    state.selectedTable = table;
    document.getElementById('edit-table-name').value = table.name;
    document.getElementById('edit-table-rotation').value = table.rotation || 0;
    
    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('table-modal').style.display = 'block';
    document.getElementById('guest-modal').style.display = 'none';
  },

  saveTableSettings() {
    const table = state.selectedTable;
    if (!table) return;
    table.name = document.getElementById('edit-table-name').value;
    table.rotation = parseInt(document.getElementById('edit-table-rotation').value) || 0;
    updateState({});
    window.closeModal();
  },

  deleteTable() {
    if (confirm('Удалить стол?')) {
      deleteTable(state.selectedTable.id);
      window.closeModal();
    }
  },

  openGuestModal(id = null) {
    const isEdit = id !== null;
    const g = isEdit ? state.guests.find(gu => gu.id === id) : { name: '', group: 'Друзья', label: '', status: 'Приглашение принято' };
    state.selectedGuest = isEdit ? g : null;

    document.getElementById('edit-guest-name').value = g.name;
    document.getElementById('edit-guest-group').value = g.group;
    document.getElementById('edit-guest-labels').value = g.label || '';
    document.getElementById('edit-guest-status').value = g.status;

    const deleteBtn = document.getElementById('delete-guest-modal-btn');
    deleteBtn.style.display = isEdit ? 'block' : 'none';
    deleteBtn.onclick = () => {
      if (confirm('Удалить гостя?')) {
        deleteGuest(g.id);
        window.closeModal();
      }
    };

    document.getElementById('modal-overlay').style.display = 'flex';
    document.getElementById('guest-modal').style.display = 'block';
    document.getElementById('table-modal').style.display = 'none';
  },

  saveGuestSettings() {
    const name = document.getElementById('edit-guest-name').value;
    const group = document.getElementById('edit-guest-group').value;
    const label = document.getElementById('edit-guest-labels').value;
    const status = document.getElementById('edit-guest-status').value;

    if (!name) return alert('Введите имя');

    if (state.selectedGuest) {
      // Edit
      const guests = state.guests.map(gu => gu.id === state.selectedGuest.id ? { ...gu, name, group, label, status } : gu);
      updateState({ guests });
    } else {
      // Add
      addGuest({ name, group, label, status });
    }
    window.closeModal();
  },

  editGuest(id) {
    this.openGuestModal(id);
  },

  exportToExcel() {
    const data = state.guests.map(g => {
      const table = state.tables.find(t => t.seats.includes(g.id));
      return {
        'Имя': g.name,
        'Группа': g.group,
        'Статус': g.status,
        'Метки': g.label || '',
        'Стол': table ? table.name : 'Не рассажен'
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Guests");
    XLSX.writeFile(wb, "Wedding_Seating.xlsx");
  }
};

app.init();
export default app;
