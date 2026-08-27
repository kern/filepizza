import React, { useRef, useEffect, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import axios from 'axios';

const AstraPanel = ({ transaction, onClose }) => {
    const graphRef = useRef();
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    const [freezeStatus, setFreezeStatus] = useState(null);

    useEffect(() => {
        if (!transaction) return;

        // Construct graph data centered on the fraudster (sender for fan-out)
        // For Mule Fan-Out, the sender is the central node distributing funds.
        // We simulate connected nodes (mules) for visualization since we don't have the full graph in frontend state.
        // In a real app, we'd fetch neighbors from backend.

        const centerNode = transaction.sender_id;
        const receiverNode = transaction.receiver_id;

        // Mocking a fan-out network for visualization
        const nodes = [
            { id: centerNode, group: 'fraudster', val: 20 },
            { id: receiverNode, group: 'mule', val: 10 }
        ];

        const links = [
            { source: centerNode, target: receiverNode }
        ];

        // Add some dummy mules to show the "Fan-Out" pattern visually
        for (let i = 0; i < 8; i++) {
            const muleId = `mule-${i}`;
            nodes.push({ id: muleId, group: 'mule', val: 5 });
            links.push({ source: centerNode, target: muleId });
        }

        setGraphData({ nodes, links });
        setFreezeStatus(null);

    }, [transaction]);

    const handleFreeze = () => {
        if (!transaction) return;

        axios.post(`http://localhost:8000/freeze/${transaction.sender_id}`)
            .then(res => {
                setFreezeStatus('SUCCESS');
                alert(`ACCOUNT FROZEN: ${transaction.sender_id}`);
            })
            .catch(err => {
                setFreezeStatus('ERROR');
                alert('Freeze Action Failed');
            });
    };

    if (!transaction) return null;

    return (
        <div className="astra-panel">
            <div className="astra-header">
                <h2>ASTRA INTELLIGENCE PANEL</h2>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            <div className="graph-container">
                <ForceGraph2D
                    ref={graphRef}
                    graphData={graphData}
                    nodeAutoColorBy="group"
                    nodeLabel="id"
                    backgroundColor="#000000"
                    width={400}
                    height={300}
                    linkDirectionalParticles={2}
                    linkDirectionalParticleSpeed={d => 0.005}
                />
            </div>

            <div className="risk-summary">
                <div className="risk-item">
                    <span className="label">RISK VECTOR:</span>
                    <span className="value warning">MULE FAN-OUT</span>
                </div>
                <div className="risk-item">
                    <span className="label">VELOCITY:</span>
                    <span className="value">{transaction.factors?.velocity_1h || 'High'} txns / min</span>
                </div>
                <div className="risk-item">
                    <span className="label">GEO-CLUSTER:</span>
                    <span className="value">
                        Lat: {transaction.lat?.toFixed(4)}, Lng: {transaction.lng?.toFixed(4)}
                    </span>
                </div>
            </div>

            <div className="action-area">
                <button
                    className={`freeze-btn ${freezeStatus === 'SUCCESS' ? 'frozen' : ''}`}
                    onClick={handleFreeze}
                    disabled={freezeStatus === 'SUCCESS'}
                >
                    {freezeStatus === 'SUCCESS' ? 'ACCOUNT FROZEN' : 'INITIATE FREEZE'}
                </button>
            </div>
        </div>
    );
};

export default AstraPanel;
