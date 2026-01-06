import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import TableList from './TableList';
import TableEditor from './TableEditor';
import 'handsontable/dist/handsontable.full.min.css';

function App() {
  const [activeTableId, setActiveTableId] = useState(null);

  return (
    <Router>
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <Routes>
          <Route path="/" element={
            <div>
              <div style={{ marginBottom: '20px' }}>
                <TableList onTableSelect={setActiveTableId} />
              </div>
              {activeTableId && (
                <div style={{
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  padding: '20px',
                  marginTop: '30px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>Редактор таблицы</h3>
                    <button
                      onClick={() => setActiveTableId(null)}
                      style={{ padding: '8px 16px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                      Закрыть редактор
                    </button>
                  </div>
                  <TableEditor id={activeTableId} compactMode={false} />
                </div>
              )}
            </div>
          } />
          <Route path="/table/:id" element={<TableEditor />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;