import React, { useState, useEffect, useRef } from 'react';
import { Camera, Video, Image as ImageIcon, Download, Share2, X, ChevronLeft, Save, Sparkles, MessageSquareText, Wand2, AlertTriangle, CheckCircle, Heart, Smartphone, UploadCloud } from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot } from "firebase/firestore";


// ==========================================
// 🔧 PRODUCTION CONFIGURATION
// ==========================================



// 1. GEMINI API KEY
const API_KEY = "AIzaSyCx-8lga_xe_xiuCfFLiM9GDyxq707i_MY";


// 2. FIREBASE CONFIGURATION
// Get this from: Firebase Console -> Project Settings -> General -> Your Apps -> SDK Setup
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCx-8lga_xe_xiuCfFLiM9GDyxq707i_MY",
    authDomain: "wedding-app-14609698-a717a.firebaseapp.com",
    projectId: "wedding-app-14609698-a717a",
    storageBucket: "wedding-app-14609698-a717a.firebasestorage.app",
    messagingSenderId: "831947215506",
    appId: "1:831947215506:web:1743aa75a00c23fc838c4b"
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
     `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${API_KEY}`,
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


// 2. Camera & Upload Component
const CameraCapture = ({ user, userName, onSwitchToGallery, onSwitchToToast }) => {
  const fileInputRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [caption, setCaption] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);


  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
        setCaption('');
      };
      reader.readAsDataURL(file);
    }
  };


  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };


  const handleMagicCaption = async () => {
    if (!capturedImage) return;
    setIsGenerating(true);
    const prompt = "Look at this wedding photo. Write a short, fun, and celebratory caption for Gabriella & John's wedding (March 2026). Keep it under 15 words.";
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
      // Don't auto-download, let user do it from gallery
      // Upload to Firestore (COMPRESSED to fit 1MB limit)
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
        if (e.message.includes("bytes")) { // Firestore size limit error
          console.log("Image too big, compressing more...");
          uploadUrl = await compressImage(capturedImage, 800, 0.7);
          await addDoc(collection(db, 'wedding_photos'), {
            url: uploadUrl,
            author: userName,
            caption: caption,
            timestamp: Date.now(),
            type: 'photo'
          });
        } else {
            throw e;
        }
      }


      setCapturedImage(null);
    } catch (error) {
      console.error("Save error", error);
      alert("Couldn't share to the feed. Please check your connection and try again.");
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
              <button onClick={() => setCapturedImage(null)} className="flex-1 py-3 rounded-lg bg-stone-100 text-stone-600 font-medium">Cancel</button>
              <button onClick={savePhoto} disabled={uploading} className={`flex-2 w-full py-3 rounded-lg text-white font-medium shadow-lg flex justify-center items-center ${THEME.button} ${uploading ? 'opacity-50' : ''}`}>
                {uploading ? 'Sharing...' : <><Save size={18} className="mr-2" /> Share to Gallery</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className={`fixed inset-0 ${THEME.bg} flex flex-col z-40`}>
        <div className="bg-white shadow-sm sticky top-0 z-10 p-4 pt-safe flex justify-between items-center">
            <div className="font-serif text-xl text-stone-800">{APP_TITLE}</div>
            <div className="flex gap-2">
                <button onClick={onSwitchToToast} className="bg-stone-100 text-stone-600 p-2 rounded-full">
                    <MessageSquareText size={20} />
                </button>
                <button onClick={onSwitchToGallery} className="bg-stone-100 text-stone-600 p-2 rounded-full">
                <ImageIcon size={20} />
                </button>
            </div>
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-8">
                <h2 className="text-3xl font-serif text-stone-800 mb-2">Welcome, {userName}!</h2>
                <p className="text-stone-500">Share a photo to the wedding gallery.</p>
            </div>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageSelect}
                accept="image/*"
                capture="environment" // Prioritizes back camera
                className="hidden"
            />
            <button
                onClick={triggerFileSelect}
                className={`w-full max-w-xs py-5 px-6 rounded-2xl font-semibold tracking-wide transition-all transform active:scale-95 shadow-lg flex items-center justify-center text-lg ${THEME.button}`}
            >
                <UploadCloud size={24} className="mr-3" />
                Upload Photo
            </button>
            <p className="text-xs text-stone-400 mt-4">Opens your camera or photo library</p>
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
const Gallery = ({ user, onBack, onSwitchToCamera, isAdmin }) => {
 const [photos, setPhotos] = useState([]);
 const [loading, setLoading] = useState(true);


 useEffect(() => {
   if (!user) return;
   const q = collection(db, 'wedding_photos');
   const unsubscribe = onSnapshot(q, (snapshot) => {
     let fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
     if (!isAdmin) {
         fetched = fetched.filter(p => p.author === localStorage.getItem('wedding_guest_name'));
     }
     fetched.sort((a, b) => b.timestamp - a.timestamp);
     setPhotos(fetched);
     setLoading(false);
   }, (e) => { console.error(e); setLoading(false); });
   return () => unsubscribe();
 }, [user, isAdmin]);


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
       <button onClick={onSwitchToCamera} className="text-stone-600 p-2 -ml-2"><ChevronLeft size={28} /></button>
       <div className="text-center"><h2 className="font-serif text-xl text-stone-800">Shared Moments</h2></div>
       <div className="w-8"></div>
     </div>
     <div className="flex-1 p-4 overflow-y-auto">
        {loading && <div className="text-center p-10 text-stone-400">Loading memories...</div>}
        {!loading && photos.length === 0 && (
            <div className="text-center p-10 text-stone-500 bg-white rounded-lg shadow-sm">
                <h3 className="font-serif text-lg">No Photos Yet</h3>
                <p className="text-sm mt-1">{isAdmin ? "The gallery is empty." : "You haven't uploaded any photos yet."}</p>
                 <button onClick={onSwitchToCamera} className={`mt-4 py-2 px-4 rounded-lg font-medium text-white flex justify-center items-center mx-auto ${THEME.button}`}>
                    Share Your First Photo
                 </button>
            </div>
        )}
       {!loading && photos.length > 0 &&
        <div className="grid grid-cols-2 gap-4 pb-20">
           {photos.map(photo => (
             <div key={photo.id} className="bg-white p-2 rounded-lg shadow-sm">
               <div className="relative group">
                 <img src={photo.url} alt={`By ${photo.author}`} className="w-full h-auto rounded bg-stone-100" loading="lazy" />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded">
                   <button onClick={() => downloadImage(photo.url, photo.author)} className="text-white p-2"><Download size={20} /></button>
                 </div>
               </div>
               <p className="text-stone-600 text-xs mt-2 px-1 leading-snug break-words">{photo.caption}</p>
               <p className="text-stone-400 text-[10px] mt-1 px-1 font-medium truncate uppercase">{photo.author}</p>
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
    const [view, setView] = useState('loading'); // Start as loading
    const [installPrompt, setInstallPrompt] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const authUnsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const savedName = localStorage.getItem('wedding_guest_name');
                const adminPass = sessionStorage.getItem('admin_pass');
                if (adminPass === 'password') {
                    setIsAdmin(true);
                    setUserName("Admin");
                    setView('gallery');
                } else if (savedName) {
                    setIsAdmin(false);
                    setUserName(savedName);
                    setView('camera');
                } else {
                    setView('welcome');
                }
            } else {
                // No user, but maybe they are still in the process of anonymous sign-in
                // Don't switch to welcome immediately, wait for sign-in to attempt
            }
        });

        const pwaUnsubscribe = window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        });
        
        signInAnonymously(auth).catch((error) => {
            console.error("Anonymous sign-in failed:", error);
            setView('welcome'); // Go to welcome on auth failure
        });

        return () => {
            authUnsubscribe();
            window.removeEventListener('beforeinstallprompt', pwaUnsubscribe);
        };
    }, []);


 const handleJoin = (name) => {
    if (name.toLowerCase() === 'admin') {
        const pass = prompt("Enter Admin Password:");
        if (pass === 'password') {
            sessionStorage.setItem('admin_pass', 'password');
            setIsAdmin(true);
            setUserName("Admin");
            setView('gallery');
        } else {
            alert("Incorrect password.");
        }
    } else {
       setUserName(name);
       localStorage.setItem('wedding_guest_name', name);
       setIsAdmin(false);
       setView('camera');
    }
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


 if (view === 'loading') {
    return <div className="h-screen flex items-center justify-center bg-[#faf9f6]">Loading...</div>;
 }


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
     {view === 'gallery' && <Gallery user={user} onBack={() => setView('camera')} onSwitchToCamera={() => setView('camera')} isAdmin={isAdmin} />}
     {view === 'toast' && <ToastAssistant onBack={() => setView('camera')} />}
   </div>
 );
}
