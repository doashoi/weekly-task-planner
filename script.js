document.addEventListener('DOMContentLoaded', () => {
    const STORAGE_KEY = 'taskPlanData';
    const DEFAULT_PERSONNEL = ['畅为', '尚哥', '白云', '喆杰', '可欣', '嘉豪', '孜尊', '晟杰', '星宇', '俊鹏', '英祺', '璐燚', '俊杰', '依婷'];

    let socket;
    let isConnected = false;
    let isLocalChange = false;

    const listContainer = document.querySelector('.personnel-list');
    const assignedAreas = document.querySelectorAll('.assigned-area');
    const leftDatePlaceholders = document.querySelectorAll('.date-placeholder-left');
    const rightDatePlaceholders = document.querySelectorAll('.date-placeholder');

    const PERSONNEL_COLORS = [
        '#E0E7FF', '#DBEAFE', '#FCE7F3', '#D1FAE5', '#EDE9FE',
        '#FEF3C7', '#CFFAFE', '#ECFCCB', '#FCE7F3', '#E0F2FE',
        '#F1F5F9', '#FFEDD5', '#FAE8FF', '#CCFBF1', '#FEE2E2',
        '#E0E7FF', '#DCFCE7', '#DBEAFE', '#FEF9C3', '#FFE4E6'
    ];

    let taskData = {
        leftPersonList: [],
        rightPersonMap: {},
        taskSections: {},
        taskPresets: ['早班巡检', '午间清理', '晚班移交', '周报整理'],
        todoPresets: ['日常巡检', '环境清洁', '设备维护', '文档整理', '客户接待'],
        sectionPresets: ['日常任务', '专项任务', '临时增援', '值班工作'],
        dayStates: {}
    };

    let todayIndex = -1;
    let sidebarCurrentDateIndex = 0;
    let currentViewMonday = null;

    const sidebar = document.getElementById('sidebar');
    const sidebarDateVal = document.querySelector('.sidebar-date-val');
    const sidebarWeekdayVal = document.querySelector('.sidebar-weekday-val');
    const sidebarDayCols = document.querySelectorAll('.sidebar-day-col');

    function init() {
        const today = new Date();
        const currentDay = today.getDay();
        const distanceToMonday = (currentDay === 0 ? 7 : currentDay) - 1;
        currentViewMonday = new Date(today);
        currentViewMonday.setHours(0, 0, 0, 0);
        currentViewMonday.setDate(today.getDate() - distanceToMonday);

        initSocket();
        initEventListeners();
    }

    function initSocket() {
        const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
        const host = window.location.host || 'localhost:3001';
        const socketUrl = `${protocol}//${host}`;

        socket = io(socketUrl);

        socket.on('connect', () => {
            console.log('已连接到服务器');
            isConnected = true;
            updateConnectionStatus(true);
        });

        socket.on('disconnect', () => {
            console.log('与服务器断开连接');
            isConnected = false;
            updateConnectionStatus(false);
        });

        socket.on('init', (data) => {
            console.log('收到初始数据');
            taskData = data;
            initDefaultData();
            updateDates();
            sidebarCurrentDateIndex = todayIndex !== -1 ? todayIndex : 0;
            updateSidebarDateDisplay();
            renderLeft();
            renderRight();
            initDragDrop();
        });

        socket.on('sync', (data) => {
            console.log('收到同步数据');
            isLocalChange = true;
            taskData = data;
            updateDates();
            updateSidebarDateDisplay();
            renderLeft();
            renderRight();
            isLocalChange = false;
        });
    }

    function updateConnectionStatus(connected) {
        let statusEl = document.getElementById('connection-status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'connection-status';
            statusEl.style.cssText = 'position:fixed;top:10px;right:10px;padding:8px 16px;border-radius:20px;font-size:12px;font-weight:600;z-index:9999;transition:all 0.3s;';
            document.body.appendChild(statusEl);
        }
        if (connected) {
            statusEl.textContent = '🟢 已连接';
            statusEl.style.background = 'rgba(34, 197, 94, 0.9)';
            statusEl.style.color = 'white';
        } else {
            statusEl.textContent = '🔴 未连接';
            statusEl.style.background = 'rgba(239, 68, 68, 0.9)';
            statusEl.style.color = 'white';
        }
    }

    function initEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const todoModal = document.getElementById('todo-modal');
                const sectionModal = document.getElementById('section-modal');
                const presetModal = document.getElementById('preset-modal');

                if (todoModal.style.display === 'block') {
                    confirmManualTodo();
                } else if (sectionModal.style.display === 'block') {
                    confirmManualSection();
                } else if (presetModal.style.display === 'block') {
                    addPreset();
                }
            }
        });
    }

    function initDefaultData() {
        for (let i = 0; i < 5; i++) {
            const dateKey = getDateKey(i);
            if (!taskData.dayStates[dateKey]) {
                taskData.dayStates[dateKey] = { isTodoExpanded: false, isTaskExpanded: false };
            }
            if (!taskData.taskSections[dateKey]) {
                const defaultSectionId = 'default-' + dateKey;
                taskData.taskSections[dateKey] = [{ id: defaultSectionId, title: '默认任务', todos: [], isExpanded: false }];
            }
            if (!taskData.rightPersonMap[dateKey]) {
                taskData.rightPersonMap[dateKey] = {};
            }
        }

        if (!taskData.leftPersonList || taskData.leftPersonList.length === 0) {
            resetData();
        }
    }

    function resetData() {
        taskData = {
            leftPersonList: [...DEFAULT_PERSONNEL],
            rightPersonMap: {},
            taskSections: {},
            taskPresets: ['早班巡检', '午间清理', '晚班移交', '周报整理'],
            todoPresets: ['日常巡检', '环境清洁', '设备维护', '文档整理', '客户接待'],
            sectionPresets: ['日常任务', '专项任务', '临时增援', '值班工作'],
            dayStates: {}
        };

        for (let i = 0; i < 5; i++) {
            const dateKey = getDateKey(i);
            const defaultSectionId = 'default-' + dateKey;
            taskData.taskSections[dateKey] = [{ id: defaultSectionId, title: '默认任务', todos: [], isExpanded: false }];
            taskData.rightPersonMap[dateKey] = { [defaultSectionId]: [] };
            taskData.dayStates[dateKey] = { isTodoExpanded: false, isTaskExpanded: false };
        }
        saveToStorage();
    }

    function updateDates() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        todayIndex = -1;

        for (let i = 0; i < 5; i++) {
            const date = new Date(currentViewMonday);
            date.setDate(currentViewMonday.getDate() + i);
            const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;

            if (date.getTime() === today.getTime()) {
                todayIndex = i;
            }

            if (leftDatePlaceholders[i]) leftDatePlaceholders[i].textContent = dateStr;
            if (rightDatePlaceholders[i]) rightDatePlaceholders[i].textContent = dateStr;
        }
    }

    window.changeWeek = function(offset) {
        currentViewMonday.setDate(currentViewMonday.getDate() + (offset * 7));

        for (let i = 0; i < 5; i++) {
            const dateKey = getDateKey(i);
            if (!taskData.taskSections[dateKey]) {
                const defaultSectionId = 'default-' + dateKey;
                taskData.taskSections[dateKey] = [{ id: defaultSectionId, title: '默认任务', todos: [], isExpanded: false }];
            }
            if (!taskData.rightPersonMap[dateKey]) {
                taskData.rightPersonMap[dateKey] = {};
            }
            if (!taskData.dayStates[dateKey]) {
                taskData.dayStates[dateKey] = { isTodoExpanded: false, isTaskExpanded: false };
            }
        }

        updateDates();
        updateSidebarDateDisplay();
        renderLeft();
        renderRight();
        saveToStorage();
    };

    function updateSidebarDateDisplay() {
        const weekdays = ['周一', '周二', '周三', '周四', '周五'];
        let dateStr = leftDatePlaceholders[sidebarCurrentDateIndex] ? leftDatePlaceholders[sidebarCurrentDateIndex].textContent : '--月--日';

        const isCollapsed = sidebar.classList.contains('collapsed');
        if (isCollapsed && dateStr.includes('月')) {
            dateStr = dateStr.replace('月', '月\n');
        }

        if (sidebarDateVal) sidebarDateVal.textContent = dateStr;
        if (sidebarWeekdayVal) sidebarWeekdayVal.textContent = weekdays[sidebarCurrentDateIndex];

        const dateDisplayBox = document.querySelector('.date-display-box');
        if (dateDisplayBox) {
            if (sidebarCurrentDateIndex === todayIndex) {
                dateDisplayBox.classList.add('is-today');
            } else {
                dateDisplayBox.classList.remove('is-today');
            }
        }

        sidebarDayCols.forEach((col, idx) => {
            col.classList.remove('active', 'current-day');
            if (idx === todayIndex) col.classList.add('current-day');
        });
    }

    function saveToStorage() {
        if (isLocalChange) return;

        if (socket && isConnected) {
            socket.emit('update', taskData);
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(taskData));
        }
    }

    function getDateKey(index, baseMonday = currentViewMonday) {
        const date = new Date(baseMonday);
        date.setDate(baseMonday.getDate() + index);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function getColorForName(name) {
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return PERSONNEL_COLORS[Math.abs(hash) % PERSONNEL_COLORS.length];
    }

    function renderLeft() {
        if (!listContainer) return;
        listContainer.innerHTML = '';
        const isCollapsed = sidebar.classList.contains('collapsed');

        taskData.leftPersonList.forEach((name, index) => {
            const row = document.createElement('div');
            row.className = 'personnel-row';
            const blocksContainer = document.createElement('div');
            blocksContainer.className = 'name-blocks-container';

            if (isCollapsed) {
                blocksContainer.appendChild(createNameBlock(name, sidebarCurrentDateIndex));
            } else {
                for (let i = 0; i < 5; i++) blocksContainer.appendChild(createNameBlock(name, i));
            }
            row.appendChild(blocksContainer);
            listContainer.appendChild(row);
        });
        updateSidebarDateDisplay();
    }

    function createNameBlock(name, dateIndex) {
        const block = document.createElement('div');
        block.className = 'name-block';
        block.textContent = name;
        block.dataset.name = name;
        block.dataset.dateIndex = dateIndex;
        block.dataset.source = 'left';
        block.style.background = getColorForName(name);

        if (isDisabled(name, dateIndex)) {
            block.classList.add('disabled');
            block.draggable = false;
        } else {
            block.draggable = true;
            block.addEventListener('dragstart', handleDragStart);
            block.addEventListener('dragend', handleDragEnd);
        }
        return block;
    }

    function renderRight() {
        const dayHeaders = document.querySelectorAll('.day-header');

        assignedAreas.forEach((area, index) => {
            area.innerHTML = '';
            area.dataset.dateIndex = index;
            const dateKey = getDateKey(index);

            if (dayHeaders[index]) {
                if (index === todayIndex) {
                    dayHeaders[index].classList.add('current-day');
                } else {
                    dayHeaders[index].classList.remove('current-day');
                }
            }

            const sections = taskData.taskSections[dateKey] || [];
            sections.forEach((section, sectionIdx) => {
                const sectionEl = document.createElement('div');
                const isExpanded = section.isExpanded || false;
                sectionEl.className = `task-section ${isExpanded ? 'expanded' : ''}`;
                sectionEl.dataset.sectionId = section.id;
                sectionEl.dataset.colorIndex = sectionIdx % 6;

                const header = document.createElement('div');
                header.className = 'task-section-header';

                const headerLeft = document.createElement('div');
                headerLeft.className = 'task-section-header-left';

                const title = document.createElement('div');
                title.className = 'task-section-title';
                title.textContent = section.title;
                title.title = '点击修改名称';
                title.onclick = (e) => {
                    e.stopPropagation();
                    const newTitle = prompt('请输入新的任务板块名称:', section.title);
                    if (newTitle && newTitle.trim() !== '') {
                        section.title = newTitle.trim();
                        saveToStorage();
                        renderRight();
                    }
                };

                const expandBtn = document.createElement('button');
                expandBtn.className = 'btn-toggle-section';
                expandBtn.innerHTML = isExpanded ? '收起' : '展开';
                expandBtn.title = isExpanded ? '收起详细信息' : '展开详细信息';
                expandBtn.onclick = (e) => {
                    e.stopPropagation();
                    section.isExpanded = !isExpanded;
                    saveToStorage();
                    renderRight();
                };

                headerLeft.appendChild(title);
                headerLeft.appendChild(expandBtn);
                header.appendChild(headerLeft);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn-remove-card';
                deleteBtn.innerHTML = '×';
                deleteBtn.title = '删除任务板块';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteSection(index, section.id);
                };
                header.appendChild(deleteBtn);

                sectionEl.appendChild(header);

                const content = document.createElement('div');
                content.className = 'task-section-content';

                section.todos.forEach((todo, todoIdx) => {
                    const item = document.createElement('div');
                    item.className = 'todo-item global-todo-item';

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = todo.done;
                    checkbox.onchange = () => {
                        todo.done = checkbox.checked;
                        saveToStorage();
                        renderRight();
                    };

                    const text = document.createElement('span');
                    text.className = `todo-text ${todo.done ? 'done' : ''}`;
                    text.textContent = todo.text;

                    const delBtn = document.createElement('button');
                    delBtn.className = 'btn-remove-todo';
                    delBtn.textContent = '×';
                    delBtn.onclick = () => {
                        section.todos.splice(todoIdx, 1);
                        saveToStorage();
                        renderRight();
                    };

                    item.appendChild(checkbox);
                    item.appendChild(text);
                    item.appendChild(delBtn);
                    content.appendChild(item);
                });

                const addBtn = document.createElement('button');
                addBtn.className = 'btn-add-global-todo';
                addBtn.textContent = '+ 任务说明';
                addBtn.onclick = () => addGlobalTodo(index, section.id);
                content.appendChild(addBtn);

                const assignedContainer = document.createElement('div');
                assignedContainer.className = 'task-section-assigned';
                assignedContainer.dataset.sectionId = section.id;

                const persons = (taskData.rightPersonMap[dateKey] && taskData.rightPersonMap[dateKey][section.id]) || [];
                persons.forEach((personObj, personIndex) => {
                    const card = createPersonCard(personObj, index, section.id, personIndex);
                    assignedContainer.appendChild(card);
                });

                content.appendChild(assignedContainer);
                sectionEl.appendChild(content);
                area.appendChild(sectionEl);
            });

            const addSectionBtn = document.createElement('button');
            addSectionBtn.className = 'btn-add-section';
            addSectionBtn.textContent = '+ 添加任务板块';
            addSectionBtn.onclick = () => addSection(index);

            addSectionBtn.addEventListener('dragover', (e) => {
                e.preventDefault();
                addSectionBtn.classList.add('drag-over');
            });
            addSectionBtn.addEventListener('dragleave', () => {
                addSectionBtn.classList.remove('drag-over');
            });
            addSectionBtn.addEventListener('drop', (e) => {
                e.preventDefault();
                addSectionBtn.classList.remove('drag-over');
                const rawData = e.dataTransfer.getData('text/plain');
                if (!rawData) return;

                const dragData = JSON.parse(rawData);
                if (dragData.name) {
                    if (dragData.source === 'right') {
                        const fromDateKey = getDateKey(dragData.fromIndex);
                        const list = taskData.rightPersonMap[fromDateKey][dragData.sectionId];
                        const idx = list.findIndex(p => (typeof p === 'string' ? p : p.name) === dragData.name);
                        if (idx !== -1) {
                            list.splice(idx, 1);
                        }
                    }
                    addSection(index, dragData.name);
                }
            });

            area.appendChild(addSectionBtn);
        });
        initDragDrop();
    }

    function createPersonCard(personObj, dateIndex, sectionId, personIndex) {
        const name = typeof personObj === 'string' ? personObj : personObj.name;
        const todos = personObj.todos || [];
        const isExpanded = personObj.isExpanded || false;

        const card = document.createElement('div');
        card.className = `person-card ${isExpanded ? 'expanded' : ''}`;
        card.draggable = true;
        card.dataset.name = name;
        card.dataset.sourceDateIndex = dateIndex;
        card.dataset.sectionId = sectionId;
        card.dataset.source = 'right';
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);

        const header = document.createElement('div');
        header.className = 'person-card-header';
        header.style.background = getColorForName(name);

        const title = document.createElement('div');
        title.className = 'person-card-title';
        title.textContent = name;

        const doneCount = todos.filter(t => t.done).length;
        const counter = document.createElement('span');
        counter.className = 'todo-counter';
        counter.textContent = `${doneCount}/${todos.length}`;

        header.appendChild(title);
        header.appendChild(counter);
        card.appendChild(header);

        const content = document.createElement('div');
        content.className = 'person-card-content';

        todos.forEach((todo, todoIndex) => {
            const item = document.createElement('div');
            item.className = 'todo-item';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'todo-checkbox';
            checkbox.checked = todo.done;
            checkbox.onchange = () => {
                todo.done = checkbox.checked;
                saveToStorage();
                renderRight();
            };
            const text = document.createElement('span');
            text.className = `todo-text ${todo.done ? 'done' : ''}`;
            text.textContent = todo.text;
            const delTodoBtn = document.createElement('button');
            delTodoBtn.className = 'btn-remove-todo';
            delTodoBtn.textContent = '×';
            delTodoBtn.onclick = () => {
                todos.splice(todoIndex, 1);
                saveToStorage();
                renderRight();
            };
            item.appendChild(checkbox);
            item.appendChild(text);
            item.appendChild(delTodoBtn);
            content.appendChild(item);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'btn-add-todo';
        addBtn.textContent = '+ 添加待办';
        addBtn.onclick = () => addTodo(dateIndex, sectionId, personIndex);
        content.appendChild(addBtn);

        card.appendChild(content);
        return card;
    }

    let currentTodoTarget = { type: '', dateIndex: -1, sectionId: '', personIndex: -1 };
    let currentSectionTarget = { dateIndex: -1, initialPersonName: null };

    function addGlobalTodo(dateIndex, sectionId) {
        currentTodoTarget = { type: 'global', dateIndex, sectionId };
        showTodoModal('添加任务说明');
    }

    function addTodo(dateIndex, sectionId, personIndex) {
        currentTodoTarget = { type: 'person', dateIndex, sectionId, personIndex };
        showTodoModal('添加待办事项');
    }

    function showTodoModal(title) {
        const modal = document.getElementById('todo-modal');
        const input = document.getElementById('todo-manual-input');
        const tagsContainer = document.getElementById('todo-preset-tags');
        document.getElementById('todo-modal-title').textContent = title;
        input.value = '';
        modal.style.display = 'block';
        tagsContainer.innerHTML = '';
        const presets = currentTodoTarget.type === 'global' ? taskData.taskPresets : taskData.todoPresets;
        presets.forEach(text => {
            const tag = document.createElement('div');
            tag.className = 'preset-tag';
            tag.textContent = text;
            tag.onclick = () => { saveTodo(text); closeTodoModal(); };
            tagsContainer.appendChild(tag);
        });
        input.focus();
    }

    function closeTodoModal() { document.getElementById('todo-modal').style.display = 'none'; }
    function confirmManualTodo() {
        const text = document.getElementById('todo-manual-input').value.trim();
        if (text) { saveTodo(text); closeTodoModal(); }
    }

    function saveTodo(text) {
        const { type, dateIndex, sectionId, personIndex } = currentTodoTarget;
        const dateKey = getDateKey(dateIndex);
        if (type === 'global') {
            const section = taskData.taskSections[dateKey].find(s => s.id === sectionId);
            section.todos.push({ text, done: false });
        } else {
            const person = taskData.rightPersonMap[dateKey][sectionId][personIndex];
            person.todos.push({ text, done: false });
        }
        saveToStorage();
        renderRight();
    }

    function addSection(dateIndex, initialPersonName = null) {
        currentSectionTarget = { dateIndex, initialPersonName };
        const modal = document.getElementById('section-modal');
        const input = document.getElementById('section-manual-input');
        const tagsContainer = document.getElementById('section-preset-tags');

        input.value = '';
        modal.style.display = 'block';
        tagsContainer.innerHTML = '';

        taskData.sectionPresets.forEach(text => {
            const tag = document.createElement('div');
            tag.className = 'preset-tag';
            tag.textContent = text;
            tag.onclick = () => { saveSection(text); closeSectionModal(); };
            tagsContainer.appendChild(tag);
        });
        input.focus();
    }

    function closeSectionModal() { document.getElementById('section-modal').style.display = 'none'; }
    function confirmManualSection() {
        const text = document.getElementById('section-manual-input').value.trim();
        if (text) { saveSection(text); closeSectionModal(); }
    }

    function saveSection(title) {
        const { dateIndex, initialPersonName } = currentSectionTarget;
        const sectionId = 'section-' + Date.now();
        const dateKey = getDateKey(dateIndex);

        if (!taskData.taskSections[dateKey]) taskData.taskSections[dateKey] = [];
        taskData.taskSections[dateKey].push({
            id: sectionId,
            title: title,
            todos: [],
            isExpanded: true
        });

        if (!taskData.rightPersonMap[dateKey]) {
            taskData.rightPersonMap[dateKey] = {};
        }
        taskData.rightPersonMap[dateKey][sectionId] = [];

        if (initialPersonName) {
            if (!isDisabled(initialPersonName, dateIndex)) {
                taskData.rightPersonMap[dateKey][sectionId].push({
                    name: initialPersonName,
                    todos: [],
                    isExpanded: true
                });
            }
        }

        saveToStorage();
        renderRight();
        renderLeft();
    }

    function deleteSection(dateIndex, sectionId) {
        if (confirm('确定要删除这个任务板块吗？该板块下的所有人员安排也将被移除。')) {
            const dateKey = getDateKey(dateIndex);
            const sections = taskData.taskSections[dateKey];
            const idx = sections.findIndex(s => s.id === sectionId);
            if (idx !== -1) {
                sections.splice(idx, 1);
                if (taskData.rightPersonMap[dateKey]) {
                    delete taskData.rightPersonMap[dateKey][sectionId];
                }
                saveToStorage();
                renderRight();
                renderLeft();
            }
        }
    }

    function isDisabled(name, dateIndex) {
        const dateKey = getDateKey(dateIndex);
        const sectionsMap = taskData.rightPersonMap[dateKey] || {};
        return Object.values(sectionsMap).some(list => list.some(p => (typeof p === 'string' ? p : p.name) === name));
    }

    function handleDragStart(e) {
        const target = e.target.closest('.name-block, .person-card');
        if (!target) return;

        target.classList.add('dragging');
        const dragData = {
            name: target.dataset.name,
            source: target.dataset.source,
            fromIndex: parseInt(target.dataset.dateIndex || target.dataset.sourceDateIndex),
            sectionId: target.dataset.sectionId || '',
            sourceIndex: target.dataset.sourceIndex || ''
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));

        if (dragData.source === 'right') {
            const removeArea = document.getElementById('drop-remove-area');
            if (removeArea) removeArea.classList.add('active');
        }
    }

    function handleDragEnd(e) {
        e.target.classList.remove('dragging');
        document.querySelectorAll('.task-section-assigned').forEach(el => el.classList.remove('drag-over'));

        const removeArea = document.getElementById('drop-remove-area');
        if (removeArea) {
            removeArea.classList.remove('active', 'drag-over');
        }
    }

    function initDragDrop() {
        const removeArea = document.getElementById('drop-remove-area');
        if (removeArea) {
            removeArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                removeArea.classList.add('drag-over');
            });
            removeArea.addEventListener('dragleave', () => removeArea.classList.remove('drag-over'));
            removeArea.addEventListener('drop', (e) => {
                e.preventDefault();
                removeArea.classList.remove('drag-over', 'active');
                const rawData = e.dataTransfer.getData('text/plain');
                if (!rawData) return;
                const { name, source, fromIndex, sectionId } = JSON.parse(rawData);

                if (source === 'right') {
                    const fromDateKey = getDateKey(fromIndex);
                    const list = taskData.rightPersonMap[fromDateKey][sectionId];
                    const idx = list.findIndex(p => (typeof p === 'string' ? p : p.name) === name);
                    if (idx !== -1) {
                        list.splice(idx, 1);
                        saveToStorage();
                        renderRight();
                        renderLeft();
                    }
                }
            });
        }

        document.querySelectorAll('.task-section-assigned').forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();

                const rawData = e.dataTransfer.getData('text/plain');
                if (rawData) {
                    try {
                        const { name, fromIndex, source } = JSON.parse(rawData);
                        const targetDateIndex = parseInt(container.closest('.assigned-area').dataset.dateIndex);

                        if (source === 'left' || fromIndex !== targetDateIndex) {
                            if (isDisabled(name, targetDateIndex)) {
                                e.dataTransfer.dropEffect = 'none';
                                return;
                            }
                        }
                    } catch(err) {}
                }

                container.classList.add('drag-over');
            });
            container.addEventListener('dragleave', () => container.classList.remove('drag-over'));
            container.addEventListener('drop', (e) => {
                e.preventDefault();
                container.classList.remove('drag-over');
                const rawData = e.dataTransfer.getData('text/plain');
                if (!rawData) return;
                const { name, source, fromIndex, sectionId: oldSectionId, sourceIndex } = JSON.parse(rawData);
                const targetDateIndex = parseInt(container.closest('.assigned-area').dataset.dateIndex);
                const targetSectionId = container.dataset.sectionId;

                const isSameDayMove = (source === 'right' && fromIndex === targetDateIndex);

                if (!isSameDayMove && isDisabled(name, targetDateIndex)) {
                    const dayColumn = document.querySelectorAll('.day-column')[targetDateIndex];
                    const existingCards = dayColumn.querySelectorAll(`.person-card[data-name="${name}"]`);
                    existingCards.forEach(card => {
                        card.classList.remove('flash-warning');
                        void card.offsetWidth;
                        card.classList.add('flash-warning');
                        setTimeout(() => card.classList.remove('flash-warning'), 1500);
                    });
                    return;
                }

                if (source === 'right') {
                    const fromDateKey = getDateKey(fromIndex);
                    const oldList = taskData.rightPersonMap[fromDateKey][oldSectionId];
                    const idx = oldList.findIndex(p => (typeof p === 'string' ? p : p.name) === name);
                    if (idx !== -1) oldList.splice(idx, 1);
                }

                const targetDateKey = getDateKey(targetDateIndex);
                if (!taskData.rightPersonMap[targetDateKey]) taskData.rightPersonMap[targetDateKey] = {};
                if (!taskData.rightPersonMap[targetDateKey][targetSectionId]) taskData.rightPersonMap[targetDateKey][targetSectionId] = [];

                const currentList = taskData.rightPersonMap[targetDateKey][targetSectionId];
                if (!currentList.some(p => (typeof p === 'string' ? p : p.name) === name)) {
                    currentList.push({ name, sourceIndex, todos: [], isExpanded: false });
                }

                saveToStorage();
                renderRight();
                renderLeft();
            });
        });
    }

    function updateLastBackupInfo() {
        const lastBackup = localStorage.getItem('lastBackupTime');
        const infoElement = document.getElementById('last-backup-info');
        if (infoElement) {
            infoElement.textContent = lastBackup ? `最近一次导出备份时间: ${lastBackup}` : '尚未进行过导出备份';
        }
    }

    window.showDataManagement = function() {
        const modal = document.getElementById('data-modal');
        if (modal) {
            modal.style.display = 'block';
            updateLastBackupInfo();
        }
    };

    window.closeDataModal = function() {
        const modal = document.getElementById('data-modal');
        if (modal) modal.style.display = 'none';
    };

    window.exportData = function() {
        try {
            const dataStr = JSON.stringify(taskData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const now = new Date();
            const dateStr = now.getFullYear() +
                          String(now.getMonth() + 1).padStart(2, '0') +
                          String(now.getDate()).padStart(2, '0') + '_' +
                          String(now.getHours()).padStart(2, '0') +
                          String(now.getMinutes()).padStart(2, '0');
            const a = document.createElement('a');
            a.href = url;
            a.download = `task_assignment_backup_${dateStr}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            const timeStr = now.toLocaleString();
            localStorage.setItem('lastBackupTime', timeStr);
            updateLastBackupInfo();
            alert('数据已成功导出为 JSON 文件，请妥善保存。');
        } catch (error) {
            console.error('导出失败:', error);
            alert('数据导出失败，请重试。');
        }
    };

    window.triggerImport = function() {
        const input = document.getElementById('import-file-input');
        if (input) input.click();
    };

    window.resetAllData = function() {
         if (confirm('警告：这将清空所有人员安排、预设和配置，并恢复到初始状态。此操作不可撤销，确定继续吗？')) {
             localStorage.removeItem(STORAGE_KEY);
             localStorage.removeItem('lastBackupTime');
             if (socket && isConnected) {
                 fetch('/api/reset', { method: 'POST' });
             }
             location.reload();
         }
     };

     window.importData = function(event) {
         const file = event.target.files[0];
         if (!file) return;
         if (!confirm('导入数据将覆盖当前所有安排，确定继续吗？')) {
             event.target.value = '';
             return;
         }
         const reader = new FileReader();
         reader.onload = function(e) {
             try {
                 const importedData = JSON.parse(e.target.result);
                 if (!importedData.taskSections || !importedData.leftPersonList) {
                     throw new Error('无效的数据格式');
                 }
                 taskData = importedData;
                 saveToStorage();

                 updateDates();
                 renderLeft();
                 renderRight();
                 updateSidebarDateDisplay();

                 alert('数据导入成功！');
                 window.closeDataModal();
             } catch (error) {
                 console.error('导入失败:', error);
                 alert('数据导入失败：文件格式不正确或已损坏。');
             } finally {
                 event.target.value = '';
             }
         };
         reader.readAsText(file);
     };

    window.toggleSidebar = () => {
        sidebar.classList.toggle('collapsed');
        updateSidebarDateDisplay();
        renderLeft();
    };

    window.prevSidebarDate = () => {
        if (sidebarCurrentDateIndex > 0) {
            sidebarCurrentDateIndex--;
        } else {
            changeWeek(-1);
            sidebarCurrentDateIndex = 4;
        }
        updateSidebarDateDisplay();
        renderLeft();
    };

    window.nextSidebarDate = () => {
        if (sidebarCurrentDateIndex < 4) {
            sidebarCurrentDateIndex++;
        } else {
            changeWeek(1);
            sidebarCurrentDateIndex = 0;
        }
        updateSidebarDateDisplay();
        renderLeft();
    };

    window.confirmManualTodo = confirmManualTodo;
    window.closeTodoModal = closeTodoModal;
    window.confirmManualSection = confirmManualSection;
    window.closeSectionModal = closeSectionModal;

    window.addPerson = function() {
        const name = prompt('请输入人员名字:');
        if (name && name.trim()) {
            const trimmedName = name.trim();
            if (!taskData.leftPersonList.includes(trimmedName)) {
                taskData.leftPersonList.push(trimmedName);
                saveToStorage();
                renderLeft();
            } else {
                alert('该人员已存在！');
            }
        }
    };

    window.showDeleteDialog = function() {
        if (taskData.leftPersonList.length === 0) {
            alert('暂无人员可删除');
            return;
        }
        const name = prompt('请输入要删除的人员名字:');
        if (name && name.trim()) {
            const trimmedName = name.trim();
            const index = taskData.leftPersonList.indexOf(trimmedName);
            if (index !== -1) {
                if (confirm(`确定要删除人员 "${trimmedName}" 吗？`)) {
                    taskData.leftPersonList.splice(index, 1);
                    saveToStorage();
                    renderLeft();
                    renderRight();
                }
            } else {
                alert('未找到该人员');
            }
        }
    };

    let currentPresetType = 'task';

    window.managePresets = function(type) {
        currentPresetType = type;
        const modal = document.getElementById('preset-modal');
        const title = modal.querySelector('h3');
        const input = document.getElementById('new-preset-input');
        const list = document.getElementById('modal-preset-list');

        if (type === 'task') title.textContent = '任务预设管理';
        else if (type === 'todo') title.textContent = '代办预设管理';
        else title.textContent = '板块预设管理';

        input.value = '';
        list.innerHTML = '';

        let presets;
        if (type === 'task') presets = taskData.taskPresets;
        else if (type === 'todo') presets = taskData.todoPresets;
        else presets = taskData.sectionPresets;

        presets.forEach((text, index) => {
            const item = document.createElement('div');
            item.className = 'preset-item';
            item.innerHTML = `
                <span>${text}</span>
                <button class="btn-delete-preset" onclick="deletePreset(${index})">×</button>
            `;
            list.appendChild(item);
        });

        modal.style.display = 'block';
        input.focus();
    };

    window.closePresetModal = function() {
        document.getElementById('preset-modal').style.display = 'none';
    };

    window.addPreset = function() {
        const input = document.getElementById('new-preset-input');
        const text = input.value.trim();
        if (text) {
            let presets;
            if (currentPresetType === 'task') presets = taskData.taskPresets;
            else if (currentPresetType === 'todo') presets = taskData.todoPresets;
            else presets = taskData.sectionPresets;

            if (!presets.includes(text)) {
                presets.push(text);
                saveToStorage();
                managePresets(currentPresetType);
            } else {
                alert('该预设已存在！');
            }
        }
    };

    window.deletePreset = function(index) {
        let presets;
        if (currentPresetType === 'task') presets = taskData.taskPresets;
        else if (currentPresetType === 'todo') presets = taskData.todoPresets;
        else presets = taskData.sectionPresets;

        if (confirm('确定要删除这个预设吗？')) {
            presets.splice(index, 1);
            saveToStorage();
            managePresets(currentPresetType);
        }
    };

    init();
});
