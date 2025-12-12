import React, { useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  doc 
} from "firebase/firestore";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  Wallet, 
  TrendingUp, 
  PieChart as PieChartIcon, 
  Plus, 
  Trash2, 
  DollarSign, 
  Home, 
  Bitcoin,
  Landmark,
  RefreshCw,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  LayoutGrid,
  Minus,
  X,
  Users,
  AlertCircle
} from 'lucide-react';

// --- [중요] CodeSandbox용 스타일 자동 적용 스크립트 ---
if (typeof document !== 'undefined' && !document.getElementById('tailwind-script')) {
  const script = document.createElement('script');
  script.id = 'tailwind-script';
  script.src = "https://cdn.tailwindcss.com";
  document.head.appendChild(script);
}

// --- 1. Firebase Configuration ---
// 배포 환경에서도 동일한 프로젝트를 사용하도록 제공된 구성으로 고정합니다.
const firebaseConfig = {
  apiKey: "AIzaSyC1IElcIPL5_mxevrCoG3iZr4gvrCIM5M8",
  authDomain: "our-asset-manager.firebaseapp.com",
  projectId: "our-asset-manager",
  storageBucket: "our-asset-manager.firebasestorage.app",
  messagingSenderId: "898133422254",
  appId: "1:898133422254:web:61e2a1f2db6ef7331cbd3f",
  measurementId: "G-3KS2VMET2W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 가족 공유용 App ID
const SHARED_APP_ID = "our-family-assets-v1";

// --- Types ---
type AssetType = 'Cash' | 'Stock' | 'RealEstate' | 'Crypto' | 'Other';
type ColorTheme = 'global' | 'korea';

interface Asset {
  id: string;
  name: string;
  amount: number; 
  purchaseAmount: number; 
  category: AssetType;
  ticker?: string;
  quantity?: number;
  currentPrice?: number; 
  date: string;
}

interface AssetHistory {
  id?: string;
  date: string;
  totalValue: number;
}

interface TreemapItem extends Asset {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// --- Helpers ---
const getCategoryIcon = (category: AssetType) => {
  switch (category) {
    case 'Cash': return <DollarSign size={18} />;
    case 'Stock': return <TrendingUp size={18} />;
    case 'RealEstate': return <Home size={18} />;
    case 'Crypto': return <Bitcoin size={18} />;
    case 'Other': return <Landmark size={18} />;
    default: return <Wallet size={18} />;
  }
};

const categoryLabels: Record<AssetType, string> = {
  Cash: '현금/예금',
  Stock: '주식/펀드',
  RealEstate: '부동산',
  Crypto: '가상화폐',
  Other: '기타 자산'
};

const categoryColors: Record<AssetType, string> = {
  Cash: '#10b981',
  Stock: '#3b82f6',
  RealEstate: '#6366f1',
  Crypto: '#f97316',
  Other: '#6b7280'
};

// --- Components ---

const Treemap = ({ assets, width, height, theme }: { assets: Asset[], width: number, height: number, theme: ColorTheme }) => {
  if (assets.length === 0) return <div className="flex items-center justify-center h-full text-gray-400">데이터 없음</div>;

  const items: TreemapItem[] = [];
  
  const layout = (list: Asset[], x: number, y: number, w: number, h: number) => {
    if (list.length === 0) return;
    
    if (list.length === 1) {
      const asset = list[0];
      const roi = asset.purchaseAmount > 0 
        ? ((asset.amount - asset.purchaseAmount) / asset.purchaseAmount) * 100 
        : 0;
      
      let bgColor = '#e5e7eb';
      const intensity = Math.min(Math.abs(roi) * 5, 50) + 10; 
      
      if (theme === 'korea') {
        if (roi > 0) bgColor = `hsl(0, 70%, ${95 - intensity}%)`; 
        else if (roi < 0) bgColor = `hsl(220, 70%, ${95 - intensity}%)`; 
      } else {
        if (roi > 0) bgColor = `hsl(142, 60%, ${90 - intensity}%)`; 
        else if (roi < 0) bgColor = `hsl(0, 70%, ${95 - intensity}%)`; 
      }

      items.push({ ...asset, x, y, w, h, color: bgColor });
      return;
    }

    list.sort((a, b) => b.amount - a.amount);
    const mid = Math.ceil(list.length / 2);
    const groupA = list.slice(0, mid);
    const groupB = list.slice(mid);
    const valueA = groupA.reduce((sum, a) => sum + a.amount, 0);
    const valueB = groupB.reduce((sum, a) => sum + a.amount, 0);

    if (w > h) {
      const widthA = (valueA / (valueA + valueB)) * w;
      layout(groupA, x, y, widthA, h);
      layout(groupB, x + widthA, y, w - widthA, h);
    } else {
      const heightA = (valueA / (valueA + valueB)) * h;
      layout(groupA, x, y, w, heightA);
      layout(groupB, x, y + heightA, w, h - heightA);
    }
  };

  layout([...assets], 0, 0, 100, 100);

  return (
    <div className="relative w-full h-full overflow-hidden rounded-xl bg-gray-100" style={{ minHeight: '300px' }}>
      {items.map((item) => {
        const total = assets.reduce((sum, a) => sum + a.amount, 0);
        const roi = item.purchaseAmount > 0 
          ? ((item.amount - item.purchaseAmount) / item.purchaseAmount) * 100 
          : 0;
        
        return (
          <div
            key={item.id}
            className="absolute border border-white/50 flex flex-col items-center justify-center p-1 text-center transition-all hover:brightness-110 hover:z-10 cursor-pointer overflow-hidden"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              width: `${item.w}%`,
              height: `${item.h}%`,
              backgroundColor: item.color,
            }}
            title={`${item.name}\n비중: ${(item.amount/total*100).toFixed(1)}%\n수익률: ${roi.toFixed(2)}%`}
          >
            <span className="font-bold text-gray-800 text-[10px] sm:text-xs truncate w-full px-1">{item.name}</span>
            {item.h > 15 && item.w > 15 && (
              <span className={`text-[10px] font-medium ${roi >= 0 ? (theme === 'korea' ? 'text-red-700' : 'text-green-800') : (theme === 'korea' ? 'text-blue-700' : 'text-red-800')}`}>
                {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

const LineChart = ({ data }: { data: AssetHistory[] }) => {
  if (data.length < 2) return <div className="flex h-full items-center justify-center text-gray-400 text-sm">데이터가 충분하지 않습니다 (최소 2일 필요)</div>;
  
  const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const values = sorted.map(d => d.totalValue);
  const min = Math.min(...values) * 0.98;
  const max = Math.max(...values) * 1.02;
  const range = max - min || 1;
  const points = sorted.map((d, i) => {
    const x = (i / (sorted.length - 1)) * 100;
    const y = 100 - ((d.totalValue - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full h-full relative p-4" style={{ minHeight: '200px' }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        {[0, 25, 50, 75, 100].map(p => <line key={p} x1="0" y1={p} x2="100" y2={p} stroke="#f3f4f6" strokeWidth="0.5" />)}
        <polyline points={points} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {sorted.map((d, i) => {
          const x = (i / (sorted.length - 1)) * 100;
          const y = 100 - ((d.totalValue - min) / range) * 100;
          return <circle key={i} cx={x} cy={y} r="1.5" fill="white" stroke="#3b82f6" strokeWidth="1"><title>{d.date}: {Math.round(d.totalValue).toLocaleString()}원</title></circle>;
        })}
      </svg>
      <div className="absolute bottom-0 left-0 text-[10px] text-gray-400 transform translate-y-full pt-1">{sorted[0].date}</div>
      <div className="absolute bottom-0 right-0 text-[10px] text-gray-400 transform translate-y-full pt-1">{sorted[sorted.length-1].date}</div>
    </div>
  );
};

// --- Main App ---
export default function App() {
  const [user, setUser] = useState<any>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [history, setHistory] = useState<AssetHistory[]>([]);
  
  // Local Settings
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('finnhub-api-key') || '');
  const [theme, setTheme] = useState<ColorTheme>(() => (localStorage.getItem('asset-theme') as ColorTheme) || 'global');

  // UI State
  const [tab, setTab] = useState<'dashboard' | 'history' | 'treemap'>('treemap');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tradeModalOpen, setTradeModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  // Input State
  const [name, setName] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [ticker, setTicker] = useState('');
  const [quantity, setQuantity] = useState('');
  const [category, setCategory] = useState<AssetType>('Cash');
  const [tradePrice, setTradePrice] = useState('');
  const [tradeQuantity, setTradeQuantity] = useState('');

  // --- 1. Authentication ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (e: any) {
        console.error("Auth Error:", e);
        setAuthError(e.message);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- 2. Data Synchronization (Firestore) ---
  useEffect(() => {
    if (!user) return;

    // Use a shared path for family syncing.
    const assetsCollection = collection(db, 'families', SHARED_APP_ID, 'assets');
    const historyCollection = collection(db, 'families', SHARED_APP_ID, 'history');

    const unsubAssets = onSnapshot(assetsCollection, (snapshot) => {
      const loadedAssets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Asset));
      loadedAssets.sort((a, b) => b.amount - a.amount);
      setAssets(loadedAssets);
      setFirestoreError(null);
    }, (error) => console.error("Assets Sync Error:", error));

    const unsubHistory = onSnapshot(historyCollection, (snapshot) => {
      const loadedHistory = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AssetHistory));
      setHistory(loadedHistory);
      setFirestoreError(null);
    }, (error) => console.error("History Sync Error:", error));

    return () => {
      unsubAssets();
      unsubHistory();
    };
  }, [user]);

  // Persist Settings
  useEffect(() => { localStorage.setItem('finnhub-api-key', apiKey); }, [apiKey]);
  useEffect(() => { localStorage.setItem('asset-theme', theme); }, [theme]);

  // --- 3. Logic: Daily History ---
  useEffect(() => {
    if (!user || assets.length === 0) return;
    
    const today = new Date().toISOString().split('T')[0];
    const totalValue = assets.reduce((sum, a) => sum + a.amount, 0);
    const todayEntry = history.find(h => h.date === today);
    
    const updateHistory = async () => {
      try {
        if (todayEntry) {
          if (Math.abs(todayEntry.totalValue - totalValue) > 100) { 
             await updateDoc(doc(db, 'families', SHARED_APP_ID, 'history', todayEntry.id!), { totalValue });
          }
        } else {
          await addDoc(collection(db, 'families', SHARED_APP_ID, 'history'), { date: today, totalValue });
        }
      } catch (e) { console.error("History Error", e); }
    };
    
    const timer = setTimeout(updateHistory, 3000);
    return () => clearTimeout(timer);
  }, [assets, history, user]);

  // --- CRUD Operations ---
  const handleAddAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    let finalAmount = parseInt(amountInput.replace(/,/g, '')) || 0;
    let finalPrice = 0;
    let qty = parseFloat(quantity) || 0;

    if (category === 'Stock' || category === 'Crypto') {
      if (qty > 0 && finalAmount > 0) finalPrice = finalAmount / qty;
    }

    const newAsset = {
      name,
      amount: finalAmount,
      purchaseAmount: finalAmount,
      category,
      ticker: ticker || undefined,
      quantity: qty || undefined,
      currentPrice: finalPrice || undefined,
      date: new Date().toISOString().split('T')[0]
    };

    try {
      await addDoc(collection(db, 'families', SHARED_APP_ID, 'assets'), newAsset);
      resetForm();
      setFirestoreError(null);
    } catch (e: any) {
      console.error(e);
      setFirestoreError(e.message || String(e));
      alert("저장 실패 (Firestore 규칙을 확인하세요): " + e);
    }
  };

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset || !user) return;

    const price = parseFloat(tradePrice);
    const qty = parseFloat(tradeQuantity);
    if (!price || !qty) return;

    let updated = { ...selectedAsset };
    delete (updated as any).id; // Remove ID for update payload

    if (tradeType === 'buy') {
      const oldQty = updated.quantity || 0;
      const oldCost = updated.purchaseAmount;
      const addCost = price * qty;
      
      updated.quantity = oldQty + qty;
      updated.purchaseAmount = oldCost + addCost;
      updated.currentPrice = price; 
      updated.amount = (updated.currentPrice || price) * updated.quantity;

    } else {
      const oldQty = updated.quantity || 0;
      if (qty >= oldQty) {
        try {
          await deleteDoc(doc(db, 'families', SHARED_APP_ID, 'assets', selectedAsset.id));
          setTradeModalOpen(false);
        } catch (e) { alert("삭제 실패"); }
        return;
      }
      const ratio = qty / oldQty;
      updated.purchaseAmount = updated.purchaseAmount * (1 - ratio); 
      updated.quantity = oldQty - qty;
      updated.amount = (updated.currentPrice || price) * updated.quantity;
    }

    try {
      await updateDoc(doc(db, 'families', SHARED_APP_ID, 'assets', selectedAsset.id), updated);
      setTradeModalOpen(false);
      setFirestoreError(null);
    } catch (e: any) {
      console.error(e);
      setFirestoreError(e.message || String(e));
      alert("거래 실패");
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteDoc(doc(db, 'families', SHARED_APP_ID, 'assets', id));
        setFirestoreError(null);
      } catch (e: any) {
        console.error(e);
        setFirestoreError(e.message || String(e));
        alert("삭제 실패");
      }
    }
  };

  const fetchPrice = async (symbol: string): Promise<number | null> => {
    if (!apiKey) return null;
    try {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`);
      const data = await res.json();
      return data.c;
    } catch { return null; }
  };

  const refreshPrices = async () => {
    setIsRefreshing(true);
    if (!apiKey) { alert("설정에서 API 키를 입력해주세요."); setIsRefreshing(false); return; }
    
    await Promise.all(assets.map(async (a) => {
      if (a.ticker && (a.category === 'Stock' || a.category === 'Crypto')) {
        const price = await fetchPrice(a.ticker);
        if (price) {
          const isKorean = a.ticker.toUpperCase().endsWith('.KS') || a.ticker.toUpperCase().endsWith('.KQ');
          const finalPrice = isKorean ? price : price * 1400; // 환율 1400원 고정
          
          const updatedFields = {
            currentPrice: Math.floor(finalPrice),
            amount: Math.floor(finalPrice * (a.quantity || 1))
          };
          try {
             await updateDoc(doc(db, 'families', SHARED_APP_ID, 'assets', a.id), updatedFields);
          } catch(e) { console.error("Price Update Failed", a.name); }
        }
      }
    }));
    setIsRefreshing(false);
  };

  const testApiKey = async () => {
    if (!apiKey) return;
    try {
      setTestStatus('idle');
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`);
      if (res.ok) { const d = await res.json(); if(d && typeof d.c === 'number') { setTestStatus('success'); return; } }
      setTestStatus('error');
    } catch { setTestStatus('error'); }
  };

  const openTradeModal = (asset: Asset, type: 'buy' | 'sell') => {
    setSelectedAsset(asset);
    setTradeType(type);
    setTradePrice(asset.currentPrice ? asset.currentPrice.toString() : '');
    setTradeQuantity('');
    setTradeModalOpen(true);
  };

  const resetForm = () => {
    setName(''); setAmountInput(''); setTicker(''); setQuantity(''); setIsFormOpen(false);
  };

  // Calculations
  const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalPurchase = assets.reduce((sum, a) => sum + a.purchaseAmount, 0);
  const totalReturn = totalAssets - totalPurchase;
  const totalReturnRate = totalPurchase === 0 ? 0 : (totalReturn / totalPurchase) * 100;

  const formatMoney = (val: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val);

  if (authError) {
    return <div className="min-h-screen flex items-center justify-center p-4 text-center">
      <div className="bg-red-50 text-red-600 p-6 rounded-xl">
        <AlertCircle size={48} className="mx-auto mb-4"/>
        <h2 className="text-xl font-bold mb-2">Firebase 연결 오류</h2>
        <p className="text-sm">{authError}</p>
        <p className="text-xs mt-4 text-gray-500">Firebase 콘솔에서 Authentication(익명)과 Firestore 설정을 확인해주세요.</p>
      </div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans p-2 sm:p-6 flex flex-col items-center">

      {firestoreError && (
        <div className="w-full max-w-6xl mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl flex items-start gap-3">
          <AlertCircle className="mt-0.5 flex-shrink-0" size={18} />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold">Firestore에 기록할 수 없습니다.</p>
            <p className="mt-1">배포 환경(Vercel 등)에서 Firebase 보안 규칙 또는 App Check 설정으로 인해 권한이 거부된 것 같습니다.</p>
            <p className="mt-1">Firebase 콘솔에서 Firestore 규칙을 업데이트하고, 프로젝트 설정에 맞는 환경 변수(REACT_APP_FIREBASE_*)를 추가한 뒤 다시 시도해주세요.</p>
            <p className="mt-1 text-xs text-amber-600">에러 메시지: {firestoreError}</p>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2"><Settings size={20} /> 환경 설정</h3>
              <button onClick={() => setIsSettingsOpen(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">색상 테마 (등락 표시)</label>
              <div className="flex gap-2">
                <button onClick={() => setTheme('global')} className={`flex-1 py-2 rounded-lg border text-sm ${theme === 'global' ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold' : 'border-gray-200'}`}>
                  글로벌 (초록=상승)
                </button>
                <button onClick={() => setTheme('korea')} className={`flex-1 py-2 rounded-lg border text-sm ${theme === 'korea' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'border-gray-200'}`}>
                  한국형 (빨강=상승)
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Finnhub API Key</label>
              <div className="relative">
                <input 
                  type="password"
                  className={`w-full p-3 pr-20 rounded-lg border outline-none ${testStatus === 'success' ? 'border-green-500' : 'border-gray-200'}`}
                  placeholder="API 키 입력"
                  value={apiKey}
                  onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); }}
                />
                <button onClick={testApiKey} className="absolute right-2 top-2 bottom-2 px-3 bg-gray-100 hover:bg-gray-200 text-xs rounded">연결 확인</button>
              </div>
              <p className="text-xs text-gray-400 mt-2">* API 키는 이 기기에만 저장됩니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* Trade Modal */}
      {tradeModalOpen && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleTrade} className="bg-white p-6 rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-lg mb-1">{tradeType === 'buy' ? '추가 매수' : '매도(줄이기)'}</h3>
            <p className="text-sm text-gray-500 mb-4">{selectedAsset.name} ({selectedAsset.ticker || '자산'})</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">거래 단가 (1주당)</label>
                <input 
                  type="number" step="any" required
                  className="w-full p-3 rounded-lg border border-gray-200 focus:border-blue-500 outline-none"
                  value={tradePrice}
                  onChange={(e) => setTradePrice(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">수량 (개/주)</label>
                <input 
                  type="number" step="0.00000001" required
                  placeholder="예: 0.005"
                  className="w-full p-3 rounded-lg border border-gray-200 focus:border-blue-500 outline-none"
                  value={tradeQuantity}
                  onChange={(e) => setTradeQuantity(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => setTradeModalOpen(false)} className="flex-1 py-3 bg-gray-100 rounded-lg text-gray-600 font-medium">취소</button>
              <button type="submit" className={`flex-1 py-3 rounded-lg text-white font-medium ${tradeType === 'buy' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}>
                {tradeType === 'buy' ? '매수하기' : '매도하기'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Header */}
      <div className="w-full max-w-5xl mb-6 flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <PieChartIcon className="text-blue-600" /> Asset Pro
          {user ? (
            <span className="text-[10px] sm:text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1 animate-pulse">
              <Users size={12}/> Family Sync
            </span>
          ) : (
            <span className="text-[10px] sm:text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">Connecting...</span>
          )}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Settings size={20} /></button>
          <button onClick={refreshPrices} disabled={isRefreshing} className={`bg-white border text-gray-600 px-3 py-2 rounded-lg flex gap-2 ${isRefreshing ? 'opacity-50' : ''}`}>
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} /> <span className="hidden sm:inline">시세 연동</span>
          </button>
          <button onClick={() => setIsFormOpen(!isFormOpen)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex gap-2 shadow-sm">
            {isFormOpen ? '닫기' : <><Plus size={18} /> 추가</>}
          </button>
        </div>
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Visualization */}
        <div className="md:col-span-1 space-y-6 flex flex-col h-full">
          <div className="bg-gray-200 p-1 rounded-lg flex text-sm font-medium shrink-0">
            <button onClick={() => setTab('treemap')} className={`flex-1 py-1.5 rounded-md transition-all ${tab === 'treemap' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>맵</button>
            <button onClick={() => setTab('dashboard')} className={`flex-1 py-1.5 rounded-md transition-all ${tab === 'dashboard' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>구성</button>
            <button onClick={() => setTab('history')} className={`flex-1 py-1.5 rounded-md transition-all ${tab === 'history' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>추이</button>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex-1 min-h-[320px] flex flex-col">
            {tab === 'treemap' && (
              <>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-bold text-gray-700 flex items-center gap-2"><LayoutGrid size={16}/> 포트폴리오 맵</h2>
                  <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-1 rounded">크기:비중 / 색상:수익</span>
                </div>
                <div className="flex-1 w-full h-full min-h-[300px]">
                  <Treemap assets={assets} width={300} height={300} theme={theme} />
                </div>
              </>
            )}
            {tab === 'dashboard' && (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-sm font-medium text-gray-500 mb-4">자산 구성 (파이차트)</h2>
                <div className="text-center text-gray-400 text-sm">트리맵 탭에서 더 자세히 볼 수 있습니다.</div>
              </div>
            )}
            {tab === 'history' && (
              <>
                <h2 className="text-sm font-bold text-gray-700 mb-2 flex gap-2"><TrendingUp size={16}/> 자산 성장 추이</h2>
                <div className="flex-1 w-full min-h-[200px]">
                  <LineChart data={history} />
                </div>
              </>
            )}
          </div>
        </div>

        {/* List & Controls */}
        <div className="md:col-span-2 space-y-6">
           <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-2xl shadow-lg text-white flex justify-between items-center">
              <div>
                <div className="text-gray-400 text-sm mb-1">현재 총 자산</div>
                <div className="text-3xl font-bold tracking-tight">{formatMoney(totalAssets)}</div>
              </div>
              <div className="text-right">
                <div className={`text-sm font-medium flex items-center justify-end gap-1 ${totalReturnRate >= 0 ? (theme==='korea'?'text-red-400':'text-green-400') : (theme==='korea'?'text-blue-400':'text-red-400')}`}>
                  {totalReturnRate >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />} 
                  {totalReturnRate.toFixed(2)}% ({formatMoney(totalReturn)})
                </div>
                <div className="text-gray-400 text-xs">총 수익률</div>
              </div>
           </div>

          {isFormOpen && (
            <form onSubmit={handleAddAsset} className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-in slide-in-from-top-4">
              <h3 className="font-bold text-lg mb-4 text-gray-800">새 자산 등록</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2 flex gap-2 overflow-x-auto pb-2">
                  {Object.keys(categoryLabels).map(k => (
                    <button type="button" key={k} onClick={()=>setCategory(k as AssetType)} 
                    className={`px-3 py-2 rounded border text-xs whitespace-nowrap ${category===k ? 'bg-gray-800 text-white' : 'bg-white'}`}>
                      {categoryLabels[k as AssetType]}
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="자산명 (예: 삼성전자)" className="p-3 border rounded-lg col-span-2" value={name} onChange={e=>setName(e.target.value)} required />
                {(category === 'Stock' || category === 'Crypto') && (
                  <>
                    <input type="text" placeholder="티커 (예: 005930.KS)" className="p-3 border rounded-lg" value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} />
                    <input type="number" step="0.00000001" placeholder="수량" className="p-3 border rounded-lg" value={quantity} onChange={e=>setQuantity(e.target.value)} />
                  </>
                )}
                <input type="text" placeholder="총 매수 금액 (원)" className="p-3 border rounded-lg col-span-2" value={amountInput} onChange={e=>setAmountInput(e.target.value)} required />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 rounded">취소</button>
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded">저장</button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="font-semibold text-gray-800">보유 자산 목록</h3>
              <span className="text-xs text-gray-400">항목 클릭시 상세 거래</span>
            </div>
            
            <div className="divide-y divide-gray-100">
              {assets.map((asset) => {
                const roi = asset.purchaseAmount > 0 
                  ? ((asset.amount - asset.purchaseAmount) / asset.purchaseAmount) * 100 
                  : 0;
                const isProfit = roi >= 0;
                const profitColor = isProfit ? (theme === 'korea' ? 'text-red-500' : 'text-green-500') : (theme === 'korea' ? 'text-blue-500' : 'text-red-500');

                return (
                  <div key={asset.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: categoryColors[asset.category] }}>
                        {getCategoryIcon(asset.category)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 flex items-center gap-2 truncate">
                          {asset.name}
                          {asset.ticker && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">{asset.ticker}</span>}
                        </div>
                        <div className="text-xs text-gray-500 flex gap-2">
                           {asset.quantity ? <span>{asset.quantity}주(개)</span> : <span>{asset.date}</span>}
                           {asset.quantity && asset.purchaseAmount > 0 && <span>평단 {formatMoney(asset.purchaseAmount/asset.quantity)}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatMoney(asset.amount)}</div>
                        {asset.category !== 'Cash' && (
                          <div className={`text-xs font-medium ${profitColor}`}>
                            {isProfit ? '+' : ''}{roi.toFixed(2)}%
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openTradeModal(asset, 'buy')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="추가 매수"><Plus size={16} /></button>
                        <button onClick={() => openTradeModal(asset, 'sell')} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="매도/줄이기"><Minus size={16} /></button>
                        <button onClick={() => handleDelete(asset.id)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {assets.length === 0 && <div className="p-8 text-center text-gray-400">데이터가 없습니다.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
