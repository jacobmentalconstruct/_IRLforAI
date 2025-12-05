import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './utils/database';
import { generateStartRoom, getPlayerAction, resolveAction } from './services/agents';
import { Console } from './components/Console';
import { MapVisualizer } from './components/MapVisualizer';
import { DatabaseView } from './components/DatabaseView';
import { Room, PlayerState } from './types';
import { Terminal, Database, Play, Pause, RefreshCw, Cpu } from 'lucide-react';

export default function App() {
  const [initialized, setInitialized] = useState(false);
  const [logs, setLogs] = useState(db.getLogs());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [player, setPlayer] = useState<PlayerState>(db.getPlayer());
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [tick, setTick] = useState(0); // To force DB view updates
  
  // Ref to track if we should continue loop in async closures
  const autoPlayRef = useRef(isAutoPlaying);
  useEffect(() => { autoPlayRef.current = isAutoPlaying; }, [isAutoPlaying]);

  const refreshState = useCallback(() => {
    setLogs([...db.getLogs()]);
    setRooms(db.selectAllRooms());
    setPlayer(db.getPlayer());
    setTick(t => t + 1);
  }, []);

  // Initialization
  useEffect(() => {
    const initGame = async () => {
      if (db.getLogs().length === 0) {
        db.insertLog('SYSTEM', 'Initializing Gemini Zork World...');
        refreshState();
        
        try {
          const startRoom = await generateStartRoom();
          db.insertOrUpdateRoom(startRoom);
          db.updatePlayer({ currentRoomId: startRoom.id });
          db.insertLog('GM', startRoom.description);
          refreshState();
        } catch (e) {
          db.insertLog('SYSTEM', 'Error initializing world.');
        }
      } else {
          // Load existing
          refreshState();
      }
      setInitialized(true);
    };
    initGame();
  }, [refreshState]);

  // The Game Turn Logic
  const executeTurn = async () => {
    if (processing) return;
    setProcessing(true);

    try {
        const currentRoomId = db.getPlayer().currentRoomId;
        const currentRoom = db.selectRoom(currentRoomId);
        
        if (!currentRoom) {
            db.insertLog('SYSTEM', 'CRITICAL ERROR: Player in void.');
            setProcessing(false);
            return;
        }

        // 1. Agent 1 (Player) thinks
        const history = db.getLogs().map(l => `${l.role}: ${l.text}`);
        const playerAction = await getPlayerAction(currentRoom, history, db.getPlayer().inventory);
        
        db.insertLog('PLAYER', `> ${playerAction}`);
        refreshState();

        // Short delay for dramatic effect
        await new Promise(r => setTimeout(r, 800));

        // 2. Agent 2 (GM) resolves
        const knownRoomsMap = db.selectAllRooms().reduce((acc, r) => ({...acc, [r.id]: r}), {});
        const resolution = await resolveAction(playerAction, currentRoom, knownRoomsMap, db.getPlayer());

        // 3. Update State
        db.insertLog('GM', resolution.narrative);

        if (resolution.newRoom) {
            // Logic to position new room relative to old one based on direction would go here
            // For now, we rely on the GM to have assigned coords or we mock them simply:
            // (In a real game engine, we'd parse the 'direction' from action to offset coords)
            const exists = db.selectRoom(resolution.newRoom.id);
            if (!exists) {
                // Heuristic for simple visualization: Random offset if coords duplicate or missing
                // In production, we'd pass the specific direction to the GM resolver to get accurate relative coords.
                // Assuming GM returns coords in the JSON now for simplicity or we jitter:
                const newRoom = { ...resolution.newRoom };
                if (!newRoom.coordinates) {
                   newRoom.coordinates = { 
                       x: currentRoom.coordinates.x + (Math.random() > 0.5 ? 1 : -1), 
                       y: currentRoom.coordinates.y + (Math.random() > 0.5 ? 1 : -1) 
                   };
                }
                db.insertOrUpdateRoom(newRoom);
            }
        }

        if (resolution.movedToRoomId) {
            db.updatePlayer({ currentRoomId: resolution.movedToRoomId });
        }

        if (resolution.playerUpdate) {
            const currentInv = db.getPlayer().inventory;
            let newInv = [...currentInv];
            if (resolution.playerUpdate.inventoryToAdd) {
                newInv = [...newInv, ...resolution.playerUpdate.inventoryToAdd];
            }
            if (resolution.playerUpdate.inventoryToRemove) {
                newInv = newInv.filter(i => !resolution.playerUpdate?.inventoryToRemove?.includes(i));
            }
            db.updatePlayer({ 
                health: resolution.playerUpdate.health || db.getPlayer().health,
                inventory: newInv
            });
        }

        refreshState();

    } catch (e) {
        console.error(e);
        db.insertLog('SYSTEM', 'Agents encountered a quantum error.');
    } finally {
        setProcessing(false);
    }
  };

  // Auto Play Effect
  useEffect(() => {
    let interval: any;
    if (isAutoPlaying) {
      interval = setInterval(() => {
        if (!processing && initialized) {
          executeTurn();
        }
      }, 4000); // 4 seconds between turns
    }
    return () => clearInterval(interval);
  }, [isAutoPlaying, processing, initialized]);

  const handleReset = () => {
      setIsAutoPlaying(false);
      db.reset();
      window.location.reload();
  }

  if (!initialized) return <div className="bg-black h-screen text-[#33ff00] p-10 font-mono">Booting Neural Interface...</div>;

  return (
    <div className="h-screen w-screen bg-[#111] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-black border-b border-[#33ff00]/30 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
            <Cpu className="text-[#33ff00]" />
            <h1 className="text-xl font-bold text-[#33ff00] tracking-wider">GEMINI.ZORK.AGENTS</h1>
            <span className="text-xs text-gray-500 border border-gray-700 px-2 py-0.5 rounded bg-gray-900">
              v2.5 FLASH CLUSTER
            </span>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => executeTurn()} 
                disabled={isAutoPlaying || processing}
                className="flex items-center gap-2 px-4 py-1 bg-[#33ff00]/10 border border-[#33ff00] text-[#33ff00] hover:bg-[#33ff00]/20 disabled:opacity-50 transition-all font-mono text-sm"
            >
                <Terminal size={14} /> STEP
            </button>
            <button 
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className={`flex items-center gap-2 px-4 py-1 border transition-all font-mono text-sm ${isAutoPlaying ? 'bg-red-900/30 border-red-500 text-red-500 animate-pulse' : 'bg-cyan-900/30 border-cyan-500 text-cyan-500 hover:bg-cyan-900/50'}`}
            >
                {isAutoPlaying ? <Pause size={14} /> : <Play size={14} />} 
                {isAutoPlaying ? 'STOP AGENTS' : 'AUTO PLAY'}
            </button>
            <button onClick={handleReset} className="text-gray-500 hover:text-red-500 ml-4">
                <RefreshCw size={16} />
            </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Terminal */}
        <div className="w-1/2 flex flex-col border-r border-[#33ff00]/20">
            <Console logs={logs} />
        </div>

        {/* Right: Visuals */}
        <div className="w-1/2 flex flex-col bg-[#050505]">
            {/* Top Right: Map */}
            <div className="h-1/2 border-b border-[#33ff00]/20 relative">
                <MapVisualizer rooms={rooms} currentRoomId={player.currentRoomId} />
            </div>
            
            {/* Bottom Right: DB View */}
            <div className="h-1/2 p-2 relative">
                <div className="absolute top-0 right-0 p-1 opacity-50 pointer-events-none">
                    <Database className="text-cyan-800" size={100} />
                </div>
                <DatabaseView dbInstance={db} tick={tick} />
                
                {/* Stats Overlay */}
                <div className="absolute bottom-4 left-4 right-4 flex gap-4 text-xs font-mono text-cyan-600">
                    <div className="bg-black/80 border border-cyan-900 p-2 flex-1">
                        <div className="uppercase text-gray-500 text-[10px]">Current Location</div>
                        <div className="text-cyan-300 text-sm truncate">{rooms.find(r => r.id === player.currentRoomId)?.name || 'Unknown'}</div>
                    </div>
                    <div className="bg-black/80 border border-cyan-900 p-2 flex-1">
                        <div className="uppercase text-gray-500 text-[10px]">Inventory</div>
                        <div className="text-cyan-300 text-sm truncate">{player.inventory.join(', ') || 'Empty'}</div>
                    </div>
                    <div className="bg-black/80 border border-cyan-900 p-2 w-20">
                         <div className="uppercase text-gray-500 text-[10px]">Health</div>
                         <div className="text-cyan-300 text-sm">{player.health}%</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}