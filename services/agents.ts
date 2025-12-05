import { GoogleGenAI, Type, Schema } from '@google/genai';
import { Room, PlayerState } from '../types';

// NOTE: In a real production app, ensure these prompts are robust against injection.
const GM_MODEL = 'gemini-2.5-flash';
const PLAYER_MODEL = 'gemini-2.5-flash';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Schemas ---

const gmResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    narrative: { type: Type.STRING, description: "The description of what happens or the room description." },
    newRoom: {
      type: Type.OBJECT,
      nullable: true,
      description: "Data for a NEW room if the player entered one that didn't exist.",
      properties: {
        id: { type: Type.STRING },
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        exits: { type: Type.ARRAY, items: { type: Type.STRING } },
        items: { type: Type.ARRAY, items: { type: Type.STRING } },
      }
    },
    movedToRoomId: { type: Type.STRING, nullable: true, description: "If the player successfully moved, this is the ID of the room they are now in." },
    playerUpdate: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
            health: { type: Type.INTEGER },
            inventoryToAdd: { type: Type.ARRAY, items: { type: Type.STRING }},
            inventoryToRemove: { type: Type.ARRAY, items: { type: Type.STRING }}
        }
    }
  },
  required: ['narrative']
};

// --- Services ---

export const generateStartRoom = async (): Promise<Room> => {
  const prompt = `
    Create the starting room for a Zork-like text adventure. 
    It should be atmospheric, slightly mysterious, and classic.
    Return the room details.
    ID should be 'start'.
    Coordinates should be x:0, y:0.
  `;

  try {
    const response = await ai.models.generateContent({
      model: GM_MODEL,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                exits: { type: Type.ARRAY, items: { type: Type.STRING } },
                items: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        }
      }
    });

    const roomData = JSON.parse(response.text || '{}');
    return {
        ...roomData,
        visited: true,
        coordinates: { x: 0, y: 0 }
    };

  } catch (error) {
    console.error("GM Init Error", error);
    // Fallback
    return {
        id: 'start',
        name: 'West of House',
        description: 'You are standing in an open field west of a white house, with a boarded front door. There is a small mailbox here.',
        exits: ['north', 'south', 'west'],
        items: ['mailbox'],
        visited: true,
        coordinates: { x: 0, y: 0 }
    };
  }
};

export const getPlayerAction = async (room: Room, previousLog: string[], inventory: string[]): Promise<string> => {
    const historyText = previousLog.slice(-5).join("\n");
    const prompt = `
      You are a Player Agent in a text adventure game.
      
      Current Room: ${room.name}
      Description: ${room.description}
      Visible Exits: ${room.exits.join(', ')}
      Visible Items: ${room.items.join(', ')}
      Your Inventory: ${inventory.join(', ') || 'Empty'}
      
      Recent History:
      ${historyText}

      Your Goal: Explore the map, find treasure, survive.
      Instructions:
      1. Choose a logical action (Move, Take, Examine, Use).
      2. Do not repeat failed actions immediately.
      3. Be curious.
      
      Output ONLY the action string (e.g., "go north", "take sword", "examine rug").
      Keep it short (max 5 words).
    `;

    try {
        const response = await ai.models.generateContent({
            model: PLAYER_MODEL,
            contents: prompt,
        });
        return response.text?.trim() || "look around";
    } catch (e) {
        console.error("Player Agent Error", e);
        return "wait";
    }
};

export const resolveAction = async (
    action: string, 
    currentRoom: Room, 
    knownRooms: Record<string, Room>, 
    playerState: PlayerState
) => {
    const contextRooms = Object.values(knownRooms).map(r => `${r.id} (${r.name})`).join(", ");
    
    const prompt = `
      You are the Game Master (GM).
      
      World State:
      - Current Room: ${JSON.stringify(currentRoom)}
      - Player Inventory: ${JSON.stringify(playerState.inventory)}
      - Existing Room IDs: ${contextRooms}
      
      Player Action: "${action}"
      
      Task:
      Resolve the action effectively. 
      - If it's a movement command (e.g., "go north"):
        - If the exit exists and leads to a KNOWN room, move them there (return movedToRoomId).
        - If the exit exists but is UNKNOWN, GENERATE a NEW room (return newRoom object). 
          - New room IDs should be descriptive (e.g., 'forest_path', 'dungeon_hall').
          - Give it logically consistent coordinates based on current room x:${currentRoom.coordinates.x}, y:${currentRoom.coordinates.y}.
        - If exit doesn't exist, narrate failure.
      - If it's an item interaction (take, drop, use), update inventory.
      
      Maintain a coherent, Zork-like tone. Gloomy, witty, mysterious.
    `;

    try {
        const response = await ai.models.generateContent({
            model: GM_MODEL,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: gmResponseSchema,
                thinkingConfig: {
                  thinkingBudget: 1024 // Use thinking to ensure spatial consistency
                }
            }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("GM Resolution Error", e);
        return { narrative: "The game master is confused. Try again." };
    }
}
