import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllModules } from 'handsontable/registry';
import { textRenderer } from 'handsontable/renderers/textRenderer';
import axios from 'axios';
import Papa from 'papaparse';
import * as XLSX from 'xlsx-js-style';
import HyperFormula from 'hyperformula';

registerAllModules();

const API_BASE = 'http://localhost:8000/api/tables/';

function TableEditor({
  id,
  compactMode = false,
  showCompactControls = false,
  compactHeight,
  compactWidth,
  viewportZoom,
  onTitleChange
}) {
  const params = useParams();
  const tableId = id ?? params.id;
  const hotRef = useRef(null);
  const fileInputRef = useRef(null);
  const importMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  const [contextMenuCell, setContextMenuCell] = useState(null);
  const [cellSettings, setCellSettings] = useState({});
  const [title, setTitle] = useState('');
  const [hotData, setHotData] = useState([['']]);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (importMenuRef.current && !importMenuRef.current.contains(e.target)) {
        setShowImportMenu(false);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Загрузка таблицы
  useEffect(() => {
    if (tableId) {
      axios.get(`${API_BASE}${tableId}/`)
        .then(res => {
          const nextTitle = res.data.title || 'Без названия';
          setTitle(nextTitle);
          if (onTitleChange) {
            onTitleChange(nextTitle);
          }

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
  }, [tableId]);

  // Сохранение таблицы
  const saveTable = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;

    let sourceData;
    try {
      sourceData = hot.getSourceData();
    } catch (e) {
      // Если метод не поддерживается, попробуем другой способ
      console.warn('getSourceData not available, trying alternative');
      sourceData = hot.getData();
      const formulas = hot.getPlugin('formulas');
      if (formulas) {
        const formulaData = formulas.getFormulas();
        sourceData = sourceData.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const formula = formulaData[rowIndex] && formulaData[rowIndex][colIndex];
            return formula || cell;
          })
        );
      }
    }

    const payload = {
      title,
      data: { rows: sourceData }, // ✅ Сохраняем формулы
      cell_settings: cellSettings
    };

    if (tableId) {
      axios.patch(`${API_BASE}${tableId}/`, payload)
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

  // Импорт (CSV/JSON/Excel)
  const handleImport = (format) => {
    if (fileInputRef.current) fileInputRef.current.value = '';

    let accept = '';
    if (format === 'csv') accept = '.csv';
    else if (format === 'json') accept = '.json';
    else if (format === 'excel') accept = '.xlsx,.xls';

    fileInputRef.current.accept = accept;
    fileInputRef.current.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          let rows = [['']];
          let cellSettings = {};
          let importedTitle = title || 'Импортированная таблица';

          if (file.name.endsWith('.csv')) {
            Papa.parse(e.target.result, {
              complete: (res) => {
                rows = res.data
                  .filter(row => row.some(cell => cell !== '' && cell != null))
                  .map(row => row.map(cell => cell ?? ''));
                if (rows.length === 0) rows = [['']];
                setHotData(rows);
                hotRef.current?.hotInstance?.loadData(rows);
                setCellSettings({});
              },
              skipEmptyLines: true,
            });
          } else if (file.name.endsWith('.json')) {
            const json = JSON.parse(e.target.result);
            rows = (Array.isArray(json) ? json : json.rows || json.data?.rows || []).map(
              row => row.map(cell => cell ?? '')
            );
            if (rows.length === 0) rows = [['']];
            cellSettings = json.cell_settings || {};
            importedTitle = json.title || importedTitle;
            setHotData(rows);
            hotRef.current?.hotInstance?.loadData(rows);
            setCellSettings(cellSettings);
            setTitle(importedTitle);
          } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellStyles: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            if (rows.length === 0) rows = [['']];

            // Извлекаем стили (цвета, шрифты)
            cellSettings = {};
            const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
            for (let R = range.s.r; R <= range.e.r; R++) {
              for (let C = range.s.c; C <= range.e.c; C++) {
                const addr = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = sheet[addr];
                if (!cell || !cell.s) continue;

                const key = `${R},${C}`;
                const style = {};

                if (cell.s.fill?.fgColor?.rgb) {
                  style.color = `#${cell.s.fill.fgColor.rgb}`;
                }
                if (cell.s.font?.color?.rgb) {
                  style.fontColor = `#${cell.s.font.color.rgb}`;
                }
                if (cell.s.font?.bold) style.bold = true;
                if (cell.s.font?.italic) style.italic = true;
                if (cell.s.font?.underline) style.underline = true;
                if (cell.s.alignment?.horizontal) style.align = cell.s.alignment.horizontal;
                if (cell.t === 'b') style.type = 'checkbox';

                if (Object.keys(style).length > 0) {
                  cellSettings[key] = { color: '#FFFFFF', ...style };
                }
              }
            }

            setHotData(rows);
            hotRef.current?.hotInstance?.loadData(rows);
            setCellSettings(cellSettings);
          }

          setShowImportMenu(false);
          alert(`Таблица успешно импортирована из ${format.toUpperCase()}`);
        } catch (err) {
          console.error('Ошибка импорта:', err);
          alert(`Не удалось импортировать файл (${format})`);
        }
      };

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        reader.readAsArrayBuffer(file);
      } else {
        reader.readAsText(file);
      }
    };

    fileInputRef.current.click();
  };

  // Экспорт в CSV
  const exportToCSV = () => {
    if (!hotRef.current) return;
    const data = hotRef.current.hotInstance.getData();
    const csvContent = 'data:text/csv;charset=utf-8,' +
      data.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title || 'table'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Экспорт в JSON
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

  // Экспорт в Excel с сохранением форматирования
  const exportToExcel = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    const data = hot.getData();

    const ws = XLSX.utils.aoa_to_sheet(data);
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');

    for (let R = range.s.r; R <= range.e.r; R++) {
      for (let C = range.s.c; C <= range.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C });
        let cell = ws[addr];
        if (!cell) {
          cell = { v: data[R]?.[C] ?? '' };
          ws[addr] = cell;
        }

        const settings = getCellSettings(R, C);
        cell.s = {};

        // Фон
        if (settings.color && settings.color !== '#FFFFFF') {
          cell.s.fill = { fgColor: { rgb: settings.color.replace('#', '') } };
        }
        // Текст
        if (settings.fontColor && settings.fontColor !== '#000000') {
          cell.s.font = cell.s.font || {};
          cell.s.font.color = { rgb: settings.fontColor.replace('#', '') };
        }
        // Шрифт
        if (settings.bold || settings.italic || settings.underline) {
          cell.s.font = cell.s.font || {};
          if (settings.bold) cell.s.font.bold = true;
          if (settings.italic) cell.s.font.italic = true;
          if (settings.underline) cell.s.font.underline = true;
        }
        // Выравнивание
        if (settings.align) {
          cell.s.alignment = { horizontal: settings.align };
        }
        // Чекбокс
        if (settings.type === 'checkbox') {
          cell.t = 'b';
          cell.v = Boolean(data[R]?.[C]);
        }
      }
    }

    // Ширина столбцов
    ws['!cols'] = data[0]?.map(() => ({ wch: 15 })) || [];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Лист1');
    const safeTitle = (title || 'table').replace(/[<>:"/\\|?*]/g, '_');
    XLSX.writeFile(wb, `${safeTitle}.xlsx`);
  };

  // Работа с настройками ячеек
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
          if (!selection?.[0]) return;
          const { row, col } = selection[0].start;
          const settings = getCellSettings(row, col);
          setContextMenuCell({ row, col, ...settings });

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
          if (!selection?.length) return;
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

  // Кастомный рендерер с форматированием
  const createRenderer = () => (instance, td, row, col, prop, value, cellProperties) => {
    const settings = getCellSettings(row, col);

    td.style.backgroundColor = settings.color && settings.color !== '#FFFFFF' ? settings.color : '';
    td.style.color = settings.fontColor && settings.fontColor !== '#000000' ? settings.fontColor : '';
    td.style.fontWeight = settings.bold ? 'bold' : '';
    td.style.fontStyle = settings.italic ? 'italic' : '';
    td.style.textDecoration = settings.underline ? 'underline' : '';
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
      textRenderer(instance, td, row, col, prop, value, cellProperties);
    }

    return td;
  };

  // Закрытие модального окна
  const closeModal = () => {
    const modal = document.getElementById('cellSettingsModal');
    if (modal) modal.style.display = 'none';
    setContextMenuCell(null);
    saveTable();
  };

  // Пересчёт настроек при перемещении строк/столбцов
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

  const containerStyle = compactMode
    ? { height: '100%', display: 'flex', flexDirection: 'column' }
    : {};

  const tableWrapperStyle = compactMode
    ? { flex: 1, minHeight: '240px', height: '100%' }
    : {};

  const resolvedCompactHeight = compactHeight && compactHeight > 0 ? compactHeight : '100%';
  const resolvedCompactWidth = compactWidth && compactWidth > 0 ? compactWidth : '100%';

  useEffect(() => {
    if (!compactMode || !hotRef.current) {
      return;
    }
    const hot = hotRef.current.hotInstance;
    if (!hot) {
      return;
    }
    hot.updateSettings({
      height: resolvedCompactHeight,
      width: resolvedCompactWidth
    });
    if (typeof viewportZoom === 'number') {
      hot.refreshDimensions();
    }
    hot.render();
  }, [compactMode, resolvedCompactHeight, resolvedCompactWidth, viewportZoom]);

  return (
    <div style={containerStyle} className="nodrag">
      {/* Скрытый input для импорта */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
      />

      {/* Панель управления */}
      {!compactMode && (
        <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <input
            value={title}
            onChange={e => {
              const nextTitle = e.target.value;
              setTitle(nextTitle);
              if (onTitleChange) {
                onTitleChange(nextTitle);
              }
            }}
            style={{ fontSize: '20px', padding: '8px', width: '350px' }}
            placeholder="Название таблицы"
          />

          <button
            onClick={saveTable}
            style={{ padding: '10px 20px', background: '#007bff', color: 'white', fontWeight: 'bold' }}
          >
            Сохранить
          </button>

          {/* Импорт */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setShowImportMenu(!showImportMenu)}
              style={{ padding: '10px 20px', background: '#28a745', color: 'white' }}
            >
              Импорт ▼
            </button>
            {showImportMenu && (
              <div
                ref={importMenuRef}
                style={{
                  position: 'absolute', zIndex: 1000, background: 'white',
                  border: '1px solid #ccc', borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '180px',
                  marginTop: '5px'
                }}
              >
                <button onClick={() => { setShowImportMenu(false); handleImport('csv'); }}
                  style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  CSV
                </button>
                <button onClick={() => { setShowImportMenu(false); handleImport('json'); }}
                  style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  JSON (с форматированием)
                </button>
                <button onClick={() => { setShowImportMenu(false); handleImport('excel'); }}
                  style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  Excel (.xlsx/.xls)
                </button>
              </div>
            )}
          </div>

          {/* Экспорт */}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ padding: '10px 20px', background: '#ffc107', color: 'black', fontWeight: 'bold' }}
            >
              Экспорт ▼
            </button>
            {showExportMenu && (
              <div
                ref={exportMenuRef}
                style={{
                  position: 'absolute', zIndex: 1000, background: 'white',
                  border: '1px solid #ccc', borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '180px',
                  marginTop: '5px'
                }}
              >
                <button onClick={() => { setShowExportMenu(false); exportToCSV(); }}
                  style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  CSV
                </button>
                <button onClick={() => { setShowExportMenu(false); exportToJSON(); }}
                  style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  JSON (с форматированием)
                </button>
                <button onClick={() => { setShowExportMenu(false); exportToExcel(); }}
                  style={{ display: 'block', width: '100%', padding: '10px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {compactMode && showCompactControls && (
        <div style={{ marginBottom: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', flexShrink: 0 }}>
          <input
            value={title}
            onChange={e => {
              const nextTitle = e.target.value;
              setTitle(nextTitle);
              if (onTitleChange) {
                onTitleChange(nextTitle);
              }
            }}
            onBlur={saveTable}
            placeholder="Название таблицы"
            style={{
              padding: '6px 10px',
              fontSize: '12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              minWidth: '140px',
              flex: '1 1 140px'
            }}
          />
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setShowImportMenu(!showImportMenu)}
              style={{ padding: '6px 12px', background: '#28a745', color: 'white', fontSize: '12px' }}
            >
              Импорт ▼
            </button>
            {showImportMenu && (
              <div
                ref={importMenuRef}
                style={{
                  position: 'absolute', zIndex: 1000, background: 'white',
                  border: '1px solid #ccc', borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '160px',
                  marginTop: '5px'
                }}
              >
                <button onClick={() => { setShowImportMenu(false); handleImport('csv'); }}
                  style={{ display: 'block', width: '100%', padding: '8px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  CSV
                </button>
                <button onClick={() => { setShowImportMenu(false); handleImport('json'); }}
                  style={{ display: 'block', width: '100%', padding: '8px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  JSON (с форматированием)
                </button>
                <button onClick={() => { setShowImportMenu(false); handleImport('excel'); }}
                  style={{ display: 'block', width: '100%', padding: '8px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  Excel (.xlsx/.xls)
                </button>
              </div>
            )}
          </div>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{ padding: '6px 12px', background: '#ffc107', color: 'black', fontWeight: 'bold', fontSize: '12px' }}
            >
              Экспорт ▼
            </button>
            {showExportMenu && (
              <div
                ref={exportMenuRef}
                style={{
                  position: 'absolute', zIndex: 1000, background: 'white',
                  border: '1px solid #ccc', borderRadius: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', minWidth: '160px',
                  marginTop: '5px'
                }}
              >
                <button onClick={() => { setShowExportMenu(false); exportToCSV(); }}
                  style={{ display: 'block', width: '100%', padding: '8px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  CSV
                </button>
                <button onClick={() => { setShowExportMenu(false); exportToJSON(); }}
                  style={{ display: 'block', width: '100%', padding: '8px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  JSON (с форматированием)
                </button>
                <button onClick={() => { setShowExportMenu(false); exportToExcel(); }}
                  style={{ display: 'block', width: '100%', padding: '8px', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer' }}>
                  Excel (.xlsx)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Таблица */}
      {tableLoaded && (
        <div style={tableWrapperStyle} className="nodrag">
          <HotTable
            ref={hotRef}
            data={hotData}
            rowHeaders={true}
            colHeaders={true}
            height={compactMode ? resolvedCompactHeight : "70vh"}
            width={compactMode ? resolvedCompactWidth : "100%"}
            rowHeights={48}
            colWidths={100}
            stretchH="none"
            licenseKey="non-commercial-and-evaluation"
            formulas={{engine: HyperFormula}}
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
        </div>
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
              Форматирование ячейки
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

      {/* Стили */}
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
