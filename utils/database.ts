import { GameDatabase, Room, PlayerState, LogEntry } from '../types';

const DB_KEY = 'zork_gemini_db_v1';

const INITIAL_DB: GameDatabase = {
  rooms: {},
  player: {
    currentRoomId: 'start',
    inventory: [],
    health: 100,
    status: 'Healthy',
  },
  logs: [],
  settings: {
    turnCount: 0,
    gameActive: false,
    autoPlay: false,
  },
};

export class SimpleSQL {
  private data: GameDatabase;

  constructor() {
    this.data = this.load();
  }

  private load(): GameDatabase {
    const stored = localStorage.getItem(DB_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse DB', e);
      }
    }
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }

  public save(): void {
    localStorage.setItem(DB_KEY, JSON.stringify(this.data));
  }

  public reset(): void {
    this.data = JSON.parse(JSON.stringify(INITIAL_DB));
    this.save();
  }

  // --- "SQL" Queries ---

  public selectRoom(id: string): Room | undefined {
    return this.data.rooms[id];
  }

  public selectAllRooms(): Room[] {
    return Object.values(this.data.rooms);
  }

  public insertOrUpdateRoom(room: Room): void {
    this.data.rooms[room.id] = room;
    this.save();
  }

  public getPlayer(): PlayerState {
    return this.data.player;
  }

  public updatePlayer(updates: Partial<PlayerState>): void {
    this.data.player = { ...this.data.player, ...updates };
    this.save();
  }

  public insertLog(role: LogEntry['role'], text: string): void {
    this.data.logs.push({
      id: Date.now(),
      role,
      text,
      timestamp: Date.now(),
    });
    // Keep log size manageable
    if (this.data.logs.length > 100) {
      this.data.logs.shift();
    }
    this.save();
  }

  public getLogs(): LogEntry[] {
    return this.data.logs;
  }

  public getSettings() {
    return this.data.settings;
  }

  public updateSettings(updates: Partial<GameDatabase['settings']>) {
    this.data.settings = { ...this.data.settings, ...updates };
    this.save();
  }

  public exportSQL(): string {
    // Generate a fake SQL dump for visualization
    let sql = `-- Database Dump ${new Date().toISOString()}\n\n`;
    
    sql += `CREATE TABLE rooms (id TEXT PRIMARY KEY, name TEXT, description TEXT);\n`;
    Object.values(this.data.rooms).forEach(r => {
      sql += `INSERT INTO rooms VALUES ('${r.id}', '${r.name.replace(/'/g, "''")}', '${r.description.substring(0, 30)}...');\n`;
    });

    sql += `\nCREATE TABLE player (id INTEGER PRIMARY KEY, health INTEGER, inventory TEXT);\n`;
    sql += `INSERT INTO player VALUES (1, ${this.data.player.health}, '${JSON.stringify(this.data.player.inventory)}');\n`;

    return sql;
  }
}

export const db = new SimpleSQL();