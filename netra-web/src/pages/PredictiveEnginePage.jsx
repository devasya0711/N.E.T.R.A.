import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useStats } from "../hooks/usePotholes";

// Icons
const CloudRainIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 14.899A7 7 0 1115.71 8h1.79a4.5 4.5 0 012.5 8.242M12 14v7m-4-4v7m8-4v7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AlertTriangleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function PredictiveEnginePage() {
  const { stats } = useStats();
  const [weatherData, setWeatherData] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  
  // OpenWeatherMap API details
  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY;
  const targetCities = [
    { name: "Raipur", lat: 21.2514, lon: 81.6296 },
    { name: "Bilaspur", lat: 22.0797, lon: 82.1391 },
    { name: "Durg", lat: 21.1911, lon: 81.2849 }
  ];

  useEffect(() => {
    async function fetchWeather() {
      if (!API_KEY) {
        // Fallback mock payload if no key provided
        setTimeout(() => {
          setWeatherData(targetCities.map(city => ({
            ...city,
            temp: Math.floor(Math.random() * 10) + 25, // 25-35C
            rainLikelihood: Math.floor(Math.random() * 80) + 10,
            desc: "Scattered Showers (Mocked)",
            icon: "10d"
          })));
          setLoadingWeather(false);
        }, 800);
        return;
      }
      
      try {
        const results = await Promise.all(targetCities.map(async city => {
          const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${city.lat}&lon=${city.lon}&units=metric&appid=${API_KEY}`);
          if (!res.ok) throw new Error("API Limit or Error");
          const data = await res.json();
          // Heuristic: compute fake rain likelihood from humidity + clouds
          const rainScore = Math.min(100, Math.round((data.main.humidity * 0.6) + (data.clouds.all * 0.4)));
          return {
            ...city,
            temp: Math.round(data.main.temp),
            rainLikelihood: rainScore,
            desc: data.weather[0].description,
            icon: data.weather[0].icon
          };
        }));
        setWeatherData(results);
      } catch (err) {
        console.error("Weather fetch failed:", err);
        // Fallback to mock on error
        setWeatherData(targetCities.map(city => ({
          ...city, temp: 30, rainLikelihood: 45, desc: "API Limit Exceeded", icon: "03d"
        })));
      } finally {
        setLoadingWeather(false);
      }
    }
    fetchWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute Predictive Alerts based on dummy algorithms
  // We'll combine our "Existing Severity" + "Rain Likelihood" to forecast degenerating segments
  const mockAlerts = [
    { id: "PA-101", region: "NH-130 Raipur Bypass", score: 92, timeframe: "7 Days", reason: "Existing cracks + 80% heavy rain forecast will accelerate washout.", cost: "₹45,000" },
    { id: "PA-102", region: "SH-3 Bilaspur Approach", score: 85, timeframe: "14 Days", reason: "High heavy-truck traffic load + moderate rainfall predicted.", cost: "₹28,000" },
    { id: "PA-103", region: "Durg Connector Road", score: 78, timeframe: "21 Days", reason: "Multiple minor surface anomalies merging under monsoon pressure.", cost: "₹15,000" },
    { id: "PA-104", region: "NH-43 Jagdalpur Node", score: 65, timeframe: "30 Days", reason: "Age of asphalt layer nearing critical threshold with early signs of distress.", cost: "₹18,500" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-widest mb-3">
            <TrendingUpIcon /> Pre-Release Beta
          </div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Predictive Early-Warning Engine</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Forecast pothole formation and highway degradation in the next 7-30 days by correlating detecting severity trends with live meteorological and traffic data.
          </p>
        </div>
        {!API_KEY && (
           <div className="text-right flex items-center gap-2 justify-end px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
             <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
             <p className="text-[10px] text-slate-500 font-semibold">Using Simulated Weather Data.<br/>Add VITE_OPENWEATHER_API_KEY in .env</p>
           </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_350px] gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          
          {/* Weather Impact Widget */}
          <div className="netra-panel overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <CloudRainIcon />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Meteorological Vulnerability Index</h3>
                <p className="text-[11px] text-slate-500">Live weather correlation modeling for Chhattisgarh NH/SH corridors</p>
              </div>
            </div>
            
            <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {loadingWeather ? (
                Array(3).fill(0).map((_,i) => <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-xl" />)
              ) : (
                weatherData?.map((city, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white relative overflow-hidden group">
                    {/* Background tint based on rain likelihood */}
                    <div className="absolute inset-0 opacity-[0.03] transition-opacity group-hover:opacity-[0.08]" 
                         style={{ backgroundColor: city.rainLikelihood > 60 ? '#ef4444' : city.rainLikelihood > 30 ? '#eab308' : '#3b82f6' }} />
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div>
                        <h4 className="font-bold text-slate-700 text-sm">{city.name} Corridor</h4>
                        <p className="text-xs text-slate-500 capitalize mt-0.5">{city.desc}</p>
                      </div>
                      {city.icon && (
                         <img src={`https://openweathermap.org/img/wn/${city.icon}.png`} alt="weather" className="w-10 h-10 -m-2 opacity-80" />
                      )}
                    </div>
                    
                    <div className="mt-4 flex items-end justify-between relative z-10">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Surface Temp</p>
                        <p className="text-xl font-bold text-slate-800">{city.temp}°C</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider">Degradation Risk</p>
                        <p className={`text-lg font-black ${city.rainLikelihood > 60 ? 'text-red-500' : city.rainLikelihood > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                          {city.rainLikelihood}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Preventive Maintenance Alerts */}
          <div className="netra-panel">
            <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <AlertTriangleIcon />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Preventive Maintenance Auto-Alerts</h3>
                  <p className="text-[11px] text-slate-500">AI-generated work orders anticipating structural failures before they occur</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded text-xs font-bold hover:bg-indigo-100 transition-colors">
                Export Forecasting Report
              </button>
            </div>
            
            <div className="divide-y divide-slate-100">
              {mockAlerts.map(alert => (
                <div key={alert.id} className="p-5 hover:bg-slate-50 transition-colors grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center">
                  {/* Gauge */}
                  <div className="flex flex-col items-center justify-center w-16 h-16 rounded-full border-4 border-slate-100 relative shadow-sm">
                    <svg className="absolute inset-0 w-full h-full -rotate-90">
                      <circle cx="50%" cy="50%" r="42%" className="fill-none stroke-slate-100" strokeWidth="3" />
                      <circle cx="50%" cy="50%" r="42%" className={`fill-none ${alert.score > 80 ? 'stroke-red-500' : 'stroke-orange-400'}`} strokeWidth="3" strokeDasharray="100" strokeDashoffset={100 - alert.score} strokeLinecap="round" />
                    </svg>
                    <span className="text-sm font-black text-slate-700">{alert.score}%</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Risk</span>
                  </div>
                  
                  {/* Details */}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-indigo-500 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{alert.id}</span>
                      <h4 className="text-xs font-bold text-slate-800">{alert.region}</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed max-w-lg mb-2">
                      <span className="font-semibold text-slate-700">AI Forecasting:</span> {alert.reason}
                    </p>
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                       <span className="text-red-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"/> Failure expected in {alert.timeframe}</span>
                       <span className="text-emerald-600">Proactive repair saves estimated {alert.cost}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="rounded-2xl border border-indigo-800 shadow-sm bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-6 xl:p-8 relative overflow-hidden">
            {/* Background design */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
            
            <h3 className="text-sm font-bold text-indigo-100 mb-6 relative z-10 flex items-center justify-between">
              Predictive ROI Summary
              <ShieldCheckIcon className="w-5 h-5 text-emerald-400" />
            </h3>
            
            <div className="space-y-5 relative z-10">
              <div>
                <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-black mb-1">Forecasted Savings (YTD)</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black text-white">₹4.2M</p>
                  <p className="text-xs text-emerald-400 font-bold">+18% vs reactive</p>
                </div>
              </div>
              
              <div className="h-px w-full bg-white/10" />
              
              <div>
                <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-black mb-1">Accidents Prevented</p>
                <p className="text-xl font-bold text-white">Est. 12-15</p>
              </div>
              
              <div className="h-px w-full bg-white/10" />

              <div>
                <p className="text-[10px] text-indigo-200 uppercase tracking-widest font-black mb-1">Predictive Accuracy</p>
                <div className="w-full bg-white/10 rounded-full h-1.5 mt-2 mb-1">
                  <div className="bg-emerald-400 h-1.5 rounded-full" style={{ width: '87%' }}></div>
                </div>
                <p className="text-[10px] text-indigo-100 font-mono">Model Confidence: 87.4%</p>
              </div>
            </div>
          </div>

          {/* Mini-map placeholder */}
          <div className="netra-panel p-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">Threat Vectors Map</h3>
            <div className="w-full h-48 bg-slate-100 rounded-lg flex flex-col items-center justify-center text-center border overflow-hidden relative border-slate-200 group">
              {/* Dummy map illustration */}
              <div className="absolute inset-0 opacity-[0.15] mix-blend-multiply flex items-center justify-center">
                 <svg className="w-[150%] h-[150%] text-slate-400" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5">
                   <path d="M10 50 Q 30 20 60 40 T 90 30" />
                   <path d="M20 80 Q 50 60 70 80 T 100 50" />
                   <circle cx="60" cy="40" r="3" fill="#ef4444" className="animate-ping" />
                   <circle cx="70" cy="80" r="2" fill="#eab308" className="animate-ping" style={{ animationDelay: '1s' }} />
                 </svg>
              </div>
              <MapPinIcon className="w-8 h-8 text-slate-400 mb-2 relative z-10 group-hover:text-blue-500 transition-colors" />
              <p className="text-[11px] font-semibold text-slate-500 max-w-[180px] relative z-10 group-hover:text-slate-700 transition-colors">
                Interactive forecasting map visualization requires WebGL extension.
              </p>
              <Link to="/dashboard/livemap" className="mt-3 text-[10px] font-bold text-blue-600 hover:underline relative z-10">
                View Risk Heatmap instead →
              </Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ShieldCheckIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}
function MapPinIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
