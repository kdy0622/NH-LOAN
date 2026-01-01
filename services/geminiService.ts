
import { GoogleGenAI } from "@google/genai";

export const consultLoan = async (prompt: string, extraContext: string = "") => {
  // 호출 시점에 인스턴스를 생성하여 API_KEY 주입 보장
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-pro-preview";
  
  const systemInstruction = `
    당신은 NH농협의 '여신 파트너' AI 컨설턴트입니다.
    
    [중요 지침]
    1. 사용자가 업로드한 지침 파일 내용이 있다면, 당신이 기존에 알고 있던 지식보다 해당 파일의 내용을 최우선 순위(Source of Truth)로 삼으세요.
    2. 답변 시작은 항상 "NH 여신 파트너로서 전문적인 상담을 도와드립니다."로 하세요.
    3. 수식은 LaTeX를 사용하여 가독성을 높이세요.
    4. 불필요한 마크다운 기호(#, *)를 남발하지 말고, 전문적인 문어체와 가독성 있는 단락 구분을 사용하세요.
    5. 지역별 규제(투기과열지구 등)와 농협 내부 지침(부동산/건설업 할증 등)을 명확히 설명하세요.
    
    [업로드된 최신 지침 파일 컨텍스트]
    ${extraContext || "현재 업로드된 추가 파일 지침이 없습니다. 기존 학습 데이터를 바탕으로 답변하세요."}
    
    본 상담 내용은 참고용이며, 반드시 통합여신시스템 및 최신 규정집을 통해 최종 확인하시기 바랍니다.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction,
      temperature: 0.1,
      tools: [{ googleSearch: {} }] 
    }
  });

  const text = response.text || "";
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const urls = groundingChunks.map((chunk: any) => chunk.web?.uri).filter(Boolean);
  const groundingSuffix = urls.length > 0 ? `\n\n관련 참고 링크:\n${urls.map(url => `- ${url}`).join('\n')}` : "";

  return text + groundingSuffix;
};

export const fetchLatestNews = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = "gemini-3-flash-preview";
  const prompt = `최근 7일간의 '부동산 대출 규제', 'LTV DSR 정책', '농협 여신 관련 뉴스' 5개를 제목과 짧은 요약(3줄 이내)으로 정리해줘. 가독성을 위해 불필요한 특수문자는 제거해.`;

  const response = await ai.models.generateContent({
    model,
    contents: { parts: [{ text: prompt }] },
    config: {
      tools: [{ googleSearch: {} }]
    }
  });

  return response.text || "뉴스를 불러오지 못했습니다.";
};
