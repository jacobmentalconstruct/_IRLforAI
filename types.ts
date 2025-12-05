export interface Room {
  id: string;
  name: string;
  description: string;
  exits: string[]; // Directions like "north", "east"
  items: string[];
  visited: boolean;
  coordinates: { x: number; y: number };
}

export interface PlayerState {
  currentRoomId: string;
  inventory: string[];
  health: number;
  status: string;
}

export interface LogEntry {
  id: number;
  role: 'GM' | 'PLAYER' | 'SYSTEM';
  text: string;
  timestamp: number;
}

// Simulated SQL Table Structure
export interface GameDatabase {
  rooms: Record<string, Room>;
  player: PlayerState;
  logs: LogEntry[];
  settings: {
    turnCount: number;
    gameActive: boolean;
    autoPlay: boolean;
  };
}

export interface AgentResponse {
  text: string;
  data?: any;
}

export interface GMActionResponse {
  narrative: string;
  newRoom?: Room;
  movedToRoomId?: string;
  updatedPlayerState?: Partial<PlayerState>;
}