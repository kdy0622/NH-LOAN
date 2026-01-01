
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

  const [todos, setTodos] = useState<TodoItem[]>(() => safeParse('nh_todos_v6_0', []));
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => safeParse('nh_schedules_v6_0', []));
  const [accumulatedNews, setAccumulatedNews] = useState<NewsItem[]>(() => safeParse('nh_news_v6_0', []));
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
    localStorage.setItem('nh_todos_v6_0', JSON.stringify(todos));
    localStorage.setItem('nh_schedules_v6_0', JSON.stringify(schedules));
    localStorage.setItem('nh_news_v6_0', JSON.stringify(accumulatedNews));
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
      {/* 컴팩트 상단 정보 */}
      <div className="mb-3 bg-gradient-to-r from-[#009a44] to-[#004a99] px-3 py-1.5 rounded-lg text-white shadow-sm flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-black tracking-tighter">{bannerTimeStr}</h2>
          <div className="h-3 w-px bg-white/20 hidden md:block"></div>
          <p className="text-[8px] font-black opacity-50 uppercase tracking-widest hidden sm:block">NH Internal Management</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[8px] font-bold opacity-60">총 심사 한도:</span>
          <p className="text-sm font-black">{formatNum(totalLimit)} <span className="text-[9px] opacity-60">천원</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
        {/* 심사부 (Left) */}
        <div className="xl:col-span-8 space-y-3">
          <section className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 no-print">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                <span className="w-5 h-5 bg-green-50 text-green-700 rounded-md flex items-center justify-center text-[10px] font-bold">🌍</span>
                전국 행정구역 기반 소재지
              </h3>
              <button onClick={() => {
                const newId = Date.now().toString();
                setLoanState(prev => ({...prev, properties: [...prev.properties, { id: newId, lotNumber: '', usage: '', majorCategory: '주택', minorCategory: '아파트', appraisalValue: 0, itemLtv: 70, seniorDeduction: 0 }]}));
                setSelectedPropertyId(newId);
              }} className="bg-green-600 text-white px-2 py-1 rounded-md text-[9px] font-black hover:bg-green-700 transition-colors">+ 담보추가</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 mb-2 bg-gray-50 p-2 rounded-md border border-gray-100">
              <select className="p-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold" value={loanState.city} onChange={e => setLoanState({...loanState, city: e.target.value, district: Object.keys(REGIONS[e.target.value])[0]})}>
                {Object.keys(REGIONS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="p-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold" value={loanState.district} onChange={e => {
                const district = e.target.value;
                const neighborhoods = REGIONS[loanState.city][district] || [];
                setLoanState({...loanState, district, neighborhood: neighborhoods[0] || "", village: ""});
              }}>
                {Object.keys(REGIONS[loanState.city] || {}).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="p-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold" value={loanState.neighborhood} onChange={e => setLoanState({...loanState, neighborhood: e.target.value, village: ""})}>
                {(REGIONS[loanState.city] && REGIONS[loanState.city][loanState.district])?.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="p-1.5 bg-white border border-gray-200 rounded text-[10px] font-bold" value={loanState.village} onChange={e => setLoanState({...loanState, village: e.target.value})} disabled={!VILLAGES[loanState.neighborhood]}>
                <option value="">- 리(Ri) 단위 -</option>
                {VILLAGES[loanState.neighborhood]?.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto rounded border border-gray-100">
              <table className="w-full text-[10px]">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase border-b border-gray-100">
                  <tr>
                    <th className="p-1.5 text-left">지번/호수</th>
                    <th className="p-1.5 text-left">종류</th>
                    <th className="p-1.5 text-right">감정가</th>
                    <th className="p-1.5 text-center">LTV</th>
                    <th className="p-1.5 text-right text-green-700">심사한도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedProperties.map(p => (
                    <tr key={p.id} onClick={() => setSelectedPropertyId(p.id)} className="cursor-pointer hover:bg-green-50 transition-all group">
                      <td className="p-1.5 font-bold text-gray-700">{p.lotNumber || '(미입력)'}</td>
                      <td className="p-1.5 text-[9px] text-gray-400 font-bold">{p.minorCategory}</td>
                      <td className="p-1.5 text-right font-bold">{formatNum(p.appraisalValue)}</td>
                      <td className="p-1.5 text-center font-bold text-blue-600">{p.itemLtv}%</td>
                      <td className="p-1.5 text-right font-black text-green-700 group-hover:underline">{formatNum(p.finalAmt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 no-print">
            <h3 className="text-[11px] font-black text-gray-800 flex items-center gap-1.5 mb-2">
              <span className="w-5 h-5 bg-blue-50 text-blue-700 rounded-md flex items-center justify-center text-xs">🗺️</span>
              실시간 지도 조회 (카카오맵)
            </h3>
            <div className="w-full h-[200px] rounded border border-gray-100 overflow-hidden shadow-inner">
              <iframe 
                src={mapSearchUrl}
                className="w-full h-full border-none"
                title="loan-map"
              ></iframe>
            </div>
          </section>

          <section className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 no-print">
            <h3 className="text-[11px] font-black text-green-800 flex items-center gap-1.5 mb-2">
              <span className="w-5 h-5 bg-green-600 text-white rounded-md flex items-center justify-center text-[9px] font-black">AI</span>
              여신 컨설팅 분석 리포트
            </h3>
            <div className={`bg-gray-50 rounded p-3 border border-gray-100 mb-2 text-[11px] leading-relaxed text-gray-700 ${aiResponse ? 'h-auto' : 'h-12 flex items-center justify-center text-gray-300 italic'}`}>
              {aiResponse || "심사 분석 대기 중..."}
            </div>
            <div className="relative">
              <input type="text" className="w-full p-2 bg-white border border-gray-200 rounded text-[10px] font-bold shadow-sm focus:border-green-600 outline-none pr-10" placeholder="규정 분석 또는 한도 계산 요청..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiConsult()} />
              <button onClick={handleAiConsult} disabled={loading} className="absolute right-1 top-1 w-7 h-7 bg-green-600 text-white rounded flex items-center justify-center shadow hover:bg-green-700 transition-all">{loading ? '..' : '→'}</button>
            </div>
          </section>
        </div>

        {/* 위젯부 (Right) */}
        <div className="xl:col-span-4 space-y-3 no-print">
          <section className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">🗓️ 일정 관리</h3>
            <div className="space-y-1 mb-2 max-h-20 overflow-y-auto custom-scrollbar">
              {schedules.map(s => (
                <div key={s.id} className="flex items-center gap-2 p-1 bg-gray-50/50 rounded border border-gray-50">
                  <span className="text-[8px] font-black text-green-600">{s.date.slice(5)}</span>
                  <span className="text-[9px] font-bold text-gray-700 truncate">{s.title}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-1">
              <input type="date" className="flex-1 p-1 bg-gray-50 border border-gray-100 rounded text-[9px] font-bold" id="cal-date-mini" />
              <button onClick={() => {
                const d = (document.getElementById('cal-date-mini') as HTMLInputElement).value;
                const t = prompt("일정:");
                if(d && t) setSchedules([{id:Date.now().toString(), date:d, title:t}, ...schedules]);
              }} className="bg-green-600 text-white px-2 rounded text-[9px] font-black">등록</button>
            </div>
          </section>

          <section className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">✅ 할 일</h3>
            <div className="space-y-1 mb-2 max-h-24 overflow-y-auto custom-scrollbar">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-1.5 p-1 hover:bg-gray-50 rounded cursor-pointer" onClick={() => setTodos(todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t))}>
                  <input type="checkbox" checked={todo.completed} className="w-2.5 h-2.5 accent-green-600" readOnly />
                  <span className={`text-[9px] font-bold flex-1 truncate ${todo.completed ? 'line-through text-gray-300' : 'text-gray-600'}`}>{todo.text}</span>
                </div>
              ))}
            </div>
            <input type="text" className="w-full p-1.5 bg-gray-50 border border-gray-100 rounded text-[9px] font-bold outline-none" placeholder="+ 추가 (Enter)" value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => {
              if(e.key === 'Enter' && todoInput.trim()) {
                setTodos([{ id: Date.now().toString(), text: todoInput, completed: false }, ...todos]);
                setTodoInput("");
              }
            }} />
          </section>

          <section className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">🔗 업무 링크</h3>
            <div className="grid grid-cols-2 gap-1">
              {EXTERNAL_LINKS.map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="p-1.5 bg-gray-50/80 border border-gray-100 rounded text-[8px] font-black text-gray-500 text-center hover:bg-green-600 hover:text-white transition-all">
                  {link.name}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 담보 설정 모달 - 컴팩트형 */}
      {selectedPropertyId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white w-full max-w-[320px] rounded-xl shadow-2xl border-t-4 border-green-600 overflow-hidden">
            <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-black text-gray-800">담보 정보</h3>
              <button onClick={() => setSelectedPropertyId(null)} className="text-gray-400 hover:text-red-500 text-lg font-bold">×</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input type="text" className="p-1.5 bg-gray-50 rounded text-[10px] font-bold border" placeholder="지번/호수" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.lotNumber} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,lotNumber:e.target.value}:p)})} />
                <input type="text" className="p-1.5 bg-gray-50 rounded text-[10px] font-bold border" placeholder="용도" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.usage} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,usage:e.target.value}:p)})} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select className="p-1.5 bg-gray-50 rounded text-[10px] font-bold border" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.majorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,majorCategory:e.target.value,minorCategory:MINOR_CATEGORIES[e.target.value][0]}:p)})}>
                  {MAJOR_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
                <select className="p-1.5 bg-gray-50 rounded text-[10px] font-bold border" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.minorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,minorCategory:e.target.value}:p)})}>
                  {MINOR_CATEGORIES[loanState.properties.find(p=>p.id===selectedPropertyId)?.majorCategory || '주택']?.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="bg-green-50 p-2 rounded-lg space-y-2">
                <label className="text-[8px] font-black text-green-700">감정가 (천원)</label>
                <input type="number" className="w-full p-2 bg-white rounded border border-green-100 text-sm font-black text-green-900" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.appraisalValue || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,appraisalValue:Number(e.target.value)}:p)})} />
                <div className="grid grid-cols-2 gap-2">
                  <input type="number" className="p-1.5 bg-white rounded border border-green-100 text-[10px] font-black" placeholder="LTV%" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.itemLtv} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,itemLtv:Number(e.target.value)}:p)})} />
                  <input type="number" className="p-1.5 bg-white rounded border border-red-100 text-[10px] font-black text-red-700" placeholder="방공제" value={loanState.properties.find(p=>p.id===selectedPropertyId)?.seniorDeduction || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p=>p.id===selectedPropertyId?{...p,seniorDeduction:Number(e.target.value)}:p)})} />
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 flex gap-2">
              <button onClick={() => {
                if(confirm("삭제?")) {
                  setLoanState({...loanState, properties: loanState.properties.filter(p=>p.id!==selectedPropertyId)});
                  setSelectedPropertyId(null);
                }
              }} className="flex-1 py-1.5 bg-white border border-red-100 text-red-500 rounded font-black text-[9px]">삭제</button>
              <button onClick={() => setSelectedPropertyId(null)} className="flex-[2] py-1.5 bg-green-600 text-white rounded font-black text-[9px] shadow-sm hover:bg-green-700 transition-colors">저장</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
