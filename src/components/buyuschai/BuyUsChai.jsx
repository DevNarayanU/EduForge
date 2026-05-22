import { useState } from 'react';
import { FiCoffee, FiX, FiCopy, FiCheck } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import './BuyUsChai.css';

export default function BuyUsChai() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Replace this with the exact UPI ID once provided
  const upiId = "7012879159@ybl";

  const copyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button className="chai-floating-btn" onClick={() => setIsOpen(true)} title="Buy us a Chai!">
        <FiCoffee size={24} />
      </button>

      {isOpen && (
        <div className="chai-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="chai-modal-content" onClick={e => e.stopPropagation()}>
            <button className="chai-modal-close" onClick={() => setIsOpen(false)}>
              <FiX size={20} />
            </button>
            
            <div className="chai-modal-header">
              <div className="chai-icon-wrapper">
                <FiCoffee size={28} />
              </div>
              <h3>Buy us a Chai</h3>
            </div>
            
            <p className="chai-note">
              Built by students, for learners 🫶 If EduForge helped you learn, consider supporting us with a chai ☕ Your support keeps EduForge free and improving ✨
            </p>

            <div className="chai-qr-container">
              <QRCodeSVG 
                value={`upi://pay?pa=${upiId}&pn=EduForge`} 
                size={180} 
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <div className="chai-upi-box">
              <span>{upiId}</span>
              <button onClick={copyUpi} className="chai-copy-btn">
                {copied ? <FiCheck color="#10b981" /> : <FiCopy />}
              </button>
            </div>
            
            <p className="chai-footer-note">Scan with any UPI app</p>
          </div>
        </div>
      )}
    </>
  );
}
