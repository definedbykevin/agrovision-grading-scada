import { useState, useEffect } from 'react';
import { FiTool, FiPlus, FiEdit2, FiTrash2, FiChevronRight, FiChevronDown, FiPackage, FiLayers } from 'react-icons/fi';
import './MachineryListView.css';

/**
 * MachineryListView - Full-featured machinery management
 * Displays hierarchical: Stations → Machines → Parts
 * Integrates with backend/src/controllers/settingController.js
 */
function MachineryListView({ initialContext = '' }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedStations, setExpandedStations] = useState(new Set());
  const [expandedMachines, setExpandedMachines] = useState(new Set());
  
  // Parse initial context from menu navigation
  // Format: "Machinery List - Station - Machine - Part|machinery-list"
  const contextParts = initialContext.split(' - ').map(s => s.split('|')[0]);
  const initialStation = contextParts[1] || null;
  const initialMachine = contextParts[2] || null;

  useEffect(() => {
    fetchAllMachinery();
  }, []);

  useEffect(() => {
    if (initialStation && data.length > 0) {
      const station = data.find(s => s.station_name === initialStation);
      if (station) {
        setExpandedStations(new Set([station.id]));
        if (initialMachine) {
          const machine = station.machines?.find(m => m.machine_name === initialMachine);
          if (machine) {
            setExpandedMachines(new Set([machine.id]));
          }
        }
      }
    }
  }, [initialStation, initialMachine, data]);

  const fetchAllMachinery = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/maintenance/machinery/all', {
        credentials: 'include',
      });
      if (!res.ok) {
        console.error('Failed to fetch machinery — HTTP', res.status, res.statusText);
        return;
      }
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      } else {
        console.error('Failed to fetch machinery:', result.error || result.message);
      }
    } catch (error) {
      console.error('Failed to fetch machinery:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStation = async () => {
    const name = prompt('Enter new station name:');
    if (!name || !name.trim()) return;
    
    const sortOrder = data.length + 1;
    try {
      const res = await fetch('/api/maintenance/machinery/stations/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), sort_order: sortOrder })
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to add station: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error adding station: ' + error.message);
    }
  };

  const handleEditStation = async (station) => {
    const newName = prompt('Enter new station name:', station.station_name);
    if (!newName || !newName.trim() || newName === station.station_name) return;
    
    try {
      const res = await fetch(`/api/maintenance/machinery/stations/${station.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() })
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to update station: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error updating station: ' + error.message);
    }
  };

  const handleDeleteStation = async (station) => {
    if (!confirm(`Delete station "${station.station_name}" and all its machines/parts?`)) return;
    
    try {
      const res = await fetch(`/api/maintenance/machinery/stations/${station.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to delete station: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error deleting station: ' + error.message);
    }
  };

  const handleAddMachine = async (stationName) => {
    const name = prompt(`Add new machine for ${stationName}:`);
    if (!name || !name.trim()) return;
    
    try {
      const res = await fetch('/api/maintenance/machinery/machines/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ station: stationName, name: name.trim() })
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to add machine: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error adding machine: ' + error.message);
    }
  };

  const handleEditMachine = async (machine) => {
    const newName = prompt('Enter new machine name:', machine.machine_name);
    if (!newName || !newName.trim() || newName === machine.machine_name) return;
    
    try {
      const res = await fetch(`/api/maintenance/machinery/machines/${machine.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() })
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to update machine: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error updating machine: ' + error.message);
    }
  };

  const handleDeleteMachine = async (machine) => {
    if (!confirm(`Delete machine "${machine.machine_name}" and all its parts?`)) return;
    
    try {
      const res = await fetch(`/api/maintenance/machinery/machines/${machine.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to delete machine: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error deleting machine: ' + error.message);
    }
  };

  const handleAddPart = async (machineId, machineName) => {
    const partName = prompt(`Add new part for ${machineName}:`);
    if (!partName || !partName.trim()) return;
    
    try {
      const res = await fetch('/api/maintenance/machinery/parts/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ machineId, partName: partName.trim() })
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to add part: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error adding part: ' + error.message);
    }
  };

  const handleEditPart = async (part) => {
    const newName = prompt('Enter new part name:', part.part_name);
    if (!newName || !newName.trim() || newName === part.part_name) return;
    
    try {
      const res = await fetch(`/api/maintenance/machinery/parts/${part.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() })
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to update part: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error updating part: ' + error.message);
    }
  };

  const handleDeletePart = async (part) => {
    if (!confirm(`Delete part "${part.part_name}"?`)) return;
    
    try {
      const res = await fetch(`/api/maintenance/machinery/parts/${part.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const result = await res.json();
      if (result.success) {
        fetchAllMachinery();
      } else {
        alert('Failed to delete part: ' + (result.error || result.message));
      }
    } catch (error) {
      alert('Error deleting part: ' + error.message);
    }
  };

  const toggleStation = (stationId) => {
    setExpandedStations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stationId)) {
        newSet.delete(stationId);
      } else {
        newSet.add(stationId);
      }
      return newSet;
    });
  };

  const toggleMachine = (machineId) => {
    setExpandedMachines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(machineId)) {
        newSet.delete(machineId);
      } else {
        newSet.add(machineId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="machinery-list-container">
        <div className="machinery-list-header">
          <h1><FiLayers /> MACHINERY LIST</h1>
        </div>
        <div className="machinery-list-body">
          <div className="loading-state">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="machinery-list-container">
      <div className="machinery-list-header">
        <div className="header-left">
          <h1><FiLayers /> MACHINERY LIST</h1>
          <p>Hierarchical machinery asset management</p>
        </div>
        <button className="btn-add-primary" onClick={handleAddStation}>
          <FiPlus /> Add Station
        </button>
      </div>

      <div className="machinery-list-body">
        {data.length === 0 ? (
          <div className="empty-state">
            <FiPackage size={48} />
            <p>No stations yet. Add your first station to begin.</p>
          </div>
        ) : (
          <div className="machinery-tree">
            {data.map(station => {
              const isExpanded = expandedStations.has(station.id);
              const machineCount = station.machines?.length || 0;
              
              return (
                <div key={station.id} className="tree-station">
                  <div className="tree-node station-node">
                    <button 
                      className="expand-btn"
                      onClick={() => toggleStation(station.id)}
                    >
                      {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                    </button>
                    <FiLayers className="node-icon station-icon" />
                    <span className="node-label">{station.station_name}</span>
                    <span className="node-count">{machineCount} machines</span>
                    <div className="node-actions">
                      <button className="btn-icon" onClick={() => handleAddMachine(station.station_name)} title="Add Machine">
                        <FiPlus />
                      </button>
                      <button className="btn-icon" onClick={() => handleEditStation(station)} title="Edit Station">
                        <FiEdit2 />
                      </button>
                      <button className="btn-icon btn-delete" onClick={() => handleDeleteStation(station)} title="Delete Station">
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>

                  {isExpanded && station.machines && (
                    <div className="tree-children">
                      {station.machines.map(machine => {
                        const isMachineExpanded = expandedMachines.has(machine.id);
                        const partCount = machine.parts?.length || 0;

                        return (
                          <div key={machine.id} className="tree-machine">
                            <div className="tree-node machine-node">
                              <button 
                                className="expand-btn"
                                onClick={() => toggleMachine(machine.id)}
                              >
                                {isMachineExpanded ? <FiChevronDown /> : <FiChevronRight />}
                              </button>
                              <FiTool className="node-icon machine-icon" />
                              <span className="node-label">{machine.machine_name}</span>
                              <span className="node-count">{partCount} parts</span>
                              <div className="node-actions">
                                <button className="btn-icon" onClick={() => handleAddPart(machine.id, machine.machine_name)} title="Add Part">
                                  <FiPlus />
                                </button>
                                <button className="btn-icon" onClick={() => handleEditMachine(machine)} title="Edit Machine">
                                  <FiEdit2 />
                                </button>
                                <button className="btn-icon btn-delete" onClick={() => handleDeleteMachine(machine)} title="Delete Machine">
                                  <FiTrash2 />
                                </button>
                              </div>
                            </div>

                            {isMachineExpanded && machine.parts && (
                              <div className="tree-children">
                                {machine.parts.map(part => (
                                  <div key={part.id} className="tree-part">
                                    <div className="tree-node part-node">
                                      <FiPackage className="node-icon part-icon" />
                                      <span className="node-label">{part.part_name}</span>
                                      <div className="node-actions">
                                        <button className="btn-icon" onClick={() => handleEditPart(part)} title="Edit Part">
                                          <FiEdit2 />
                                        </button>
                                        <button className="btn-icon btn-delete" onClick={() => handleDeletePart(part)} title="Delete Part">
                                          <FiTrash2 />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MachineryListView;
