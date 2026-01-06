document.addEventListener('DOMContentLoaded', () => {
    const startInput = document.getElementById('semester-start');

    // Title Inputs
    const titleYearInput = document.getElementById('title-year');
    const titleSemesterInput = document.getElementById('title-semester');

    // Event Inputs
    const dateInput = document.getElementById('event-date');
    const endDateInput = document.getElementById('event-end-date');
    const descInput = document.getElementById('event-desc');
    const teacherOnlyInput = document.getElementById('teacher-only');
    const addBtn = document.getElementById('add-btn');

    // Note Inputs
    const noteMonthInput = document.getElementById('note-month');
    const noteContentInput = document.getElementById('note-content');
    const addNoteBtn = document.getElementById('add-note-btn');

    // View Switcher
    const viewRadios = document.getElementsByName('view-mode');

    const scheduleBody = document.getElementById('schedule-body');

    // Load data
    let events = JSON.parse(localStorage.getItem('schoolEvents')) || [];
    let monthlyNotes = JSON.parse(localStorage.getItem('schoolNotes')) || [];
    let semesterStart = localStorage.getItem('semesterStart') || '2025-08-31'; // Default to a Sunday
    let currentView = 'teacher'; // Default view

    // Load Title Data
    titleYearInput.value = localStorage.getItem('titleYear') || '114';
    titleSemesterInput.value = localStorage.getItem('titleSemester') || '1';

    // Listeners
    startInput.addEventListener('change', () => {
        semesterStart = startInput.value;
        localStorage.setItem('semesterStart', semesterStart);
        renderTable();
    });

    titleYearInput.addEventListener('change', () => {
        let value = parseInt(titleYearInput.value);
        if (isNaN(value) || value < 100) {
            value = 100;
        } else if (value > 999) {
            value = 999;
        }
        titleYearInput.value = value;
        localStorage.setItem('titleYear', value);
    });

    titleSemesterInput.addEventListener('change', () => {
        let value = parseInt(titleSemesterInput.value);
        if (isNaN(value) || value < 1) {
            value = 1;
        } else if (value > 2) {
            value = 2;
        }
        titleSemesterInput.value = value;
        localStorage.setItem('titleSemester', value);
    });

    addBtn.addEventListener('click', addEvent);
    addNoteBtn.addEventListener('click', addNote);

    viewRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentView = e.target.value;
            renderTable();
        });
    });

    document.getElementById('print-btn').addEventListener('click', () => {
        window.print();
    });

    // CSV Export
    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);

    // CSV Import
    const fileInput = document.getElementById('csv-file-input');
    document.getElementById('import-csv-btn').addEventListener('click', () => {
        fileInput.click();
    });
    fileInput.addEventListener('change', importCSV);

    // Init inputs
    startInput.value = semesterStart;

    // Render
    renderTable();

    function addEvent() {
        const dateVal = dateInput.value;
        const endDateVal = endDateInput.value;
        const descVal = descInput.value.trim();
        const isTeacherOnly = teacherOnlyInput ? teacherOnlyInput.checked : false;

        if (!dateVal) {
            alert('請輸入日期');
            return;
        }

        if (!descVal) {
            alert('請輸入事項內容');
            return;
        }

        // Default end date to start date if empty
        const finalEndDate = endDateVal ? endDateVal : dateVal;

        if (finalEndDate < dateVal) {
            alert('結束日期不能早於開始日期');
            return;
        }

        const newEvent = {
            id: Date.now(),
            date: dateVal,
            endDate: finalEndDate,
            desc: descVal,
            teacherOnly: isTeacherOnly
        };

        events.push(newEvent);
        saveData();

        // Reset inputs
        descInput.value = '';
        if (endDateInput) endDateInput.value = ''; // Reset end date
        if (teacherOnlyInput) teacherOnlyInput.checked = false;
        dateInput.focus();
        renderTable();
    }

    function addNote() {
        const monthVal = noteMonthInput.value; // YYYY-MM
        const contentVal = noteContentInput.value.trim();

        if (!monthVal || !contentVal) {
            alert('請輸入月份和備註內容');
            return;
        }

        const newNote = {
            id: Date.now(),
            month: monthVal,
            content: contentVal
        };

        monthlyNotes.push(newNote);
        saveData();

        noteContentInput.value = '';
        renderTable();
    }

    function saveData() {
        localStorage.setItem('schoolEvents', JSON.stringify(events));
        localStorage.setItem('schoolNotes', JSON.stringify(monthlyNotes));
    }

    // CSV Functions
    function exportCSV() {
        // Schema: Type,Date_Month,EndDate,Content,TeacherOnly
        const rows = [['Type', 'Date_Month', 'EndDate', 'Content', 'TeacherOnly']];

        // Events
        events.forEach(e => {
            rows.push([
                'Event',
                e.date,
                e.endDate || e.date,
                e.desc,
                e.teacherOnly ? 'true' : 'false'
            ]);
        });

        // Notes
        monthlyNotes.forEach(n => {
            rows.push([
                'Note',
                n.month,
                '',
                n.content,
                ''
            ]);
        });

        let csvContent = "\uFEFF"; // BOM for Excel handling of UTF-8
        rows.forEach(row => {
            const escapedRow = row.map(field => {
                if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
                    return `"${field.replace(/"/g, '""')}"`;
                }
                return field;
            });
            csvContent += escapedRow.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "school_schedule_data.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function importCSV(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!confirm('匯入資料將會清除目前所有的事項與備註，確定要繼續嗎？')) {
            e.target.value = ''; // Reset input
            return;
        }

        const reader = new FileReader();
        reader.onload = function (evt) {
            const text = evt.target.result;
            const lines = text.split('\n');
            const newEvents = [];
            const newNotes = [];

            // Skip header (index 0)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                // Simple CSV parser (handles quotes roughly)
                // Ref: https://stackoverflow.com/questions/8493195/how-can-i-parse-a-csv-string-with-javascript-which-contains-comma-in-data
                const re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;

                // Use a simpler approach assuming standard simple CSV generated by us, but handle quotes if present
                // Matches: "value", value, ...
                const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
                if (!matches) continue;

                // The above regex is imperfect for empty fields. Let's do a basic split if no quotes, or a better parser.
                // Or simply: 
                let fields = [];
                let currentField = '';
                let inQuote = false;
                for (let char of line) {
                    if (char === '"') {
                        inQuote = !inQuote;
                    } else if (char === ',' && !inQuote) {
                        fields.push(currentField);
                        currentField = '';
                    } else {
                        currentField += char;
                    }
                }
                fields.push(currentField);

                // Clean quotes
                fields = fields.map(f => {
                    if (f.startsWith('"') && f.endsWith('"')) {
                        return f.slice(1, -1).replace(/""/g, '"');
                    }
                    return f;
                });

                if (fields.length < 4) continue;

                const type = fields[0];
                const col1 = fields[1]; // Date or Month
                const col2 = fields[2]; // EndDate
                const col3 = fields[3]; // Content
                const col4 = fields[4]; // TeacherOnly

                if (type === 'Event') {
                    if (col1 && col3) {
                        newEvents.push({
                            id: Date.now() + Math.random(), // Ensure unique ID
                            date: col1,
                            endDate: col2 || col1,
                            desc: col3,
                            teacherOnly: col4 === 'true'
                        });
                    }
                } else if (type === 'Note') {
                    if (col1 && col3) {
                        newNotes.push({
                            id: Date.now() + Math.random(),
                            month: col1,
                            content: col3
                        });
                    }
                }
            }

            events = newEvents;
            monthlyNotes = newNotes;
            saveData();
            renderTable();
            alert('資料匯入成功！');
            e.target.value = ''; // Reset
        };
        reader.readAsText(file);
    }

    // Helper: Get color class
    function getEventClass(desc) {
        if (desc.includes('段考')) return 'event-exam';
        if (desc.includes('校外教學')) return 'event-trip';
        if (desc.includes('慶生會') || desc.includes('同樂會') || desc.includes('歡送會')) return 'event-birthday';
        if (desc.includes('節日') || desc.includes('補假') || desc.includes('放假')) return 'event-holiday';
        return '';
    }

    // Helper: Get Chinese Number
    function toChineseNum(num) {
        const map = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
        if (num <= 10) return map[num];
        if (num < 20) return '十' + (num % 10 === 0 ? '' : map[num % 10]);
        if (num < 100) {
            const tens = Math.floor(num / 10);
            const units = num % 10;
            return map[tens] + '十' + (units === 0 ? '' : map[units]);
        }
        return num;
    }

    function renderTable() {
        scheduleBody.innerHTML = '';

        if (!semesterStart) return;

        // Use UTC to avoid timezone issues with YYYY-MM-DD strings
        const startDate = new Date(semesterStart);
        const dayOfWeek = startDate.getUTCDay();
        startDate.setUTCDate(startDate.getUTCDate() - dayOfWeek);

        const totalWeeks = 23;

        let currentWeekStart = new Date(startDate);

        for (let w = 1; w <= totalWeeks; w++) {
            const row = document.createElement('tr');

            const weekDates = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(currentWeekStart);
                date.setUTCDate(currentWeekStart.getUTCDate() + d);
                weekDates.push(date);
            }

            // 1. Month (Use UTC)
            const majorityDate = weekDates[3];
            const monthNum = majorityDate.getUTCMonth() + 1;
            const yearNum = majorityDate.getUTCFullYear();
            const monthKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;

            const monthCell = document.createElement('td');
            monthCell.className = 'cell-month';
            monthCell.innerHTML = `<span class="month-num">${monthNum}</span>月`;
            row.appendChild(monthCell);

            // 2. Week Number
            const weekCell = document.createElement('td');
            weekCell.className = 'cell-week';
            if (w > 21) {
                weekCell.textContent = '放假';
            } else {
                weekCell.textContent = toChineseNum(w);
            }
            row.appendChild(weekCell);

            // 3. Days
            weekDates.forEach(date => {
                const dayCell = document.createElement('td');
                dayCell.className = 'cell-day';
                dayCell.textContent = date.getUTCDate();

                const dayOfWeek = date.getUTCDay();
                if (dayOfWeek === 0 || dayOfWeek === 6) {
                    dayCell.classList.add('is-weekend');
                }

                // Color logic (Legacy: for single day background if no bar, or keep distinct?)
                // Current design: Use bars for multi-day, maybe background for single day?
                // Plan: Show bars for ALL events that cover this day to be consistent. 

                const dateStr = date.toISOString().split('T')[0];

                // Find events covering this date
                // Event covers if startDate <= date <= endDate
                const dayEvents = events.filter(e => {
                    // Check view mode
                    if (currentView === 'parent' && e.teacherOnly) return false;

                    const eStart = e.date;
                    const eEnd = e.endDate || e.date; // Use date as fallback

                    return dateStr >= eStart && dateStr <= eEnd;
                });

                // Sort by ID to keep consistent stacking order
                dayEvents.sort((a, b) => a.id - b.id);

                if (dayEvents.length > 0) {
                    // Check if there are any multi-day events covering this day
                    // OR multiple events on the same day, we might want to still use bars?
                    // User request: Single day event -> Fill color
                    // Multi-day event -> Bar line

                    // Implementation strategy:
                    // 1. Separate single-day and multi-day events for this day

                    const singleDayEvents = dayEvents.filter(e => {
                        const start = e.date;
                        const end = e.endDate || e.date;
                        return start === end;
                    });

                    const multiDayEvents = dayEvents.filter(e => {
                        const start = e.date;
                        const end = e.endDate || e.date;
                        return start !== end;
                    });

                    // Render background for single day events
                    // Note: If multiple single day events exist, last one wins color? 
                    // Or mix? Usually one major event per day. Let's pick the last one's color.
                    if (singleDayEvents.length > 0) {
                        // Apply background color of the last single-day event
                        const lastEvent = singleDayEvents[singleDayEvents.length - 1];
                        const bgClass = getEventClass(lastEvent.desc);
                        if (bgClass) {
                            dayCell.classList.add(bgClass);
                        }
                        // Also add title tooltip
                        dayCell.title = singleDayEvents.map(e => e.desc).join('\n');
                    }

                    // Render bars ONLY for multi-day events
                    if (multiDayEvents.length > 0) {
                        const barContainer = document.createElement('div');
                        barContainer.className = 'event-bar-container';

                        multiDayEvents.forEach(e => {
                            const bar = document.createElement('div');
                            let cls = 'event-bar ' + getEventClass(e.desc);

                            const eStart = e.date;
                            const eEnd = e.endDate || e.date;

                            if (dateStr === eStart) cls += ' start';
                            if (dateStr === eEnd) cls += ' end';

                            bar.className = cls;
                            barContainer.appendChild(bar);
                        });

                        dayCell.appendChild(barContainer);
                    }
                }

                row.appendChild(dayCell);
            });

            // 4. Events
            const eventCell = document.createElement('td');
            eventCell.className = 'cell-events';

            const weekStartStr = weekDates[0].toISOString().split('T')[0];
            const weekEndStr = weekDates[6].toISOString().split('T')[0];

            // Filter events: In this week AND NOT a holiday
            const weekEvents = events.filter(e => {
                const isHoliday = getEventClass(e.desc) === 'event-holiday';
                // Filter by view mode
                if (currentView === 'parent' && e.teacherOnly) return false;

                return e.date >= weekStartStr && e.date <= weekEndStr && !isHoliday;
            });

            weekEvents.sort((a, b) => a.date.localeCompare(b.date));

            weekEvents.forEach(e => {
                const div = document.createElement('div');
                div.className = `event-block ${getEventClass(e.desc)}`;

                const dateNum = new Date(e.date).getUTCDate();

                // Determine display date string
                let dateDisplay = `${dateNum}`;

                // Check if multi-day
                const eStart = e.date;
                const eEnd = e.endDate || e.date;

                if (eStart !== eEnd) {
                    const endDateNum = new Date(eEnd).getUTCDate();
                    // Simple range format: "23-26"
                    // Note: If cross month, it will show e.g. "30-2". 
                    // Given the requirement prompt "23-26", this is likely the desired format.
                    dateDisplay = `${dateNum}-${endDateNum}`;
                }

                let content = `<span class="event-date-prefix">${dateDisplay}</span>${e.desc}`;
                if (e.teacherOnly && currentView === 'teacher') {
                    content += ` <span class="teacher-only-mark">(師)</span>`;
                }

                div.innerHTML = content;
                div.title = "雙擊刪除";
                div.ondblclick = () => {
                    if (confirm('刪除此事項？')) {
                        events = events.filter(ev => ev.id !== e.id);
                        saveData();
                        renderTable();
                    }
                };
                eventCell.appendChild(div);
            });
            row.appendChild(eventCell);

            // 5. Notes (Monthly + Holidays)
            const noteCell = document.createElement('td');
            noteCell.className = 'cell-notes';

            // A. Manual Monthly Notes
            const currentMonthNotes = monthlyNotes.filter(n => n.month === monthKey);

            // B. Holiday Events in this Month
            const holidayEvents = events.filter(e => {
                const eDate = new Date(e.date);
                // Filter by view mode (though holidays usually aren't teacher only, but good to be consistent)
                if (currentView === 'parent' && e.teacherOnly) return false;

                return e.date.startsWith(monthKey) && getEventClass(e.desc) === 'event-holiday';
            });

            // Combine and Render
            holidayEvents.sort((a, b) => a.date.localeCompare(b.date));

            holidayEvents.forEach(e => {
                const div = document.createElement('div');
                div.className = 'event-block event-holiday';
                const dateNum = new Date(e.date).getUTCDate();

                let content = `<span class="event-date-prefix">${dateNum}</span>${e.desc}`;
                if (e.teacherOnly && currentView === 'teacher') {
                    content += ` <span class="teacher-only-mark">(師)</span>`;
                }

                div.innerHTML = content;
                div.title = "雙擊刪除";
                div.ondblclick = () => {
                    if (confirm('刪除此事項？')) {
                        events = events.filter(ev => ev.id !== e.id);
                        saveData();
                        renderTable();
                    }
                };
                noteCell.appendChild(div);
            });

            // Render Manual Notes
            if (currentMonthNotes.length > 0) {
                currentMonthNotes.forEach(n => {
                    const div = document.createElement('div');
                    div.textContent = n.content;
                    div.style.marginBottom = '4px';
                    div.title = "雙擊刪除備註";
                    div.style.cursor = "pointer";
                    div.ondblclick = () => {
                        if (confirm('刪除此備註？')) {
                            monthlyNotes = monthlyNotes.filter(mn => mn.id !== n.id);
                            saveData();
                            renderTable();
                        }
                    };
                    noteCell.appendChild(div);
                });
            }
            row.appendChild(noteCell);

            scheduleBody.appendChild(row);

            currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() + 7);
        }

        mergeCells('.cell-month');
        mergeCells('.cell-notes');
    }

    function mergeCells(selector) {
        const rows = scheduleBody.querySelectorAll('tr');
        if (rows.length === 0) return;

        let lastContent = '';
        let rowspan = 1;
        let startRowIndex = 0;

        for (let i = 0; i < rows.length; i++) {
            const cell = rows[i].querySelector(selector);
            // Use innerHTML for comparison to catch structure changes, but textContent is safer for simple text. 
            // For notes, we have divs, so innerHTML is better.
            const currentContent = cell.innerHTML;

            if (i === 0) {
                lastContent = currentContent;
                continue;
            }

            if (currentContent === lastContent && currentContent !== '') {
                rowspan++;
                cell.style.display = 'none';
                rows[startRowIndex].querySelector(selector).rowSpan = rowspan;
            } else {
                lastContent = currentContent;
                rowspan = 1;
                startRowIndex = i;
            }
        }
    }
});
