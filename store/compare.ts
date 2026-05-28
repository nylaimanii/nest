import { create } from "zustand";

// scenario A is always the active scenario in the app store; B is a separate
// selection just for the /compare view.
interface CompareState {
  bId: string | null;
  setB: (id: string | null) => void;
}

export const useCompareStore = create<CompareState>((set) => ({
  bId: null,
  setB: (id) => set({ bId: id }),
}));
