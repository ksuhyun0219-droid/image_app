import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface CopyOption {
  headline: string;
  subheadline: string;
  cta: string;
}

export interface ProductAnalysis {
  productName: string;
  recommendations: CopyOption[];
  problem: string;      // 1. 강한 문제 제기
  empathy: string;      // 2. 공감 확대
  cause: string;        // 3. 문제 원인 설명
  solution: string;     // 4. 해결책 제시
  comparison: {         // 5. 제품 차별점
    us: string;
    them: string;
  };
  ingredients: string;  // 6. 핵심 성분 및 기능
  proof: string;        // 7. 임상 근거 및 신뢰
  reviews: string[];    // 8. 사용자 후기
  benefits: string;     // 9. 혜택 및 이벤트
  closing: string;      // 10. 강한 구매 유도 CTA
  targetAudience: string;
  tone: string;
}

export async function analyzeProductImage(
  base64Images: string[], 
  userTarget?: string,
  style?: string,
  userCopy?: { headline?: string, subheadline?: string }
): Promise<ProductAnalysis> {
  const imageParts = base64Images.map(data => ({
    inlineData: {
      mimeType: "image/jpeg",
      data: data,
    },
  }));

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        ...imageParts,
        {
          text: `You are a 10-year performance marketer and copywriter specializing in high-converting Shopee cosmetic product pages.
          Your goal is NOT "pretty design" but "conversion-driven copy".
          Analyze the uploaded images and create a product detail page for "EGF Peptide Ampoule" (or the detected product) following this EXACT 10-point structure:

          [Structure]
          1. Problem: One powerful sentence the customer empathizes with.
          2. Empathy: Detailed description of the customer's situation.
          3. Cause: Explanation of why the problem occurs.
          4. Solution: Product introduction as the solution.
          5. Comparison: "Us vs Them" comparison points.
          6. Ingredients: Easy explanation of key ingredients and functions.
          7. Proof: Clinical evidence and trust factors (include numbers).
          8. Reviews: Copy that feels like real user reviews.
          9. Benefits: Highlight benefits and events.
          10. Closing: Strong CTA.

          [Copy Style]
          - Short and powerful (one-line focus).
          - Don't explain; speak to the customer's situation.
          - Use keywords like "속건조", "주름", "모공" actively.
          - Stimulate emotions (anxiety, empathy, expectation).
          - NO explanatory sentences like "~합니다". Use punchy, conversational, or result-oriented endings.
          - NO long, stiff sentences.

          [Context]
          - Target: 20-40s women, inner dryness + wrinkle concerns.
          - Product: EGF Peptide Ampoule (High concentration EGF, Peptide, Low irritation).
          - Traffic Source: Users coming from Shorts ads (need immediate impact).

          The output must be in JSON format:
          {
            "productName": "...",
            "recommendations": [
              { "headline": "...", "subheadline": "...", "cta": "..." }
            ],
            "problem": "...",
            "empathy": "...",
            "cause": "...",
            "solution": "...",
            "comparison": { "us": "...", "them": "..." },
            "ingredients": "...",
            "proof": "...",
            "reviews": ["...", "..."],
            "benefits": "...",
            "closing": "...",
            "targetAudience": "...",
            "tone": "..."
          }
          Please respond in Korean.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          productName: { type: Type.STRING },
          recommendations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                subheadline: { type: Type.STRING },
                cta: { type: Type.STRING },
              },
              required: ["headline", "subheadline", "cta"],
            },
          },
          problem: { type: Type.STRING },
          empathy: { type: Type.STRING },
          cause: { type: Type.STRING },
          solution: { type: Type.STRING },
          comparison: {
            type: Type.OBJECT,
            properties: {
              us: { type: Type.STRING },
              them: { type: Type.STRING },
            },
            required: ["us", "them"],
          },
          ingredients: { type: Type.STRING },
          proof: { type: Type.STRING },
          reviews: { type: Type.ARRAY, items: { type: Type.STRING } },
          benefits: { type: Type.STRING },
          closing: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          tone: { type: Type.STRING },
        },
        required: ["productName", "recommendations", "problem", "empathy", "cause", "solution", "comparison", "ingredients", "proof", "reviews", "benefits", "closing", "targetAudience", "tone"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("AI 분석 중 오류가 발생했습니다.");
  }
}
