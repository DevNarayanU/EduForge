import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSend, FiSave, FiDownload, FiExternalLink, 
  FiYoutube, FiGlobe, FiX, FiPlus, FiTrash2, FiEdit3, FiFileText
} from 'react-icons/fi';
import { fetchApi } from '../services/api';
import Top_panel from '../components/top-panel/Top_panel';
import './Roadmap.css';

const initialNodes = [];
const initialEdges = [];

export default function Roadmap({ user, profileImage }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [skill, setSkill] = useState('');
  const [roadmapTitle, setRoadmapTitle] = useState('');
  const [currentRoadmapId, setCurrentRoadmapId] = useState(null);
  const [roadmaps, setRoadmaps] = useState([]);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [recentNotes, setRecentNotes] = useState([]);
  
  const loadSpecificRoadmap = useCallback((roadmap) => {
    setNodes(roadmap.nodes || []);
    setEdges(roadmap.edges || []);
    setRoadmapTitle(roadmap.title || "");
    setCurrentRoadmapId(roadmap.id);
    setSkill(roadmap.skill || "");
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  useEffect(() => {
    const loadNotes = async () => {
      if (!user) return;
      try {
        const response = await fetchApi('getNotes', { username: user }, 'GET', { useCache: true });
        const data = await response.json();
        if (Array.isArray(data)) {
          setRecentNotes(data.slice(-5).reverse());
        }
      } catch (e) {
        console.error("Failed to load notes", e);
      }
    };
    loadNotes();
  }, [user]);

  useEffect(() => {
    const loadRoadmaps = async () => {
      if (!user) return;
      try {
        const response = await fetchApi('getRoadmap', { username: user }, 'GET', { component: 'roadmap', useCache: true });
        const result = await response.json();
        if (result.status === 'success' && result.roadmap) {
          const data = result.roadmap;
          if (Array.isArray(data)) {
            setRoadmaps(data);
            if (data.length > 0) {
              const latest = data[data.length - 1];
              loadSpecificRoadmap(latest);
            }
          } else if (data.nodes) {
            // Legacy single roadmap
            setNodes(data.nodes);
            setEdges(data.edges);
            setRoadmapTitle(data.title || "My Roadmap");
            setRoadmaps([data]);
          }
        }
      } catch {
        console.error("Failed to load roadmaps");
      }
    };
    loadRoadmaps();
  }, [user, loadSpecificRoadmap, setNodes, setEdges]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setIsEditing(false);
  }, []);

  const generateRoadmap = async (e) => {
    e.preventDefault();
    if (!skill.trim()) return;

    setIsGenerating(true);
    setMessage('Forging Learning Path...');
    setSelectedNode(null);

    try {
      const response = await fetchApi('generateRoadmap', { username: user, skill }, 'POST', { component: 'roadmap' });
      const result = await response.json();

      if (result.status === 'success') {
        const { nodes: newNodes, edges: newEdges } = result.roadmap;
        setNodes(newNodes.map(n => ({
          ...n,
          data: { ...n.data, label: n.label, resources: n.resources || [] },
          style: { 
            background: 'rgba(20, 20, 20, 0.9)', 
            color: '#fff', 
            border: '1px solid #333', 
            borderRadius: '16px',
            padding: '15px',
            fontSize: '14px',
            width: 200,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease'
          }
        })));
        setEdges(newEdges.map(e => ({
          ...e,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          style: { stroke: '#6366f1', strokeWidth: 2 }
        })));
        setRoadmapTitle(skill);
        setCurrentRoadmapId(null);
        setMessage('Roadmap generated!');
      } else {
        setMessage('Error: ' + result.error);
      }
    } catch {
      setMessage('Failed to generate roadmap.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveRoadmap = async () => {
    if (!roadmapTitle.trim()) {
      setMessage('Please give your roadmap a heading.');
      return;
    }
    setMessage('Saving...');
    try {
      const roadmapData = {
        id: currentRoadmapId,
        title: roadmapTitle,
        skill: skill,
        nodes,
        edges
      };
      const response = await fetchApi('saveRoadmap', { 
        username: user, 
        title: roadmapTitle, 
        skill, 
        roadmap: roadmapData 
      }, 'POST', { component: 'roadmap' });
      
      const result = await response.json();
      if (result.status === 'success') {
        setRoadmaps(result.roadmaps || []);
        // Find the saved roadmap to get its ID if it was new
        const saved = result.roadmaps.find(r => r.title === roadmapTitle) || result.roadmaps[result.roadmaps.length - 1];
        setCurrentRoadmapId(saved.id);
        setMessage('Roadmap saved!');
      }
    } catch {
      setMessage('Save failed.');
    }
  };

  const createNewCanvas = () => {
    if (window.confirm("Start a new roadmap? Current unsaved changes will be lost.")) {
      setNodes([]);
      setEdges([]);
      setSkill('');
      setRoadmapTitle('');
      setCurrentRoadmapId(null);
      setSelectedNode(null);
      setMessage('New canvas created.');
    }
  };

  const updateNodeLabel = (newLabel) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: { ...node.data, label: newLabel },
          };
        }
        return node;
      })
    );
    setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: newLabel } });
  };

  return (
    <div className="roadmap-page">
      <Top_panel user={user} profileImage={profileImage} />
      
      <div className="roadmap-container">
        <div className="roadmap-sidebar">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="roadmap-controls"
          >
            <div className="roadmap-header-row">
              <h2>AI Roadmap</h2>
              <button className="new-canvas-btn" onClick={createNewCanvas} title="New Roadmap">
                <FiPlus />
              </button>
            </div>
            
            <form onSubmit={generateRoadmap} className="roadmap-input-group">
              <input
                type="text"
                value={skill}
                onChange={(e) => setSkill(e.target.value)}
                placeholder="Topic (e.g. Docker)"
                disabled={isGenerating}
              />
              <button type="submit" disabled={isGenerating}>
                {isGenerating ? <div className="spinner" /> : <FiSend />}
              </button>
            </form>

            <div className="roadmap-title-field" style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '0.4rem' }}>Roadmap Heading</label>
              <div className="roadmap-input-group">
                <input
                  type="text"
                  value={roadmapTitle}
                  onChange={(e) => setRoadmapTitle(e.target.value)}
                  placeholder="Enter roadmap heading..."
                />
              </div>
            </div>

            <AnimatePresence>
              {message && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="roadmap-message">
                  {message}
                </motion.div>
              )}
            </AnimatePresence>

            {roadmaps.length > 0 && (
              <div className="saved-roadmaps-list">
                <h3>Your Roadmaps</h3>
                <div className="roadmaps-scroll">
                  {roadmaps.map((rm) => (
                    <div 
                      key={rm.id} 
                      className={`roadmap-list-item ${currentRoadmapId === rm.id ? 'active' : ''}`}
                      onClick={() => loadSpecificRoadmap(rm)}
                    >
                      <FiFileText />
                      <span>{rm.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recentNotes.length > 0 && (
              <div className="saved-roadmaps-list">
                <h3>Recent Notes</h3>
                <div className="roadmaps-scroll">
                  {recentNotes.map((note) => (
                    <div key={note.video_id} className="roadmap-list-item">
                      <FiEdit3 />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.8rem', color: '#fff' }}>{note.title}</span>
                        <span style={{ fontSize: '0.7rem', color: '#555', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                          {note.content}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="roadmap-actions">
              <button onClick={saveRoadmap}><FiSave /> Save Roadmap</button>
              <button onClick={() => window.print()}><FiDownload /> Export</button>
            </div>
          </motion.div>

          <AnimatePresence>
            {selectedNode && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="node-resources-panel"
              >
                <div className="panel-header">
                  {isEditing ? (
                    <input 
                      className="edit-label-input"
                      value={selectedNode.data.label}
                      onChange={(e) => updateNodeLabel(e.target.value)}
                      onBlur={() => setIsEditing(false)}
                      autoFocus
                    />
                  ) : (
                    <h3>{selectedNode.data.label}</h3>
                  )}
                  <div className="panel-tools">
                    <button onClick={() => setIsEditing(!isEditing)}><FiEdit3 /></button>
                    <button onClick={() => setSelectedNode(null)}><FiX /></button>
                  </div>
                </div>
                
                <div className="resources-list">
                  {selectedNode.data.resources?.map((res, i) => (
                    <a 
                      key={i} 
                      href={res.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="resource-item"
                    >
                      {res.type === 'video' ? <FiYoutube className="res-icon video" /> : <FiGlobe className="res-icon site" />}
                      <div className="res-info">
                        <span className="res-title">{res.title}</span>
                        <FiExternalLink className="res-link-icon" />
                      </div>
                    </a>
                  ))}
                  <button className="add-res-placeholder"><FiPlus /> Add Resource</button>
                </div>
                
                <button 
                  className="delete-node-btn"
                  onClick={() => {
                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                    setSelectedNode(null);
                  }}
                >
                  <FiTrash2 /> Delete Step
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="roadmap-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            colorMode="dark"
          >
            <Background color="#111" gap={25} variant="dots" />
            <Controls />
            <MiniMap 
               nodeColor={() => '#6366f1'} 
               maskColor="rgba(0, 0, 0, 0.7)"
               style={{ background: '#0a0a0a' }}
            />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}
