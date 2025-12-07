import React, { useEffect, useState, useRef } from 'react';
import { HotTable } from '@handsontable/react';
import Handsontable from 'handsontable';
import { registerAllModules } from 'handsontable/registry';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

registerAllModules();

const API_BASE = 'http://localhost:8000/api/tables/';

function TableEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
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
          console.log('Loaded cell settings:', res.data.cell_settings);
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

  // Изменить цвет ячейки
  const changeCellColor = (row, col) => {
    const currentColor = getCellSettings(row, col).color || '#FFFFFF';
    const color = prompt('Введите цвет в формате HEX (например, #FF0000):', currentColor);
    if (color) {
      updateCellSettings(row, col, { color });
      setTimeout(() => saveTable(), 100);
    }
  };

  // Переключить тип ячейки (текст/чекбокс)
  const toggleCellType = (row, col) => {
    const currentType = getCellSettings(row, col).type || 'text';
    const newType = currentType === 'text' ? 'checkbox' : 'text';

    updateCellSettings(row, col, { type: newType });

    // Если переключаем на чекбокс, обновляем значение
    if (newType === 'checkbox' && hotRef.current) {
      const hot = hotRef.current.hotInstance;
      const currentValue = hot.getDataAtCell(row, col);
      hot.setDataAtCell(row, col, Boolean(currentValue));
    }

    setTimeout(() => saveTable(), 100);
  };

  // Сбросить настройки ячейки
  const resetCellSettings = (row, col) => {
    updateCellSettings(row, col, null);
    setTimeout(() => saveTable(), 100);
  };

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
        key: 'cell_settings',
        name: 'Настройки ячейки',
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
      {
        key: 'set_color',
        name: 'Изменить цвет',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          changeCellColor(startRow, startCol);
        }
      },
      {
        key: 'toggle_checkbox',
        name: 'Переключить чекбокс',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          toggleCellType(startRow, startCol);
        }
      },
      {
        key: 'reset_cell',
        name: 'Сбросить настройки',
        callback: (key, selection) => {
          if (!selection || selection.length === 0) return;
          const startRow = selection[0].start.row;
          const startCol = selection[0].start.col;
          resetCellSettings(startRow, startCol);
        }
      }
    ];
  };

  // Создание рендерера для ячеек с учетом настроек
  const createRenderer = () => {
    return function(instance, td, row, col, prop, value) {
      // Получаем настройки ячейки
      const settings = getCellSettings(row, col);

      // Применяем цвет фона
      if (settings.color && settings.color !== '#FFFFFF') {
        td.style.backgroundColor = settings.color;
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

  // Добавление строки
  const addRow = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    const colCount = hot.countCols();
    const newRow = Array(colCount).fill('');
    hot.alter('insert_row_below', hot.countRows());
    setTimeout(() => saveTable(), 100);
  };

  // Добавление столбца
  const addColumn = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    hot.alter('insert_col_end');
    setTimeout(() => saveTable(), 100);
  };

  // Удаление строки
  const removeRow = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    if (hot.countRows() <= 1) return;
    hot.alter('remove_row', hot.countRows() - 1);
    setTimeout(() => saveTable(), 100);
  };

  // Удаление столбца
  const removeColumn = () => {
    if (!hotRef.current) return;
    const hot = hotRef.current.hotInstance;
    if (hot.countCols() <= 1) return;
    hot.alter('remove_col', hot.countCols() - 1);
    setTimeout(() => saveTable(), 100);
  };

  // Закрыть модальное окно
  const closeModal = () => {
    const modal = document.getElementById('cellSettingsModal');
    if (modal) {
      modal.style.display = 'none';
    }
    setContextMenuCell(null);
    saveTable();
  };

  // Обработчик изменения цвета в модальном окне
  const handleColorChange = (e) => {
    if (!contextMenuCell) return;
    const newColor = e.target.value;
    const newSettings = { ...contextMenuCell, color: newColor };
    setContextMenuCell(newSettings);
    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { color: newColor });
  };

  // Обработчик изменения типа в модальном окне
  const handleTypeChange = (newType) => {
    if (!contextMenuCell) return;
    const newSettings = { ...contextMenuCell, type: newType };
    setContextMenuCell(newSettings);
    toggleCellType(contextMenuCell.row, contextMenuCell.col);
  };

  return (
    <div onClick={(e) => {
      // Закрываем модальное окно при клике вне его
      const modal = document.getElementById('cellSettingsModal');
      if (modal && !modal.contains(e.target) && modal.style.display === 'block') {
        closeModal();
      }
    }}>
      {/* Панель управления */}
      <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => navigate(-1)}>Назад</button>

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          style={{ fontSize: '20px', padding: '8px', width: '350px' }}
          placeholder="Название таблицы"
        />

        <button onClick={saveTable} style={{ padding: '10px 20px', fontWeight: 'bold', background: '#007bff', color: 'white' }}>
          Сохранить
        </button>
      </div>

      {/* Панель управления таблицей */}
      <div style={{ marginBottom: '15px', padding: '10px', background: '#f8f9fa', borderRadius: '8px' }}>
        <strong>Управление таблицей:</strong>
        <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={addRow} style={{ padding: '6px 12px' }}>Добавить строку</button>
          <button onClick={addColumn} style={{ padding: '6px 12px' }}>Добавить столбец</button>
          <button onClick={removeRow} style={{ padding: '6px 12px' }}>Удалить строку</button>
          <button onClick={removeColumn} style={{ padding: '6px 12px' }}>Удалить столбец</button>
          <button
            onClick={() => {
              if (window.confirm('Сбросить настройки всех ячеек?')) {
                setCellSettings({});
                saveTable();
                if (hotRef.current) {
                  hotRef.current.hotInstance.render();
                }
              }
            }}
            style={{ padding: '6px 12px', background: '#dc3545', color: 'white' }}
          >
            Сбросить все настройки
          </button>
        </div>
        <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          <em>Нажмите правой кнопкой мыши на ячейку для настройки</em>
        </div>
      </div>

      {/* Кнопки экспорта */}
      <div style={{ marginBottom: '15px' }}>
        <button onClick={() => window.open(`${API_BASE}${id}/export_csv/`)}>Экспорт CSV</button>
        <button onClick={() => window.open(`${API_BASE}${id}/export_json/`)} style={{ marginLeft: '10px' }}>
          Экспорт JSON
        </button>
      </div>

      {/* Таблица */}
      {tableLoaded && (
        <HotTable
          ref={hotRef}
          data={hotData}
          rowHeaders={true}
          colHeaders={true}
          height="70vh"
          width="100%"
          licenseKey="non-commercial-and-evaluation"
          contextMenu={createContextMenu()}
          manualRowResize={true}
          manualColumnResize={true}
          manualRowMove={true}
          manualColumnMove={true}
          stretchH="all"
          autoColumnSize={true}
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
          minWidth: '300px',
          maxWidth: '400px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenuCell && (
          <>
            <h4 style={{ marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
              Настройки ячейки [{contextMenuCell.row + 1}, {contextMenuCell.col + 1}]
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

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Цвет фона:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="color"
                  value={contextMenuCell.color || '#FFFFFF'}
                  onChange={handleColorChange}
                  style={{ width: '60px', height: '40px', cursor: 'pointer', border: '1px solid #ccc' }}
                />
                <input
                  type="text"
                  value={contextMenuCell.color || '#FFFFFF'}
                  onChange={(e) => {
                    const newSettings = { ...contextMenuCell, color: e.target.value };
                    setContextMenuCell(newSettings);
                    updateCellSettings(contextMenuCell.row, contextMenuCell.col, { color: e.target.value });
                  }}
                  style={{ padding: '8px', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}
                  placeholder="#FFFFFF"
                />
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Тип данных:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleTypeChange('text')}
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
                  onClick={() => handleTypeChange('checkbox')}
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
                    resetCellSettings(contextMenuCell.row, contextMenuCell.col);
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
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Закрыть
                </button>
              </div>

              <div style={{ marginTop: '10px', fontSize: '12px', color: '#666' }}>
                <em>Настройки применяются только к выбранной ячейке</em>
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
          min-width: 200px;
        }

        .htContextMenu table tbody tr td {
          padding: 8px 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .htContextMenu table tbody tr td:hover {
          background-color: #f8f9fa;
        }

        /* Предпросмотр цвета в модальном окне */
        .color-preview {
          width: 30px;
          height: 30px;
          border: 1px solid #ccc;
          border-radius: 4px;
          margin-right: 10px;
        }
      `}</style>
    </div>
  );
}

export default TableEditor;