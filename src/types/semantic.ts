export interface SemanticData {
  type: 'Room' | 'Furniture' | 'Prop' | 'Zone' | 'Unit';
  id: string;
  name: string;
  description?: string;
  interactable?: boolean;
  state?: Record<string, any>;
  owner?: string; // agentID
}

// Helper to check if an object has semantic data
export function isSemanticObject(obj: any): obj is { userData: SemanticData } {
  return obj && obj.userData && typeof obj.userData.type === 'string' && typeof obj.userData.id === 'string';
}
