import React, { useEffect, useState, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import axios from 'axios';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { textRenderer } from 'handsontable/renderers/textRenderer';

registerAllModules();

const API_BASE = 'http://localhost:8000/api/tables/';

function TableEditor({ id, compactMode = false }) {
  const hotRef = useRef(null);
  const fileInputRef = useRef(null);

  const [contextMenuCell, setContextMenuCell] = useState(null);
  const [cellSettings, setCellSettings] = useState({});
  const [title, setTitle] = useState('');
  const [hotData, setHotData] = useState([['']]);
  const [tableLoaded, setTableLoaded] = useState(false);

  // Загрузка таблицы
  useEffect(() => {
    if (id) {
      axios.get(`${API_BASE}${id}/`)
        .then(res => {
          setTitle(res.data.title || 'Без названия');

          let rows = [];
          if (Array.isArray(res.data.data)) {
            rows = res.data.data;
          } else if (res.data.data && Array.isArray(res.data.data.rows)) {
            rows = res.data.data.rows;
          }

          setHotData(rows.length > 0 ? rows.map(row => row.map(cell => cell ?? '')) : [['']]);
          setCellSettings(res.data.cell_settings || {});
          setTableLoaded(true);
        })
        .catch(err => {
          console.error('Ошибка загрузки таблицы:', err);
          alert('Не удалось загрузить таблицу');
        });
    } else {
      setTitle('Новая таблица');
      setTableLoaded(true);
    }
  }, [id]);

  // Сохранение таблицы
  const saveTable = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    const currentData = hot.getData();

    const payload = {
      title,
      data: { rows: currentData },
      cell_settings: cellSettings
    };

    if (id) {
      axios.patch(`${API_BASE}${id}/`, payload)
        .then(() => console.log('Таблица сохранена'))
        .catch(err => {
          console.error('Ошибка сохранения:', err);
          alert('Ошибка при сохранении');
        });
    } else {
      axios.post(`${API_BASE}`, payload)
        .then(res => {
          window.location.href = `/table/${res.data.id}`;
        })
        .catch(err => {
          console.error('Ошибка создания:', err);
          alert('Ошибка при создании таблицы');
        });
    }
  };

  // Импорт файла
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target.result;

      if (file.name.endsWith('.csv')) {
        Papa.parse(content, {
          complete: (result) => {
            const rows = result.data.map(row => row.map(cell => cell ?? ''));
            setHotData(rows);
            hotRef.current.hotInstance.loadData(rows);
            setCellSettings({});
            alert('Таблица успешно импортирована из CSV');
          },
          skipEmptyLines: true,
        });
      } else if (file.name.endsWith('.json')) {
        try {
          const json = JSON.parse(content);
          let rows = [];
          if (Array.isArray(json)) rows = json;
          else if (json.rows) rows = json.rows;
          else if (json.data?.rows) rows = json.data.rows;

          const normalized = rows.map(row => row.map(cell => cell ?? ''));
          setHotData(normalized);
          hotRef.current.hotInstance.loadData(normalized);
          setCellSettings(json.cell_settings || {});
          setTitle(json.title || 'Импортированная таблица');
          alert('Таблица успешно импортирована из JSON');
        } catch (err) {
          alert('Ошибка чтения JSON-файла');
        }
      } else {
        alert('Поддерживаются только файлы .csv и .json');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Экспорт в CSV
  const exportToCSV = () => {
    if (!hotRef.current) return;
    const data = hotRef.current.hotInstance.getData();
    const csv = data.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'table'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Экспорт в JSON (с настройками)
  const exportToJSON = () => {
    if (!hotRef.current) return;
    const data = hotRef.current.hotInstance.getData();
    const json = {
      title,
      data: { rows: data },
      cell_settings: cellSettings
    };
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'table'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Экспорт в Excel (.xlsx) с форматированием
  const exportToExcel = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    const data = hot.getData();

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    const range = XLSX.utils.decode_range(ws['!ref']);
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        const settings = getCellSettings(r, c);

        if (!ws[cellAddr]) ws[cellAddr] = { v: data[r][c] || '' };
        ws[cellAddr].s = ws[cellAddr].s || {};

        if (settings.color && settings.color !== '#FFFFFF') {
          ws[cellAddr].s.fill = { fgColor: { rgb: settings.color.slice(1) } };
        }
        if (settings.fontColor && settings.fontColor !== '#000000') {
          ws[cellAddr].s.font = ws[cellAddr].s.font || {};
          ws[cellAddr].s.font.color = { rgb: settings.fontColor.slice(1) };
        }
        if (settings.bold) {
          ws[cellAddr].s.font = ws[cellAddr].s.font || {};
          ws[cellAddr].s.font.bold = true;
        }
        if (settings.italic) {
          ws[cellAddr].s.font = ws[cellAddr].s.font || {};
          ws[cellAddr].s.font.italic = true;
        }
        if (settings.underline) {
          ws[cellAddr].s.font = ws[cellAddr].s.font || {};
          ws[cellAddr].s.font.underline = true;
        }
        if (settings.align) {
          ws[cellAddr].s.alignment = { horizontal: settings.align };
        }
        if (settings.type === 'checkbox') {
          ws[cellAddr].t = 'b';
          ws[cellAddr].v = Boolean(data[r][c]);
        }
      }
    }

    ws['!cols'] = data[0]?.map(() => ({ wch: 15 }));

    XLSX.utils.book_append_sheet(wb, ws, 'Лист1');
    XLSX.writeFile(wb, `${title || 'table'}.xlsx`);
  };

  // Настройки ячейки
  const getCellSettings = (row, col) => {
    const key = `${row},${col}`;
    return cellSettings[key] || { color: '#FFFFFF', type: 'text' };
  };

  const updateCellSettings = (row, col, settings) => {
    const key = `${row},${col}`;
    const newSettings = { ...cellSettings };

    if (settings === null) {
      delete newSettings[key];
    } else {
      newSettings[key] = { ...getCellSettings(row, col), ...settings };
    }

    setCellSettings(newSettings);
    hotRef.current?.hotInstance.render();
  };

  // Контекстное меню на русском
    const createContextMenu = () => ({
      items: {
        'row_above': { name: 'Вставить строку сверху' },
        'row_below': { name: 'Вставить строку снизу' },
        'col_left': { name: 'Вставить столбец слева' },
        'col_right': { name: 'Вставить столбец справа' },
        '---------': { disabled: true },
        'remove_row': { name: 'Удалить строку' },
        'remove_col': { name: 'Удалить столбец' },
        'format_cell': {
          name: 'Форматирование ячейки',
          callback: (key, selection) => {
            if (!selection || selection.length === 0) return;
            const start = selection[0].start;
            const settings = getCellSettings(start.row, start.col);
            setContextMenuCell({ row: start.row, col: start.col, ...settings });

            const modal = document.getElementById('cellSettingsModal');
            if (modal) {
              modal.style.display = 'block';
              modal.style.left = '50%';
              modal.style.top = '50%';
              modal.style.transform = 'translate(-50%, -50%)';
            }
          }
        },
        'reset_cell': {
          name: 'Сбросить настройки ячейки',
          callback: (key, selection) => {
            if (!selection || selection.length === 0) return;
            selection.forEach(sel => {
              const { start, end } = sel;
              for (let r = start.row; r <= end.row; r++) {
                for (let c = start.col; c <= end.col; c++) {
                  updateCellSettings(r, c, null);
                }
              }
            });
            saveTable();
          }
        }
      }
    });

  // Рендерер с форматированием
    const createRenderer = () => (instance, td, row, col, prop, value, cellProperties) => {
      const settings = getCellSettings(row, col);

      // Применяем стили
      if (settings.color && settings.color !== '#FFFFFF') td.style.backgroundColor = settings.color;
      if (settings.fontColor && settings.fontColor !== '#000000') td.style.color = settings.fontColor;
      if (settings.bold) td.style.fontWeight = 'bold';
      if (settings.italic) td.style.fontStyle = 'italic';
      if (settings.underline) td.style.textDecoration = 'underline';
      if (settings.align) td.style.textAlign = settings.align;

      if (settings.type === 'checkbox') {
        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(value);
        checkbox.style.cursor = 'pointer';
        checkbox.addEventListener('change', (e) => {
          instance.setDataAtCell(row, col, e.target.checked);
          saveTable();
        });
        td.appendChild(checkbox);
      } else {
        // Правильный вызов базового текст-рендерера (важно для ARIA!)
        textRenderer(instance, td, row, col, prop, value, cellProperties);
      }

      return td;
    };

  const closeModal = () => {
    document.getElementById('cellSettingsModal').style.display = 'none';
    setContextMenuCell(null);
    saveTable();
  };

  // Перемещение строк/столбцов с переносом настроек
  const remapCellSettingsAfterMove = (type, movedIndexes, finalIndex) => {
    const hot = hotRef.current?.hotInstance;
    if (!hot) return;

    const count = type === 'row' ? hot.countRows() : hot.countCols();
    const remaining = Array.from({ length: count }, (_, i) => i).filter(i => !movedIndexes.includes(i));
    remaining.splice(finalIndex, 0, ...movedIndexes);

    const mapping = {};
    remaining.forEach((oldIdx, newIdx) => { mapping[oldIdx] = newIdx; });

    const newSettings = {};
    Object.entries(cellSettings).forEach(([key, val]) => {
      const [r, c] = key.split(',').map(Number);
      const newRow = type === 'row' ? mapping[r] : r;
      const newCol = type === 'col' ? mapping[c] : c;
      if (newRow !== undefined && newCol !== undefined) {
        newSettings[`${newRow},${newCol}`] = val;
      }
    });

    setCellSettings(newSettings);
  };

  return (
    <div>
      {!compactMode && (
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ fontSize: '20px', padding: '8px', width: '350px' }}
            placeholder="Название таблицы"
          />
          <button onClick={saveTable} style={{ padding: '10px 20px', background: '#007bff', color: 'white', fontWeight: 'bold' }}>
            Сохранить
          </button>

          <button onClick={() => fileInputRef.current.click()} style={{ padding: '10px 20px', background: '#28a745', color: 'white' }}>
            Импорт (CSV/JSON)
          </button>

          <button onClick={exportToCSV} style={{ padding: '10px 20px', background: '#ffc107', color: 'black' }}>
            Экспорт CSV
          </button>
          <button onClick={exportToJSON} style={{ padding: '10px 20px', background: '#ffc107', color: 'black' }}>
            Экспорт JSON
          </button>
          <button onClick={exportToExcel} style={{ padding: '10px 20px', background: '#fd7e14', color: 'white', fontWeight: 'bold' }}>
            Экспорт Excel (.xlsx)
          </button>
        </div>
      )}

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImport}
        accept=".csv,.json"
        style={{ display: 'none' }}
      />

      {tableLoaded && (
        <HotTable
          ref={hotRef}
          data={hotData}
          rowHeaders={true}
          colHeaders={true}
          height={compactMode ? "50vh" : "70vh"}
          width="100%"
          rowHeights={48}
          colWidths={100}
          stretchH="none"
          licenseKey="non-commercial-and-evaluation"
          contextMenu={createContextMenu()}
          manualRowResize={true}
          manualColumnResize={true}
          manualRowMove={true}
          manualColumnMove={true}
          fixedColumnsStart={1}
          cells={(row, col) => {
            const settings = getCellSettings(row, col);
            return {
              renderer: createRenderer(),
              type: settings.type === 'checkbox' ? 'checkbox' : 'text',
              className: settings.type === 'checkbox' ? 'htCenter htMiddle' : ''
            };
          }}
          afterRowMove={(moved, final) => { remapCellSettingsAfterMove('row', moved, final); setTimeout(saveTable, 100); }}
          afterColumnMove={(moved, final) => { remapCellSettingsAfterMove('col', moved, final); setTimeout(saveTable, 100); }}
          afterChange={(changes, source) => source === 'edit' && saveTable()}
        />
      )}

      {/* Модальное окно форматирования */}
      <div id="cellSettingsModal" style={{
        display: 'none', position: 'fixed', zIndex: 1000, background: 'white',
        border: '1px solid #ccc', borderRadius: '8px', padding: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)', minWidth: '400px', maxWidth: '500px'
      }}>
        {contextMenuCell && (
          <>
            <h4 style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Форматирование ячейки [{contextMenuCell.row + 1}, {contextMenuCell.col + 1}]
              <button onClick={closeModal} style={{ float: 'right', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Цвет фона:</label>
                <input type="color" value={contextMenuCell.color || '#FFFFFF'}
                  onChange={e => {
                    const upd = { ...contextMenuCell, color: e.target.value };
                    setContextMenuCell(upd);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { color: e.target.value });
                  }}
                  style={{ width: '100%', height: '40px', cursor: 'pointer' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Цвет текста:</label>
                <input type="color" value={contextMenuCell.fontColor || '#000000'}
                  onChange={e => {
                    const upd = { ...contextMenuCell, fontColor: e.target.value };
                    setContextMenuCell(upd);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { fontColor: e.target.value });
                  }}
                  style={{ width: '100%', height: '40px', cursor: 'pointer' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Формат текста:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { const b = !contextMenuCell.bold; setContextMenuCell({...contextMenuCell, bold: b}); updateCellSettings(contextMenuCell.row, contextMenuCell.col, { bold: b }); }}
                  style={{ padding: '8px 12px', background: contextMenuCell.bold ? '#007bff' : '#e9ecef', color: contextMenuCell.bold ? 'white' : '#495057', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}>B</button>
                <button onClick={() => { const i = !contextMenuCell.italic; setContextMenuCell({...contextMenuCell, italic: i}); updateCellSettings(contextMenuCell.row, contextMenuCell.col, { italic: i }); }}
                  style={{ padding: '8px 12px', background: contextMenuCell.italic ? '#007bff' : '#e9ecef', color: contextMenuCell.italic ? 'white' : '#495057', border: 'none', borderRadius: '4px', fontStyle: 'italic' }}>I</button>
                <button onClick={() => { const u = !contextMenuCell.underline; setContextMenuCell({...contextMenuCell, underline: u}); updateCellSettings(contextMenuCell.row, contextMenuCell.col, { underline: u }); }}
                  style={{ padding: '8px 12px', background: contextMenuCell.underline ? '#007bff' : '#e9ecef', color: contextMenuCell.underline ? 'white' : '#495057', border: 'none', borderRadius: '4px', textDecoration: 'underline' }}>U</button>
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Выравнивание:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {['left', 'center', 'right'].map(align => (
                  <button key={align} onClick={() => { setContextMenuCell({...contextMenuCell, align}); updateCellSettings(contextMenuCell.row, contextMenuCell.col, { align }); }}
                    style={{ flex: 1, padding: '8px', background: contextMenuCell.align === align ? '#007bff' : '#e9ecef', color: contextMenuCell.align === align ? 'white' : '#495057', border: 'none', borderRadius: '4px' }}>
                    {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Тип данных:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { updateCellSettings(contextMenuCell.row, contextMenuCell.col, { type: 'text' }); closeModal(); }}
                  style={{ flex: 1, padding: '8px 16px', background: contextMenuCell.type === 'text' ? '#007bff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>Текст</button>
                <button onClick={() => { updateCellSettings(contextMenuCell.row, contextMenuCell.col, { type: 'checkbox' }); closeModal(); }}
                  style={{ flex: 1, padding: '8px 16px', background: contextMenuCell.type === 'checkbox' ? '#007bff' : '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}>Чекбокс</button>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee', display: 'flex', gap: '10px' }}>
              <button onClick={() => { updateCellSettings(contextMenuCell.row, contextMenuCell.col, null); closeModal(); }}
                style={{ flex: 1, padding: '8px 16px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '4px' }}>Сбросить</button>
              <button onClick={closeModal}
                style={{ flex: 1, padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}>Применить</button>
            </div>
          </>
        )}
      </div>

      <style>{`
        .handsontable td { vertical-align: middle; }
        .handsontable td:hover { outline: 2px solid rgba(0,123,255,0.3); outline-offset: -2px; }
        .htContextMenu table.htCore { min-width: 220px; }
        .htContextMenu td { padding: 8px 12px; }
        .htContextMenu td:hover { background-color: #f8f9fa; }
      `}</style>
    </div>
  );
}

export default TableEditor;