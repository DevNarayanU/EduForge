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
  Handle,
  Position,
  Panel,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSend, FiSave, FiDownload, FiExternalLink, 
  FiYoutube, FiGlobe, FiX, FiPlus, FiTrash2, FiEdit3, FiFileText, FiCheck
} from 'react-icons/fi';
import { fetchApi } from '../services/api';
import { fetchYoutube } from '../services/youtube';
import Top_panel from '../components/top-panel/Top_panel';
import './Roadmap.css';

const CustomNode = ({ data, selected }) => {
  return (
    <div className={`custom-roadmap-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} id="t-top" className="custom-node-handle" />
      <Handle type="target" position={Position.Left} id="t-left" className="custom-node-handle" />
      
      <div className="custom-node-body">
        <div className="custom-node-accent" />
        <div className="custom-node-content">
          <div className="custom-node-label">{data.label}</div>
          {data.resources && data.resources.length > 0 && (
            <div className="custom-node-meta">
              <span className="resource-count-badge">
                {data.resources.length} {data.resources.length === 1 ? 'resource' : 'resources'}
              </span>
            </div>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} id="s-bottom" className="custom-node-handle" />
      <Handle type="source" position={Position.Right} id="s-right" className="custom-node-handle" />
    </div>
  );
};

const nodeTypes = {
  default: CustomNode,
  custom: CustomNode,
};


const getYouTubeId = (url) => {
  if (!url) return null;
  if (url.length === 11 && !url.includes('/') && !url.includes('.')) {
    return url;
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const initialNodes = [];
const initialEdges = [];

function RoadmapContent({ user, profileImage }) {
  const { screenToFlowPosition } = useReactFlow();
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

  // States for resource editing
  const [showAddResource, setShowAddResource] = useState(false);
  const [newResource, setNewResource] = useState({ title: '', url: '', type: 'article' });
  const [editingResourceIndex, setEditingResourceIndex] = useState(null);
  const [editingResource, setEditingResource] = useState({ title: '', url: '', type: 'article' });

  const updateResourceInState = useCallback((nodeId, targetResource, updates) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedResources = node.data.resources.map((res) => {
            if (res === targetResource || (res.type === targetResource.type && res.url === targetResource.url)) {
              return { ...res, ...updates };
            }
            return res;
          });
          return {
            ...node,
            data: { ...node.data, resources: updatedResources },
          };
        }
        return node;
      })
    );

    setSelectedNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev;
      const updatedResources = prev.data.resources.map((res) => {
        if (res === targetResource || (res.type === targetResource.type && res.url === targetResource.url)) {
          return { ...res, ...updates };
        }
        return res;
      });
      return {
        ...prev,
        data: { ...prev.data, resources: updatedResources },
      };
    });
  }, [setNodes, setSelectedNode]);

  const removeResourceFromState = useCallback((nodeId, targetResource) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedResources = node.data.resources.filter(
            (res) => !(res === targetResource || (res.type === targetResource.type && res.url === targetResource.url))
          );
          return {
            ...node,
            data: { ...node.data, resources: updatedResources },
          };
        }
        return node;
      })
    );

    setSelectedNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev;
      const updatedResources = prev.data.resources.filter(
        (res) => !(res === targetResource || (res.type === targetResource.type && res.url === targetResource.url))
      );
      return {
        ...prev,
        data: { ...prev.data, resources: updatedResources },
      };
    });
  }, [setNodes, setSelectedNode]);

  const updateNodeResources = useCallback((nodeId, updatedResources) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, resources: updatedResources },
          };
        }
        return node;
      })
    );
    setSelectedNode((prev) => {
      if (!prev || prev.id !== nodeId) return prev;
      return {
        ...prev,
        data: { ...prev.data, resources: updatedResources },
      };
    });
  }, [setNodes, setSelectedNode]);

  const handleAddResource = () => {
    if (!newResource.title.trim() || !newResource.url.trim()) return;
    const updatedResources = [...(selectedNode.data.resources || []), { ...newResource }];
    updateNodeResources(selectedNode.id, updatedResources);
    setNewResource({ title: '', url: '', type: 'article' });
    setShowAddResource(false);
  };

  const handleDeleteResource = (index) => {
    const updatedResources = (selectedNode.data.resources || []).filter((_, i) => i !== index);
    updateNodeResources(selectedNode.id, updatedResources);
  };

  const startEditingResource = (index, res) => {
    setEditingResourceIndex(index);
    setEditingResource({ ...res });
  };

  const handleSaveEditedResource = (index) => {
    if (!editingResource.title.trim() || !editingResource.url.trim()) return;
    const updatedResources = (selectedNode.data.resources || []).map((res, i) =>
      i === index ? { ...editingResource } : res
    );
    updateNodeResources(selectedNode.id, updatedResources);
    setEditingResourceIndex(null);
  };

  const addCustomNode = () => {
    const newId = `node_${Date.now()}`;
    let position = { x: 200, y: 200 };
    
    if (selectedNode) {
      position = {
        x: selectedNode.position.x,
        y: selectedNode.position.y + 150
      };
    } else if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      position = {
        x: lastNode.position.x,
        y: lastNode.position.y + 150
      };
    }
    
    const newNode = {
      id: newId,
      type: 'default',
      position,
      data: {
        label: 'New Step',
        resources: []
      }
    };
    
    setNodes((nds) => [...nds, newNode]);
    
    if (selectedNode) {
      const newEdge = {
        id: `e-${selectedNode.id}-${newId}`,
        source: selectedNode.id,
        target: newId,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        style: { stroke: '#6366f1', strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    }
    
    setSelectedNode(newNode);
    setIsEditing(true);
  };

  const onEdgeClick = useCallback((event, edge) => {
    if (window.confirm("Delete this connection?")) {
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
  }, [setEdges]);

  useEffect(() => {
    if (!selectedNode || !selectedNode.data || !selectedNode.data.resources) return;

    const videoRes = selectedNode.data.resources.find(
      (res) => res.type === 'video' && !res.verified && !res.isVerifying
    );
    if (!videoRes) return;

    const verifyAndFixVideo = async () => {
      const url = videoRes.url;
      const videoId = getYouTubeId(url);
      const isRickAstley = videoId === 'dQw4w9WgXcQ';

      updateResourceInState(selectedNode.id, videoRes, { isVerifying: true });

      let videoExists = false;
      if (videoId && !isRickAstley) {
        try {
          const data = await fetchYoutube('videos', { part: 'id', id: videoId });
          if (data && data.items && data.items.length > 0) {
            videoExists = true;
          }
        } catch (err) {
          console.error("Error verifying video existence:", err);
        }
      }

      if (videoExists) {
        updateResourceInState(selectedNode.id, videoRes, { verified: true, isVerifying: false });
      } else {
        try {
          const skillLower = (skill || roadmapTitle || "").toLowerCase().trim();
          const titleLower = (videoRes.title || "").toLowerCase();
          const query = titleLower.includes(skillLower) 
            ? videoRes.title 
            : `${skill || roadmapTitle || ""} ${videoRes.title}`.trim();

          const searchData = await fetchYoutube('search', {
            q: query,
            maxResults: 1,
            type: 'video',
            part: 'snippet'
          });

          if (searchData && searchData.items && searchData.items.length > 0) {
            const videoSnippet = searchData.items[0].snippet;
            const resTitleLower = videoSnippet.title.toLowerCase();
            const resDescLower = videoSnippet.description.toLowerCase();
            const labelLower = selectedNode.data.label.toLowerCase().trim();

            const isRelevant = 
              (skillLower && (resTitleLower.includes(skillLower) || resDescLower.includes(skillLower))) ||
              (labelLower && (resTitleLower.includes(labelLower) || resDescLower.includes(labelLower)));

            if (isRelevant) {
              const newVideoId = searchData.items[0].id.videoId;
              const newUrl = `https://www.youtube.com/watch?v=${newVideoId}`;
              const newTitle = videoSnippet.title;

              updateResourceInState(selectedNode.id, videoRes, {
                url: newUrl,
                title: newTitle,
                verified: true,
                isVerifying: false
              });
            } else {
              console.warn(`[YouTube Verification] Discarded irrelevant search result: "${videoSnippet.title}" for query: "${query}"`);
              removeResourceFromState(selectedNode.id, videoRes);
            }
          } else {
            removeResourceFromState(selectedNode.id, videoRes);
          }
        } catch (searchErr) {
          console.error("Error searching for replacement video:", searchErr);
          updateResourceInState(selectedNode.id, videoRes, { verified: true, isVerifying: false });
        }
      }
    };

    verifyAndFixVideo();
  }, [selectedNode, roadmapTitle, skill, updateResourceInState, removeResourceFromState]);
  
  const loadSpecificRoadmap = useCallback((roadmap) => {
    const cleanedNodes = (roadmap.nodes || []).map(node => {
      // eslint-disable-next-line no-unused-vars
      const { style, ...rest } = node;
      return rest;
    });
    setNodes(cleanedNodes);
    setEdges((roadmap.edges || []).map(e => ({
      ...e,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
      style: { stroke: '#6366f1', strokeWidth: 2 }
    })));
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
            setEdges((data.edges || []).map(e => ({
              ...e,
              animated: true,
              markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
              style: { stroke: '#6366f1', strokeWidth: 2 }
            })));
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
    (params) => {
      const newEdge = {
        ...params,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        style: { stroke: '#6366f1', strokeWidth: 2 }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setIsEditing(false);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setIsEditing(false);
  }, []);

  const onPaneDoubleClick = useCallback((event) => {
    if (
      event.target.classList.contains('react-flow__pane') ||
      event.target.classList.contains('react-flow__background') ||
      event.target.tagName === 'svg'
    ) {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newId = `node_${Date.now()}`;
      const newNode = {
        id: newId,
        type: 'default',
        position,
        data: {
          label: 'New Step',
          resources: []
        }
      };

      setNodes((nds) => [...nds, newNode]);

      if (selectedNode) {
        const newEdge = {
          id: `e-${selectedNode.id}-${newId}`,
          source: selectedNode.id,
          target: newId,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          style: { stroke: '#6366f1', strokeWidth: 2 }
        };
        setEdges((eds) => addEdge(newEdge, eds));
      }

      setSelectedNode(newNode);
      setIsEditing(true);
    }
  }, [screenToFlowPosition, selectedNode, setNodes, setEdges]);

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
          data: { ...n.data, label: n.label, resources: n.resources || [] }
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
                  {selectedNode.data.resources?.map((res, i) => {
                    if (res.isVerifying) {
                      return (
                        <div key={i} className="resource-item verifying">
                          <div className="spinner-small" />
                          <div className="res-info">
                            <span className="res-title">Verifying video source...</span>
                          </div>
                        </div>
                      );
                    }

                    if (editingResourceIndex === i) {
                      return (
                        <div key={i} className="resource-edit-form-inline">
                          <div className="form-group-inline">
                            <select
                              value={editingResource.type}
                              onChange={(e) => setEditingResource({ ...editingResource, type: e.target.value })}
                            >
                              <option value="article">Article</option>
                              <option value="video">Video</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Title"
                              value={editingResource.title}
                              onChange={(e) => setEditingResource({ ...editingResource, title: e.target.value })}
                            />
                            <input
                              type="text"
                              placeholder="URL"
                              value={editingResource.url}
                              onChange={(e) => setEditingResource({ ...editingResource, url: e.target.value })}
                            />
                          </div>
                          <div className="edit-form-actions">
                            <button className="save-edit-res-btn" onClick={() => handleSaveEditedResource(i)} title="Save">
                              <FiCheck />
                            </button>
                            <button className="cancel-edit-res-btn" onClick={() => setEditingResourceIndex(null)} title="Cancel">
                              <FiX />
                            </button>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={i} className="resource-item-wrapper">
                        <a 
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
                        <div className="resource-actions">
                          <button className="edit-res-btn" onClick={() => startEditingResource(i, res)} title="Edit Resource">
                            <FiEdit3 />
                          </button>
                          <button className="delete-res-btn" onClick={() => handleDeleteResource(i)} title="Delete Resource">
                            <FiTrash2 />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {showAddResource ? (
                    <div className="resource-add-form-inline">
                      <h4>Add New Resource</h4>
                      <div className="form-group-inline">
                        <select
                          value={newResource.type}
                          onChange={(e) => setNewResource({ ...newResource, type: e.target.value })}
                        >
                          <option value="article">Article</option>
                          <option value="video">Video</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Title"
                          value={newResource.title}
                          onChange={(e) => setNewResource({ ...newResource, title: e.target.value })}
                        />
                        <input
                          type="text"
                          placeholder="URL"
                          value={newResource.url}
                          onChange={(e) => setNewResource({ ...newResource, url: e.target.value })}
                        />
                      </div>
                      <div className="add-form-actions">
                        <button className="confirm-add-res-btn" onClick={handleAddResource}>
                          Add
                        </button>
                        <button className="cancel-add-res-btn" onClick={() => setShowAddResource(false)}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="add-res-placeholder" onClick={() => setShowAddResource(true)}>
                      <FiPlus /> Add Resource
                    </button>
                  )}
                </div>
                
                <button 
                  className="delete-node-btn"
                  onClick={() => {
                    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
                    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
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
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            onPaneDoubleClick={onPaneDoubleClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            colorMode="dark"
          >
            <Background color="rgba(99, 102, 241, 0.12)" gap={24} size={1.5} variant="dots" />
            <Controls />
            <MiniMap 
               nodeColor={() => '#6366f1'} 
               maskColor="rgba(0, 0, 0, 0.7)"
               style={{ background: '#0a0a0a' }}
            />
            <Panel position="top-right" className="canvas-custom-panel">
              <button className="canvas-add-btn" onClick={addCustomNode}>
                <FiPlus /> Add Step
              </button>
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default function Roadmap(props) {
  return (
    <ReactFlowProvider>
      <RoadmapContent {...props} />
    </ReactFlowProvider>
  );
}
