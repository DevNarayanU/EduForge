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

  const handlePayment = (app) => {
    let url = `upi://pay?pa=${upiId}&pn=EduForge&cu=INR`;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (app === 'gpay') {
      if (isAndroid) {
        url = `intent://pay?pa=${upiId}&pn=EduForge&cu=INR#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      } else if (isIOS) {
        url = `gpay://upi/pay?pa=${upiId}&pn=EduForge&cu=INR`;
      }
    } else if (app === 'phonepe') {
      url = `phonepe://pay?pa=${upiId}&pn=EduForge&cu=INR`;
    } else if (app === 'paytm') {
      url = `paytmmp://pay?pa=${upiId}&pn=EduForge&cu=INR`;
    } else if (app === 'bhim') {
      url = `bhim://pay?pa=${upiId}&pn=EduForge&cu=INR`;
    }

    if (app === 'generic' || (!isAndroid && !isIOS)) {
      window.location.href = `upi://pay?pa=${upiId}&pn=EduForge&cu=INR`;
      return;
    }

    // Try opening specific app deep link
    const start = Date.now();
    window.location.href = url;

    // Fallback to generic chooser if app is not installed/opened
    setTimeout(() => {
      if (Date.now() - start < 2000) {
        window.location.href = `upi://pay?pa=${upiId}&pn=EduForge&cu=INR`;
      }
    }, 1500);
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

            <div className="chai-mobile-pay">
              <p className="chai-mobile-title">Pay directly via UPI app:</p>
              <div className="chai-pay-grid">
                <button 
                  onClick={() => handlePayment('gpay')} 
                  className="chai-pay-btn gpay"
                  title="Pay with Google Pay"
                >
                  Google Pay
                </button>
                <button 
                  onClick={() => handlePayment('phonepe')} 
                  className="chai-pay-btn phonepe"
                  title="Pay with PhonePe"
                >
                  PhonePe
                </button>
                <button 
                  onClick={() => handlePayment('paytm')} 
                  className="chai-pay-btn paytm"
                  title="Pay with Paytm"
                >
                  Paytm
                </button>
                <button 
                  onClick={() => handlePayment('bhim')} 
                  className="chai-pay-btn bhim"
                  title="Pay with BHIM"
                >
                  BHIM
                </button>
              </div>
              <button 
                onClick={() => handlePayment('generic')} 
                className="chai-pay-btn generic-upi"
                title="Pay with other UPI App"
              >
                Pay via any other UPI App
              </button>
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
