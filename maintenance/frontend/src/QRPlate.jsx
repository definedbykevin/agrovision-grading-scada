import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FiPrinter } from 'react-icons/fi';

export default function QRPlate({ machine, station, accentColor = 'gold' }) {
  if (!machine) return null;

  const qrValue = `agrovision://machine/${machine.id}?station=${encodeURIComponent(station)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="qr-plate-container" style={{
      border: `2px dashed ${accentColor}`,
      borderRadius: '8px',
      padding: '24px',
      maxWidth: '350px',
      margin: '20px auto',
      textAlign: 'center',
      backgroundColor: '#1e1e24',
      color: '#fff',
      boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
    }}>
      <div className="qr-plate-header" style={{
        fontSize: '12px',
        fontWeight: 'bold',
        letterSpacing: '2px',
        color: accentColor,
        marginBottom: '16px'
      }}>
        AgroVision ASSET IDENTIFICATION
      </div>

      <div style={{
        background: '#fff',
        padding: '16px',
        borderRadius: '8px',
        display: 'inline-block',
        marginBottom: '16px'
      }}>
        <QRCodeSVG value={qrValue} size={150} fgColor="#000" bgColor="#fff" includeMargin={true} />
      </div>

      <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>
        {machine.machine_name}
      </div>

      <div style={{ fontSize: '14px', color: '#a0a0a0', marginBottom: '4px' }}>
        Station: {station}
      </div>

      <div style={{ fontSize: '12px', color: '#606060', marginBottom: '20px' }}>
        UID: {machine.id.toString().padStart(4, '0')}
      </div>

      <button onClick={handlePrint} className="qr-print-btn" style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: accentColor === 'gold' ? '#ffc107' : accentColor,
        color: '#000',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'opacity 0.2s'
      }}>
        <FiPrinter /> Print Plate
      </button>
    </div>
  );
}
