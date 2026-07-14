import { create } from 'zustand';

export type TabValue = 'upload' | 'reports' | 'create' | 'dashboard' | 'settings';

export interface MriReport {
  id: string;
  patientName: string;
  patientId: string | null;
  patientAge: number | null;
  patientGender: string | null;
  referringDoctor: string | null;
  studyDate: string | null;
  accessionNumber: string | null;
  bodyRegion: string;
  studyType: string;
  modality: string;
  scannerModel: string | null;
  fieldStrength: string | null;
  clinicalIndication: string | null;
  clinicalHistory: string | null;
  technique: string | null;
  comparison: string | null;
  findings: string;
  impression: string;
  contrastAdministered: boolean;
  contrastAgent: string | null;
  contrastVolume: string | null;
  contrastRoute: string | null;
  reportStatus: string;
  priority: string;
  reportNumber: string | null;
  attachmentPath: string | null;
  attachmentName: string | null;
  fileSize: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadResult {
  total: number;
  success: number;
  skipped: number;
  errors: string[];
  organized: {
    originalName: string;
    storedPath: string;
    bodyRegion: string;
    patientName: string;
  }[];
}

export interface DashboardStats {
  totalReports: number;
  finalReports: number;
  draftReports: number;
  urgentReports: number;
  recentReports: MriReport[];
  regionCounts: { region: string; count: number }[];
  monthlyData: Record<string, number>;
}

export interface TemplateData {
  bodyRegions: string[];
  studyTypes: Record<string, string[]>;
  defaultTemplates: { name: string; bodyRegion: string; technique: string; findings: string; impression: string }[];
  customTemplates: { id: string; name: string; bodyRegion: string; technique: string | null; findings: string | null; impression: string | null }[];
}

interface AppState {
  // Navigation
  activeTab: TabValue;
  setActiveTab: (tab: TabValue) => void;

  // Selected report for viewing
  selectedReportId: string | null;
  setSelectedReportId: (id: string | null) => void;

  // Edit mode
  editingReportId: string | null;
  setEditingReportId: (id: string | null) => void;

  // Upload state
  isUploading: boolean;
  uploadResult: UploadResult | null;
  setIsUploading: (v: boolean) => void;
  setUploadResult: (r: UploadResult | null) => void;

  // Search/filter
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filterRegion: string;
  setFilterRegion: (r: string) => void;
  filterStatus: string;
  setFilterStatus: (s: string) => void;
  filterPriority: string;
  setFilterPriority: (p: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'create',
  setActiveTab: (tab) => set({ activeTab: tab }),

  selectedReportId: null,
  setSelectedReportId: (id) => set({ selectedReportId: id }),

  editingReportId: null,
  setEditingReportId: (id) => set({ editingReportId: id }),

  isUploading: false,
  uploadResult: null,
  setIsUploading: (v) => set({ isUploading: v }),
  setUploadResult: (r) => set({ uploadResult: r }),

  searchQuery: '',
  setSearchQuery: (q) => set({ searchQuery: q }),
  filterRegion: '',
  setFilterRegion: (r) => set({ filterRegion: r }),
  filterStatus: '',
  setFilterStatus: (s) => set({ filterStatus: s }),
  filterPriority: '',
  setFilterPriority: (p) => set({ filterPriority: p }),
}));