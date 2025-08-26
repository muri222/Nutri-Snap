import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Type } from "@google/genai";

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


// --- Main Application Component ---
const NutriSnapApp = () => {
  const [activeTab, setActiveTab] = useState('analysis');
  const [currentDateTime, setCurrentDateTime] = useState('');
  
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
  const [weightChangeRate, setWeightChangeRate] = useState('0.5');
  const [bmrResults, setBmrResults] = useState<BMRResults | null>(null);
    
  // States for Weekly Tracker
  const [selectedGoal, setSelectedGoal] = useState<Goal>('lose');
  const [weeklyLog, setWeeklyLog] = useState<WeeklyLog>(initialWeeklyLog);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  let ai: GoogleGenAI;
  try {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
  } catch (e) {
    console.error(e);
  }

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

  useEffect(() => {
    try {
        const savedBmrResults = localStorage.getItem('bmrResults');
        if (savedBmrResults) setBmrResults(JSON.parse(savedBmrResults));
        
        const savedWeeklyLog = localStorage.getItem('weeklyLog');
        if (savedWeeklyLog) {
            const parsedLog = JSON.parse(savedWeeklyLog);
            const validLog = Object.keys(initialWeeklyLog).reduce((acc, day) => {
                acc[day] = Array.isArray(parsedLog[day]) ? parsedLog[day] : [];
                return acc;
            }, {} as WeeklyLog);
            setWeeklyLog(validLog);
        }
    } catch (e) { console.error("Failed to parse from localStorage", e); }
  }, []);

  useEffect(() => {
      if (bmrResults) localStorage.setItem('bmrResults', JSON.stringify(bmrResults));
      localStorage.setItem('weeklyLog', JSON.stringify(weeklyLog));
  }, [bmrResults, weeklyLog]);

  const cleanupCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    return () => cleanupCamera();
  }, [stream]);

  // --- Handlers ---
  const handleStartCamera = async () => {
    cleanupCamera();
    setError(null);
    setAnalysisResult(null);
    setImageSrc(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStream(stream);
    } catch (err) {
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
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
    if (!imageSrc || !ai) {
      setError(!imageSrc ? "Por favor, tire uma foto ou envie uma imagem." : "API não inicializada.");
      return;
    }
    setLoading(true);
    setError(null);
    setAnalysisResult(null);
    try {
      const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: { parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageSrc.split(',')[1] } },
            { text: `Analise a comida nesta imagem. Descrição do usuário: "${foodDescription || 'Nenhuma'}". Identifique o prato, estime o peso, e forneça os macros TOTAIS e detalhados por ingrediente. Responda apenas com o JSON formatado.` }
          ]},
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: { foodName: { type: Type.STRING }, estimatedWeight: { type: Type.STRING }, calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER },
                    ingredients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER } }, required: ["name", "calories", "protein", "carbs", "fat"] } } },
                required: ["foodName", "estimatedWeight", "calories", "protein", "carbs", "fat", "ingredients"]
            }
          }
      });
      setAnalysisResult(JSON.parse(response.text.trim()));
    } catch (e) {
      setError("Ocorreu um erro ao analisar a imagem. Tente novamente.");
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
      const calorieAdjustment = parseFloat(weightChangeRate) * 500;
      setBmrResults({ bmr: Math.round(bmr), maintain: Math.round(tdee), lose: Math.round(tdee - calorieAdjustment), gain: Math.round(tdee + calorieAdjustment) });
  }
  
  const handleAddMealToLog = () => {
    if (!analysisResult) return;
    const d = new Date().getDay(); // 0 for Sunday, 1 for Monday, etc.
    const dayIndex = d === 0 ? 6 : d - 1; // Map to Monday-first index (0-6)
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

  return (
    <div className="container">
      <div className="datetime-display">{currentDateTime}</div>
      <header>
        <h1>NutriSnap 🥗</h1>
        <p>Sua ferramenta inteligente para análise nutricional e metas de calorias.</p>
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
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.776 48.776 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" /></svg>
                    <span>Use a câmera ou envie uma imagem</span>
                </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" style={{ display: 'none' }} />
          <div className="controls">
            {!stream && !imageSrc && (
                <div className="button-group">
                    <button onClick={handleStartCamera} className="btn btn-secondary"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 9.172 2H6.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 3.172 4H2zm.5 2a.5.5 0 1 1 0-1 .5.5 0 0 1 0 1zm9 2.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/></svg> Iniciar Câmera</button>
                    <button onClick={handleUploadClick} className="btn btn-primary"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" /></svg> Enviar Imagem</button>
                </div>
            )}
            {stream && <button onClick={handleTakePhoto} className="btn btn-primary">Tirar Foto</button>}
            {imageSrc && !stream && !analysisResult && (
                <><div className="input-group"><label htmlFor="food-description">Detalhes da refeição (opcional)</label><input id="food-description" type="text" placeholder="Ex: Arroz, feijão e bife" value={foodDescription} onChange={(e) => setFoodDescription(e.target.value)}/></div><button onClick={handleAnalyze} className="btn btn-primary" disabled={loading}>Analisar Refeição</button><button onClick={reset} className="btn btn-secondary" disabled={loading}>Nova Análise</button></>
            )}
          </div>
          {loading && <div className="loading"><div className="spinner"></div><p>Analisando...</p></div>}
          {error && <div className="error">{error}</div>}
          {analysisResult && (
            <div className="results">
              <h2>{analysisResult.foodName}</h2>
              <p>Peso estimado: {analysisResult.estimatedWeight}</p>
              <div className="macros"><div className="macro-card calories"><h3>Calorias</h3><span className="value">{Math.round(analysisResult.calories)} <small>kcal</small></span></div><div className="macro-card"><h3>Proteína</h3><span className="value">{analysisResult.protein.toFixed(1)} <small>g</small></span></div><div className="macro-card"><h3>Carboidratos</h3><span className="value">{analysisResult.carbs.toFixed(1)} <small>g</small></span></div><div className="macro-card"><h3>Gorduras</h3><span className="value">{analysisResult.fat.toFixed(1)} <small>g</small></span></div></div>
              {analysisResult.ingredients?.length > 0 && (
                <div className="detailed-breakdown"><h4>Detalhamento por Ingrediente</h4><table className="breakdown-table"><thead><tr><th>Ingrediente</th><th>Calorias</th><th>Proteína</th><th>Carbs</th><th>Gordura</th><th>Ação</th></tr></thead><tbody>{analysisResult.ingredients.map((item, index) => (<tr key={index}><td>{item.name}</td><td>{Math.round(item.calories)}</td><td>{item.protein.toFixed(1)}g</td><td>{item.carbs.toFixed(1)}g</td><td>{item.fat.toFixed(1)}g</td><td><button onClick={() => handleRemoveIngredient(index)} className="remove-btn" title="Remover">&times;</button></td></tr>))}</tbody></table></div>
              )}
              <div className="controls"><button onClick={handleAddMealToLog} className="btn btn-primary btn-add-to-log">Adicionar ao Diário</button><button onClick={reset} className="btn btn-secondary">Analisar Outra</button></div>
            </div>
          )}
        </>
      )}
      {activeTab === 'bmr' && (
          <div className="bmr-calculator">
              <form onSubmit={handleCalculateBMR} className="bmr-form">
                  <div className="input-group"><label>Gênero</label><div className="radio-group"><label><input type="radio" value="male" checked={gender === 'male'} onChange={e => setGender(e.target.value)} /> Masculino</label><label><input type="radio" value="female" checked={gender === 'female'} onChange={e => setGender(e.target.value)} /> Feminino</label></div></div>
                  <div className="form-grid"><div className="input-group"><label htmlFor="age">Idade</label><input id="age" type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="anos" required /></div><div className="input-group"><label htmlFor="weight">Peso (kg)</label><input id="weight" type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="kg" required /></div><div className="input-group"><label htmlFor="height">Altura (cm)</label><input id="height" type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="cm" required /></div></div>
                  <div className="input-group"><label htmlFor="activity">Nível de Atividade</label><select id="activity" value={activityLevel} onChange={e => setActivityLevel(e.target.value)}><option value="1.2">Sedentário</option><option value="1.375">Levemente ativo (1-3 dias/sem)</option><option value="1.55">Moderadamente ativo (3-5 dias/sem)</option><option value="1.725">Muito ativo (6-7 dias/sem)</option><option value="1.9">Extremamente ativo</option></select></div>
                  <div className="input-group"><label htmlFor="change-rate">Meta de Alteração Semanal</label><select id="change-rate" value={weightChangeRate} onChange={e => setWeightChangeRate(e.target.value)}><option value="0.25">Perder/Ganhar 0.25 kg</option><option value="0.5">Perder/Ganhar 0.5 kg</option><option value="0.75">Perder/Ganhar 0.75 kg</option><option value="1">Perder/Ganhar 1 kg</option></select></div>
                  <button type="submit" className="btn btn-primary">Calcular</button>
              </form>
              {error && activeTab === 'bmr' && <div className="error">{error}</div>}
              {bmrResults && (
                  <div className="results bmr-results">
                      <h2>Seus Resultados</h2><p>Sua TMB é <strong>{bmrResults.bmr} kcal</strong>. Estas são suas metas diárias:</p>
                      <div className="macros"><div className="macro-card goal-card"><h3>Perder Peso</h3><span className="value">{bmrResults.lose} <small>kcal/dia</small></span><p className="goal-desc">Déficit para perder ~{weightChangeRate}kg/semana.</p></div><div className="macro-card goal-card"><h3>Manter Peso</h3><span className="value">{bmrResults.maintain} <small>kcal/dia</small></span></div><div className="macro-card goal-card"><h3>Ganhar Peso</h3><span className="value">{bmrResults.gain} <small>kcal/dia</small></span><p className="goal-desc">Superávit para ganhar ~{weightChangeRate}kg/semana.</p></div></div>
                      <div className="detailed-breakdown weekly-bank"><h4>Banco Semanal de Metas</h4><p className="goal-desc">Estimativa de macros (40% C, 30% P, 30% G).</p><table className="breakdown-table"><thead><tr><th>Objetivo</th><th>Calorias</th><th>Proteína</th><th>Carbs</th><th>Gordura</th></tr></thead><tbody><tr><td>Perder Peso</td><td>{(bmrResults.lose * 7).toLocaleString('pt-BR')}</td><td>{Math.round((bmrResults.lose * 0.30 / 4) * 7)}g</td><td>{Math.round((bmrResults.lose * 0.40 / 4) * 7)}g</td><td>{Math.round((bmrResults.lose * 0.30 / 9) * 7)}g</td></tr><tr><td>Manter Peso</td><td>{(bmrResults.maintain * 7).toLocaleString('pt-BR')}</td><td>{Math.round((bmrResults.maintain * 0.30 / 4) * 7)}g</td><td>{Math.round((bmrResults.maintain * 0.40 / 4) * 7)}g</td><td>{Math.round((bmrResults.maintain * 0.30 / 9) * 7)}g</td></tr><tr><td>Ganhar Peso</td><td>{(bmrResults.gain * 7).toLocaleString('pt-BR')}</td><td>{Math.round((bmrResults.gain * 0.30 / 4) * 7)}g</td><td>{Math.round((bmrResults.gain * 0.40 / 4) * 7)}g</td><td>{Math.round((bmrResults.gain * 0.30 / 9) * 7)}g</td></tr></tbody></table></div>
                      <p className="disclaimer">Valores estimados. Consulte um profissional de saúde.</p>
                  </div>
              )}
          </div>
      )}
      {activeTab === 'weekly' && bmrResults && (
          <WeeklyTracker
              bmrResults={bmrResults}
              initialGoal={selectedGoal}
              initialLog={weeklyLog}
              onLogChange={setWeeklyLog}
              expandedDays={expandedDays}
              setExpandedDays={setExpandedDays}
          />
      )}
       {activeTab === 'weekly' && !bmrResults && (
           <div className="placeholder-text"><p>Calcule sua TMB primeiro para definir suas metas.</p></div>
       )}
    </div>
  );
};


// --- Weekly Tracker Component (for performance and organization) ---
interface WeeklyTrackerProps {
    bmrResults: BMRResults;
    initialGoal: Goal;
    initialLog: WeeklyLog;
    onLogChange: React.Dispatch<React.SetStateAction<WeeklyLog>>;
    expandedDays: Record<string, boolean>;
    setExpandedDays: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const WeeklyTracker: React.FC<WeeklyTrackerProps> = ({ bmrResults, initialGoal, initialLog, onLogChange, expandedDays, setExpandedDays }) => {
    const [selectedGoal, setSelectedGoal] = useState<Goal>(initialGoal);
    
    // --- Handlers specific to this component ---
    const toggleDayExpansion = (dayKey: string) => {
        setExpandedDays(prev => ({ ...prev, [dayKey]: !prev[dayKey] }));
    };

    const handleRemoveMealEntry = (dayKey: string, indexToRemove: number) => {
        const newLog = { ...initialLog };
        newLog[dayKey] = newLog[dayKey].filter((_, i) => i !== indexToRemove);
        onLogChange(newLog);
    };

    const handleMoveMealEntry = (dayKey: string, index: number, direction: 'up' | 'down') => {
        const dayIndex = daysOfWeekOrder.indexOf(dayKey);
        const newLog: WeeklyLog = JSON.parse(JSON.stringify(initialLog));
        const currentDayEntries = newLog[dayKey];
        const mealToMove = currentDayEntries.splice(index, 1)[0];
        
        if (direction === 'up') {
            if (index > 0) currentDayEntries.splice(index - 1, 0, mealToMove);
            else if (dayIndex > 0) newLog[daysOfWeekOrder[dayIndex - 1]].push(mealToMove);
        } else {
            if (index < currentDayEntries.length) currentDayEntries.splice(index + 1, 0, mealToMove);
            else if (dayIndex < daysOfWeekOrder.length - 1) newLog[daysOfWeekOrder[dayIndex + 1]].unshift(mealToMove);
        }
        onLogChange(newLog);
    };

    // --- Memoized Calculations for Performance ---
    const dailyMacros = React.useMemo(() => {
        const dailyTarget = bmrResults[selectedGoal];
        return {
            calories: Math.round(dailyTarget),
            protein: Math.round(dailyTarget * 0.30 / 4),
            carbs: Math.round(dailyTarget * 0.40 / 4),
            fat: Math.round(dailyTarget * 0.30 / 9),
        };
    }, [bmrResults, selectedGoal]);

    const weeklyTarget = React.useMemo(() => ({
        calories: dailyMacros.calories * 7,
        protein: dailyMacros.protein * 7,
        carbs: dailyMacros.carbs * 7,
        fat: dailyMacros.fat * 7,
    }), [dailyMacros]);

    const consumed = React.useMemo(() => Object.values(initialLog).flat().reduce((acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fat: acc.fat + entry.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [initialLog]);
    
    const todayConsumed = React.useMemo(() => {
        const d = new Date().getDay();
        const dayIndex = d === 0 ? 6 : d - 1;
        const todayKey = daysOfWeekOrder[dayIndex];
        return (initialLog[todayKey] || []).reduce((acc, entry) => ({
            calories: acc.calories + entry.calories,
            protein: acc.protein + entry.protein,
            carbs: acc.carbs + entry.carbs,
            fat: acc.fat + entry.fat,
        }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    }, [initialLog]);
    
    const remaining = {
        calories: weeklyTarget.calories - consumed.calories, protein: weeklyTarget.protein - consumed.protein,
        carbs: weeklyTarget.carbs - consumed.carbs, fat: weeklyTarget.fat - consumed.fat,
    };

    // --- JSX ---
    return (
        <div className="weekly-tracker">
            <div className="input-group">
                <label htmlFor="goal-select">Selecione sua Meta</label>
                <select id="goal-select" value={selectedGoal} onChange={e => setSelectedGoal(e.target.value as Goal)}>
                    <option value="lose">Perder Peso</option>
                    <option value="maintain">Manter Peso</option>
                    <option value="gain">Ganhar Peso</option>
                </select>
            </div>
            <div className="detailed-breakdown"><h4>Registro Diário</h4><table className="breakdown-table weekly-log-table"><thead><tr><th>Dia</th><th>Calorias</th><th>P (g)</th><th>C (g)</th><th>G (g)</th></tr></thead><tbody>{daysOfWeek.map((day, dayIndex) => {const dayLog = initialLog[day.key] || [];const dayTotals = dayLog.reduce((acc, entry) => ({ calories: acc.calories + entry.calories, protein: acc.protein + entry.protein, carbs: acc.carbs + entry.carbs, fat: acc.fat + entry.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });const isExpanded = !!expandedDays[day.key];return (<React.Fragment key={day.key}><tr className="day-summary-row" onClick={() => toggleDayExpansion(day.key)}><td><span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>&#9656;</span>{day.name}</td><td className="daily-calorie-cell">{Math.round(dayTotals.calories)}<span className="daily-goal-text"> de {dailyMacros.calories}</span></td><td>{dayTotals.protein.toFixed(1)}</td><td>{dayTotals.carbs.toFixed(1)}</td><td>{dayTotals.fat.toFixed(1)}</td></tr>{isExpanded && (dayLog.length > 0 ? (dayLog.map((entry, index) => (<tr key={`${day.key}-${index}`} className="meal-entry-row"><td><div className="meal-info"><span className="meal-time">{entry.time}</span><span className="meal-name">{entry.name}</span></div></td><td>{Math.round(entry.calories)}</td><td>{entry.protein.toFixed(1)}</td><td>{entry.carbs.toFixed(1)}</td><td><div className="fat-and-actions"><span>{entry.fat.toFixed(1)}</span><div className="meal-actions"><button onClick={() => handleMoveMealEntry(day.key, index, 'up')} disabled={dayIndex === 0 && index === 0} className="move-btn" title="Mover para cima">&#9650;</button><button onClick={() => handleMoveMealEntry(day.key, index, 'down')} disabled={dayIndex === daysOfWeek.length - 1 && index === dayLog.length - 1} className="move-btn" title="Mover para baixo">&#9660;</button><button onClick={() => handleRemoveMealEntry(day.key, index)} className="remove-btn" title="Remover refeição">&times;</button></div></div></td></tr>))) : (<tr className="no-meals-row"><td colSpan={5}><p className="no-meals-text">Nenhuma refeição registrada.</p></td></tr>))}</React.Fragment>)})}</tbody></table></div>
            <div className="weekly-summary-container">
                <div className="weekly-summary"><div className="summary-card consumed"><h4>Total Consumido</h4><p><strong>{Math.round(consumed.calories).toLocaleString('pt-BR')}</strong> kcal</p><span>{consumed.protein.toFixed(1)}g P / {consumed.carbs.toFixed(1)}g C / {consumed.fat.toFixed(1)}g G</span></div><div className="summary-card remaining"><h4>Restante</h4><p><strong>{Math.round(remaining.calories).toLocaleString('pt-BR')}</strong> kcal</p><span>{remaining.protein.toFixed(1)}g P / {remaining.carbs.toFixed(1)}g C / {remaining.fat.toFixed(1)}g G</span></div></div>
                <div className="daily-goal-display"><h4>Resumo do Dia Atual</h4><div className="macros"><div className="macro-card"><h3>Calorias</h3><span className="value">{Math.round(todayConsumed.calories).toLocaleString('pt-BR')} / {dailyMacros.calories.toLocaleString('pt-BR')}</span></div><div className="macro-card"><h3>Proteína</h3><span className="value">{todayConsumed.protein.toFixed(0)}g / {dailyMacros.protein}g</span></div><div className="macro-card"><h3>Carbs</h3><span className="value">{todayConsumed.carbs.toFixed(0)}g / {dailyMacros.carbs}g</span></div><div className="macro-card"><h3>Gordura</h3><span className="value">{todayConsumed.fat.toFixed(0)}g / {dailyMacros.fat}g</span></div></div></div>
            </div>
        </div>
    )
};

const root = createRoot(document.getElementById('root')!);
root.render(<NutriSnapApp />);
