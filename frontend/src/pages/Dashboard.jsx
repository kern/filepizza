import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import socket from '../utils/socket';
import axios from 'axios';
import AstraPanel from '../components/AstraPanel';

// Fix Leaflet icon issue
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

const Dashboard = () => {
    const [alerts, setAlerts] = useState([]);
    const [hotspots, setHotspots] = useState([]);
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [selectedAlert, setSelectedAlert] = useState(null);

    useEffect(() => {
        // Connect to socket
        socket.on('connect', () => {
            console.log('Connected to WebSocket');
            setIsConnected(true);
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from WebSocket');
            setIsConnected(false);
        });

        // Listen for alerts
        socket.on('new_alert', (data) => {
            console.log('New Alert:', data);
            setAlerts((prev) => [data, ...prev]); // Add new alert to top
            // Play sound effect (optional)
        });

        // Fetch initial hotspots
        axios.get('http://localhost:8000/hotspots')
            .then(res => {
                setHotspots(res.data);
            })
            .catch(err => console.error("Error fetching hotspots:", err));

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('new_alert');
        };
    }, []);

    const startSimulation = () => {
        axios.post('http://localhost:8000/sim/start')
            .then(res => console.log(res.data.message))
            .catch(() => console.error("Error starting simulation"));
    };

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>KAVACH TITANIUM</h2>
                    <div className="status">
                        Status: <span style={{ color: isConnected ? '#0f0' : '#f00' }}>
                            {isConnected ? 'LIVE' : 'OFFLINE'}
                        </span>
                    </div>
                    <button onClick={startSimulation} className="sim-btn">
                        Start Simulation
                    </button>
                </div>

                <div className="alerts-list">
                    <h3>Recent Alerts ({alerts.length})</h3>
                    {alerts.length === 0 && <p className="no-alerts">No alerts yet...</p>}
                    {alerts.map((alert, index) => (
                        <div key={index} className="alert-card">
                            <div className="alert-header">
                                <span className="alert-id">TXN: {alert.txn_id.substring(0, 8)}...</span>
                                <span className="alert-score">Risk: {(alert.risk_score * 100).toFixed(0)}%</span>
                            </div>
                            <div className="alert-details">
                                <p>Graph Risk: {alert.factors.graph_risk}</p>
                                <p>AI Risk: {alert.factors.ai_risk.toFixed(2)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Map */}
            <div className="map-container">
                <MapContainer
                    center={[22.5937, 78.9629]} // Center of India
                    zoom={5}
                    minZoom={4}
                    maxBounds={[
                        [-10, 30], // South West (Indian Ocean/Africa)
                        [50, 130]  // North East (China/Japan)
                    ]}
                    maxBoundsViscosity={1.0}
                    style={{ height: '100%', width: '100%', background: '#1a1a1a' }}
                >
                    {/* CartoDB Dark Matter Tiles */}
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        noWrap={true}
                    />

                    {/* Render Hotspots (Static/Historical) */}
                    {hotspots.map((h, i) => (
                        <CircleMarker
                            key={`hotspot-${i}`}
                            center={[h.lat, h.lng]}
                            radius={5}
                            pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.5, weight: 0 }}
                        >
                            <Popup>Historical Hotspot</Popup>
                        </CircleMarker>
                    ))}

                    {/* Render Live Alerts */}
                    {alerts.map((alert, i) => (
                        alert.lat && alert.lng && (
                            <CircleMarker
                                key={`alert-${i}`}
                                center={[alert.lat, alert.lng]}
                                radius={10}
                                pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.8 }}
                                eventHandlers={{
                                    click: () => setSelectedAlert(alert),
                                }}
                            >
                                <Popup>
                                    <strong>FRAUD ALERT</strong><br />
                                    Risk: {(alert.risk_score * 100).toFixed(0)}%<br />
                                    Txn: {alert.txn_id}
                                </Popup>
                            </CircleMarker>
                        )
                    ))}
                </MapContainer>

                {/* Astra Panel Overlay */}
                {selectedAlert && (
                    <div className="astra-overlay">
                        <AstraPanel
                            transaction={selectedAlert}
                            onClose={() => setSelectedAlert(null)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
