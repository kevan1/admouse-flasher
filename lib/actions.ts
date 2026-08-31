export type ActionId = 0 | 1 | 2 | 3 | 4 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26;

export type DeviceAction = {
  id: ActionId;
  kind: "mouse" | "keyboard";
  label: string;
  shortLabel: string;
  symbol: string;
};

export const ACTIONS: readonly DeviceAction[] = [
  { id: 0, kind: "keyboard", label: "Sin acción", shortLabel: "Nada", symbol: "—" },
  { id: 1, kind: "mouse", label: "Clic izquierdo", shortLabel: "Izquierdo", symbol: "L" },
  { id: 2, kind: "mouse", label: "Clic derecho", shortLabel: "Derecho", symbol: "R" },
  { id: 3, kind: "mouse", label: "Clic de rueda", shortLabel: "Rueda", symbol: "●" },
  { id: 4, kind: "mouse", label: "Doble clic", shortLabel: "Doble clic", symbol: "2×" },
  { id: 16, kind: "keyboard", label: "Enter", shortLabel: "Enter", symbol: "↵" },
  { id: 17, kind: "keyboard", label: "Barra espaciadora", shortLabel: "Espacio", symbol: "␣" },
  { id: 18, kind: "keyboard", label: "Tabulador", shortLabel: "Tab", symbol: "⇥" },
  { id: 19, kind: "keyboard", label: "Escape", shortLabel: "Esc", symbol: "Esc" },
  { id: 20, kind: "keyboard", label: "Retroceso", shortLabel: "Borrar", symbol: "⌫" },
  { id: 21, kind: "keyboard", label: "Flecha arriba", shortLabel: "Arriba", symbol: "↑" },
  { id: 22, kind: "keyboard", label: "Flecha abajo", shortLabel: "Abajo", symbol: "↓" },
  { id: 23, kind: "keyboard", label: "Flecha izquierda", shortLabel: "Izquierda", symbol: "←" },
  { id: 24, kind: "keyboard", label: "Flecha derecha", shortLabel: "Derecha", symbol: "→" },
  { id: 25, kind: "keyboard", label: "Copiar", shortLabel: "Copiar", symbol: "Ctrl C" },
  { id: 26, kind: "keyboard", label: "Pegar", shortLabel: "Pegar", symbol: "Ctrl V" },
] as const;

export const MOUSE_ACTIONS = ACTIONS.filter((action) => action.kind === "mouse");
export const KEYBOARD_ACTIONS = ACTIONS.filter((action) => action.kind === "keyboard");
export const SUPPORTED_ACTION_IDS = new Set<number>(ACTIONS.map((action) => action.id));

export function getAction(id: ActionId): DeviceAction {
  const action = ACTIONS.find((candidate) => candidate.id === id);
  if (!action) throw new Error(`Unsupported action ${id}.`);
  return action;
}
