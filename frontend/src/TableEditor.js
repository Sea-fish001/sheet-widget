import React, { useEffect, useState, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllModules } from 'handsontable/registry';
import axios from 'axios';

registerAllModules();

const API_BASE = 'http://localhost:8000/api/tables/';

function TableEditor({ id, compactMode = false }) {
  const hotRef = useRef(null);
  const [contextMenuCell, setContextMenuCell] = useState(null);
  const [cellSettings, setCellSettings] = useState({});
  const [title, setTitle] = useState('');
  const [hotData, setHotData] = useState([['']]);
  const [tableLoaded, setTableLoaded] = useState(false);

  // Загрузка данных
  useEffect(() => {
    axios.get(`${API_BASE}${id}/`)
      .then(res => {
        console.log('Table data loaded:', res.data);
        setTitle(res.data.title || 'Без названия');

        let rows = [];
        if (Array.isArray(res.data.data)) {
          rows = res.data.data;
        } else if (res.data.data && Array.isArray(res.data.data.rows)) {
          rows = res.data.data.rows;
        }

        setHotData(rows.length > 0 ? rows.map(row => row.map(cell => cell ?? '')) : [['']]);

        // Загружаем настройки ячеек, если есть
        if (res.data.cell_settings && typeof res.data.cell_settings === 'object') {
          setCellSettings(res.data.cell_settings);
        } else {
          setCellSettings({});
        }

        setTableLoaded(true);
      })
      .catch(err => {
        console.error('Error loading table:', err);
        alert('Ошибка загрузки таблицы');
      });
  }, [id]);

  // Сохранение таблицы
  const saveTable = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    const currentData = hot.getData();

    axios.patch(`${API_BASE}${id}/`, {
      title,
      data: { rows: currentData },
      cell_settings: cellSettings
    }).then(() => {
      console.log('Table saved successfully');
    }).catch((error) => {
      console.error('Save error:', error);
      alert('Ошибка сохранения');
    });
  };

  // Получить настройки ячейки
  const getCellSettings = (row, col) => {
    const key = `${row},${col}`;
    return cellSettings[key] || { color: '#FFFFFF', type: 'text' };
  };

  // Обновить настройки ячейки
  const updateCellSettings = (row, col, settings) => {
    const key = `${row},${col}`;
    const newSettings = { ...cellSettings };

    if (settings === null) {
      // Удалить настройки ячейки
      delete newSettings[key];
    } else {
      // Обновить настройки ячейки
      newSettings[key] = {
        ...getCellSettings(row, col),
        ...settings
      };
    }

    setCellSettings(newSettings);

    // Обновить отображение таблицы
    if (hotRef.current) {
      const hot = hotRef.current.hotInstance;
      hot.render();
    }
  };


//  // Переключить тип ячейки (текст/чекбокс)
//  const toggleCellType = (row, col) => {
//    const currentType = getCellSettings(row, col).type || 'text';
//    const newType = currentType === 'text' ? 'checkbox' : 'text';
//
//    updateCellSettings(row, col, { type: newType });
//
//    // Если переключаем на чекбокс, обновляем значение
//    if (newType === 'checkbox' && hotRef.current) {
//      const hot = hotRef.current.hotInstance;
//      const currentValue = hot.getDataAtCell(row, col);
//      hot.setDataAtCell(row, col, Boolean(currentValue));
//    }
//
//    setTimeout(() => saveTable(), 100);
//  };
//
//  // Сбросить настройки ячейки
//  const resetCellSettings = (row, col) => {
//    updateCellSettings(row, col, null);
//    setTimeout(() => saveTable(), 100);
//  };

  // Создание контекстного меню
  const createContextMenu = () => {
    return [
      'row_above',
      'row_below',
      'col_left',
      'col_right',
      'remove_row',
      'remove_col',
      '---------',
      {
        key: 'format_cell',
        name: 'Форматирование ячейки',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;

          const settings = getCellSettings(startRow, startCol);
          setContextMenuCell({
            row: startRow,
            col: startCol,
            ...settings
          });

          // Показываем модальное окно
          const modal = document.getElementById('cellSettingsModal');
          if (modal) {
            modal.style.display = 'block';
            // Позиционируем по центру экрана
            modal.style.left = '50%';
            modal.style.top = '50%';
            modal.style.transform = 'translate(-50%, -50%)';
          }
        }
      },

      '---------',
      {
        key: 'bold',
        name: 'Жирный',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          const settings = getCellSettings(startRow, startCol);
          const newBold = !settings.bold;
          updateCellSettings(startRow, startCol, { bold: newBold });
          setTimeout(() => saveTable(), 100);
        }
      },
      {
        key: 'italic',
        name: 'Курсив',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          const settings = getCellSettings(startRow, startCol);
          const newItalic = !settings.italic;
          updateCellSettings(startRow, startCol, { italic: newItalic });
          setTimeout(() => saveTable(), 100);
        }
      },
      {
        key: 'underline',
        name: 'Подчеркивание',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          const settings = getCellSettings(startRow, startCol);
          const newUnderline = !settings.underline;
          updateCellSettings(startRow, startCol, { underline: newUnderline });
          setTimeout(() => saveTable(), 100);
        }
      },
      '---------',
      {
        key: 'align_left',
        name: 'Выравнивание по левому краю',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          updateCellSettings(startRow, startCol, { align: 'left' });
          setTimeout(() => saveTable(), 100);
        }
      },
      {
        key: 'align_center',
        name: 'Выравнивание по центру',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          updateCellSettings(startRow, startCol, { align: 'center' });
          setTimeout(() => saveTable(), 100);
        }
      },
      {
        key: 'align_right',
        name: 'Выравнивание по правому краю',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          updateCellSettings(startRow, startCol, { align: 'right' });
          setTimeout(() => saveTable(), 100);
        }
      },
      '---------',
      {
        key: 'font_color',
        name: 'Цвет текста',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          const currentColor = getCellSettings(startRow, startCol).fontColor || '#000000';
          const color = prompt('Введите цвет текста в формате HEX (например, #FF0000):', currentColor);
          if (color) {
            updateCellSettings(startRow, startCol, { fontColor: color });
            setTimeout(() => saveTable(), 100);
          }
        }
      },
      {
        key: 'cell_color',
        name: 'Цвет фона',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          const currentColor = getCellSettings(startRow, startCol).color || '#FFFFFF';
          const color = prompt('Введите цвет фона в формате HEX (например, #FFFF00):', currentColor);
          if (color) {
            updateCellSettings(startRow, startCol, { color });
            setTimeout(() => saveTable(), 100);
          }
        }
      },
      '---------',
      {
        key: 'toggle_checkbox',
        name: 'Переключить чекбокс',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          const currentType = getCellSettings(startRow, startCol).type || 'text';
          const newType = currentType === 'text' ? 'checkbox' : 'text';

          updateCellSettings(startRow, startCol, { type: newType });

          if (newType === 'checkbox' && hotRef.current) {
            const hot = hotRef.current.hotInstance;
            const currentValue = hot.getDataAtCell(startRow, startCol);
            hot.setDataAtCell(startRow, startCol, Boolean(currentValue));
          }

          setTimeout(() => saveTable(), 100);
        }
      },
      {
        key: 'reset_cell',
        name: 'Сбросить настройки',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          updateCellSettings(startRow, startCol, null);
          setTimeout(() => saveTable(), 100);
        }
      }
    ];
  };

  // Расширенный рендерер с поддержкой форматирования
  const createRenderer = () => {
    return function(instance, td, row, col, prop, value) {
      // Получаем настройки ячейки
      const settings = getCellSettings(row, col);

      // Применяем цвет фона
      if (settings.color && settings.color !== '#FFFFFF') {
        td.style.backgroundColor = settings.color;
      }

      // Применяем цвет текста
      if (settings.fontColor && settings.fontColor !== '#000000') {
        td.style.color = settings.fontColor;
      }

      // Применяем форматирование текста
      if (settings.bold) td.style.fontWeight = 'bold';
      if (settings.italic) td.style.fontStyle = 'italic';
      if (settings.underline) td.style.textDecoration = 'underline';

      // Применяем выравнивание
      if (settings.align) {
        td.style.textAlign = settings.align;
      }

      // Для чекбоксов
      if (settings.type === 'checkbox') {
        td.innerHTML = '';
        td.style.textAlign = 'center';
        td.style.verticalAlign = 'middle';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(value);
        checkbox.style.margin = '0';
        checkbox.style.cursor = 'pointer';

        checkbox.addEventListener('change', (e) => {
          instance.setDataAtCell(row, col, e.target.checked);
          saveTable();
        });

        td.appendChild(checkbox);
      } else {
        // Для текста используем стандартный рендерер
        Handsontable.renderers.TextRenderer.apply(this, arguments);
      }

      return td;
    };
  };

//  // Добавление строки
//  const addRow = () => {
//    if (!hotRef.current) return;
//    const hot = hotRef.current.hotInstance;
//    const colCount = hot.countCols();
//    const newRow = Array(colCount).fill('');
//    hot.alter('insert_row_below', hot.countRows());
//    setTimeout(() => saveTable(), 100);
//  };
//
//  // Добавление столбца
//  const addColumn = () => {
//    if (!hotRef.current) return;
//    const hot = hotRef.current.hotInstance;
//    hot.alter('insert_col_end');
//    setTimeout(() => saveTable(), 100);
//  };
//
//  // Удаление строки
//  const removeRow = () => {
//    if (!hotRef.current) return;
//    const hot = hotRef.current.hotInstance;
//    if (hot.countRows() <= 1) return;
//    hot.alter('remove_row', hot.countRows() - 1);
//    setTimeout(() => saveTable(), 100);
//  };
//
//  // Удаление столбца
//  const removeColumn = () => {
//    if (!hotRef.current) return;
//    const hot = hotRef.current.hotInstance;
//    if (hot.countCols() <= 1) return;
//    hot.alter('remove_col', hot.countCols() - 1);
//    setTimeout(() => saveTable(), 100);
//  };

  // Закрыть модальное окно
  const closeModal = () => {
    const modal = document.getElementById('cellSettingsModal');
    if (modal) {
      modal.style.display = 'none';
    }
    setContextMenuCell(null);
    saveTable();
  };

//  // Обработчик изменения цвета в модальном окне
//  const handleColorChange = (e) => {
//    if (!contextMenuCell) return;
//    const newColor = e.target.value;
//    const newSettings = { ...contextMenuCell, color: newColor };
//    setContextMenuCell(newSettings);
//    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { color: newColor });
//  };
//
//  // Обработчик изменения типа в модальном окне
//  const handleTypeChange = (newType) => {
//    if (!contextMenuCell) return;
//    const newSettings = { ...contextMenuCell, type: newType };
//    setContextMenuCell(newSettings);
//    toggleCellType(contextMenuCell.row, contextMenuCell.col);
//  };

    // функция пересчёта координат
    const remapCellSettingsAfterMove = (type, movedIndexes, finalIndex) => {
      const hot = hotRef.current.hotInstance;
      if (!hot) return;

      const newSettings = {};
      const indexMapping = {};

      const count =
        type === 'row'
          ? hot.countRows()
          : hot.countCols();

      const remaining = Array.from({ length: count }, (_, i) => i)
        .filter(i => !movedIndexes.includes(i));

      remaining.splice(finalIndex, 0, ...movedIndexes);

      remaining.forEach((oldIndex, newIndex) => {
        indexMapping[oldIndex] = newIndex;
      });

      Object.entries(cellSettings).forEach(([key, value]) => {
        const [row, col] = key.split(',').map(Number);

        if (type === 'row') {
          const newRow = indexMapping[row];
          if (newRow !== undefined) {
            newSettings[`${newRow},${col}`] = value;
          }
        }

        if (type === 'col') {
          const newCol = indexMapping[col];
          if (newCol !== undefined) {
            newSettings[`${row},${newCol}`] = value;
          }
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

          <button onClick={saveTable} style={{ padding: '10px 20px', fontWeight: 'bold', background: '#007bff', color: 'white' }}>
            Сохранить
          </button>

          <button onClick={() => window.open(`${API_BASE}${id}/export_csv/`)}>Экспорт CSV</button>
          <button onClick={() => window.open(`${API_BASE}${id}/export_json/`)} style={{ marginLeft: '10px' }}>
            Экспорт JSON
          </button>
        </div>
      )}

      {/* Таблица */}
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
          autoColumnSize={false}

          licenseKey="non-commercial-and-evaluation"
          contextMenu={createContextMenu()}
          manualRowResize={true}
          manualColumnResize={true}
          manualRowMove={true}
          manualColumnMove={true}

          fixedRowsTop={0}
          fixedColumnsStart={1}
          cells={function(row, col) {
            const settings = getCellSettings(row, col);
            return {
              renderer: createRenderer(),
              type: settings.type === 'checkbox' ? 'checkbox' : 'text',
              className: settings.type === 'checkbox' ? 'htCenter htMiddle' : ''
            };
          }}

          // чтобы цвета ячеек тоже перетаскивались
          afterRowMove={(movedRows, finalIndex) => {
            remapCellSettingsAfterMove('row', movedRows, finalIndex);
            setTimeout(() => saveTable(), 100);
          }}
          afterColumnMove={(movedCols, finalIndex) => {
            remapCellSettingsAfterMove('col', movedCols, finalIndex);
            setTimeout(() => saveTable(), 100);
          }}

          // Обновляем таблицу при изменении данных
          afterChange={(changes, source) => {
            if (source === 'edit') {
              saveTable();
            }
          }}
        />
      )}

      {/* Модальное окно настроек ячейки */}
      <div
        id="cellSettingsModal"
        style={{
          display: 'none',
          position: 'fixed',
          zIndex: 1000,
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '20px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          minWidth: '400px',
          maxWidth: '500px'
        }}
      >
        {contextMenuCell && (
          <>
            <h4 style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Форматирование ячейки [{contextMenuCell.row + 1}, {contextMenuCell.col + 1}]
              <button
                onClick={closeModal}
                style={{
                  float: 'right',
                  padding: '2px 8px',
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Цвет фона:</label>
                <input
                  type="color"
                  value={contextMenuCell.color || '#FFFFFF'}
                  onChange={(e) => {
                    const newSettings = { ...contextMenuCell, color: e.target.value };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { color: e.target.value });
                  }}
                  style={{ width: '100%', height: '40px', cursor: 'pointer', border: '1px solid #ccc' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Цвет текста:</label>
                <input
                  type="color"
                  value={contextMenuCell.fontColor || '#000000'}
                  onChange={(e) => {
                    const newSettings = { ...contextMenuCell, fontColor: e.target.value };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { fontColor: e.target.value });
                  }}
                  style={{ width: '100%', height: '40px', cursor: 'pointer', border: '1px solid #ccc' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Формат текста:</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const newBold = !contextMenuCell.bold;
                    const newSettings = { ...contextMenuCell, bold: newBold };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { bold: newBold });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: contextMenuCell.bold ? '#007bff' : '#e9ecef',
                    color: contextMenuCell.bold ? 'white' : '#495057',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 'bold'
                  }}
                >
                  B
                </button>
                <button
                  onClick={() => {
                    const newItalic = !contextMenuCell.italic;
                    const newSettings = { ...contextMenuCell, italic: newItalic };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { italic: newItalic });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: contextMenuCell.italic ? '#007bff' : '#e9ecef',
                    color: contextMenuCell.italic ? 'white' : '#495057',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontStyle: 'italic'
                  }}
                >
                  I
                </button>
                <button
                  onClick={() => {
                    const newUnderline = !contextMenuCell.underline;
                    const newSettings = { ...contextMenuCell, underline: newUnderline };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { underline: newUnderline });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: contextMenuCell.underline ? '#007bff' : '#e9ecef',
                    color: contextMenuCell.underline ? 'white' : '#495057',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  U
                </button>
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Выравнивание:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const newSettings = { ...contextMenuCell, align: 'left' };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { align: 'left' });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: contextMenuCell.align === 'left' ? '#007bff' : '#e9ecef',
                    color: contextMenuCell.align === 'left' ? 'white' : '#495057',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  ←
                </button>
                <button
                  onClick={() => {
                    const newSettings = { ...contextMenuCell, align: 'center' };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { align: 'center' });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: contextMenuCell.align === 'center' ? '#007bff' : '#e9ecef',
                    color: contextMenuCell.align === 'center' ? 'white' : '#495057',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  ↔
                </button>
                <button
                  onClick={() => {
                    const newSettings = { ...contextMenuCell, align: 'right' };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { align: 'right' });
                  }}
                  style={{
                    padding: '8px 12px',
                    background: contextMenuCell.align === 'right' ? '#007bff' : '#e9ecef',
                    color: contextMenuCell.align === 'right' ? 'white' : '#495057',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  →
                </button>
              </div>
            </div>

            <div style={{ marginTop: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Тип данных:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    const newSettings = { ...contextMenuCell, type: 'text' };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { type: 'text' });
                    closeModal();
                  }}
                  style={{
                    padding: '8px 16px',
                    background: contextMenuCell.type === 'text' ? '#007bff' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Текст
                </button>
                <button
                  onClick={() => {
                    const newSettings = { ...contextMenuCell, type: 'checkbox' };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { type: 'checkbox' });
                    closeModal();
                  }}
                  style={{
                    padding: '8px 16px',
                    background: contextMenuCell.type === 'checkbox' ? '#007bff' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Чекбокс
                </button>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #eee' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, null);
                    closeModal();
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#dc3545',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Сбросить
                </button>

                <button
                  onClick={closeModal}
                  style={{
                    padding: '8px 16px',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Применить
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Стили для чекбоксов */}
      <style>{`
        .handsontable .htCheckbox {
          text-align: center;
          vertical-align: middle;
        }

        .handsontable .htCheckbox input[type="checkbox"] {
          margin: 0;
          cursor: pointer;
          transform: scale(1.2);
        }

        .handsontable td {
          vertical-align: middle;
          cursor: default;
        }

        .handsontable td:hover {
          outline: 2px solid rgba(0, 123, 255, 0.3);
          outline-offset: -2px;
        }

        /* Стили для контекстного меню */
        .htContextMenu {
          z-index: 999;
        }

        .htContextMenu table.htCore {
          min-width: 220px;
        }

        .htContextMenu table tbody tr td {
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .htContextMenu table tbody tr td:hover {
          background-color: #f8f9fa;
        }

        .handsontable .htLeft {
          text-align: left;
        }

        .handsontable .htCenter {
          text-align: center;
        }

        .handsontable .htRight {
          text-align: right;
        }
      `}</style>
    </div>
  );
}

export default TableEditor;