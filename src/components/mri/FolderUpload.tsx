'use client';

import { useState, useCallback, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import type { UploadResult } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FolderOpen,
  FileCheck,
  FileX,
  Brain,
  Activity,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const REGION_ICONS: Record<string, string> = {
  'Brain': '🧠',
  'Spine - Cervical': '🦴',
  'Spine - Thoracic': '🦴',
  'Spine - Lumbar': '🦴',
  'Spine - Sacral': '🦴',
  'Knee': '🦵',
  'Shoulder': '💪',
  'Hip': '🦵',
  'Abdomen': '🫁',
  'Pelvis': '🫀',
  'Chest': '🫁',
  'Cardiac': '❤️',
  'Breast': '🩺',
  'Neck': '🦴',
  'Other': '📁',
};

export default function FolderUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderName, setFolderName] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setLocalUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const { isUploading, setIsUploading, uploadResult: storeResult, setUploadResult, setActiveTab } = useAppStore();

  const result = uploadResult || storeResult;

  const handleFiles = useCallback((files: FileList | File[], sourceFolder?: string) => {
    const fileList = Array.from(files);
    // Accept ALL files — don't filter by extension (MRI files can have many formats)
    // The server will handle organization regardless of extension
    setSelectedFiles(fileList);
    setFolderName(sourceFolder || (fileList[0]?.name || 'Upload'));
    setLocalUploadResult(null);
    setUploadResult(null);
  }, [setUploadResult]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Try to get the folder path from the first file's webkitRelativePath
      const firstFile = e.dataTransfer.files[0] as File & { path?: string; webkitRelativePath?: string };
      const folder = firstFile.webkitRelativePath?.split('/')[0] || '';
      handleFiles(e.dataTransfer.files, folder || undefined);
    }
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const handleFolderInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const firstFile = e.target.files[0] as File & { webkitRelativePath?: string };
      const folder = firstFile.webkitRelativePath?.split('/')[0] || 'Uploaded Folder';
      handleFiles(e.target.files, folder);
    }
  }, [handleFiles]);

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file);
    });
    if (folderName) {
      formData.append('folderStructure', folderName);
    }

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const res = await fetch('/api/reports/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `Server error ${res.status}` }));
        setUploadError(errData.error || `Upload failed (${res.status})`);
        setUploadProgress(0);
        return;
      }

      setUploadProgress(100);
      setUploadError(null);

      const data = await res.json();
      if (data.results) {
        setLocalUploadResult(data.results);
        setUploadResult(data.results);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError(err instanceof Error ? err.message : 'Network error — check your connection');
    } finally {
      setIsUploading(false);
    }
  };

  // Group organized files by region
  const groupedByRegion = result?.organized?.reduce((acc, item) => {
    if (!acc[item.bodyRegion]) acc[item.bodyRegion] = [];
    acc[item.bodyRegion].push(item);
    return acc;
  }, {} as Record<string, typeof result.organized>) || {};

  const resetUpload = () => {
    setSelectedFiles([]);
    setFolderName('');
    setLocalUploadResult(null);
    setUploadResult(null);
    setUploadProgress(0);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Upload MRI Reports</h2>
        <p className="text-muted-foreground mt-1">
          Drag & drop your MRI report folder or select files. Reports are automatically organized by body region and date.
        </p>
      </div>

      {/* Upload Zone */}
      <Card className={`relative overflow-hidden border-2 transition-all duration-300 ${
        isDraggingOver 
          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' 
          : 'border-dashed hover:border-primary/50'
      }`}>
        <CardContent className="p-0">
          <motion.div
            animate={isDraggingOver ? { scale: 1.01, backgroundColor: 'rgba(0,0,0,0.02)' } : { scale: 1 }}
            onDragEnter={handleDragIn}
            onDragLeave={handleDragOut}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className="flex flex-col items-center justify-center py-16 px-6 cursor-pointer"
            onClick={() => folderInputRef.current?.click()}
          >
            <motion.div
              animate={isDraggingOver ? { y: -8, scale: 1.1 } : { y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="mb-6"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                <FolderOpen className={`w-10 h-10 text-primary transition-colors ${isDraggingOver ? 'text-primary' : 'text-primary/70'}`} />
              </div>
            </motion.div>

            <h3 className="text-lg font-semibold mb-2">
              {isDraggingOver ? 'Drop your folder here' : 'Drop MRI Report Folder'}
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              Select a folder containing MRI reports. Supports PDF, images (JPG, PNG, DICOM), and document files.
              Files are auto-organized by body region, detected from filenames.
            </p>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Select Folder
              </Button>
              <Button
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <Upload className="w-4 h-4 mr-2" />
                Select Files
              </Button>
            </div>

            <input
              ref={folderInputRef}
              type="file"
              directory=""
              webkitdirectory=""
              className="hidden"
              onChange={handleFolderInput}
              multiple
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileInput}
              multiple
            />
          </motion.div>
        </CardContent>
      </Card>

      {/* Selected Files Preview */}
      <AnimatePresence>
        {selectedFiles.length > 0 && !result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Ready to Import</CardTitle>
                    <CardDescription>
                      {folderName && <span className="font-medium text-foreground">📁 {folderName}</span>}
                      {' — '}{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={resetUpload}>
                      Clear
                    </Button>
                    <Button onClick={handleUpload} disabled={isUploading}>
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Import {selectedFiles.length} Report{selectedFiles.length !== 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isUploading && (
                  <Progress value={uploadProgress} className="mb-4 h-2" />
                )}
                <ScrollArea className="max-h-64">
                  <div className="space-y-1">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-muted/50 text-sm">
                        <FileCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="truncate flex-1">{file.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0">
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Error */}
      {uploadError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{uploadError}</span>
            <Button variant="ghost" size="sm" onClick={() => setUploadError(null)} className="shrink-0 ml-2">Dismiss</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Upload Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Summary Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-emerald-500" />
                      Import Complete
                    </CardTitle>
                    <CardDescription>
                      {result.success} of {result.total} files imported successfully
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetUpload}>
                      Upload More
                    </Button>
                    <Button size="sm" onClick={() => setActiveTab('reports')}>
                      View Reports
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-emerald-50 rounded-lg">
                    <div className="text-2xl font-bold text-emerald-700">{result.success}</div>
                    <div className="text-xs text-emerald-600">Imported</div>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <div className="text-2xl font-bold text-amber-700">{result.skipped}</div>
                    <div className="text-xs text-amber-600">Skipped</div>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-700">{result.errors.length}</div>
                    <div className="text-xs text-red-600">Errors</div>
                  </div>
                </div>

                {/* Errors */}
                {result.errors.length > 0 && (
                  <Alert variant="destructive" className="mb-4">
                    <XCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-medium mb-1">Errors:</div>
                      {result.errors.map((err, i) => (
                        <div key={i} className="text-sm">{err}</div>
                      ))}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Organized by Region */}
                <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4" />
                  Auto-Organized by Body Region
                </h4>
                <ScrollArea className="max-h-80">
                  <div className="space-y-3">
                    {Object.entries(groupedByRegion).map(([region, files]) => (
                      <div key={region} className="border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{REGION_ICONS[region] || '📁'}</span>
                          <span className="font-medium text-sm">{region}</span>
                          <Badge variant="secondary" className="text-xs">
                            {files.length} file{files.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <div className="ml-7 space-y-1">
                          {files.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{file.originalName}</span>
                              <span className="text-xs shrink-0 ml-auto">→ {file.storedPath}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* How It Works */}
      {!selectedFiles.length && !result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">1</span>
                </div>
                <h4 className="font-medium text-sm mb-1">Drop Your Folder</h4>
                <p className="text-xs text-muted-foreground">
                  Select or drag your MRI report folder containing PDFs, images, or DICOM files.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">2</span>
                </div>
                <h4 className="font-medium text-sm mb-1">Auto-Organize</h4>
                <p className="text-xs text-muted-foreground">
                  Files are sorted by body region (Brain, Spine, Knee, etc.) and study date, detected from filenames.
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl font-bold text-primary">3</span>
                </div>
                <h4 className="font-medium text-sm mb-1">Review & Manage</h4>
                <p className="text-xs text-muted-foreground">
                  Browse organized reports, add clinical details, and manage your MRI report library.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}