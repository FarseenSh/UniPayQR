import { create } from 'zustand';

interface ScannedUPI {
  payeeAddress: string;
  payeeName: string;
  amount: string;
}

interface AppStore {
  scannedUPI: ScannedUPI | null;
  setScannedUPI: (upi: ScannedUPI | null) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  scannedUPI: null,
  setScannedUPI: (upi) => set({ scannedUPI: upi }),
}));

