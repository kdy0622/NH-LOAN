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

  const [todos, setTodos] = useState<TodoItem[]>(() => safeParse('nh_todos_v4_0', []));
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => safeParse('nh_schedules_v4_0', []));
  const [accumulatedNews, setAccumulatedNews] = useState<NewsItem[]>(() => safeParse('nh_news_v4_0', []));
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

  const [docConfig, setDocConfig] = useState({
    propertyType: "주택(아파트/연립)",
    borrowerType: "개인",
    job: "근로자",
    income: "근로소득",
    isTrade: "매매(구입)",
    purpose: "주택구입자금"
  });

  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const activeQuote = useMemo(() => QUOTES[Math.floor(Math.random() * QUOTES.length)], []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    if (accumulatedNews.length === 0) handleFetchNews();
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('nh_todos_v4_0', JSON.stringify(todos));
    localStorage.setItem('nh_schedules_v4_0', JSON.stringify(schedules));
    localStorage.setItem('nh_news_v4_0', JSON.stringify(accumulatedNews));
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
    const currentInput = chatInput;
    setChatInput("");
    setLoading(true);
    try {
      const res = await consultLoan(currentInput, extraContext);
      setAiResponse(res);
    } catch (e) { setAiResponse("AI 연결 오류입니다."); } finally { setLoading(false); }
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
      const password = prompt("관리자 비밀번호 (0000):");
      if (password === "0000") setIsAdmin(true);
    } else setIsAdmin(false);
  };

  const bannerTimeStr = `${currentTime.getFullYear()}년 ${currentTime.getMonth() + 1}월 ${currentTime.getDate()}일 ${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

  // 카카오맵 검색 주소 생성
  const mapSearchUrl = `https://map.kakao.com/?q=${loanState.city} ${loanState.district} ${loanState.neighborhood} ${loanState.village}`;

  return (
    <Layout isAdmin={isAdmin} onToggleAdmin={handleToggleAdmin}>
      {/* 좁은 배너 디자인 - 밀도 향상 */}
      <div className="mb-4 bg-gradient-to-r from-[#009a44] to-[#004a99] px-6 py-4 rounded-2xl text-white shadow-lg flex justify-between items-center no-print">
        <div className="flex gap-4 items-center">
          <div className="text-left">
            <h2 className="text-xl font-black tracking-tight">{bannerTimeStr}</h2>
            <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest">Administrative Center</p>
          </div>
          <div className="h-8 w-px bg-white/20 hidden md:block"></div>
          <p className="text-sm font-medium italic opacity-90 hidden lg:block">"{activeQuote.text}"</p>
        </div>
        <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10 text-right">
          <p className="text-[9px] font-black opacity-60 uppercase mb-0.5">Total Limit</p>
          <p className="text-xl font-black">{formatNum(totalLimit)} <span className="text-xs opacity-60 font-medium">천원</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* 메인 심사 구역 */}
        <div className="xl:col-span-8 space-y-4">
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 no-print">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-50 text-green-700 rounded-lg flex items-center justify-center text-xl">🌍</span>
                소재지 심사 및 물건 관리
              </h3>
              <button onClick={() => {
                const newId = Date.now().toString();
                setLoanState(prev => ({...prev, properties: [...prev.properties, { id: newId, lotNumber: '', usage: '', majorCategory: '주택', minorCategory: '아파트', appraisalValue: 0, itemLtv: 70, seniorDeduction: 0 }]}));
                setSelectedPropertyId(newId);
              }} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-black shadow-md hover:bg-green-700">+ 담보 추가</button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <select className="p-3 bg-white border border-gray-200 rounded-lg text-xs font-bold" value={loanState.city} onChange={e => setLoanState({...loanState, city: e.target.value, district: Object.keys(REGIONS[e.target.value])[0]})}>
                {Object.keys(REGIONS).map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="p-3 bg-white border border-gray-200 rounded-lg text-xs font-bold" value={loanState.district} onChange={e => setLoanState({...loanState, district: e.target.value})}>
                {Object.keys(REGIONS[loanState.city] || {}).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="p-3 bg-white border border-gray-200 rounded-lg text-xs font-bold" value={loanState.neighborhood} onChange={e => setLoanState({...loanState, neighborhood: e.target.value})}>
                {REGIONS[loanState.city][loanState.district]?.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="p-3 bg-white border border-gray-200 rounded-lg text-xs font-bold" value={loanState.village} onChange={e => setLoanState({...loanState, village: e.target.value})}>
                <option value="">- 리 선택 -</option>
                {VILLAGES[loanState.neighborhood]?.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-400 font-black uppercase tracking-tighter">
                  <tr>
                    <th className="p-3 text-left">지번/호수</th>
                    <th className="p-3 text-left">종류</th>
                    <th className="p-3 text-right">감정가</th>
                    <th className="p-3 text-center">LTV</th>
                    <th className="p-3 text-right text-green-700">심사한도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedProperties.map(p => (
                    <tr key={p.id} onClick={() => setSelectedPropertyId(p.id)} className="cursor-pointer hover:bg-green-50 transition-all">
                      <td className="p-3 font-bold text-gray-800">{p.lotNumber || '(미입력)'}</td>
                      <td className="p-3 text-[10px] text-gray-400 font-black">{p.minorCategory}</td>
                      <td className="p-3 text-right font-bold">{formatNum(p.appraisalValue)}</td>
                      <td className="p-3 text-center font-bold text-blue-600">{p.itemLtv}%</td>
                      <td className="p-3 text-right font-black text-green-700">{formatNum(p.finalAmt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 지도 뷰 (카카오맵 통합) */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 no-print overflow-hidden">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center text-xl">🗺️</span>
              물건 소재지 현황 (카카오맵)
            </h3>
            <div className="w-full h-[300px] bg-gray-100 rounded-xl relative">
              <iframe 
                src={mapSearchUrl}
                className="w-full h-full rounded-xl border-none"
                title="kakao-map"
              ></iframe>
              <a href={mapSearchUrl} target="_blank" rel="noreferrer" className="absolute top-2 right-2 bg-white/90 px-3 py-1 rounded-lg text-[10px] font-black text-blue-600 shadow-sm border border-blue-100">카카오맵 크게보기</a>
            </div>
          </section>

          {/* AI 컨설팅 솔루션 */}
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 no-print">
            <h3 className="text-lg font-black text-green-800 flex items-center gap-2 mb-4">
              <span className="w-8 h-8 bg-green-600 text-white rounded-lg flex items-center justify-center text-sm font-black">AI</span>
              NH 여신 전문 컨설팅
            </h3>
            <div className={`bg-gray-50 rounded-xl p-6 border border-gray-100 mb-4 ${aiResponse ? 'h-auto' : 'h-32 flex items-center justify-center'}`}>
              {aiResponse ? (
                <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResponse}</div>
              ) : (
                <p className="text-xs text-gray-400 font-bold">심사 요청을 입력해주세요.</p>
              )}
            </div>
            <div className="relative">
              <input type="text" className="w-full p-4 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold shadow-sm focus:border-green-600 outline-none pr-16" placeholder="전문가에게 심사 분석 요청..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAiConsult()} />
              <button onClick={handleAiConsult} disabled={loading} className="absolute right-2 top-2 w-12 h-12 bg-green-600 text-white rounded-lg flex items-center justify-center shadow-lg hover:bg-green-700 transition-all">{loading ? '..' : '→'}</button>
            </div>
          </section>
        </div>

        {/* 사이드바 - 밀도 높인 위젯들 */}
        <div className="xl:col-span-4 space-y-4 no-print">
          <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-800 mb-4">🗓️ 여신 스케줄러</h3>
            <div className="space-y-2 mb-4">
              <div className="flex gap-1">
                <input type="date" className="flex-1 p-2 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold" id="cal-date" />
                <button onClick={() => {
                  const d = (document.getElementById('cal-date') as HTMLInputElement).value;
                  const t = prompt("일정:");
                  if(d && t) setSchedules([{id:Date.now().toString(), date:d, title:t}, ...schedules]);
                }} className="bg-green-600 text-white px-3 rounded-lg text-[10px] font-black">등록</button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {schedules.map(s => (
                  <div key={s.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <span className="text-[9px] font-black text-green-600">{s.date}</span>
                    <span className="text-[10px] font-bold text-gray-700 truncate flex-1">{s.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-800 mb-4 flex justify-between">
              <span>✅ 업무 체크리스트</span>
              <span className="text-[10px] opacity-40">{todos.filter(t=>t.completed).length}/{todos.length}</span>
            </h3>
            <div className="space-y-1 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-lg transition-all group cursor-pointer" onClick={() => setTodos(todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t))}>
                  <input type="checkbox" checked={todo.completed} className="w-3.5 h-3.5 accent-green-600" readOnly />
                  <span className={`text-[11px] font-bold flex-1 ${todo.completed ? 'line-through text-gray-300' : 'text-gray-600'}`}>{todo.text}</span>
                </div>
              ))}
            </div>
            <input type="text" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-lg text-[10px] font-bold outline-none focus:border-green-500" placeholder="+ 추가 (Enter)" value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => {
              if(e.key === 'Enter' && todoInput.trim()) {
                setTodos([...todos, { id: Date.now().toString(), text: todoInput, completed: false }]);
                setTodoInput("");
              }
            }} />
          </section>

          <section className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-black text-gray-800 mb-4">🔗 여신 심사 도구함</h3>
            <div className="grid grid-cols-2 gap-2">
              {EXTERNAL_LINKS.map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="p-3 bg-gray-50/80 border border-gray-100 rounded-xl text-[10px] font-black text-gray-500 text-center hover:bg-green-600 hover:text-white transition-all shadow-sm">
                  {link.name}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 담보 상세 모달 */}
      {selectedPropertyId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-t-8 border-green-600">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-lg font-black text-gray-800">담보 상세 설정</h3>
              <button onClick={() => setSelectedPropertyId(null)} className="text-gray-400 hover:text-red-500 text-2xl font-bold">×</button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {processedProperties.find(p => p.id === selectedPropertyId) && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">지번/호수</label>
                      <input type="text" className="w-full p-3 bg-gray-50 rounded-lg text-xs font-bold" value={processedProperties.find(p => p.id === selectedPropertyId)?.lotNumber} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === selectedPropertyId ? {...p, lotNumber: e.target.value} : p)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">용도</label>
                      <input type="text" className="w-full p-3 bg-gray-50 rounded-lg text-xs font-bold" value={processedProperties.find(p => p.id === selectedPropertyId)?.usage} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === selectedPropertyId ? {...p, usage: e.target.value} : p)})} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">대분류</label>
                      <select className="w-full p-3 bg-gray-50 rounded-lg text-xs font-bold" value={processedProperties.find(p => p.id === selectedPropertyId)?.majorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === selectedPropertyId ? {...p, majorCategory: e.target.value, minorCategory: MINOR_CATEGORIES[e.target.value][0]} : p)})}>
                        {MAJOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase">소분류</label>
                      <select className="w-full p-3 bg-gray-50 rounded-lg text-xs font-bold" value={processedProperties.find(p => p.id === selectedPropertyId)?.minorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === selectedPropertyId ? {...p, minorCategory: e.target.value} : p)})}>
                        {MINOR_CATEGORIES[processedProperties.find(p => p.id === selectedPropertyId)?.majorCategory || '주택']?.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-2xl space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-green-700">감정평가액 (천원)</label>
                      <input type="number" className="w-full p-4 bg-white rounded-xl text-xl font-black text-green-800" value={processedProperties.find(p => p.id === selectedPropertyId)?.appraisalValue || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === selectedPropertyId ? {...p, appraisalValue: Number(e.target.value)} : p)})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-green-700">LTV (%)</label>
                        <input type="number" className="w-full p-3 bg-white rounded-lg text-lg font-black" value={processedProperties.find(p => p.id === selectedPropertyId)?.itemLtv} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === selectedPropertyId ? {...p, itemLtv: Number(e.target.value)} : p)})} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-red-700">방공제 (천원)</label>
                        <input type="number" className="w-full p-3 bg-white rounded-lg text-lg font-black" value={processedProperties.find(p => p.id === selectedPropertyId)?.seniorDeduction || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === selectedPropertyId ? {...p, seniorDeduction: Number(e.target.value)} : p)})} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="p-6 bg-gray-50 flex gap-4">
              <button onClick={() => {
                if(confirm("삭제?")) {
                  setLoanState({...loanState, properties: loanState.properties.filter(p => p.id !== selectedPropertyId)});
                  setSelectedPropertyId(null);
                }
              }} className="flex-1 py-4 bg-white border border-red-100 text-red-500 rounded-xl font-black text-xs">삭제</button>
              <button onClick={() => setSelectedPropertyId(null)} className="flex-[2] py-4 bg-green-600 text-white rounded-xl font-black text-xs shadow-lg shadow-green-100">설정 완료</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;