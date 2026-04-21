import React, { useState, useEffect } from 'react';
import { PlusCircle, Database, Trash2, Smartphone, Monitor, Loader2 } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';

/**
 * --- PRODUCTION CONFIGURATION ---
 * This block safely reads Environment Variables. 
 * If you are running this in the preview window, it will look for fallback 
 * variables provided by the environment.
 */
const getEnv = (key) => {
  try {
    // Vite / Vercel standard
    return import.meta.env[key] || "";
  } catch (e) {
    // Fallback for environments that don't support import.meta yet
    return "";
  }
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY'),
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('VITE_FIREBASE_APP_ID')
};

// Initialize Firebase
// We check if apiKey exists before initializing to avoid errors during setup
const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

export default function App() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [configError, setConfigError] = useState(!firebaseConfig.apiKey);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!auth) return;

    const login = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    login();

    return onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user || !db) return;

    const entriesRef = collection(db, 'users', user.uid, 'my_saved_data');
    
    const unsubscribe = onSnapshot(entriesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(data.sort((a, b) => b.timestamp - a.timestamp));
      setIsLoading(false);
    }, (err) => {
      console.error("Database connection error:", err);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !title.trim() || !description.trim() || !db) return;

    setIsSubmitting(true);
    try {
      const entriesRef = collection(db, 'users', user.uid, 'my_saved_data');
      await addDoc(entriesRef, {
        title: title.trim(),
        description: description.trim(),
        timestamp: Date.now(),
        device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'
      });
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error("Could not save entry:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user || !db) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'my_saved_data', id));
    } catch (err) {
      console.error("Could not delete entry:", err);
    }
  };

  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <Database className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Configuration Needed</h2>
          <p className="text-slate-600 text-sm mb-6">
            To get this running, you need to add your Firebase keys to your <code className="bg-slate-100 px-1 rounded text-pink-600">.env</code> file as shown in the deployment guide.
          </p>
          <div className="text-left bg-slate-900 rounded-lg p-4 font-mono text-xs text-blue-300 overflow-x-auto">
            VITE_FIREBASE_API_KEY=your_key...
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-blue-600">
        <Loader2 className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 p-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">CloudLogger</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Secure Sync</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-24">
            <h2 className="font-bold text-lg mb-4 text-slate-700">Add Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Subject</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Note title..."
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write something..."
                  rows="4"
                  className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all resize-none"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 active:scale-95 disabled:opacity-50 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save to Cloud"}
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-bold text-lg text-slate-600 uppercase tracking-tight">Your Records</h2>
            <span className="text-[10px] font-black text-slate-400 bg-slate-200 px-2 py-0.5 rounded">
              {entries.length} TOTAL
            </span>
          </div>

          {entries.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
              <PlusCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="font-medium">Database is empty.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {entries.map(item => (
                <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all group animate-in fade-in duration-300">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-slate-900 text-lg">{item.title}</h3>
                    <button 
                      onClick={() => handleDelete(item.id)} 
                      className="text-slate-300 hover:text-red-500 p-2 -mr-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="mt-2 text-slate-600 leading-relaxed text-sm">{item.description}</p>
                  <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    <span className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                      {item.device === 'Mobile' ? <Smartphone className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
                      {item.device}
                    </span>
                    <span>{new Date(item.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Analytics />
    </div>
  );
}
