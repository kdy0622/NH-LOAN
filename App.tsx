import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { TodoItem, PropertyDetail, LoanState, ScheduleItem, NewsItem, AdminFile } from './types';
import { NH_COLORS, QUOTES, REGIONS, VILLAGES, EXTERNAL_LINKS, MAJOR_CATEGORIES, MINOR_CATEGORIES, DOC_OPTIONS } from './constants';
import { consultLoan, fetchLatestNews } from './services/geminiService';

const App: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [newsLoading, setNewsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  const [adminFiles, setAdminFiles] = useState<AdminFile[]>([]);
  const [extraContext, setExtraContext] = useState("");

  const safeParse = (key: string, fallback: any) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      return fallback;
    }
  };

  const [todos, setTodos] = useState<TodoItem[]>(() => safeParse('nh_todos_v5_0', []));
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => safeParse('nh_schedules_v5_0', []));
  const [accumulatedNews, setAccumulatedNews] = useState<NewsItem[]>(() => safeParse('nh_news_v5_0', []));
  const [todoInput, setTodoInput] = useState("");

  const [loanState, setLoanState] = useState<LoanState>({
    city: "서울특별시",
    district: "강남구",
    neighborhood: "역삼동",
    village: "",
    properties: [{ id: '1', lotNumber: '', usage: '대지', majorCategory: '주택', minorCategory: '아파트', appraisalValue: 0, itemLtv: 70, seniorDeduction: 0 }],
    rentals: [],
    interestRate: 4.5,
    annualIncome: 0
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (accumulatedNews.length === 0) handleFetchNews();
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('nh_todos_v5_0', JSON.stringify(todos));
    localStorage.setItem('nh_schedules_v5_0', JSON.stringify(schedules));
    localStorage.setItem('nh_news_v5_0', JSON.stringify(accumulatedNews));
  }, [todos, schedules, accumulatedNews]);

  const handleFetchNews = async () => {
    setNewsLoading(true);
    try {
      const newsContent = await fetchLatestNews();
      const newsItems = newsContent.split('\n').filter(line => line.trim().length > 5).map((line, i) => ({
        id: `news-${Date.now()}-${i}`,
        content: line.replace(/[#*]/g, '').trim(),
        timestamp: new Date().toLocaleDateString()
      }));
      setAccumulatedNews(newsItems);
    } catch (e) { console.error(e); } finally { setNewsLoading(false); }
  };

  const handleAiConsult = async () => {
    if (!chatInput.trim()) return;
    setLoading(true);
    try {
      const res = await consultLoan(chatInput, extraContext);
      setAiResponse(res);
      setChatInput("");
    } catch (e) { setAiResponse("AI 연결 오류가 발생했습니다."); } finally { setLoading(false); }
  };

  const processedProperties = useMemo(() => {
    return loanState.properties.map(p => {
      const calculatedAmt = Math.floor(p.appraisalValue * (p.itemLtv / 100));
      return { ...p, calculatedAmt, finalAmt: Math.max(0, calculatedAmt - p.seniorDeduction) };
    });
  }, [loanState.properties]);

  const totalLimit = processedProperties.reduce((sum, p) => sum + p.finalAmt, 0);
  const formatNum = (val: number) => val.toLocaleString();

  const handleToggleAdmin = () => {
    if (!isAdmin) {
      const password = prompt("비밀번호 (0000):");
      if (password === "0000") setIsAdmin(true);
    } else setIsAdmin(false);
  };

  const bannerTimeStr = `${currentTime.getFullYear()}년 ${currentTime.getMonth() + 1}월 ${currentTime.getDate()}일 ${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
  const mapSearchUrl = `https://map.kakao.com/?q=${loanState.city} ${loanState.district} ${loanState.neighborhood} ${loanState.village}`;

  return (
    <Layout isAdmin={isAdmin} onToggleAdmin={handleToggleAdmin}>
      {/* 초밀착 배너 - 높이 대폭 축소 */}
      <div className="mb-3 bg-gradient-to-r from-[#009a44] to-[#004a99] px-4 py-2 rounded-xl text-white shadow-md flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-black tracking-tighter">{bannerTimeStr}</h2>
          <div className="h-4 w-px bg-white/20 hidden md:block"></div>
          <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest hidden sm:block">NH PRO DASHBOARD</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-[9px] font-black opacity-60 uppercase text-right leading-none">Total<br/>Limit</p>
          <p className="text-xl font-black">{formatNum(totalLimit)} <span className="text-[10px] opacity-60 font-medium">천원</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* 심사 섹션 (Left) */}
        <div className="xl:col-span-8 space-y-3">
          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-50 text-green-700 rounded-md flex items-center justify-center text-sm font-bold">🌍</span>
                소재지 심사
              </h3>
              <button onClick={() => {
                const newId = Date.now().toString();
                setLoanState(prev => ({...prev, properties: [...prev.properties, { id: newId, lotNumber: '', usage: '', majorCategory: '주택', minorCategory: '아파트', appraisalValue: 0, itemLtv: 70, seniorDeduction: 0 }]}));
                setSelectedPropertyId(newId);
              }} className="bg-green-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black shadow-sm hover:bg-green-700 transition-colors">+ 추가</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <select className="p-2 bg-white border border-gray-200 rounded-md text-[11px] font-bold" value={loanState.city} onChange={e => setLoanState({...loanState, city: e.target.value, district: Object.keys(REGIONS[e.target.value])[0]})}>
                {Object.keys(REGIONS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="p-2 bg-white border border-gray-200 rounded-md text-[11px] font-bold" value={loanState.district} onChange={e => setLoanState({...loanState, district: e.target.value, neighborhood: REGIONS[loanState.city][e.target.value][0]})}>
                {Object.keys(REGIONS[loanState.city] || {}).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="p-2 bg-white border border-gray-200 rounded-md text-[11px] font-bold" value={loanState.neighborhood} onChange={e => setLoanState({...loanState, neighborhood: e.target.value})}>
                {(REGIONS[loanState.city] && REGIONS[loanState.city][loanState.district])?.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="p-2 bg-white border border-gray-200 rounded-md text-[11px] font-bold" value={loanState.village} onChange={e => setLoanState({...loanState, village: e.target.value})} disabled={!VILLAGES[loanState.neighborhood]}>
                <option value="">- 리(Ri) 선택 -</option>
                {VILLAGES[loanState.neighborhood]?.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-100">
              <table className="w-full text-[11px]">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-tighter border-b border-gray-100">
                  <tr>
                    <th className="p-2 text-left">지번/호수</th>
                    <th className="p-2 text-left">종류</th>
                    <th className="p-2 text-right">감정가</th>
                    <th className="p-2 text-center">LTV</th>
                    <th className="p-2 text-right text-green-700">심사한도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedProperties.map(p => (
                    <tr key={p.id} onClick={() => setSelectedPropertyId(p.id)} className="cursor-pointer hover:bg-green-50 transition-all group">
                      <td className="p-2 font-bold text-gray-700">{p.lotNumber || '(미입력)'}</td>
                      <td className="p-2 text-[10px] text-gray-400 font-bold">{p.minorCategory}</td>
                      <td className="p-2 text-right font-bold">{formatNum(p.appraisalValue)}</td>
                      <td className="p-2 text-center font-bold text-blue-600">{p.itemLtv}%</td>
                      <td className="p-2 text-right font-black text-green-700 group-hover:underline">{formatNum(p.finalAmt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
            <h3 className="text-sm font-black text-gray-800 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center text-sm">🗺️</span>
              물건 소재지 현황
            </h3>
            <div className="w-full h-[240px] rounded-lg overflow-hidden border border-gray-100">
              <iframe 
                src={mapSearchUrl}
                className="w-full h-full border-none grayscale-[0.2] hover:grayscale-0 transition-all"
                title="kakao-map-integration"
              ></iframe>
            </div>
          </section>

          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 no-print">
            <h3 className="text-sm font-black text-green-800 flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-green-600 text-white rounded-md flex items-center justify-center text-[10px] font-black">AI</span>
              여신 심사 분석
            </h3>
            <div className={`bg-gray-50 rounded-lg p-4 border border-gray-100 mb-3 text-xs leading-relaxed text-gray-700 ${aiResponse ? 'min-h-[60px]' : 'min-h-[60px] flex items-center justify-center text-gray-300'}`}>
              {aiResponse || "분석 요청을 입력하세요."}
            </div>
            <div className="relative">
              <input type="text" className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs font-bold shadow-inner focus:border-green-600 outline-none pr-12" placeholder="한도 분석 또는 규정 질문..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiConsult()} />
              <button onClick={handleAiConsult} disabled={loading} className="absolute right-1.5 top-1.5 w-9 h-9 bg-green-600 text-white rounded-md flex items-center justify-center shadow-md hover:bg-green-700 transition-all">{loading ? '..' : '→'}</button>
            </div>
          </section>
        </div>

        {/* 위젯 섹션 (Right) */}
        <div className="xl:col-span-4 space-y-3 no-print">
          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">🗓️ 여신 스케줄</h3>
            <div className="space-y-1.5 mb-3">
              <div className="flex gap-1">
                <input type="date" className="flex-1 p-1.5 bg-gray-50 border border-gray-100 rounded text-[10px] font-bold" id="cal-date-compact" />
                <button onClick={() => {
                  const d = (document.getElementById('cal-date-compact') as HTMLInputElement).value;
                  const t = prompt("일정명:");
                  if(d && t) setSchedules([{id:Date.now().toString(), date:d, title:t}, ...schedules]);
                }} className="bg-green-600 text-white px-2 rounded text-[10px] font-black">등록</button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center gap-2 p-1.5 bg-gray-50/50 rounded border border-gray-50">
                    <span className="text-[9px] font-black text-green-600 whitespace-nowrap">{s.date.slice(-5)}</span>
                    <span className="text-[10px] font-bold text-gray-700 truncate">{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3 flex justify-between">
              <span>✅ 체크리스트</span>
              <span>{todos.filter(t=>t.completed).length}/{todos.length}</span>
            </h3>
            <div className="space-y-1 mb-2 max-h-32 overflow-y-auto custom-scrollbar">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded transition-all group cursor-pointer" onClick={() => setTodos(todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t))}>
                  <input type="checkbox" checked={todo.completed} className="w-3 h-3 accent-green-600" readOnly />
                  <span className={`text-[10px] font-bold flex-1 truncate ${todo.completed ? 'line-through text-gray-300' : 'text-gray-600'}`}>{todo.text}</span>
                </div>
              ))}
            </div>
            <input type="text" className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-[10px] font-bold outline-none" placeholder="+ 추가 후 Enter" value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => {
              if(e.key === 'Enter' && todoInput.trim()) {
                setTodos([{ id: Date.now().toString(), text: todoInput, completed: false }, ...todos]);
                setTodoInput("");
              }
            }} />
          </section>

          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">🔗 심사 도구</h3>
            <div className="grid grid-cols-2 gap-1.5">
              {EXTERNAL_LINKS.map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="p-2 bg-gray-50/80 border border-gray-100 rounded text-[9px] font-black text-gray-500 text-center hover:bg-green-600 hover:text-white transition-all">
                  {link.name}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 담보 설정 모달 */}
      {selectedPropertyId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border-t-8 border-green-600 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-800">담보 정보 입력</h3>
              <button onClick={() => setSelectedPropertyId(null)} className="text-gray-400 hover:text-red-500 text-xl font-bold">×</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase">지번/호수</label>
                  <input type="text" className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-xs font-bold" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.lotNumber} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,lotNumber:e.target.value}:p)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase">용도</label>
                  <input type="text" className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-xs font-bold" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.usage} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,usage:e.target.value}:p)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase">대분류</label>
                  <select className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-xs font-bold" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.majorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,majorCategory:e.target.value,minorCategory:MINOR_CATEGORIES[e.target.value][0]}:p)})}>
                    {MAJOR_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase">소분류</label>
                  <select className="w-full p-2 bg-gray-50 border border-gray-100 rounded text-xs font-bold" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.minorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,minorCategory:e.target.value}:p)})}>
                    {MINOR_CATEGORIES[loanState.properties.find(p=>p.id===selectedPropertyId)?.majorCategory || '주택']?.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="bg-green-50 p-3 rounded-xl space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-green-700">감정평가액 (천원)</label>
                  <input type="number" className="w-full p-3 bg-white border border-green-100 rounded-lg text-lg font-black text-green-900" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.appraisalValue || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,appraisalValue:Number(e.target.value)}:p)})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-green-700">LTV (%)</label>
                    <input type="number" className="w-full p-2 bg-white border border-green-100 rounded text-sm font-black" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.itemLtv} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,itemLtv:Number(e.target.value)}:p)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-red-700">방공제 (천원)</label>
                    <input type="number" className="w-full p-2 bg-white border border-red-100 rounded text-sm font-black text-red-700" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.seniorDeduction || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,seniorDeduction:Number(e.target.value)}:p)})} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-5 bg-gray-50 flex gap-2">
              <button onClick={() => {
                if(confirm("삭제하시겠습니까?")) {
                  setLoanState({...loanState, properties: loanState.properties.filter(p=>p.id!==selectedPropertyId)});
                  setSelectedPropertyId(null);
                }
              }} className="flex-1 py-2.5 bg-white border border-red-100 text-red-500 rounded-lg font-black text-[10px]">삭제</button>
              <button onClick={() => setSelectedPropertyId(null)} className="flex-[2] py-2.5 bg-green-600 text-white rounded-lg font-black text-[10px] shadow-md hover:bg-green-700 transition-colors">저장 완료</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;