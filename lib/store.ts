import { create } from "zustand";

interface TaskPanelStore {
  taskId: string | null;
  open: (id: string) => void;
  close: () => void;
}

export const useTaskPanel = create<TaskPanelStore>((set) => ({
  taskId: null,
  open: (id) => set({ taskId: id }),
  close: () => set({ taskId: null }),
}));
