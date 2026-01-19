import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './components/Button';
import TemplateSelector from './components/TemplateSelector';
import AnalysisModal from './components/AnalysisModal';
import { 
  fileToGenerativePart, 
  generateMagicCaptions, 
  editMemeImage, 
  analyzeMemeContext 
} from './services/geminiService';
import { TextOverlay, GeneratedCaption, LoadingState } from './types';

// Icons
const MagicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
);
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
);
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
);

function App() {
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [currentMimeType, setCurrentMimeType] = useState<string>("image/jpeg");
  const [texts, setTexts] = useState<TextOverlay[]>([]);
  const [captions, setCaptions] = useState<GeneratedCaption[]>([]);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [analysisText, setAnalysisText] = useState<string>("");
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load an image from file input
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToGenerativePart(file);
        // We reconstruct the data URL for display
        setCurrentImage(`data:${file.type};base64,${base64}`);
        setCurrentMimeType(file.type);
        setCaptions([]);
        setTexts([]);
        setErrorMsg(null);
      } catch (err) {
        console.error(err);
        setErrorMsg("Failed to load image");
      }
    }
  };

  // Load a template from URL
  const handleSelectTemplate = async (url: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentImage(reader.result as string);
        setCurrentMimeType(blob.type);
      };
      reader.readAsDataURL(blob);
      setCaptions([]);
      setTexts([]);
      setErrorMsg(null);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to load template");
    }
  };

  // Feature 1: Magic Caption
  const handleMagicCaption = async () => {
    if (!currentImage) return;
    setLoadingState(LoadingState.GENERATING_CAPTIONS);
    setErrorMsg(null);
    try {
      const base64Data = currentImage.split(',')[1];
      const result = await generateMagicCaptions(base64Data, currentMimeType);
      setCaptions(result);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to generate captions. Try again.");
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  // Feature 2: Edit Image (Nano Banana)
  const handleEditImage = async () => {
    if (!currentImage || !editPrompt.trim()) return;
    setLoadingState(LoadingState.EDITING_IMAGE);
    setErrorMsg(null);
    try {
      const base64Data = currentImage.split(',')[1];
      const newImageBase64 = await editMemeImage(base64Data, currentMimeType, editPrompt);
      setCurrentImage(newImageBase64);
      setEditPrompt(""); // Clear prompt on success
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to edit image. The model might be busy.");
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  // Feature 3: Analyze Image
  const handleAnalyze = async () => {
    if (!currentImage) return;
    setLoadingState(LoadingState.ANALYZING);
    setErrorMsg(null);
    try {
      const base64Data = currentImage.split(',')[1];
      const analysis = await analyzeMemeContext(base64Data, currentMimeType);
      setAnalysisText(analysis);
      setShowAnalysis(true);
    } catch (err) {
      console.error(err);
      setErrorMsg("Analysis failed.");
    } finally {
      setLoadingState(LoadingState.IDLE);
    }
  };

  const addTextOverlay = (text: string) => {
    const newText: TextOverlay = {
      id: Date.now().toString(),
      text: text,
      x: 50,
      y: texts.length === 0 ? 10 : 90, // Top for first, bottom for second
      fontSize: 32,
      color: '#FFFFFF',
      isUppercase: true
    };
    setTexts([...texts, newText]);
  };

  const updateTextPosition = (id: string, x: number, y: number) => {
    setTexts(texts.map(t => t.id === id ? { ...t, x, y } : t));
  };

  const removeText = (id: string) => {
    setTexts(texts.filter(t => t.id !== id));
  };

  return (
    <div className="min-h-screen bg-dark flex flex-col items-center py-8 px-4 font-sans">
      
      {/* Header */}
      <header className="mb-8 text-center max-w-2xl">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary mb-3 tracking-tight">
          MemeGenius AI
        </h1>
        <p className="text-gray-400 text-lg">
          The ultimate AI meme studio. Upload, analyze, edit, and caption with the power of Gemini.
        </p>
      </header>

      {/* Main Workspace */}
      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Tools & Inputs */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Upload Section */}
          <div className="bg-gray-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <UploadIcon /> Source Image
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-gray-800 transition-all group"
            >
              <div className="text-gray-400 group-hover:text-white transition-colors">
                <span className="block text-3xl mb-2">📁</span>
                <span className="font-medium">Click to upload</span>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
              />
            </div>

            <div className="mt-4">
              <p className="text-sm text-gray-500 mb-2">Or choose a trending template:</p>
              <TemplateSelector onSelect={handleSelectTemplate} />
            </div>
          </div>

          {/* AI Tools */}
          {currentImage && (
            <div className="bg-gray-800/50 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <span className="text-yellow-400">✨</span> AI Magic
              </h2>
              
              {/* Magic Caption */}
              <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Instant Humor</h3>
                <Button 
                  onClick={handleMagicCaption} 
                  isLoading={loadingState === LoadingState.GENERATING_CAPTIONS}
                  className="w-full"
                  icon={<MagicIcon />}
                >
                  Generate Magic Captions
                </Button>
              </div>

              {/* Edit Image */}
              <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Editor (Nano Banana)</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g. Add cool sunglasses..."
                    className="flex-1 bg-black/30 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-secondary focus:border-transparent outline-none"
                  />
                  <button 
                    onClick={handleEditImage}
                    disabled={loadingState === LoadingState.EDITING_IMAGE || !editPrompt}
                    className="bg-secondary/20 text-secondary hover:bg-secondary hover:text-white p-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <EditIcon />
                  </button>
                </div>
              </div>

               {/* Analyze Image */}
               <div className="p-4 bg-gray-900/50 rounded-xl border border-white/5">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Deep Analysis</h3>
                <Button 
                  variant="outline"
                  onClick={handleAnalyze} 
                  isLoading={loadingState === LoadingState.ANALYZING}
                  className="w-full"
                  icon={<EyeIcon />}
                >
                  Analyze Context
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Canvas & Preview */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Canvas Area */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-1 overflow-hidden shadow-2xl relative min-h-[400px] flex items-center justify-center">
            {currentImage ? (
              <div className="relative w-full h-full max-h-[70vh] flex justify-center bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]">
                <div className="relative inline-block max-w-full">
                  <img 
                    src={currentImage} 
                    alt="Meme Canvas" 
                    className="max-w-full max-h-[600px] object-contain rounded-lg"
                  />
                  
                  {/* Overlays */}
                  {texts.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        position: 'absolute',
                        left: `${t.x}%`,
                        top: `${t.y}%`,
                        transform: 'translate(-50%, -50%)',
                        fontFamily: 'Anton, sans-serif',
                        fontSize: `${t.fontSize}px`,
                        color: t.color,
                        textTransform: t.isUppercase ? 'uppercase' : 'none',
                        textAlign: 'center',
                        lineHeight: 1.1,
                        cursor: 'move',
                        width: '100%'
                      }}
                      className="text-stroke select-none group"
                      draggable
                      onDragEnd={(e) => {
                        // Simple drag logic approximation for this demo
                        // In a real app, use a DND library or better offset calculation
                        // This is a placeholder for interaction
                        const rect = (e.target as HTMLElement).parentElement?.getBoundingClientRect();
                         if (rect) {
                           // This simple event doesn't give drop coordinates relative to parent easily without complex logic
                           // For this demo, we will use buttons to nudge or just let it stay fixed for simplicity
                           // A real drag implementation would go here.
                         }
                      }}
                    >
                       <span className="relative z-10">{t.text}</span>
                       <button 
                         onClick={(e) => { e.stopPropagation(); removeText(t.id); }}
                         className="absolute -top-4 -right-4 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                       >
                         ×
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <p className="text-xl font-medium">Select an image to start</p>
                <p className="text-sm mt-2">Upload or choose a template</p>
              </div>
            )}
            
            {/* Loading Overlay */}
            {(loadingState !== LoadingState.IDLE && loadingState !== LoadingState.GENERATING_CAPTIONS && loadingState !== LoadingState.ANALYZING) && (
               <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                 <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
                 <p className="text-white font-medium animate-pulse">Processing image...</p>
               </div>
            )}
          </div>
          
          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {errorMsg}
            </div>
          )}

          {/* Generated Captions List */}
          {captions.length > 0 && (
            <div className="animate-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-lg font-bold text-white mb-3">AI Suggestions</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {captions.map((cap, idx) => (
                  <button
                    key={idx}
                    onClick={() => addTextOverlay(cap.text)}
                    className="text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-primary/50 p-4 rounded-xl transition-all group relative overflow-hidden"
                  >
                    <span className="absolute top-2 right-2 text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full group-hover:bg-primary group-hover:text-white transition-colors">
                      {cap.category}
                    </span>
                    <p className="text-gray-200 font-medium pr-10">"{cap.text}"</p>
                    <span className="text-xs text-primary mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">
                      Click to add +
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Manual Text Input (Fallback) */}
          {currentImage && (
             <div className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Type your own caption..."
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-primary outline-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      addTextOverlay(e.currentTarget.value);
                      e.currentTarget.value = '';
                    }
                  }}
                />
             </div>
          )}

        </div>
      </main>

      <AnalysisModal 
        isOpen={showAnalysis} 
        onClose={() => setShowAnalysis(false)} 
        analysis={analysisText} 
      />
    </div>
  );
}

export default App;