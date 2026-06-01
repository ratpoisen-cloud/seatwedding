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
    
    // Search
    document.getElementById('guest-search').oninput = (e) => this.renderGuests(e.target.value);

    // Import Excel
    document.getElementById('import-excel-btn').onclick = () => document.getElementById('file-input').click();
    document.getElementById('file-input').onchange = (e) => this.handleImport(e);

    // Close Modals
    window.closeModal = () => {
      document.getElementById('modal-overlay').style.display = 'none';
      document.getElementById('table-modal').style.display = 'none';
      document.getElementById('guest-modal').style.display = 'none';
    };

    document.getElementById('modal-overlay').onclick = (e) => {
      if (e.target === e.currentTarget) window.closeModal();
    };

    // Context Menu persistent bindings
    document.getElementById('ctx-toggle-q').onclick = () => {
      if (!state.selectedSeatGuest) return;
      const guest = state.selectedSeatGuest;
      guest.isQuestion = !guest.isQuestion;
      guest.status = guest.isQuestion ? 'Под вопросом' : 'Приглашение принято';
      updateState({});
      document.getElementById('ctx-menu').style.display = 'none';
    };

    document.getElementById('ctx-unseat').onclick = () => {
      if (!state.selectedSeatData) return;
      const { tableId, idx } = state.selectedSeatData;
      unseatGuest(tableId, idx);
      document.getElementById('ctx-menu').style.display = 'none';
    };

    window.onclick = () => {
      document.getElementById('ctx-menu').style.display = 'none';
    };
  },

  setZoom(val) {
    state.zoom = Math.max(0.5, Math.min(2, val));
    const container = document.querySelector('.canvas-container');
    container.style.transform = `scale(${state.zoom})`;
  },

  render() {
    this.renderGuests(document.getElementById('guest-search').value);
    renderHall();
  },

  renderGuests(search = '') {
    const list = document.getElementById('guests-list');
    list.innerHTML = '';
    // BUG #5: Use fallback for group
    const filtered = state.guests
      .filter(g => 
        (g.name || '').toLowerCase().includes(search.toLowerCase()) || 
        (g.group || '').toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    filtered.forEach(g => {
      const card = document.createElement('div');
      card.className = `guest-card ${g.seated ? 'seated' : ''}`;
      
      const infoDiv = document.createElement('div');
      infoDiv.className = 'guest-info';
      
      const nameH4 = document.createElement('h4');
      // BUG #4: Prevent XSS
      nameH4.textContent = g.name || 'Без имени';
      infoDiv.appendChild(nameH4);
      
      const p = document.createElement('p');
      // BUG #4: Prevent XSS
      p.textContent = `${g.group || 'Без группы'} ${g.label ? ` (${g.label})` : ''}`;
      infoDiv.appendChild(p);
      
      card.appendChild(infoDiv);

      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'guest-actions';
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏️';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        this.editGuest(g.id);
      };
      actionsDiv.appendChild(editBtn);
      card.appendChild(actionsDiv);
      
      const startDrag = (e) => {
        if (g.seated) return;
        state.draggedGuest = g;
        const ghost = document.getElementById('drag-ghost');
        ghost.textContent = g.name;
        ghost.style.display = 'block';
        ghost.style.left = (e.clientX || (e.touches && e.touches[0].clientX)) + 10 + 'px';
        ghost.style.top = (e.clientY || (e.touches && e.touches[0].clientY)) + 10 + 'px';
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
    if (confirm('Удалить стол? Все гости будут убраны с мест.')) {
      deleteTable(state.selectedTable.id);
      window.closeModal();
    }
  },

  openGuestModal(id = null) {
    const isEdit = id !== null;
    const g = isEdit ? state.guests.find(gu => gu.id === id) : { name: '', group: 'Друзья', label: '', status: 'Приглашение принято' };
    if (!g) return;
    state.selectedGuest = isEdit ? g : null;

    document.getElementById('edit-guest-name').value = g.name || '';
    document.getElementById('edit-guest-group').value = g.group || 'Друзья';
    document.getElementById('edit-guest-labels').value = g.label || '';
    document.getElementById('edit-guest-status').value = g.status || 'Приглашение принято';

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
      const guests = state.guests.map(gu => gu.id === state.selectedGuest.id ? { ...gu, name, group, label, status } : gu);
      updateState({ guests });
    } else {
      addGuest({ name, group, label, status });
    }
    window.closeModal();
  },

  editGuest(id) {
    this.openGuestModal(id);
  },

  openSeatMenu(e, tableId, idx, guestId) {
    const menu = document.getElementById('ctx-menu');
    const guest = state.guests.find(g => g.id === guestId);
    if (!guest) return;

    state.selectedSeatGuest = guest;
    state.selectedSeatData = { tableId, idx };

    menu.style.display = 'flex';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';
    e.stopPropagation();
  },

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    // BUG #6: Confirmation before clearing
    if ((state.guests.length > 0 || state.tables.length > 0) && !confirm('Импорт заменит всех текущих гостей и сбросит рассадку. Продолжить?')) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const guests = rows.map((row, i) => ({
          id: String(row.id || 'g' + i + Date.now()),
          name: String(row['Имя'] || row.name || 'Гость ' + (i+1)),
          group: String(row['Группа'] || row.group || 'Друзья'),
          status: String(row['Статус'] || row.status || 'Приглашение принято'),
          label: String(row['Метки'] || row.label || ''),
          seated: false
        }));

        updateState({ guests });
      } catch (err) {
        alert('Ошибка импорта');
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
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
