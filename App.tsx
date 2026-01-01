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

  // 관리자 파일 업로드 관련
  const [adminFiles, setAdminFiles] = useState<AdminFile[]>([]);
  const [extraContext, setExtraContext] = useState("");

  // 로컬스토리지 안전 파싱 함수
  const safeParse = (key: string, fallback: any) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) {
      console.error(`Error parsing ${key}:`, e);
      return fallback;
    }
  };

  // 대시보드 상태 초기화 (안전한 방식)
  const [todos, setTodos] = useState<TodoItem[]>(() => safeParse('nh_todos_v3_8', []));
  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => safeParse('nh_schedules_v3_8', []));
  const [accumulatedNews, setAccumulatedNews] = useState<NewsItem[]>(() => safeParse('nh_news_v3_8', []));
  const [todoInput, setTodoInput] = useState("");

  // 여신 상태
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

  // 서류 설정
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
    localStorage.setItem('nh_todos_v3_8', JSON.stringify(todos));
    localStorage.setItem('nh_schedules_v3_8', JSON.stringify(schedules));
    localStorage.setItem('nh_news_v3_8', JSON.stringify(accumulatedNews));
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
    } catch (e) { 
      console.error(e); 
    } finally { 
      setNewsLoading(false); 
    }
  };

  const handleAiConsult = async () => {
    if (!chatInput.trim()) return;
    const currentInput = chatInput;
    setChatInput("");
    setLoading(true);
    try {
      const res = await consultLoan(currentInput, extraContext);
      setAiResponse(res);
    } catch (e) { 
      setAiResponse("상담 엔진 연결에 실패했습니다. 잠시 후 다시 시도해주세요."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newFile = { id: Date.now().toString(), name: file.name, type: file.type, content };
      setAdminFiles([...adminFiles, newFile]);
      setExtraContext(prev => prev + `\n[관리자 지침 파일: ${file.name}]\n${content.substring(0, 5000)}`);
      alert(`'${file.name}' 파일의 내용을 AI 지침에 반영했습니다.`);
    };
    reader.readAsText(file);
  };

  const cleanAiText = (text: string) => {
    if (!text) return "";
    return text
      .replace(/###\s*(.*)/g, '<h4 class="text-xl font-black text-green-800 mt-8 mb-4 border-l-8 border-green-600 pl-4 bg-green-50/50 py-2 rounded-r-lg">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-700 font-black">$1</strong>')
      .replace(/^\s*[\*\-]\s*(.*)/gm, '<li class="ml-6 list-disc text-gray-700 my-2 pl-2">$1</li>')
      .replace(/(\n)/g, '<br/>');
  };

  const processedProperties = useMemo(() => {
    return loanState.properties.map(p => {
      const calculatedAmt = Math.floor(p.appraisalValue * (p.itemLtv / 100));
      return { ...p, calculatedAmt, finalAmt: Math.max(0, calculatedAmt - p.seniorDeduction) };
    });
  }, [loanState.properties]);

  const totalLimit = processedProperties.reduce((sum, p) => sum + p.finalAmt, 0);
  const formatNum = (val: number) => val.toLocaleString();

  const generatedDocs = useMemo(() => {
    const docs: { category: string; items: string[] }[] = [];
    docs.push({ category: "기본 공통 서류", items: ["신분증", "주민등록등본", "주민등록초본(주소변경 포함)", "인감증명서(2부) 및 도장"] });
    
    if (docConfig.borrowerType === "개인사업자") docs.push({ category: "사업자 서류", items: ["사업자등록증명원", "사업장 임대차계약서", "납세증명서(국세/지방세)"] });
    else if (docConfig.borrowerType === "법인") docs.push({ category: "법인 서류", items: ["법인등기부등본", "정관", "주주명부", "법인인감증명서", "대표자 신분증"] });

    const incomeItems = [];
    if (docConfig.job === "근로자") incomeItems.push("재직증명서", "근로소득원천징수영수증(최근2년)");
    else if (docConfig.job === "사업자") incomeItems.push("소득금액증명원", "부가세과세표준증명");
    else incomeItems.push("건강보험료 납부확인서", "연금가입증명서");
    docs.push({ category: "소득/재직 서류", items: incomeItems });

    const propertyItems = ["담보대상 등기부등본", "전입세대확인서(지번/도로명)"];
    if (docConfig.isTrade.includes("매매")) propertyItems.push("매매계약서 원본", "계약금 납입 영수증");
    if (docConfig.purpose === "시설자금") propertyItems.push("공사도급계약서", "건축허가서");
    docs.push({ category: "담보물권 및 용도 서류", items: propertyItems });

    return docs;
  }, [docConfig]);

  const activeProperty = useMemo(() => {
    return processedProperties.find(p => p.id === selectedPropertyId);
  }, [selectedPropertyId, processedProperties]);

  const bannerTimeStr = `${currentTime.getFullYear()}년 ${currentTime.getMonth() + 1}월 ${currentTime.getDate()}일 ${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

  const handleToggleAdmin = () => {
    if (!isAdmin) {
      const password = prompt("관리자 비밀번호를 입력하세요 (기본: 0000):");
      if (password === "0000") {
        setIsAdmin(true);
      } else if (password !== null) {
        alert("인증에 실패했습니다. 올바른 비밀번호를 입력해주세요.");
      }
    } else {
      if(confirm("관리자 모드를 종료하시겠습니까?")) {
        setIsAdmin(false);
      }
    }
  };

  return (
    <Layout isAdmin={isAdmin} onToggleAdmin={handleToggleAdmin}>
      {/* 관리자 업무 지침 패널 */}
      {isAdmin && (
        <div className="mb-8 bg-white p-10 rounded-[3rem] border-4 border-dashed border-red-200 animate-fade-in no-print shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-black text-red-600 flex items-center gap-3">⚙️ 관리자 규정 동기화</h3>
            <span className="text-xs font-bold text-red-300">업로드된 파일은 AI 상담 시 최우선 근거가 됩니다</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="bg-red-600 text-white px-8 py-4 rounded-2xl text-[13px] font-black cursor-pointer hover:bg-red-700 transition-all shadow-lg shadow-red-100">
              규정 파일(.txt) 업로드
              <input type="file" className="hidden" accept=".txt" onChange={handleFileUpload} />
            </label>
            <div className="flex-1 flex gap-3 overflow-x-auto py-2 custom-scrollbar">
              {adminFiles.length > 0 ? adminFiles.map(f => (
                <div key={f.id} className="bg-gray-50 px-5 py-3 rounded-xl border border-red-100 text-[11px] font-bold flex items-center gap-3 whitespace-nowrap">
                  📄 {f.name}
                  <button onClick={() => setAdminFiles(adminFiles.filter(x => x.id !== f.id))} className="text-red-300 hover:text-red-500">×</button>
                </div>
              )) : (
                <p className="text-xs text-gray-300 flex items-center">학습된 추가 지침 파일이 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 대시보드 상단 배너 */}
      <div className="mb-8 bg-gradient-to-br from-[#009a44] to-[#004a99] p-10 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-center gap-8 no-print">
        <div className="text-center md:text-left">
          <h2 className="text-4xl font-black tracking-tighter drop-shadow-md leading-tight">
            {bannerTimeStr}
          </h2>
          <p className="text-sm font-bold opacity-60 mt-1 uppercase tracking-widest">Administrative Center System</p>
        </div>
        <div className="flex-1 max-w-xl text-center px-6">
          <p className="text-lg font-medium italic opacity-95 leading-relaxed">"{activeQuote.text}"</p>
          <p className="text-[10px] font-black opacity-30 mt-4 tracking-[0.4em] uppercase">— {activeQuote.author}</p>
        </div>
        <div className="bg-white/10 p-6 rounded-[2.5rem] backdrop-blur-md border border-white/20 text-right shadow-inner">
          <p className="text-[10px] font-black opacity-60 uppercase mb-2 tracking-widest">Total Estimated Limit</p>
          <p className="text-4xl font-black">{formatNum(totalLimit)} <span className="text-sm opacity-60 font-medium">천원</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-20">
        <div className="xl:col-span-8 space-y-8">
          {/* 소재지 심사 선택 시스템 */}
          <section className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100 no-print">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-2xl font-black text-gray-800 flex items-center gap-5">
                <span className="w-16 h-16 bg-green-50 text-green-700 rounded-3xl flex items-center justify-center text-4xl shadow-sm">🌍</span>
                전국 행정구역 기반 소재지 심사
              </h3>
              <button 
                onClick={() => {
                  const newId = Date.now().toString();
                  setLoanState(prev => ({
                    ...prev, 
                    properties: [...prev.properties, { 
                      id: newId, 
                      lotNumber: '', 
                      usage: '', 
                      majorCategory: '주택', 
                      minorCategory: '아파트', 
                      appraisalValue: 0, 
                      itemLtv: 70, 
                      seniorDeduction: 0 
                    }]
                  }));
                  setSelectedPropertyId(newId);
                }}
                className="bg-green-600 text-white px-8 py-5 rounded-[2rem] text-[13px] font-black shadow-xl shadow-green-100 hover:scale-105 active:scale-95 transition-all"
              >
                + 담보물건 추가
              </button>
            </div>

            <div className="bg-gray-50/50 p-10 rounded-[3rem] border border-gray-100 mb-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] font-black text-gray-400 px-1 uppercase tracking-widest">시/도</label>
                <select className="w-full p-5 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none shadow-sm focus:ring-2 ring-green-100" value={loanState.city} onChange={e => {
                  const city = e.target.value;
                  const districts = Object.keys(REGIONS[city]);
                  setLoanState({...loanState, city, district: districts[0], neighborhood: REGIONS[city][districts[0]][0], village: ""});
                }}>
                  {Object.keys(REGIONS).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-gray-400 px-1 uppercase tracking-widest">시/군/구</label>
                <select className="w-full p-5 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none shadow-sm focus:ring-2 ring-green-100" value={loanState.district} onChange={e => {
                  const district = e.target.value;
                  setLoanState({...loanState, district, neighborhood: REGIONS[loanState.city][district][0], village: ""});
                }}>
                  {Object.keys(REGIONS[loanState.city]).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-gray-400 px-1 uppercase tracking-widest">읍/면/동</label>
                <select className="w-full p-5 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none shadow-sm focus:ring-2 ring-green-100" value={loanState.neighborhood} onChange={e => setLoanState({...loanState, neighborhood: e.target.value, village: ""})}>
                  {REGIONS[loanState.city][loanState.district]?.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black text-gray-400 px-1 uppercase tracking-widest">리 (Ri 선택)</label>
                <select 
                  className={`w-full p-5 bg-white border border-gray-200 rounded-2xl text-sm font-bold outline-none shadow-sm transition-all ${!VILLAGES[loanState.neighborhood] ? 'opacity-30 cursor-not-allowed bg-gray-100' : 'opacity-100 ring-2 ring-green-100'}`} 
                  value={loanState.village} 
                  onChange={e => setLoanState({...loanState, village: e.target.value})}
                  disabled={!VILLAGES[loanState.neighborhood]}
                >
                  <option value="">{VILLAGES[loanState.neighborhood] ? '- 리(Ri) 단위 선택 -' : '- 읍/면 지역 아님 -'}</option>
                  {VILLAGES[loanState.neighborhood]?.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[2rem] border border-gray-50 shadow-inner">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-[0.2em] border-b border-gray-100">
                    <th className="p-6 text-left">지번/호수</th>
                    <th className="p-6 text-left">종류</th>
                    <th className="p-6 text-right">감정가</th>
                    <th className="p-6 text-center">LTV</th>
                    <th className="p-6 text-right text-green-700">심사한도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {processedProperties.map(p => (
                    <tr key={p.id} onClick={() => setSelectedPropertyId(p.id)} className="cursor-pointer hover:bg-green-50/40 transition-all active:bg-green-100 group">
                      <td className="p-6 font-bold text-gray-800">{p.lotNumber || '(미입력)'}</td>
                      <td className="p-6 text-[11px] font-black text-gray-400 uppercase tracking-tighter">{p.minorCategory}</td>
                      <td className="p-6 text-right font-black text-gray-700">{formatNum(p.appraisalValue)}</td>
                      <td className="p-6 text-center font-black text-blue-600 bg-blue-50/20">{p.itemLtv}%</td>
                      <td className="p-6 text-right font-black text-green-700 group-hover:translate-x-[-4px] transition-transform">{formatNum(p.finalAmt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* AI 컨설팅 솔루션 */}
          <section className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-gray-100 flex flex-col h-auto no-print">
            <h3 className="text-2xl font-black text-green-800 flex items-center gap-5 mb-8">
              <span className="w-16 h-16 bg-green-600 text-white rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-green-100">AI</span>
              NH 여신 전문 AI 컨설팅
            </h3>
            
            <div className={`bg-gray-50/50 rounded-[3rem] p-12 border border-gray-100 mb-8 transition-all duration-500 ${aiResponse ? 'h-auto opacity-100' : 'h-[300px] flex items-center justify-center opacity-40'}`}>
              {aiResponse ? (
                <div className="animate-fade-in text-lg text-gray-800 leading-[1.8] max-w-none">
                   <div dangerouslySetInnerHTML={{ __html: cleanAiText(aiResponse) }} />
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-6xl mb-6 grayscale opacity-40">🏢</p>
                  <p className="font-black text-gray-400 text-xl tracking-tight">지침 파일 분석 및 한도 심사 요청을 입력하세요.</p>
                </div>
              )}
            </div>

            <div className="relative">
              <input 
                type="text" 
                className="w-full p-8 bg-white border-2 border-gray-100 rounded-[2.5rem] text-lg font-bold shadow-xl outline-none focus:border-green-600 transition-all pr-28"
                placeholder="전문가에게 질문하기..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiConsult()}
              />
              <button 
                onClick={handleAiConsult}
                disabled={loading}
                className="absolute right-4 top-4 w-20 h-20 bg-green-600 text-white rounded-[2rem] flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all disabled:bg-gray-300"
              >
                {loading ? '...' : <span className="text-2xl font-bold">→</span>}
              </button>
            </div>
          </section>
        </div>

        {/* 사이드바 영역 */}
        <div className="xl:col-span-4 space-y-8 no-print">
          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">🗓️ 여신 스케줄러</h3>
            <div className="space-y-4 mb-6">
              <div className="flex gap-2">
                <input type="date" className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold" id="cal-date" />
                <button onClick={() => {
                  const d = (document.getElementById('cal-date') as HTMLInputElement).value;
                  const t = prompt("일정을 입력하세요:");
                  if(d && t) setSchedules([{ id: Date.now().toString(), date: d, title: t }, ...schedules]);
                }} className="bg-green-600 text-white px-4 rounded-xl text-xs font-black hover:bg-green-700 transition-colors">등록</button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {schedules.length > 0 ? schedules.map(s => (
                  <div key={s.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-green-600">{s.date}</span>
                    <span className="text-xs font-bold text-gray-700 truncate flex-1">{s.title}</span>
                    <button onClick={() => setSchedules(schedules.filter(x => x.id !== s.id))} className="text-gray-300 hover:text-red-500 transition-colors">×</button>
                  </div>
                )) : <p className="text-[10px] text-gray-300 text-center py-4">예정된 일정이 없습니다</p>}
              </div>
            </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-800 mb-6 flex justify-between items-center">
              <span>✅ 업무 체크리스트</span>
              <span className="text-[10px] opacity-40 font-bold">{todos.filter(t=>t.completed).length}/{todos.length}</span>
            </h3>
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto custom-scrollbar">
              {todos.map(todo => (
                <div key={todo.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-all group">
                  <input type="checkbox" checked={todo.completed} onChange={() => setTodos(todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t))} className="w-5 h-5 accent-green-600 cursor-pointer" />
                  <span className={`text-sm font-bold flex-1 cursor-pointer ${todo.completed ? 'line-through text-gray-300' : 'text-gray-600'}`} onClick={() => setTodos(todos.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t))}>{todo.text}</span>
                  <button onClick={() => setTodos(todos.filter(x => x.id !== todo.id))} className="text-gray-200 group-hover:text-red-300 transition-colors">×</button>
                </div>
              ))}
            </div>
            <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold outline-none focus:border-green-500" placeholder="+ 할 일 추가 (Enter)" value={todoInput} onChange={e => setTodoInput(e.target.value)} onKeyDown={e => {
              if(e.key === 'Enter' && todoInput.trim()) {
                setTodos([...todos, { id: Date.now().toString(), text: todoInput, completed: false }]);
                setTodoInput("");
              }
            }} />
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-xl font-black text-gray-800 mb-8">🔗 심사 지원 도구함</h3>
            <div className="grid grid-cols-2 gap-4">
              {EXTERNAL_LINKS.map(link => (
                <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="p-5 bg-gray-50/50 border border-gray-100 rounded-2xl text-[12px] font-black text-gray-500 text-center hover:bg-green-600 hover:text-white hover:shadow-xl hover:translate-y-[-2px] transition-all">
                  {link.name}
                </a>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 담보 상세 설정 팝업 (모달) */}
      {selectedPropertyId && activeProperty && (
        <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white w-full max-w-lg rounded-[4rem] shadow-2xl overflow-hidden border-t-[14px] border-green-600 animate-fade-in">
            <div className="p-10 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-black text-gray-800">담보 상세 설정</h3>
                <p className="text-[11px] font-black text-green-600 uppercase mt-1">Property Analysis Data</p>
              </div>
              <button onClick={() => setSelectedPropertyId(null)} className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-bold text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all text-2xl shadow-sm">×</button>
            </div>
            
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">지번/호수</label>
                  <input type="text" className="w-full p-5 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-green-500 transition-all" value={activeProperty.lotNumber} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === activeProperty.id ? {...p, lotNumber: e.target.value} : p)})} placeholder="예: 101-2번지" />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">실제 용도</label>
                  <input type="text" className="w-full p-5 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-green-500 transition-all" value={activeProperty.usage} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === activeProperty.id ? {...p, usage: e.target.value} : p)})} placeholder="예: 상업용" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">대분류</label>
                  <select className="w-full p-5 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-green-500" value={activeProperty.majorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === activeProperty.id ? {...p, majorCategory: e.target.value, minorCategory: MINOR_CATEGORIES[e.target.value][0]} : p)})}>
                    {MAJOR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest">소분류</label>
                  <select className="w-full p-5 bg-gray-50 rounded-2xl text-sm font-bold outline-none border-2 border-transparent focus:border-green-500" value={activeProperty.minorCategory} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === activeProperty.id ? {...p, minorCategory: e.target.value} : p)})}>
                    {MINOR_CATEGORIES[activeProperty.majorCategory]?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="p-8 bg-green-50 rounded-[3rem] space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-green-700 uppercase tracking-widest">감정평가액 (천원)</label>
                  <input type="number" className="w-full p-5 bg-white rounded-2xl text-2xl font-black text-green-800 outline-none border-2 border-transparent focus:border-green-400 transition-all shadow-inner" value={activeProperty.appraisalValue || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === activeProperty.id ? {...p, appraisalValue: Number(e.target.value)} : p)})} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-green-700 uppercase tracking-widest">LTV (%)</label>
                    <input type="number" className="w-full p-5 bg-white rounded-2xl text-2xl font-black text-green-800 outline-none border-2 border-transparent focus:border-green-400 transition-all shadow-inner" value={activeProperty.itemLtv} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === activeProperty.id ? {...p, itemLtv: Number(e.target.value)} : p)})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-red-700 uppercase tracking-widest">차감/방공제 (천원)</label>
                    <input type="number" className="w-full p-5 bg-white rounded-2xl text-2xl font-black text-red-800 outline-none border-2 border-transparent focus:border-red-400 transition-all shadow-inner" value={activeProperty.seniorDeduction || ""} onChange={e => setLoanState({...loanState, properties: loanState.properties.map(p => p.id === activeProperty.id ? {...p, seniorDeduction: Number(e.target.value)} : p)})} />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-10 bg-gray-50 flex gap-6">
              <button 
                onClick={() => { 
                  if(confirm("이 담보 물건을 삭제하시겠습니까?")) {
                    setLoanState({...loanState, properties: loanState.properties.filter(p => p.id !== activeProperty.id)}); 
                    setSelectedPropertyId(null); 
                  }
                }} 
                className="flex-1 py-5 bg-white border border-red-100 text-red-500 rounded-2xl font-black hover:bg-red-50 transition-all active:scale-95"
              >
                삭제
              </button>
              <button 
                onClick={() => setSelectedPropertyId(null)} 
                className="flex-[2] py-5 bg-green-600 text-white rounded-2xl font-black shadow-xl shadow-green-100 hover:bg-green-700 transition-all active:scale-95"
              >
                저장 후 닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;