import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video, Image as ImageIcon, Download, Share2, X, ChevronLeft, Save, Sparkles, MessageSquareText, Wand2, AlertTriangle, CheckCircle, Heart, Smartphone } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";


// ==========================================
// 🔧 PRODUCTION CONFIGURATION
// ==========================================


// 1. GEMINI API KEY
const API_KEY = "AIzaSyCTXN2lJu1q6E97Zv2gCp8JswB3La2mYRI";


// 2. FIREBASE CONFIGURATION
// Get this from: Firebase Console -> Project Settings -> General -> Your Apps -> SDK Setup
const FIREBASE_CONFIG = {
 apiKey: "AIzaSyATmuS1GELq3l9eqgz4Gm0z1djhDfsGc_E",
 authDomain: "wedding-gallery-e42c7.firebaseapp.com",
 projectId: "wedding-gallery-e42c7",
 storageBucket: "wedding-gallery-e42c7.firebasestorage.app",
 messagingSenderId: "1066156219778",
 appId: "1:1066156219778:web:24c5960afb2bfb0aa6839b",
 measurementId: "G-DDVJXJPZZY",
};


const APP_TITLE = "Gabriella & John";
const THEME = {
 primary: "bg-stone-800",
 secondary: "bg-[#8da399]",
 bg: "bg-[#faf9f6]",
 button: "bg-stone-800 text-white",
};


// --- Initialization ---
const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);


// --- Helper: Gemini API Call ---
async function generateGeminiContent(prompt, imageBase64 = null) {
 if (!API_KEY) return "Add your API Key to use AI features.";
 try {
   const parts = [{ text: prompt }];
   if (imageBase64) {
     const cleanBase64 = imageBase64.split(',')[1];
     parts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64 } });
   }
   const response = await fetch(
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`,
     {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ contents: [{ parts }] })
     }
   );
   const data = await response.json();
   return data.candidates?.[0]?.content?.parts?.[0]?.text || "Couldn't generate text.";
 } catch (error) {
   console.error("AI Error:", error);
   return "The wedding spirits are busy! Try again.";
 }
}


// --- Components ---


// 1. Welcome Screen with PWA Install
const WelcomeScreen = ({ onJoin, installPrompt }) => {
 const [name, setName] = useState('');


 return (
   <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${THEME.bg} text-center safe-area-padding`}>
     <div className="mb-8 relative animate-fade-in">
       <div className="absolute -top-4 -left-4 w-16 h-16 border-t-2 border-l-2 border-[#8da399] opacity-50"></div>
       <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b-2 border-r-2 border-[#8da399] opacity-50"></div>
       <h1 className="text-5xl font-serif text-stone-800 mb-2 italic">Gabriella & John</h1>
       <p className="text-stone-500 uppercase tracking-widest text-sm">March 7, 2026 • Fort Myers, FL</p>
       <div className="flex justify-center mt-4 text-[#8da399]">
         <Heart size={24} fill="#8da399" className="opacity-50" />
       </div>
     </div>
    
     <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-sm border border-stone-100 mb-6">
       <p className="mb-6 text-stone-600 font-light">Welcome! Please enter your name to join the shared gallery.</p>
       <input
         type="text"
         placeholder="Your Name"
         className="w-full px-4 py-3 rounded-lg border border-stone-200 mb-4 focus:outline-none focus:ring-2 focus:ring-[#8da399] transition-all text-center text-lg"
         value={name}
         onChange={(e) => setName(e.target.value)}
       />
       <button
         onClick={() => name.trim() && onJoin(name)}
         disabled={!name.trim()}
         className={`w-full py-4 rounded-lg font-medium tracking-wide transition-all transform active:scale-95 ${name.trim() ? THEME.button : 'bg-gray-200 text-gray-400'}`}
       >
         Enter Wedding
       </button>
     </div>


     {installPrompt && (
       <button
         onClick={installPrompt}
         className="flex items-center text-stone-500 text-sm bg-white/50 px-4 py-2 rounded-full border border-stone-200 hover:bg-white transition-colors"
       >
         <Smartphone size={16} className="mr-2" />
         Install App on Phone
       </button>
     )}
   </div>
 );
};


// 2. Camera Component
const CameraCapture = ({ user, userName, onSwitchToGallery, onSwitchToToast }) => {
 const videoRef = useRef(null);
 const [stream, setStream] = useState(null);
 const [capturedImage, setCapturedImage] = useState(null); // High Res (For User)
 const [caption, setCaption] = useState('');
 const [isGenerating, setIsGenerating] = useState(false);
 const [uploading, setUploading] = useState(false);
 const [cameraError, setCameraError] = useState(null);
 const [facingMode, setFacingMode] = useState('environment');


 const startCamera = async () => {
   try {
     if (stream) {
       stream.getTracks().forEach(track => track.stop());
     }
     const newStream = await navigator.mediaDevices.getUserMedia({
       video: {
         facingMode: { ideal: facingMode }, // "ideal" allows fallback
         width: { ideal: 1920 },
         height: { ideal: 1080 }
       },
       audio: false
     });
     setStream(newStream);
     if (videoRef.current) {
       videoRef.current.srcObject = newStream;
     }
     setCameraError(null);
   } catch (err) {
     console.error("Camera error:", err);
     setCameraError("Camera access denied. Please check your settings.");
   }
 };


 useEffect(() => {
   startCamera();
   return () => {
     if (stream) stream.getTracks().forEach(track => track.stop());
   };
 }, [facingMode]);


 const takePhoto = () => {
   if (!videoRef.current) return;
   const canvas = document.createElement('canvas');
   const video = videoRef.current;
  
   // Use actual video dimensions for highest quality
   canvas.width = video.videoWidth;
   canvas.height = video.videoHeight;
  
   const ctx = canvas.getContext('2d');
   if (facingMode === 'user') {
     ctx.translate(canvas.width, 0);
     ctx.scale(-1, 1);
   }
   ctx.drawImage(video, 0, 0);
  
   // Save full resolution for user download
   setCapturedImage(canvas.toDataURL('image/jpeg', 0.9));
   setCaption('');
 };


 const handleMagicCaption = async () => {
   if (!capturedImage) return;
   setIsGenerating(true);
   const prompt = "Look at this wedding photo. Write a short, fun, and celebratory caption for Gabriella & John's wedding (March 2026). Keep it under 15 words.";
  
   // Send a smaller version to AI to save bandwidth
   const aiCaption = await generateGeminiContent(prompt, capturedImage);
   setCaption(aiCaption.trim());
   setIsGenerating(false);
 };


 const compressImage = (dataUrl, maxWidth, quality) => {
   return new Promise((resolve) => {
     const img = new Image();
     img.src = dataUrl;
     img.onload = () => {
       const canvas = document.createElement('canvas');
       const scale = maxWidth / img.width;
       canvas.width = maxWidth;
       canvas.height = img.height * scale;
       const ctx = canvas.getContext('2d');
       ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
       resolve(canvas.toDataURL('image/jpeg', quality));
     };
   });
 };


 const savePhoto = async () => {
   if (!capturedImage || !user) return;
   setUploading(true);


   try {
     // 1. Download to User's Device (FULL QUALITY)
     const link = document.createElement('a');
     link.href = capturedImage;
     link.download = `Gabriella-John-Wedding-${Date.now()}.jpg`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);


     // 2. Upload to Firestore (COMPRESSED to fit 1MB limit)
     // Attempt 1: High Quality (1200px)
     let uploadUrl = await compressImage(capturedImage, 1200, 0.8);
    
     try {
       await addDoc(collection(db, 'wedding_photos'), {
         url: uploadUrl,
         author: userName,
         caption: caption,
         timestamp: Date.now(),
         type: 'photo'
       });
     } catch (e) {
       // If fails (too big), compress harder (800px)
       console.log("Image too big, compressing more...");
       uploadUrl = await compressImage(capturedImage, 800, 0.7);
       await addDoc(collection(db, 'wedding_photos'), {
         url: uploadUrl,
         author: userName,
         caption: caption,
         timestamp: Date.now(),
         type: 'photo'
       });
     }


     setCapturedImage(null);
   } catch (error) {
     console.error("Save error", error);
     alert("Saved to your phone, but couldn't share to the feed (Internet issue?).");
   } finally {
     setUploading(false);
   }
 };


 if (capturedImage) {
   return (
     <div className="fixed inset-0 bg-stone-900 z-50 flex flex-col overflow-y-auto">
       <div className="flex-1 flex flex-col">
         <div className="relative flex-grow flex items-center justify-center p-4">
           <img src={capturedImage} alt="Captured" className="max-h-[60vh] rounded-lg shadow-2xl" />
         </div>
         <div className="px-6 py-4 bg-white rounded-t-3xl shadow-negative">
           <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-stone-400 uppercase tracking-wider">Caption</label>
                <button
                  onClick={handleMagicCaption}
                  disabled={isGenerating}
                  className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full flex items-center font-bold"
                >
                  {isGenerating ? <Wand2 className="animate-spin mr-1 h-3 w-3"/> : <Sparkles className="mr-1 h-3 w-3" />}
                  {isGenerating ? "Thinking..." : "Magic Caption"}
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Write a caption..."
                className="w-full p-3 bg-stone-50 rounded-lg border border-stone-200 text-stone-700 text-sm focus:outline-none focus:ring-2 focus:ring-[#8da399]"
                rows={2}
              />
           </div>
           <div className="flex gap-3 pb-safe">
             <button onClick={() => setCapturedImage(null)} className="flex-1 py-3 rounded-lg bg-stone-100 text-stone-600 font-medium">Retake</button>
             <button onClick={savePhoto} disabled={uploading} className={`flex-2 w-full py-3 rounded-lg text-white font-medium shadow-lg flex justify-center items-center ${THEME.button} ${uploading ? 'opacity-50' : ''}`}>
               {uploading ? 'Sharing...' : <><Save size={18} className="mr-2" /> Save & Share</>}
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }


 return (
   <div className="fixed inset-0 bg-black flex flex-col z-40">
     <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-safe flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
       <div className="text-white text-xs font-medium tracking-widest uppercase shadow-sm">{userName}</div>
       <div className="flex gap-2">
         <button onClick={onSwitchToToast} className="bg-white/20 backdrop-blur-md text-white px-3 py-2 rounded-full text-sm font-medium flex items-center">
            <MessageSquareText size={16} className="mr-1" />
         </button>
         <button onClick={onSwitchToGallery} className="bg-white/20 backdrop-blur-md text-white px-3 py-2 rounded-full text-sm font-medium flex items-center">
           <ImageIcon size={16} className="mr-1" /> Gallery
         </button>
       </div>
     </div>
     <div className="flex-1 relative overflow-hidden bg-stone-900">
       {cameraError ? (
         <div className="flex items-center justify-center h-full text-white p-8 text-center">{cameraError}</div>
       ) : (
         <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
       )}
     </div>
     <div className="bg-black/80 backdrop-blur-sm p-8 pb-12 pb-safe flex justify-around items-center">
        <button className="p-4 rounded-full bg-white/10 text-white opacity-50"><Video size={24} /></button>
       <button onClick={takePhoto} className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative group">
         <div className="w-16 h-16 bg-white rounded-full group-active:scale-90 transition-transform"></div>
       </button>
       <button onClick={() => setFacingMode(p => p === 'user' ? 'environment' : 'user')} className="p-4 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
         <Share2 size={24} className="rotate-90" />
       </button>
     </div>
   </div>
 );
};


// 3. Toast Assistant
const ToastAssistant = ({ onBack }) => {
 const [relation, setRelation] = useState('');
 const [generatedToast, setGeneratedToast] = useState('');
 const [loading, setLoading] = useState(false);


 const generateToast = async () => {
   if (!relation.trim()) return;
   setLoading(true);
   const prompt = `Write a short, heartfelt wedding toast for Gabriella & John. I am a ${relation}. Mention March 2026.`;
   const result = await generateGeminiContent(prompt);
   setGeneratedToast(result);
   setLoading(false);
 };


 return (
   <div className={`min-h-screen ${THEME.bg} flex flex-col pt-safe`}>
      <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4 flex items-center">
       <button onClick={onBack} className="text-stone-600 p-2 -ml-2 mr-2"><ChevronLeft size={28} /></button>
       <div><h2 className="font-serif text-xl text-stone-800">Toast Assistant</h2></div>
     </div>
     <div className="p-6 flex-1 overflow-y-auto">
       <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 mb-6">
         <label className="block text-sm font-medium text-stone-600 mb-1">How do you know them?</label>
         <input type="text" value={relation} onChange={(e) => setRelation(e.target.value)} placeholder="e.g. John's childhood friend" className="w-full p-3 mb-4 rounded-lg border border-stone-200" />
         <button onClick={generateToast} disabled={loading || !relation} className={`w-full py-3 rounded-lg font-medium text-white flex justify-center items-center ${THEME.button} ${loading ? 'opacity-50' : ''}`}>
           {loading ? "Writing..." : "Generate Toast"}
         </button>
       </div>
       {generatedToast && (
         <div className="bg-[#fcfbf9] border-l-4 border-[#8da399] p-6 rounded-r-xl shadow-sm">
           <p className="text-stone-700 italic font-serif">"{generatedToast}"</p>
         </div>
       )}
     </div>
   </div>
 );
};


// 4. Gallery
const Gallery = ({ user, onBack }) => {
 const [photos, setPhotos] = useState([]);
 const [loading, setLoading] = useState(true);


 useEffect(() => {
   if (!user) return;
   const q = collection(db, 'wedding_photos');
   const unsubscribe = onSnapshot(q, (snapshot) => {
     const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     fetched.sort((a, b) => b.timestamp - a.timestamp);
     setPhotos(fetched);
     setLoading(false);
   }, (e) => { console.error(e); setLoading(false); });
   return () => unsubscribe();
 }, [user]);


 const downloadImage = (url, author) => {
   const link = document.createElement('a');
   link.href = url;
   link.download = `Wedding-${author}-${Date.now()}.jpg`;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
 };


 return (
   <div className={`min-h-screen ${THEME.bg} flex flex-col pt-safe`}>
     <div className="bg-white shadow-sm sticky top-0 z-10 px-4 py-4 flex items-center justify-between">
       <button onClick={onBack} className="text-stone-600 p-2 -ml-2"><ChevronLeft size={28} /></button>
       <div className="text-center"><h2 className="font-serif text-xl text-stone-800">Shared Moments</h2></div>
       <div className="w-8"></div>
     </div>
     <div className="flex-1 p-4 overflow-y-auto">
       {loading ? <div className="text-center p-10 text-stone-400">Loading memories...</div> :
        <div className="grid grid-cols-2 gap-4 pb-20">
           {photos.map(photo => (
             <div key={photo.id} className="bg-white p-2 rounded-lg shadow-sm">
               <div className="relative group">
                 <img src={photo.url} alt={`By ${photo.author}`} className="w-full h-auto rounded bg-stone-100" loading="lazy" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                   <button onClick={() => downloadImage(photo.url, photo.author)} className="text-white p-2"><Download size={20} /></button>
                 </div>
               </div>
               <div className="mt-2 text-xs font-medium text-stone-600 truncate">{photo.author}</div>
             </div>
           ))}
        </div>
       }
     </div>
   </div>
 );
};


// --- Main App Container ---
export default function App() {
 const [user, setUser] = useState(null);
 const [userName, setUserName] = useState('');
 const [view, setView] = useState('welcome');
 const [installPrompt, setInstallPrompt] = useState(null);


 useEffect(() => {
   // 1. Auth
   signInAnonymously(auth).catch(console.error);
   const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
     setUser(currentUser);
     const savedName = localStorage.getItem('wedding_guest_name');
     if (savedName && currentUser) {
       setUserName(savedName);
       setView('camera');
     }
   });


   // 2. PWA Install Listener
   window.addEventListener('beforeinstallprompt', (e) => {
     e.preventDefault();
     setInstallPrompt(e);
   });


   return () => unsubscribe();
 }, []);


 const handleJoin = (name) => {
   setUserName(name);
   localStorage.setItem('wedding_guest_name', name);
   setView('camera');
 };


 const handleInstall = () => {
   if (installPrompt) {
     installPrompt.prompt();
     installPrompt.userChoice.then((choiceResult) => {
       if (choiceResult.outcome === 'accepted') {
         setInstallPrompt(null);
       }
     });
   }
 };


 if (!user) return <div className="h-screen flex items-center justify-center bg-[#faf9f6]">Loading...</div>;


 return (
   <div className="font-sans text-stone-800">
     {view === 'welcome' && <WelcomeScreen onJoin={handleJoin} installPrompt={installPrompt ? handleInstall : null} />}
     {view === 'camera' && (
       <CameraCapture
         user={user}
         userName={userName}
         onSwitchToGallery={() => setView('gallery')}
         onSwitchToToast={() => setView('toast')}
       />
     )}
     {view === 'gallery' && <Gallery user={user} onBack={() => setView('camera')} />}
     {view === 'toast' && <ToastAssistant onBack={() => setView('camera')} />}
   </div>
 );
}

