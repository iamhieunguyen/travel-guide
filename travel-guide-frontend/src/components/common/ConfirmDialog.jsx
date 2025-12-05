// components/common/ConfirmDialog.jsx
export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <>
      <div 
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999998, animation: 'fadeIn 0.2s ease-out'
        }}
        onClick={onCancel}
      />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        zIndex: 999999, backgroundColor: 'white', padding: '24px', borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', minWidth: '400px',
        animation: 'scaleIn 0.3s ease-out', fontFamily: 'Poppins, sans-serif'
      }}>
        <p style={{ fontSize: '15px', color: '#4b5563', marginBottom: '24px', lineHeight: '1.5' }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            background: 'white', border: '1px solid #d1d5db', color: '#374151', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600', padding: '10px 24px', borderRadius: '8px', minWidth: '100px'
          }}>Cancel</button>
          <button onClick={onConfirm} style={{
            background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer',
            fontSize: '14px', fontWeight: '600', padding: '10px 24px', borderRadius: '8px', minWidth: '100px',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
          }}>OK</button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { transform: translate(-50%, -50%) scale(0.9); opacity: 0; } to { transform: translate(-50%, -50%) scale(1); opacity: 1; } }
      `}</style>
    </>
  );
}
