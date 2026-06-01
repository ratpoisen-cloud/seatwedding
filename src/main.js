import { state, updateState, subscribe, addGuest, deleteGuest, saveGuest, addTable, saveTable, deleteTable, unseatGuest, updateTags } from './state.js';
import { db, syncState } from './firebase.js';
import { initCanvas, renderCanvas } from './canvas.js';

const weddingId = new URLSearchParams(window.location.search).get('id') || 'default-wedding';

const app = {
  init() {
    this.bindEvents();
    initCanvas(this.openTableModal.bind(this), this.onSeatClick.bind(this));
    
    // Make app globally available for canvas.js to call
    window.app = this;

    syncState(weddingId, (data) => {
      if (data) {
        // Merge fetched data, ensuring tags exist
        const mergedData = { ...data };
        if (!mergedData.tags) mergedData.tags = { ...state.tags };
        
        // Map old data format to new if necessary
        mergedData.guests = mergedData.guests.map(g => {
          if (!g.tag && g.label) {
            // Best effort mapping from old labels to tags
            const lbl = g.label.toLowerCase();
            if (lbl.includes('семья') || lbl.includes('родные')) g.tag = 'Семья';
            else if (lbl.includes('друг')) g.tag = 'Друзья';
            else if (lbl.includes('родител')) g.tag = 'Родители';
            else if (lbl.includes('коллег') || lbl.includes('работ')) g.tag = 'Коллеги';
            else if (lbl.includes('vip')) g.tag = 'VIP';
            else g.tag = 'Друзья';
          }
          return g;
        });

        updateState(mergedData, true);
      }
    });

    subscribe(this.render.bind(this));
  },

  bindEvents() {
    // Zoom
    document.getElementById('btn-zoom-in').onclick = () => this.setZoom(state.zoom + 0.1);
    document.getElementById('btn-zoom-out').onclick = () => this.setZoom(state.zoom - 0.1);
    document.getElementById('btn-zoom-reset').onclick = () => this.setZoom(1);

    // Sidebar & Mobile Menu
    document.getElementById('mobile-menu-toggle').onclick = () => {
      document.getElementById('sidebar').classList.toggle('open');
    };

    document.querySelectorAll('.tab').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`tab-${btn.dataset.target}`).classList.add('active');
      };
    });

    // Top Bar Actions
    document.getElementById('btn-settings').onclick = () => this.openTagsModal();
    document.getElementById('btn-export').onclick = () => this.exportExcel();
    document.getElementById('btn-share').onclick = () => this.takeScreenshot();

    // Guest Actions
    document.getElementById('search-guests').oninput = () => this.renderGuests();
    document.getElementById('btn-add-guest').onclick = () => this.openGuestModal();

    // Table Actions
    document.getElementById('btn-add-round-table').onclick = () => addTable('round');
    document.getElementById('btn-add-rect-table').onclick = () => addTable('rect');

    // Modals generic logic
    document.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.onclick = () => this.closeAllModals();
    });
    document.getElementById('modal-overlay').onpointerdown = (e) => {
      if (e.target.id === 'modal-overlay') this.closeAllModals();
    };

    // Guest Modal Saving
    document.getElementById('btn-guest-save').onclick = () => {
      const name = document.getElementById('inp-guest-name').value.trim();
      if (!name) return alert('Введите имя');
      const guestData = {
        name,
        tag: document.getElementById('inp-guest-tag').value,
        status: document.getElementById('inp-guest-status').value
      };
      if (state.selectedGuestId) guestData.id = state.selectedGuestId;
      saveGuest(guestData);
      this.closeAllModals();
    };
    document.getElementById('btn-guest-delete').onclick = () => {
      if (confirm('Удалить гостя?')) {
        deleteGuest(state.selectedGuestId);
        this.closeAllModals();
      }
    };

    // Table Modal Saving
    document.getElementById('btn-table-save').onclick = () => {
      const name = document.getElementById('inp-table-name').value.trim();
      const seats = parseInt(document.getElementById('inp-table-seats').value);
      const rotation = parseInt(document.getElementById('inp-table-rotation').value) || 0;
      if (!name || isNaN(seats) || seats < 1) return;
      saveTable(state.selectedTableId, name, seats, rotation);
      this.closeAllModals();
    };
    document.getElementById('btn-table-delete').onclick = () => {
      if (confirm('Удалить стол и освободить всех гостей?')) {
        deleteTable(state.selectedTableId);
        this.closeAllModals();
      }
    };

    // Tags Modal
    document.getElementById('btn-add-tag').onclick = () => {
      const tagName = prompt('Название новой группы (например, Родственники жениха):');
      if (tagName && !state.tags[tagName]) {
        updateTags({ ...state.tags, [tagName]: '#94a3b8' });
        this.renderTagsEditor(); // re-render list
      }
    };

    // Seat Action Modal (Swap, Question, Unseat)
    document.getElementById('btn-seat-question').onclick = () => {
      if (!state.selectedSeatData || !state.selectedSeatData.guestId) return;
      const guest = state.guests.find(g => g.id === state.selectedSeatData.guestId);
      if (guest) {
        saveGuest({ id: guest.id, isQuestion: !guest.isQuestion });
      }
      this.closeAllModals();
    };
    document.getElementById('btn-seat-unseat').onclick = () => {
      if (!state.selectedSeatData) return;
      unseatGuest(state.selectedSeatData.tableId, state.selectedSeatData.seatIdx);
      this.closeAllModals();
    };
    document.getElementById('btn-seat-swap').onclick = () => {
      if (!state.selectedSeatData || !state.selectedSeatData.guestId) return;
      this.closeAllModals();
      this.openGuestModal(state.selectedSeatData.guestId); // Shortcut to edit the guest
    };
  },

  setZoom(val) {
    state.zoom = Math.max(0.5, Math.min(2.5, val));
    const container = document.getElementById('canvas-container');
    container.style.transform = `scale(${state.zoom})`;
  },

  render() {
    this.renderGuests();
    this.renderTablesList();
    renderCanvas();
  },

  renderGuests() {
    const list = document.getElementById('guest-list');
    const search = (document.getElementById('search-guests').value || '').toLowerCase();
    
    list.innerHTML = '';
    const filtered = state.guests
      .filter(g => (g.name || '').toLowerCase().includes(search) || (g.tag || '').toLowerCase().includes(search))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    filtered.forEach(g => {
      const card = document.createElement('div');
      card.className = `guest-card ${g.seated ? 'seated' : ''}`;
      
      const info = document.createElement('div');
      info.className = 'guest-info';
      
      const h4 = document.createElement('h4');
      h4.textContent = g.name || 'Без имени';
      
      if (g.tag) {
        const badge = document.createElement('span');
        badge.className = 'tag-badge';
        badge.style.backgroundColor = state.tags[g.tag] ? state.tags[g.tag] + '40' : '#e2e8f0'; // 40 is 25% opacity hex
        badge.style.color = state.tags[g.tag] || '#475569';
        badge.textContent = g.tag;
        h4.appendChild(badge);
      }
      info.appendChild(h4);

      const p = document.createElement('p');
      p.textContent = g.status + (g.isQuestion ? ' (Под вопросом)' : '');
      info.appendChild(p);

      card.appendChild(info);

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.textContent = '✏️';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        this.openGuestModal(g.id);
      };
      card.appendChild(editBtn);

      // Drag logic
      const startDrag = (e) => {
        if (g.seated) return;
        state.draggedGuest = g;
        state.dragSourceSeat = null; // Came from sidebar
        const ghost = document.getElementById('drag-ghost');
        ghost.textContent = g.name;
        ghost.style.display = 'block';
        ghost.style.left = (e.clientX || (e.touches && e.touches[0].clientX)) + 'px';
        ghost.style.top = (e.clientY || (e.touches && e.touches[0].clientY)) + 'px';
        
        // Close sidebar on mobile when dragging starts
        if (window.innerWidth <= 1024) {
          document.getElementById('sidebar').classList.remove('open');
        }
      };

      card.onpointerdown = startDrag;
      list.appendChild(card);
    });
  },

  renderTablesList() {
    const list = document.getElementById('table-list');
    list.innerHTML = '';
    state.tables.forEach(table => {
      const card = document.createElement('div');
      card.className = 'guest-card';
      const seatedCount = table.seats.filter(s => s).length;
      
      card.innerHTML = `
        <div class="guest-info">
          <h4>${table.name}</h4>
          <p>${table.type === 'round' ? 'Круглый' : 'Прямоуг.'} • ${seatedCount}/${table.seats.length} занято</p>
        </div>
      `;
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.textContent = '✏️';
      editBtn.onclick = () => this.openTableModal(table.id);
      card.appendChild(editBtn);
      
      list.appendChild(card);
    });
  },

  // --- Modal Management ---

  closeAllModals() {
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('visible'));
    document.getElementById('modal-overlay').classList.remove('visible');
    setTimeout(() => {
      document.getElementById('modal-overlay').style.display = 'none';
    }, 200);
    state.selectedGuestId = null;
    state.selectedTableId = null;
    state.selectedSeatData = null;
  },

  openModal(modalId) {
    const overlay = document.getElementById('modal-overlay');
    overlay.style.display = 'flex';
    // Trigger reflow
    void overlay.offsetWidth;
    overlay.classList.add('visible');
    
    document.querySelectorAll('.modal').forEach(m => m.classList.remove('visible'));
    document.getElementById(modalId).classList.add('visible');
  },

  populateTagSelect(selectId, selectedTag) {
    const select = document.getElementById(selectId);
    select.innerHTML = '<option value="">Нет группы</option>';
    Object.keys(state.tags).forEach(tag => {
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag;
      if (tag === selectedTag) opt.selected = true;
      select.appendChild(opt);
    });
  },

  openGuestModal(id = null) {
    const isEdit = id !== null;
    const g = isEdit ? state.guests.find(gu => gu.id === id) : { name: '', tag: '', status: 'Принято' };
    if (!g) return;
    state.selectedGuestId = isEdit ? id : null;

    document.getElementById('guest-modal-title').textContent = isEdit ? 'Редактировать гостя' : 'Новый гость';
    document.getElementById('inp-guest-name').value = g.name || '';
    
    this.populateTagSelect('inp-guest-tag', g.tag);
    document.getElementById('inp-guest-status').value = g.status || 'Принято';

    document.getElementById('btn-guest-delete').style.display = isEdit ? 'block' : 'none';
    this.openModal('modal-guest');
  },

  openTableModal(id) {
    const table = state.tables.find(t => t.id === id);
    if (!table) return;
    state.selectedTableId = id;
    document.getElementById('inp-table-name').value = table.name;
    document.getElementById('inp-table-seats').value = table.seats.length;
    document.getElementById('inp-table-rotation').value = table.rotation || 0;
    this.openModal('modal-table');
  },

  openTagsModal() {
    this.renderTagsEditor();
    this.openModal('modal-tags');
  },

  renderTagsEditor() {
    const list = document.getElementById('tags-list');
    list.innerHTML = '';
    Object.entries(state.tags).forEach(([tagName, color]) => {
      const row = document.createElement('div');
      row.className = 'tag-edit-row';
      
      const colorInp = document.createElement('input');
      colorInp.type = 'color';
      colorInp.value = color;
      colorInp.onchange = (e) => {
        const newTags = { ...state.tags, [tagName]: e.target.value };
        updateTags(newTags);
      };

      const nameInp = document.createElement('input');
      nameInp.type = 'text';
      nameInp.value = tagName;
      nameInp.readOnly = true; // Renaming tags is complex because it's tied to guests, keeping simple for now.

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon';
      delBtn.textContent = '🗑️';
      delBtn.style.color = 'var(--danger)';
      delBtn.onclick = () => {
        if (confirm(`Удалить группу "${tagName}"?`)) {
          const newTags = { ...state.tags };
          delete newTags[tagName];
          
          // Clear tag from guests
          const newGuests = state.guests.map(g => g.tag === tagName ? { ...g, tag: '' } : g);
          updateState({ tags: newTags, guests: newGuests });
          this.renderTagsEditor();
        }
      };

      row.appendChild(colorInp);
      row.appendChild(nameInp);
      row.appendChild(delBtn);
      list.appendChild(row);
    });
  },

  onSeatClick(tableId, seatIdx, guestId) {
    if (!guestId) {
      // Empty seat clicked. Could open add guest modal here if desired.
      // E.g., openGuestModal and automatically assign? Complex UX.
      // Just notify user.
      alert('Перетащите сюда гостя из списка, чтобы посадить его за стол.');
      return;
    }
    
    state.selectedSeatData = { tableId, seatIdx, guestId };
    const guest = state.guests.find(g => g.id === guestId);
    document.getElementById('seat-action-title').textContent = guest ? guest.name : 'Действие';
    
    const qBtn = document.getElementById('btn-seat-question');
    if (guest && guest.isQuestion) {
      qBtn.textContent = '✅ Снять вопрос';
    } else {
      qBtn.textContent = '❓ Под вопросом';
    }
    
    this.openModal('modal-seat-action');
  },

  // --- Exports ---

  exportExcel() {
    const data = state.guests.map(g => {
      const table = state.tables.find(t => t.seats.includes(g.id));
      let seatNum = table ? table.seats.indexOf(g.id) + 1 : '';
      return {
        'Имя': g.name,
        'Группа/Тег': g.tag || '',
        'Статус': g.status + (g.isQuestion ? ' (Под вопросом)' : ''),
        'Стол': table ? table.name : 'Не рассажен',
        'Место': seatNum
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Рассадка");
    XLSX.writeFile(wb, "Wedding_Seating_Plan.xlsx");
  },

  async takeScreenshot() {
    // Hide UI elements to take clean screenshot
    document.body.classList.add('print-mode');
    
    // Reset zoom for screenshot
    const oldZoom = state.zoom;
    this.setZoom(1);

    const canvasArea = document.getElementById('canvas-wrapper');
    
    try {
      const canvas = await html2canvas(canvasArea, {
        backgroundColor: '#ffffff',
        scale: 2 // High resolution
      });
      
      const link = document.createElement('a');
      link.download = 'wedding-seating-plan.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Screenshot failed', e);
      alert('Не удалось создать скриншот.');
    } finally {
      // Restore UI
      this.setZoom(oldZoom);
      document.body.classList.remove('print-mode');
    }
  }
};

// Start
app.init();
