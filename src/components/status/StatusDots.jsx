import React from 'react';
import { useConnectivity } from '../../hooks/useConnectivity';
import './StatusDots.css';

export default function StatusDots() {
    const { isOnline, backendStatus } = useConnectivity();

    return (
        <div className="status-indicators">
            <div 
                className={`status-dot ${isOnline ? 'online' : 'offline'}`} 
                title={isOnline ? 'Internet Online' : 'Internet Offline'}
            />
            <div 
                className={`status-dot ${backendStatus === 'online' ? 'online' : (backendStatus === 'loading' ? 'loading' : 'offline')}`} 
                title={`Backend: ${backendStatus}`}
            />
        </div>
    );
}
