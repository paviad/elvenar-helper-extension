import React from 'react';
import { CityViewState } from '../CityViewState';
import { handleRedo } from './handleRedo';
import { handleUndo } from './handleUndo';

export function renderMoveLog(s: CityViewState) {
  const [moveLog, _1] = s.rMoveLog;
  const [redoStack, _2] = s.rRedoStack;

  return (
    <div style={{ width: 300, marginRight: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontWeight: 'bold', marginRight: 8 }}>Move Log</span>
        <button
          onClick={() => handleUndo(s)}
          disabled={moveLog.length === 0}
          style={{
            padding: '2px 10px',
            fontSize: 13,
            borderRadius: 4,
            border: '1px solid #888',
            background: moveLog.length === 0 ? '#eee' : '#fff',
            color: moveLog.length === 0 ? '#aaa' : '#222',
            cursor: moveLog.length === 0 ? 'not-allowed' : 'pointer',
            marginLeft: 8,
          }}
          title='Undo last move'
        >
          Undo (Ctrl+Z)
        </button>
        <button
          onClick={() => handleRedo(s)}
          disabled={redoStack.length === 0}
          style={{
            padding: '2px 10px',
            fontSize: 13,
            borderRadius: 4,
            border: '1px solid #888',
            background: redoStack.length === 0 ? '#eee' : '#fff',
            color: redoStack.length === 0 ? '#aaa' : '#222',
            cursor: redoStack.length === 0 ? 'not-allowed' : 'pointer',
            marginLeft: 8,
          }}
          title='Redo last undone move'
        >
          Redo (Ctrl+Y)
        </button>
      </div>
      <ol
        style={{
          fontSize: 13,
          paddingLeft: 18,
          maxHeight: 400,
          overflowY: 'auto',
          background: '#f8f8ff',
          border: '1px solid #ccc',
          borderRadius: 4,
        }}
      >
        {moveLog.length === 0 && <li style={{ color: '#888' }}>No moves yet</li>}
        {moveLog.map((log, idx) => (
          <li key={idx}>
            {log.type === 'delete' ? (
              <span style={{ color: '#b00', fontWeight: 500 }}>
                Deleted <span style={{ fontWeight: 400 }}>{log.name}</span> at ({log.from.x}, {log.from.y})
              </span>
            ) : log.type === 'duplicate' ? (
              <span style={{ color: '#0a6', fontWeight: 500 }}>
                Duplicated <span style={{ fontWeight: 400 }}>{log.name}</span> at ({log.from.x}, {log.from.y})
              </span>
            ) : (
              <span>
                <span style={{ fontWeight: 500 }}>{log.name}</span>: ({log.from.x}, {log.from.y}) → ({log.to.x}, {log.to.y})
              </span>
            )}
          </li>
        ))}
      </ol>
      <div style={{ marginTop: 12, fontSize: 12, color: '#888' }}>Most recent at bottom</div>
    </div>
  );
}
