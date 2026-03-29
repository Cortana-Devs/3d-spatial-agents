export interface DebugTargetInfo {
  name: string;
  type?: string;
  id?: string;
  pos: string;
  dims: string;
  desc?: string;
}

export interface GridCell {
  id: string;
  label: string;
  type: "item" | "slot";
  icon?: string;
  meta?: any;
}

export interface GridRow {
  id: string;
  label: string;
  cells: GridCell[];
}
