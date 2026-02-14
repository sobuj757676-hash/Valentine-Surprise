import React, { useState, useEffect, useRef } from 'react';
import { Heart, Lock, Unlock, Share2, Copy, Gift, Sparkles, CheckCircle, PenTool, X, Wand2, Loader2 } from 'lucide-react';

// --- Gemini API Configuration ---
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; // API key will be injected by the environment

const callGeminiAPI = async (prompt, isJson = false) => {
  if (!apiKey) {
    // Return dummy data if API key is missing to prevent crash
    if (isJson) {
       return { promises: ["তোমার জন্য এক আকাশ ভালোবাসা", "সারাজীবন পাশে থাকবো", "কখনো হাত ছাড়বো না", "প্রতিদিন একবার হাসি ফোটাবো", "তোমার সব স্বপ্ন পূরণ করবো"] };
    } else {
       return "তোমাকে আমি অনেক ভালোবাসি, আমার সবটুকু দিয়ে তোমায় আগলে রাখবো। Happy Valentine's Day!";
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: isJson
      ? { responseMimeType: "application/json" }
      : {}
  };

  // Exponential backoff retry logic
  const maxRetries = 5;
  let delay = 1000;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) throw new Error("No content generated");

      return isJson ? JSON.parse(text) : text;

    } catch (error) {
      console.warn(`Attempt ${i + 1} failed:`, error);
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

// --- Utility Functions for URL Encoding/Decoding ---
const encodeData = (data) => {
  try {
    const jsonString = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(jsonString)));
  } catch (e) {
    console.error("Encoding error", e);
    return "";
  }
};

const decodeData = (hash) => {
  try {
    const jsonString = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Decoding error", e);
    return null;
  }
};

// --- Confetti Effect Component ---
const Confetti = ({ active }) => {
  if (!active) return null;
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-5%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${3 + Math.random() * 4}s`,
            color: ['#ff0000', '#ff69b4', '#ffffff', '#ffd700'][Math.floor(Math.random() * 4)],
            fontSize: `${10 + Math.random() * 20}px`
          }}
        >
          {['❤️', '🌸', '✨', '💌'][Math.floor(Math.random() * 4)]}
        </div>
      ))}
    </div>
  );
};

// --- Credit Component ---
const CreditFooter = () => (
  <div className="mt-8 text-center">
    <p className="text-xs text-gray-500">
      Made with <Heart size={12} className="inline text-red-500 fill-current" /> by <span className="font-bold text-pink-600">SOBUJ</span>
    </p>
  </div>
);

// --- Main App Component ---
export default function App() {
  const [mode, setMode] = useState('create');
  const [data, setData] = useState({
    sender: '',
    receiver: '',
    date: new Date().toISOString().split('T')[0],
    question: 'আমাদের প্রথম দেখা কোথায় হয়েছিল?',
    answer: '',
    promises: ['তোমাকে কখনো রাগাবো না', 'প্রতি উইকেন্ডে ঘুরতে নিয়ে যাব', 'সবসময় পাশে থাকবো'],
    secretMessage: 'তোমাকে অনেক ভালোবাসি! Happy Valentine\'s Day!'
  });

  // Dynamic Promises Options (User can add/remove from this list via AI)
  const [availablePromises, setAvailablePromises] = useState([
    'তোমাকে কখনো রাগাবো না',
    'তোমার সব কথা শুনবো',
    'তোমাকে অনেক চকলেট দিবো',
    'ঝগড়া করলেও আমি আগে সরি বলবো',
    'সারা জীবন তোমার হাত ধরে থাকবো'
  ]);

  const [generatedLink, setGeneratedLink] = useState('');
  const [isLocked, setIsLocked] = useState(true);
  const [inputAnswer, setInputAnswer] = useState('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [shakeLock, setShakeLock] = useState(false);

  // AI Loading States
  const [isGeneratingMsg, setIsGeneratingMsg] = useState(false);
  const [isGeneratingPromises, setIsGeneratingPromises] = useState(false);

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    if (hash) {
      const decoded = decodeData(hash);
      if (decoded) {
        setData(decoded);
        setMode('view');
      }
    }
  }, []);

  // --- AI Handlers ---
  const generateAIMessage = async () => {
    if (!data.sender || !data.receiver) {
      alert("দয়া করে আগে আপনার এবং প্রিয়জনের নাম লিখুন!");
      return;
    }
    setIsGeneratingMsg(true);
    try {
      const prompt = `Write a short, romantic, heart-touching Valentine's Day message in Bengali from ${data.sender} to ${data.receiver}. Keep it under 60 words. Tone: Emotional and sweet.`;
      const result = await callGeminiAPI(prompt);
      setData(prev => ({ ...prev, secretMessage: result.trim() }));
    } catch (error) {
      console.error("AI Error:", error);
      alert("দুঃখিত, মেসেজ জেনারেট করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setIsGeneratingMsg(false);
    }
  };

  const generateAIPromises = async () => {
    setIsGeneratingPromises(true);
    try {
      // Use JSON schema for structured list
      const prompt = `Generate 5 creative, cute, and slightly funny relationship promises in Bengali. Return as a JSON object with a key 'promises' which is an array of strings.`;
      const result = await callGeminiAPI(prompt, true);

      if (result && result.promises && Array.isArray(result.promises)) {
        // Add new unique promises to the available list
        const newPromises = result.promises.filter(p => !availablePromises.includes(p));
        setAvailablePromises(prev => [...newPromises, ...prev].slice(0, 10)); // Keep max 10
      }
    } catch (error) {
      console.error("AI Error:", error);
      alert("দুঃখিত, প্রমিস জেনারেট করা যায়নি।");
    } finally {
      setIsGeneratingPromises(false);
    }
  };

  // --- Handlers ---
  const handleCreate = () => {
    if (!data.sender || !data.receiver || !data.answer) {
      alert("দয়া করে সব তথ্য পূরণ করুন!");
      return;
    }
    const hash = encodeData(data);
    const link = `${window.location.origin}${window.location.pathname}#${hash}`;
    setGeneratedLink(link);
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  };

  const copyToClipboard = () => {
    const textToCopy = generatedLink;
    const fallbackCopyTextToClipboard = (text) => {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) alert("লিংক কপি হয়েছে! এখন প্রিয়জনকে পাঠান।");
      } catch (err) {
        prompt("অটোমেটিক কপি করা যায়নি। লিংকটি ম্যানুয়ালি কপি করুন:", text);
      }
      document.body.removeChild(textArea);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy)
        .then(() => alert("লিংক কপি হয়েছে! এখন প্রিয়জনকে পাঠান।"))
        .catch(() => fallbackCopyTextToClipboard(textToCopy));
    } else {
      fallbackCopyTextToClipboard(textToCopy);
    }
  };

  const handleUnlock = () => {
    if (inputAnswer.trim().toLowerCase() === data.answer.trim().toLowerCase()) {
      setIsLocked(false);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    } else {
      setShakeLock(true);
      setTimeout(() => setShakeLock(false), 500);
      alert("উফফ! উত্তর ভুল হয়েছে 😔 আবার চেষ্টা করো!");
    }
  };

  const togglePromise = (promise) => {
    if (data.promises.includes(promise)) {
      setData({ ...data, promises: data.promises.filter(p => p !== promise) });
    } else {
      if (data.promises.length >= 5) {
        alert("সর্বোচ্চ ৫টি প্রমিস সিলেক্ট করতে পারবেন!");
        return;
      }
      setData({ ...data, promises: [...data.promises, promise] });
    }
  };

  // --- Render Create Mode ---
  if (mode === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 via-red-50 to-pink-200 p-4 font-sans text-gray-800">
        <Confetti active={showConfetti} />
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-pink-200">
          <div className="bg-gradient-to-r from-red-500 to-pink-500 p-6 text-center text-white">
            <h1 className="text-3xl font-bold mb-2 flex justify-center items-center gap-2">
               Valentine Surprise <Sparkles size={24} className="text-yellow-300"/>
            </h1>
            <p className="text-sm opacity-90">প্রিয়জনের জন্য একটি জাদুকরী গিফট তৈরি করুন</p>
          </div>

          {!generatedLink ? (
            <div className="p-6 space-y-5">

              {/* Step 1: Names */}
              <div className="space-y-3">
                <h3 className="font-semibold text-pink-600 flex items-center gap-2">
                  <Heart size={18} fill="currentColor" /> প্রাথমিক তথ্য
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="আপনার নাম"
                    className="w-full p-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
                    value={data.sender}
                    onChange={e => setData({...data, sender: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="প্রিয়জনের নাম"
                    className="w-full p-2 border border-pink-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
                    value={data.receiver}
                    onChange={e => setData({...data, receiver: e.target.value})}
                  />
                </div>
                <input
                  type="date"
                  className="w-full p-2 border border-pink-200 rounded-lg text-gray-600"
                  value={data.date}
                  onChange={e => setData({...data, date: e.target.value})}
                />
              </div>

              {/* Step 2: Lock */}
              <div className="space-y-3 pt-2 border-t border-dashed border-pink-200">
                <h3 className="font-semibold text-pink-600 flex items-center gap-2">
                  <Lock size={18} /> সিক্রেট লক
                </h3>
                <input
                  type="text"
                  placeholder="প্রশ্ন (যেমন: আমার ডাকনাম কী?)"
                  className="w-full p-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-400"
                  value={data.question}
                  onChange={e => setData({...data, question: e.target.value})}
                />
                <input
                  type="text"
                  placeholder="উত্তর (সঠিক উত্তর দিলেই খুলবে)"
                  className="w-full p-2 border border-pink-200 rounded-lg focus:ring-2 focus:ring-pink-400 bg-red-50"
                  value={data.answer}
                  onChange={e => setData({...data, answer: e.target.value})}
                />
              </div>

              {/* Step 3: Certificate Promises with AI */}
              <div className="space-y-3 pt-2 border-t border-dashed border-pink-200">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-pink-600 flex items-center gap-2">
                    <PenTool size={18} /> প্রমিস সিলেক্ট করুন
                  </h3>
                  <button
                    onClick={generateAIPromises}
                    disabled={isGeneratingPromises}
                    className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full flex items-center gap-1 hover:bg-purple-200 transition-colors disabled:opacity-50"
                  >
                    {isGeneratingPromises ? <Loader2 size={12} className="animate-spin"/> : <Wand2 size={12}/>}
                    {isGeneratingPromises ? 'খুঁজছি...' : 'AI আইডিয়া'}
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {availablePromises.map((promise, i) => (
                    <label key={i} className="flex items-center gap-2 text-sm cursor-pointer p-2 hover:bg-pink-50 rounded border border-transparent hover:border-pink-100">
                      <input
                        type="checkbox"
                        checked={data.promises.includes(promise)}
                        onChange={() => togglePromise(promise)}
                        className="accent-pink-500 w-4 h-4"
                      />
                      {promise}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-400 text-right">{data.promises.length}/5 টি সিলেক্ট করা হয়েছে</p>
              </div>

              {/* Step 4: Secret Message with AI */}
              <div className="space-y-3 pt-2 border-t border-dashed border-pink-200">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-pink-600 flex items-center gap-2">
                    <Gift size={18} /> সিক্রেট মেসেজ
                  </h3>
                  <button
                    onClick={generateAIMessage}
                    disabled={isGeneratingMsg}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1 hover:bg-indigo-200 transition-colors disabled:opacity-50 font-medium"
                  >
                    {isGeneratingMsg ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                    {isGeneratingMsg ? 'লিখছি...' : 'AI দিয়ে লিখুন'}
                  </button>
                </div>
                <div className="relative">
                  <textarea
                    placeholder="এখানে আপনার মনের গোপন কথা লিখুন..."
                    className="w-full p-3 border border-pink-200 rounded-lg h-28 focus:ring-2 focus:ring-pink-400 text-sm leading-relaxed"
                    value={data.secretMessage}
                    onChange={e => setData({...data, secretMessage: e.target.value})}
                  />
                  {isGeneratingMsg && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg backdrop-blur-sm">
                      <div className="flex items-center gap-2 text-pink-600 font-medium animate-pulse">
                        <PenTool size={16} /> জেমিনি লিখছে...
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleCreate}
                className="w-full bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all flex justify-center items-center gap-2"
              >
                <Heart size={20} fill="currentColor" /> সারপ্রাইজ তৈরি করুন
              </button>

              <CreditFooter />
            </div>
          ) : (
            // ... Generated Link View (Same as before) ...
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-500 animate-bounce">
                <CheckCircle size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">লিংক তৈরি হয়েছে! 🎉</h2>
                <p className="text-gray-600 mt-2">নিচের লিংকটি কপি করে আপনার প্রিয়জনকে মেসেঞ্জারে বা হোয়াটসঅ্যাপে পাঠান।</p>
              </div>

              <div className="bg-gray-100 p-3 rounded-lg text-sm break-all font-mono text-gray-500 border border-gray-200">
                {generatedLink}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={copyToClipboard}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 flex justify-center items-center gap-2 shadow-md"
                >
                  <Copy size={18} /> কপি লিংক
                </button>
                <button
                  onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(generatedLink)}`, '_blank')}
                  className="flex-1 bg-[#1877F2] text-white py-3 rounded-lg font-semibold hover:bg-blue-800 flex justify-center items-center gap-2 shadow-md"
                >
                  <Share2 size={18} /> শেয়ার
                </button>
              </div>

              <button
                onClick={() => setGeneratedLink('')}
                className="text-pink-500 underline text-sm mt-4 block mx-auto"
              >
                নতুন করে তৈরি করুন
              </button>

              <CreditFooter />
            </div>
          )}
        </div>

        <style>{`
          @keyframes fall {
            0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(360deg); opacity: 0; }
          }
          .animate-fall {
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
        `}</style>
      </div>
    );
  }

  // --- Render Viewer Mode (Same as before) ---
  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-4 font-sans">
      <Confetti active={showConfetti} />

      {isLocked ? (
        <div className={`max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 text-center space-y-6 border-4 border-pink-100 ${shakeLock ? 'animate-shake' : ''}`}>
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4 animate-pulse">
            <Lock size={48} />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">একটি সারপ্রাইজ অপেক্ষা করছে!</h1>
            <p className="text-gray-500 mt-2">লক খুলতে নিচের প্রশ্নের উত্তর দিন:</p>
          </div>

          <div className="bg-pink-50 p-4 rounded-lg border border-pink-200">
            <p className="font-semibold text-pink-700">"{data.question}"</p>
          </div>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="উত্তর লিখুন..."
              className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-pink-500 text-center text-lg"
              value={inputAnswer}
              onChange={e => setInputAnswer(e.target.value)}
            />
            <button
              onClick={handleUnlock}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform transform active:scale-95 flex justify-center items-center gap-2"
            >
              <Unlock size={20} /> আনলক করুন
            </button>
          </div>
          <CreditFooter />
        </div>
      ) : (
        <div className="max-w-lg w-full space-y-6 animate-fadeIn pb-10">

          <div className="bg-[#fff9f0] p-6 md:p-8 rounded-lg shadow-xl relative border-8 border-double border-[#d4af37] text-center">
            <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-[#d4af37]"></div>
            <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-[#d4af37]"></div>
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-[#d4af37]"></div>
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-[#d4af37]"></div>

            <div className="mb-4">
               <Heart className="mx-auto text-red-600 animate-bounce" size={40} fill="currentColor" />
            </div>

            <h1 className="text-3xl font-serif font-bold text-[#8b4513] mb-2 uppercase tracking-widest">Love Agreement</h1>
            <p className="text-gray-500 text-xs uppercase tracking-widest mb-6">Official Certificate of Relationship</p>

            <div className="font-serif italic text-lg text-gray-700 leading-relaxed mb-6">
              এই মর্মে প্রত্যয়ন করা যাচ্ছে যে, <br/>
              <span className="text-2xl font-bold text-pink-600 not-italic font-sans">{data.sender}</span>
              <br/> এবং <br/>
              <span className="text-2xl font-bold text-pink-600 not-italic font-sans">{data.receiver}</span>
              <br/> আজীবনের জন্য একে অপরের সাথে আবদ্ধ থাকলেন।
            </div>

            <div className="bg-white/50 p-4 rounded border border-[#d4af37]/30 mb-6 text-left">
              <h3 className="font-bold text-[#8b4513] mb-2 text-center underline decoration-wavy">শর্তাবলী:</h3>
              <ul className="space-y-2 text-gray-700 text-sm">
                {data.promises.map((promise, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">❤️</span> {promise}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-between items-end mt-8 pt-4 border-t border-[#d4af37]/50">
              <div className="text-center">
                <div className="font-script text-2xl text-blue-600 transform -rotate-6">{data.sender}</div>
                <div className="text-xs text-gray-400 border-t border-gray-300 mt-1 pt-1">স্বাক্ষর (Sender)</div>
              </div>

              <div className="w-16 h-16 rounded-full bg-red-800 text-white flex items-center justify-center text-[10px] font-bold border-4 border-[#d4af37] shadow-inner">
                OFFICIALLY<br/>LOVED
              </div>

              <div className="text-center">
                <div className="font-script text-2xl text-pink-600 transform rotate-3">{data.receiver}</div>
                <div className="text-xs text-gray-400 border-t border-gray-300 mt-1 pt-1">স্বাক্ষর (Receiver)</div>
              </div>
            </div>

            <div className="mt-4 text-[10px] text-gray-400">
              Date: {data.date} • Location: In Heart
            </div>
          </div>

          <div className="relative mt-8 group cursor-pointer" onClick={() => {
            if (!isRevealed) {
              setIsRevealed(true);
              setShowConfetti(true);
              setTimeout(() => setShowConfetti(false), 5000);
            }
          }}>
            {!isRevealed ? (
              <div className="bg-gradient-to-r from-pink-400 to-red-400 p-8 rounded-xl shadow-lg text-white text-center transform transition-all hover:scale-105 relative overflow-hidden">
                <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                <Gift size={48} className="mx-auto mb-3 animate-bounce" />
                <h3 className="text-xl font-bold">তোমার জন্য একটি গোপন গিফট!</h3>
                <p className="text-sm opacity-90 mt-1">খুলতে এখানে ক্লিক/ট্যাপ করো</p>
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-xl shadow-xl border-2 border-red-200 text-center animate-popIn relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-500 via-red-500 to-pink-500"></div>
                <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-4">Secret Message Revealed</h3>
                <p className="text-2xl font-handwriting text-pink-600 font-bold leading-relaxed">
                  "{data.secretMessage}"
                </p>
                <div className="mt-6 flex justify-center gap-2">
                   <Heart className="text-red-500 animate-ping" size={20} fill="currentColor"/>
                   <Heart className="text-pink-500 animate-bounce delay-100" size={20} fill="currentColor"/>
                   <Heart className="text-red-500 animate-pulse delay-200" size={20} fill="currentColor"/>
                </div>
              </div>
            )}
          </div>

          <div className="text-center mt-8 pb-8">
            <a href="/" className="text-pink-400 text-sm hover:underline">
              আপনার প্রিয়জনের জন্য এমন একটি তৈরি করুন
            </a>
            <CreditFooter />
          </div>

        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Noto+Serif+Bengali:wght@400;700&display=swap');
        .font-script { font-family: 'Dancing Script', cursive; }
        .font-serif { font-family: 'Noto Serif Bengali', serif; }
        .font-handwriting { font-family: 'Dancing Script', cursive; }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-popIn { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.8s ease-out forwards; }
      `}</style>
    </div>
  );
}