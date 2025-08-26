
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Type } from "@google/genai";
import { createClient, Session, User } from '@supabase/supabase-js';

// --- Supabase Client Setup ---
// Credenciais do Supabase atualizadas.
const supabaseUrl = 'https://nstjvikkaazppyrtudqa.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdGp2aWtrYWF6cHB5cnR1ZHFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNjQ2NjEsImV4cCI6MjA3MTc0MDY2MX0.nbI4Yw1dDQlA_TtnJDEweo9ewxxJdo8aFdCo-cOw24o';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Type Interfaces ---
interface Ingredient {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface AnalysisResult {
  foodName: string;
  estimatedWeight: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: Ingredient[];
}

interface BMRResults {
    bmr: number;
    maintain: number;
    lose: number;
    gain: number;
}

type Goal = 'lose' | 'maintain' | 'gain';

interface MealEntry {
  name: string;
  time: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

type WeeklyLog = Record<string, MealEntry[]>;

// --- Constants ---
const initialWeeklyLog: WeeklyLog = {
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
};
const daysOfWeek = [
    { key: 'monday', name: 'Segunda' }, { key: 'tuesday', name: 'Terça' },
    { key: 'wednesday', name: 'Quarta' }, { key: 'thursday', name: 'Quinta' },
    { key: 'friday', name: 'Sexta' }, { key: 'saturday', name: 'Sábado' },
    { key: 'sunday', name: 'Domingo' },
];
const daysOfWeekOrder = daysOfWeek.map(d => d.key);

// --- Register Component ---
const Register = ({ onSwitchToLogin }: { onSwitchToLogin: () => void }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        setLoading(true);
        try {
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        username: name,
                    },
                    emailRedirectTo: window.location.origin, // Redireciona de volta para o app
                }
            });

            if (signUpError) throw signUpError;
            
            setSuccess('Cadastro realizado! Verifique seu email para confirmar a conta.');
            setName('');
            setEmail('');
            setPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <header>
                <h1>Crie sua Conta no NutriSnap 🥗</h1>
                <p>Preencha os dados para se cadastrar.</p>
            </header>
            <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                    <label htmlFor="name">Nome</label>
                    <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" required disabled={loading} />
                </div>
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required disabled={loading} />
                </div>
                <div className="input-group">
                    <label htmlFor="password">Senha</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required disabled={loading} />
                </div>
                <div className="input-group">
                    <label htmlFor="confirm-password">Confirmar Senha</label>
                    <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••" required disabled={loading} />
                </div>
                {error && <div className="error">{error}</div>}
                {success && <div className="success">{success}</div>}
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Cadastrando...' : 'Cadastrar'}</button>
            </form>
            <div className="auth-switch">
                <p>Já tem uma conta? <button onClick={onSwitchToLogin} disabled={loading}>Entre aqui</button></p>
            </div>
        </div>
    );
};


// --- Login Component ---
const Login = ({ onSwitchToRegister }: { onSwitchToRegister: () => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;
            // onLogin is handled by the onAuthStateChange listener in App
        } catch (err: any) {
            setError(err.error_description || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <header>
                <h1>Bem-vindo ao NutriSnap 🥗</h1>
                <p>Entre para começar a analisar suas refeições.</p>
            </header>
            <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                    <label htmlFor="email">Email</label>
                    <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required disabled={loading} />
                </div>
                <div className="input-group">
                    <label htmlFor="password">Senha</label>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••" required disabled={loading} />
                </div>
                {error && <div className="error">{error}</div>}
                <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'}</button>
            </form>
            <div className="auth-switch">
                <p>Não tem uma conta? <button onClick={onSwitchToRegister} disabled={loading}>Cadastre-se</button></p>
            </div>
        </div>
    );
};

// --- Auth Container ---
const AuthContainer = () => {
    const [mode, setMode] = useState('login'); // 'login' or 'register'

    if (mode === 'login') {
        return <Login onSwitchToRegister={() => setMode('register')} />;
    } else {
        return <Register onSwitchToLogin={() => setMode('login')} />;
    }
};

// --- ProgressBar Component ---
const ProgressBar = ({ label, currentValue, goalValue, unit }: { label: string, currentValue: number, goalValue: number, unit: string }) => {
    const percentage = goalValue > 0 ? (currentValue / goalValue) * 100 : 0;
    const displayPercentage = Math.min(percentage, 100);
    const isOverLimit = percentage > 100;

    return (
        <div className="progress-bar-container">
            <div className="progress-labels">
                <span>{label}</span>
                <span>{Math.round(currentValue)} / {Math.round(goalValue)} {unit}</span>
            </div>
            <div className="progress-track">
                <div
                    className={`progress-fill ${isOverLimit ? 'over-limit' : ''}`}
                    style={{ width: `${displayPercentage}%` }}
                />
            </div>
        </div>
    );
};


// --- Main Application Component ---
const NutriSnapApp = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState('analysis');
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  
  // States for Meal Analysis
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [foodDescription, setFoodDescription] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  // States for BMR Calculator
  const [gender, setGender] = useState('male');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [activityLevel, setActivityLevel] = useState('1.2');
  const [weightChangeRate, setWeightChangeRate] = useState('0.5'); // Re-added state
  const [bmrResults, setBmrResults] = useState<BMRResults | null>(null);
    
  // States for Weekly Tracker
  const [selectedGoal, setSelectedGoal] = useState<Goal>('lose');
  const [weeklyLog, setWeeklyLog] = useState<WeeklyLog>(initialWeeklyLog);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isInitialMount = useRef(true);

  // --- Effects ---
  useEffect(() => {
    const timer = setInterval(() => {
        const now = new Date();
        setCurrentDateTime(now.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            dateStyle: 'long',
            timeStyle: 'medium'
        }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch user data from Supabase on load, create profile if it doesn't exist
  useEffect(() => {
    const fetchProfile = async () => {
        setProfileLoading(true);
        try {
            let { data, error } = await supabase
                .from('profiles')
                .select('bmr_results, weekly_log')
                .eq('id', user.id)
                .single();
            
            if (error && error.code === 'PGRST116') { // Profile not found, create it
                console.log("No profile found, creating one for new user.");
                const newProfile = {
                    id: user.id,
                    username: user.user_metadata.username || user.email?.split('@')[0],
                    bmr_results: null,
                    weekly_log: initialWeeklyLog
                };

                const { error: insertError } = await supabase.from('profiles').insert(newProfile);
                if (insertError) throw insertError;
                
                data = newProfile; // Use the newly created profile data
            } else if (error) {
                throw error; // Throw other errors
            }
            
            if (data) {
                if (data.bmr_results) setBmrResults(data.bmr_results);
                
                if (data.weekly_log) {
                     const parsedLog = data.weekly_log;
                     const validLog = Object.keys(initialWeeklyLog).reduce((acc, day) => {
                        acc[day] = Array.isArray(parsedLog[day]) ? parsedLog[day] : [];
                        return acc;
                     }, {} as WeeklyLog);
                     setWeeklyLog(validLog);
                } else {
                    setWeeklyLog(initialWeeklyLog);
                }
            }
        } catch (e: any) {
            console.error("Failed to fetch or create profile:", e.message);
        } finally {
            setProfileLoading(false);
            isInitialMount.current = false;
        }
    };
    fetchProfile();
  }, [user.id]);

  // Save user data to Supabase on change (debounced)
  useEffect(() => {
      if (isInitialMount.current || profileLoading) return;
      
      const updateProfile = async () => {
          try {
              const { error } = await supabase
                  .from('profiles')
                  .update({ bmr_results: bmrResults, weekly_log: weeklyLog })
                  .eq('id', user.id);
              if (error) throw error;
          } catch (e: any) {
              console.error("Failed to save profile:", e.message);
          }
      };

      const handler = setTimeout(() => {
          updateProfile();
      }, 1500); // Debounce time

      return () => clearTimeout(handler);
  }, [bmrResults, weeklyLog, user.id, profileLoading]);

  useEffect(() => {
    if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const cleanupCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => cleanupCamera();
  }, [stream]);

  // --- Calculations for Weekly Tracker ---
  const weeklyTrackerCalculations = React.useMemo(() => {
    if (!bmrResults) return null;

    const dailyGoal = bmrResults[selectedGoal];
    const weeklyGoal = dailyGoal * 7;

    const totalWeeklyConsumed = Object.values(weeklyLog).flat().reduce((sum, meal) => sum + meal.calories, 0);

    const d = new Date().getDay();
    const todayIndex = d === 0 ? 6 : d - 1;
    const todayKey = daysOfWeekOrder[todayIndex];
    const todayEntries = weeklyLog[todayKey] || [];
    
    const todayTotals = todayEntries.reduce((acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

    // Protein: 30%, Carbs: 40%, Fat: 30%
    const proteinGoal = (dailyGoal * 0.30) / 4;
    const carbsGoal = (dailyGoal * 0.40) / 4;
    const fatGoal = (dailyGoal * 0.30) / 9;

    return {
      dailyGoal,
      weeklyGoal,
      totalWeeklyConsumed,
      todayTotals,
      proteinGoal,
      carbsGoal,
      fatGoal
    };
  }, [bmrResults, selectedGoal, weeklyLog]);


  // --- Handlers ---
  const handleStartCamera = async () => {
    cleanupCamera();
    setError(null);
    setAnalysisResult(null);
    setImageSrc(null);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(newStream);
    } catch (err) {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(newStream);
      } catch (fallbackErr) {
        setError("Não foi possível acessar a câmera. Verifique as permissões.");
      }
    }
  };
  
  const handleUploadClick = () => fileInputRef.current?.click();
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          setImageSrc(e.target.result);
          cleanupCamera();
          setError(null);
          setAnalysisResult(null);
        }
      };
      reader.onerror = () => setError("Falha ao ler o arquivo.");
      reader.readAsDataURL(file);
    }
  };

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const { video, canvas } = { video: videoRef.current, canvas: canvasRef.current };
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        setImageSrc(canvas.toDataURL('image/jpeg'));
        cleanupCamera();
      }
    }
  };

  const handleAnalyze = async () => {
    if (!imageSrc) {
      setError("Por favor, tire uma foto ou envie uma imagem.");
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const apiResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageSrc, foodDescription }),
      });
      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to analyze image');
      }
      const resultData = await apiResponse.json();
      setAnalysisResult(resultData);
    } catch (e: any) {
      setError(`Ocorreu um erro ao analisar a imagem: ${e.message || 'Tente novamente.'}`);
    } finally {
      setLoading(false);
    }
  };
  
  const reset = () => {
    setImageSrc(null);
    setFoodDescription('');
    setAnalysisResult(null);
    setError(null);
    setLoading(false);
    cleanupCamera();
  }
  
  const handleCalculateBMR = (e: React.FormEvent) => {
      e.preventDefault();
      const [ageNum, weightNum, heightNum] = [parseInt(age), parseFloat(weight), parseFloat(height)];
      if (isNaN(ageNum) || isNaN(weightNum) || isNaN(heightNum) || ageNum <= 0 || weightNum <= 0 || heightNum <= 0) {
          setError("Por favor, insira valores válidos.");
          setBmrResults(null);
          return;
      }
      setError(null);
      let bmr = (gender === 'male') ? (10 * weightNum + 6.25 * heightNum - 5 * ageNum + 5) : (10 * weightNum + 6.25 * heightNum - 5 * ageNum - 161);
      const tdee = bmr * parseFloat(activityLevel);
      // 1kg of fat ~ 7000 kcal. 1kg/week ~ 1000 kcal/day deficit.
      const calorieAdjustment = parseFloat(weightChangeRate) * 1000;
      setBmrResults({ bmr: Math.round(bmr), maintain: Math.round(tdee), lose: Math.round(tdee - calorieAdjustment), gain: Math.round(tdee + calorieAdjustment) });
  }
  
  const handleAddMealToLog = () => {
    if (!analysisResult) return;
    const d = new Date().getDay();
    const dayIndex = d === 0 ? 6 : d - 1;
    const dayKey = daysOfWeekOrder[dayIndex];
    const newEntry: MealEntry = { name: analysisResult.foodName, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), calories: analysisResult.calories, protein: analysisResult.protein, carbs: analysisResult.carbs, fat: analysisResult.fat };
    setWeeklyLog(prevLog => ({ ...prevLog, [dayKey]: [...(prevLog[dayKey] || []), newEntry] }));
    setActiveTab('weekly');
    setExpandedDays(prev => ({ ...prev, [dayKey]: true }));
    reset();
  }

  const handleRemoveIngredient = (indexToRemove: number) => {
    if (!analysisResult) return;
    const newIngredients = analysisResult.ingredients.filter((_, index) => index !== indexToRemove);
    const newTotals = newIngredients.reduce((acc, ing) => ({ calories: acc.calories + ing.calories, protein: acc.protein + ing.protein, carbs: acc.carbs + ing.carbs, fat: acc.fat + ing.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    setAnalysisResult({ ...analysisResult, ...newTotals, ingredients: newIngredients });
  };
  
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Log any error to the console for debugging, but don't block the user.
        console.error('Error logging out:', error.message);
      }
    } catch (e) {
        console.error('An unexpected error occurred during logout:', e);
    } finally {
      // Redirect to the root of the site to force a full re-initialization.
      // This is more reliable in some environments than a simple reload.
      window.location.href = '/';
    }
  };

  const handleRemoveMeal = (dayKey: string, mealIndex: number) => {
      setWeeklyLog(prevLog => {
          const dayEntries = [...(prevLog[dayKey] || [])];
          dayEntries.splice(mealIndex, 1);
          return { ...prevLog, [dayKey]: dayEntries };
      });
  };

  const handleMoveMeal = (dayKey: string, mealIndex: number, direction: 'up' | 'down') => {
      setWeeklyLog(prevLog => {
          const dayEntries = [...(prevLog[dayKey] || [])];
          const targetIndex = direction === 'up' ? mealIndex - 1 : mealIndex + 1;
          if (targetIndex < 0 || targetIndex >= dayEntries.length) {
              return prevLog;
          }
          [dayEntries[mealIndex], dayEntries[targetIndex]] = [dayEntries[targetIndex], dayEntries[mealIndex]];
          return { ...prevLog, [dayKey]: dayEntries };
      });
  };
  
  if (profileLoading) {
      return <div className="loading-container"><div className="spinner"></div><p>Carregando seus dados...</p></div>
  }

  return (
    <div className="container">
      <div className="datetime-display">{currentDateTime}</div>
      <header>
        <h1>NutriSnap 🥗</h1>
        <p>Sua ferramenta inteligente para análise nutricional e metas de calorias.</p>
        <button onClick={handleLogout} className="logout-btn" title="Sair">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
        </button>
      </header>
      
      <div className="tabs">
          <button className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>Análise de Refeição</button>
          <button className={`tab-btn ${activeTab === 'bmr' ? 'active' : ''}`} onClick={() => setActiveTab('bmr')}>Calculadora TMB</button>
          <button className={`tab-btn ${activeTab === 'weekly' ? 'active' : ''}`} onClick={() => setActiveTab('weekly')}>Calorias Semanais</button>
      </div>

      {activeTab === 'analysis' && (
        <>
          <div className="camera-container">
            {stream && <video ref={videoRef} autoPlay playsInline muted />}
            {imageSrc && !stream && <img src={imageSrc} alt="Sua Refeição" />}
            {!stream && !imageSrc && (
                <div className="placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>
                </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} />
          
          <div className="controls">
            {!analysisResult && (
              <div className="input-group">
                <label htmlFor="food-desc">Descrição Opcional</label>
                <input id="food-desc" type="text" value={foodDescription} onChange={e => setFoodDescription(e.target.value)} placeholder="Ex: Prato de arroz, feijão e frango." />
              </div>
            )}
            <div className="button-group">
              {stream && <button className="btn btn-primary" onClick={handleTakePhoto}>Tirar Foto</button>}
              {!stream && !imageSrc && <button className="btn btn-secondary" onClick={handleStartCamera}>Abrir Câmera</button>}
              {!stream && !imageSrc && <button className="btn btn-secondary" onClick={handleUploadClick}>Enviar Imagem</button>}
              {imageSrc && !analysisResult && <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading}>Analisar</button>}
              {(imageSrc || stream) && !analysisResult && <button className="btn btn-secondary" onClick={reset}>Cancelar</button>}
            </div>
          </div>

          {loading && <div className="loading"><div className="spinner"></div><p>Analisando sua refeição...</p></div>}
          {error && <div className="error">{error}</div>}
          
          {analysisResult && (
            <div className="results">
              <h2>{analysisResult.foodName}</h2>
              <p>Peso estimado: {analysisResult.estimatedWeight}</p>
              <div className="macros">
                <div className="macro-card calories"><div className="value">{Math.round(analysisResult.calories)}</div><h3>calorias</h3></div>
                <div className="macro-card"><div className="value">{Math.round(analysisResult.protein)}g</div><h3>Proteínas</h3></div>
                <div className="macro-card"><div className="value">{Math.round(analysisResult.carbs)}g</div><h3>Carbs</h3></div>
                <div className="macro-card"><div className="value">{Math.round(analysisResult.fat)}g</div><h3>Gorduras</h3></div>
              </div>
              <div className="detailed-breakdown">
                <h4>Detalhes dos Ingredientes</h4>
                <table className="breakdown-table">
                  <thead><tr><th>Ingrediente</th><th>Cal</th><th>Prot</th><th>Carb</th><th>Gord</th><th></th></tr></thead>
                  <tbody>{analysisResult.ingredients.map((ing, i) => <tr key={i}><td>{ing.name}</td><td>{Math.round(ing.calories)}</td><td>{Math.round(ing.protein)}g</td><td>{Math.round(ing.carbs)}g</td><td>{Math.round(ing.fat)}g</td><td><button className="remove-btn" onClick={() => handleRemoveIngredient(i)}>&times;</button></td></tr>)}</tbody>
                </table>
              </div>
              <button className="btn btn-primary btn-add-to-log" onClick={handleAddMealToLog}>Adicionar ao Diário</button>
              <div className="controls"><button className="btn btn-secondary" onClick={reset}>Analisar Outra</button></div>
            </div>
          )}
        </>
      )}

      {activeTab === 'bmr' && (
        <div className="bmr-calculator">
          <form className="bmr-form" onSubmit={handleCalculateBMR}>
            <div className="input-group">
              <label>Gênero</label>
              <div className="radio-group">
                <label><input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={e => setGender(e.target.value)} /> Masculino</label>
                <label><input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={e => setGender(e.target.value)} /> Feminino</label>
              </div>
            </div>
            <div className="form-grid">
              <div className="input-group"><label htmlFor="age">Idade</label><input id="age" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="ex: 25" /></div>
              <div className="input-group"><label htmlFor="weight">Peso (kg)</label><input id="weight" type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="ex: 70" /></div>
              <div className="input-group"><label htmlFor="height">Altura (cm)</label><input id="height" type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="ex: 175" /></div>
            </div>
            <div className="input-group">
                <label htmlFor="activity">Nível de Atividade</label>
                <select id="activity" value={activityLevel} onChange={e => setActivityLevel(e.target.value)}><option value="1.2">Sedentário (pouco ou nenhum exercício)</option><option value="1.375">Levemente ativo (exercício leve 1-3 dias/semana)</option><option value="1.55">Moderadamente ativo (exercício moderado 3-5 dias/semana)</option><option value="1.725">Muito ativo (exercício intenso 6-7 dias/semana)</option><option value="1.9">Extremamente ativo (trabalho físico intenso, etc)</option></select>
            </div>
            <div className="input-group">
                <label htmlFor="rate">Ritmo de Alteração de Peso (kg/semana)</label>
                <select id="rate" value={weightChangeRate} onChange={e => setWeightChangeRate(e.target.value)}><option value="0.25">0.25 kg</option><option value="0.5">0.5 kg</option><option value="0.75">0.75 kg</option><option value="1">1 kg</option></select>
            </div>
            <button type="submit" className="btn btn-primary">Calcular Metas</button>
          </form>
          {error && <div className="error" style={{marginTop: '1rem'}}>{error}</div>}
          {bmrResults && (
            <div className="results bmr-results">
              <h2>Suas Metas Diárias</h2>
              <p>Com base nos seus dados, aqui estão suas metas de calorias estimadas para diferentes objetivos.</p>
              <div className="macros">
                <div className="goal-card"><div className="value">{bmrResults.lose}</div><h3>Emagrecer</h3><p className="goal-desc">Déficit calórico para perda de peso gradual.</p></div>
                <div className="goal-card"><div className="value">{bmrResults.maintain}</div><h3>Manter Peso</h3><p className="goal-desc">Calorias para manter seu peso atual.</p></div>
                <div className="goal-card"><div className="value">{bmrResults.gain}</div><h3>Ganhar Massa</h3><p className="goal-desc">Superávit calórico para ganho de massa muscular.</p></div>
              </div>
              <p className="disclaimer">Estes valores são estimativas. Consulte um profissional de saúde para orientação personalizada.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'weekly' && (
        <div className="weekly-tracker">
          {!bmrResults ? (
            <div className="placeholder-text">Calcule suas metas na aba "Calculadora TMB" para começar a acompanhar suas calorias semanais.</div>
          ) : (
            <>
              <div className="weekly-summary-container">
                  <h4>Resumo da Semana</h4>
                  <div className="weekly-summary">
                      <div className="summary-card consumed">
                          <h4>Consumidas na Semana</h4>
                          <p><strong>{Math.round(weeklyTrackerCalculations?.totalWeeklyConsumed ?? 0)}</strong> kcal</p>
                          <span>de {Math.round(weeklyTrackerCalculations?.weeklyGoal ?? 0)} kcal</span>
                      </div>
                       <div className="summary-card remaining">
                          <h4>Restantes na Semana</h4>
                          <p><strong>{Math.round((weeklyTrackerCalculations?.weeklyGoal ?? 0) - (weeklyTrackerCalculations?.totalWeeklyConsumed ?? 0))}</strong> kcal</p>
                          <span>para sua meta</span>
                      </div>
                  </div>
              </div>
              
              <div className="daily-goal-display">
                <h4>Progresso do Dia</h4>
                <div className="progress-bars-grid">
                  <ProgressBar label="Calorias" currentValue={weeklyTrackerCalculations?.todayTotals.calories ?? 0} goalValue={weeklyTrackerCalculations?.dailyGoal ?? 0} unit="kcal" />
                  <ProgressBar label="Proteínas" currentValue={weeklyTrackerCalculations?.todayTotals.protein ?? 0} goalValue={weeklyTrackerCalculations?.proteinGoal ?? 0} unit="g" />
                  <ProgressBar label="Carboidratos" currentValue={weeklyTrackerCalculations?.todayTotals.carbs ?? 0} goalValue={weeklyTrackerCalculations?.carbsGoal ?? 0} unit="g" />
                  <ProgressBar label="Gorduras" currentValue={weeklyTrackerCalculations?.todayTotals.fat ?? 0} goalValue={weeklyTrackerCalculations?.fatGoal ?? 0} unit="g" />
                </div>
              </div>
            
              <div className="weekly-log">
                <h4>Registro Diário</h4>
                <div className="input-group">
                  <label htmlFor="goal-select">Meu objetivo é:</label>
                  <select id="goal-select" value={selectedGoal} onChange={e => setSelectedGoal(e.target.value as Goal)}>
                      <option value="lose">Emagrecer</option>
                      <option value="maintain">Manter Peso</option>
                      <option value="gain">Ganhar Massa</option>
                  </select>
                </div>
                <table className="breakdown-table weekly-log-table">
                  <thead><tr><th>Dia</th><th>Calorias</th></tr></thead>
                  <tbody>
                    {daysOfWeek.map(({ key, name }) => {
                      const dayEntries = weeklyLog[key] || [];
                      const dayTotal = dayEntries.reduce((sum, entry) => sum + entry.calories, 0);
                      const isExpanded = !!expandedDays[key];
                      return (
                        <React.Fragment key={key}>
                          <tr className="day-summary-row" onClick={() => setExpandedDays(prev => ({ ...prev, [key]: !isExpanded }))}>
                            <td><span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>&#9656;</span> {name}</td>
                            <td className="daily-calorie-cell"><strong>{Math.round(dayTotal)}</strong><span className="daily-goal-text">/ {bmrResults[selectedGoal]} kcal</span></td>
                          </tr>
                          {isExpanded && (
                            dayEntries.length > 0 ? (
                              dayEntries.map((meal, index) => (
                                <tr key={`${key}-${index}`} className="meal-entry-row">
                                  <td>
                                    <div className="meal-info">
                                      <span className="meal-name">{meal.name}</span>
                                      <span className="meal-time">{meal.time}</span>
                                    </div>
                                  </td>
                                  <td className="meal-actions-cell">
                                    <span>{Math.round(meal.calories)} kcal</span>
                                    <div className="meal-actions">
                                      <button className="move-btn" onClick={(e) => { e.stopPropagation(); handleMoveMeal(key, index, 'up'); }} disabled={index === 0}>&#8593;</button>
                                      <button className="move-btn" onClick={(e) => { e.stopPropagation(); handleMoveMeal(key, index, 'down'); }} disabled={index === dayEntries.length - 1}>&#8595;</button>
                                      <button className="remove-btn" onClick={(e) => { e.stopPropagation(); handleRemoveMeal(key, index); }}>&times;</button>
                                    </div>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr className="meal-entry-row no-meals-row"><td colSpan={2}><p className="no-meals-text">Nenhuma refeição registrada.</p></td></tr>
                            )
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};


// --- App Component (Authentication Manager) ---
const App = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth state changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    if (loading) {
        return <div className="loading-container"><div className="spinner"></div><p>Iniciando...</p></div>;
    }

    if (!session) {
        return <AuthContainer />;
    } else {
        // Using key={session.user.id} ensures the component remounts on user change
        return <NutriSnapApp key={session.user.id} user={session.user} />;
    }
};

// --- Render App ---
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}
