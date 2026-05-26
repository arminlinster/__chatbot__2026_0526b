export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string; // ISO String to easily handle serialization if stored in localStorage
}

export interface PresetScenario {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstruction: string;
  suggestions: string[];
}
