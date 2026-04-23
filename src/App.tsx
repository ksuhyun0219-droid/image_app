/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { toPng } from 'html-to-image';
import download from 'downloadjs';
import { 
  Upload, 
  Sparkles, 
  Layout, 
  Type as TypeIcon, 
  Eye, 
  CheckCircle2, 
  ArrowRight,
  Palette,
  Loader2,
  Image as ImageIcon,
  ChevronRight,
  ShoppingBag,
  Star,
  Monitor,
  Smartphone,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { analyzeProductImage, ProductAnalysis } from './services/geminiService';
import { cn } from '@/lib/utils';

type TemplateStyle = 'minimal' | 'bold' | 'elegant' | 'modern' | 'vintage' | 'playful';
type ViewMode = 'mobile' | 'desktop';

interface ImageUploadSlotProps {
  image: string | null;
  onDrop: (files: File[]) => void;
  index: number;
}

const ImageUploadSlot: React.FC<ImageUploadSlotProps> = ({ image, onDrop, index }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  } as any);

  return (
    <div 
      {...getRootProps()} 
      className={cn(
        "relative aspect-square rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden",
        isDragActive ? "border-black bg-black/5" : "border-gray-200 hover:border-gray-300 bg-gray-50",
        image ? "border-none" : ""
      )}
    >
      <input {...getInputProps()} />
      {image ? (
        <>
          <img src={image} alt={`Product ${index + 1}`} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
            <p className="text-white text-[10px] font-medium flex items-center gap-1">
              <Upload className="h-3 w-3" /> 변경
            </p>
          </div>
        </>
      ) : (
        <div className="text-center p-2">
          <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
          <p className="text-[10px] font-medium text-gray-500">이미지 {index + 1}</p>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [template, setTemplate] = useState<TemplateStyle>('modern');
  const [viewMode, setViewMode] = useState<ViewMode>('mobile');
  const [userTarget, setUserTarget] = useState('');
  
  // Editable fields
  const [editableHeadline, setEditableHeadline] = useState('');
  const [editableSubheadline, setEditableSubheadline] = useState('');
  const [editableCta, setEditableCta] = useState('');
  const [editableProblem, setEditableProblem] = useState('');
  const [editableEmpathy, setEditableEmpathy] = useState('');
  const [editableCause, setEditableCause] = useState('');
  const [editableSolution, setEditableSolution] = useState('');
  const [editableIngredients, setEditableIngredients] = useState('');
  const [editableProof, setEditableProof] = useState('');
  const [editableBenefits, setEditableBenefits] = useState('');
  const [editableClosing, setEditableClosing] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  
  const previewRef = useRef<HTMLDivElement>(null);

  const onDrop = useCallback((acceptedFiles: File[], index: number) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const newImages = [...images];
        newImages[index] = reader.result as string;
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    }
  }, [images]);

  const handleAnalyze = async () => {
    const validImages = images.filter((img): img is string => img !== null);
    if (validImages.length === 0) return;
    setIsAnalyzing(true);
    try {
      const base64DataArray = validImages.map(img => img.split(',')[1]);
      const result = await analyzeProductImage(base64DataArray, userTarget, template, {
        headline: editableHeadline,
        subheadline: editableSubheadline
      });
      setAnalysis(result);
      
      // Set initial editable fields from the first recommendation
      if (result.recommendations.length > 0) {
        setEditableHeadline(result.recommendations[0].headline);
        setEditableSubheadline(result.recommendations[0].subheadline);
        setEditableCta(result.recommendations[0].cta);
      }
      
      setEditableProblem(result.problem);
      setEditableEmpathy(result.empathy);
      setEditableCause(result.cause);
      setEditableSolution(result.solution);
      setEditableIngredients(result.ingredients);
      setEditableProof(result.proof);
      setEditableBenefits(result.benefits);
      setEditableClosing(result.closing);
      
      setActiveTab('preview');
    } catch (error) {
      console.error(error);
      alert('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectRecommendation = (index: number) => {
    if (!analysis) return;
    const rec = analysis.recommendations[index];
    setEditableHeadline(rec.headline);
    setEditableSubheadline(rec.subheadline);
    setEditableCta(rec.cta);
  };

  const handleExport = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    
    try {
      // 9:16 aspect ratio logic
      // We'll capture the entire scrollable content and then potentially split it
      // For now, let's capture the whole thing and inform the user it's optimized for 9:16
      
      const dataUrl = await toPng(previewRef.current, {
        cacheBust: true,
        quality: 1,
        pixelRatio: 2, // High quality
      });
      
      download(dataUrl, `sellcraft-design-${Date.now()}.png`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setIsExporting(false);
    }
  };

  const updateField = (field: keyof ProductAnalysis, value: string | string[]) => {
    if (!analysis) return;
    setAnalysis({ ...analysis, [field]: value });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">SellCraft AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-[200px]">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="editor">에디터</TabsTrigger>
                <TabsTrigger value="preview">미리보기</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          
          {/* Left Column: Editor */}
          <div className={cn(
            "lg:col-span-5 space-y-6",
            activeTab === 'preview' && "hidden lg:block"
          )}>
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-gray-500" />
                  상품 이미지
                </CardTitle>
                <CardDescription>상세 페이지를 만들 상품 사진을 업로드하세요.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Step 1: Target & Style */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">1. 타겟 고객 (선택 사항)</label>
                      <Input 
                        placeholder="예: 20대 여성, 캠핑 매니아, 직장인 등"
                        value={userTarget}
                        onChange={(e) => setUserTarget(e.target.value)}
                        className="border-gray-200 focus:ring-black"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">2. 디자인 스타일 선택</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['modern', 'minimal', 'bold', 'elegant', 'vintage', 'playful'] as TemplateStyle[]).map((style) => (
                          <button
                            key={style}
                            onClick={() => setTemplate(style)}
                            className={cn(
                              "px-2 py-2 rounded-lg border text-[10px] font-bold transition-all capitalize",
                              template === style 
                                ? "border-black bg-black text-white shadow-sm" 
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            )}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">3. 기본 카피라이팅 (선택 사항)</label>
                      <div className="space-y-2">
                        <Input 
                          placeholder="메인 헤드라인 (직접 입력 시 AI가 참고합니다)"
                          value={editableHeadline}
                          onChange={(e) => setEditableHeadline(e.target.value)}
                          className="border-gray-200 focus:ring-black text-sm"
                        />
                        <Textarea 
                          placeholder="서브 헤드라인 또는 상품 설명"
                          value={editableSubheadline}
                          onChange={(e) => setEditableSubheadline(e.target.value)}
                          className="border-gray-200 focus:ring-black text-sm min-h-[60px]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 2: Image Upload */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400">4. 상품 이미지 업로드 (최대 4장)</label>
                    <div className="grid grid-cols-2 gap-4">
                      {images.map((img, index) => (
                        <ImageUploadSlot 
                          key={index}
                          image={img}
                          onDrop={(files) => onDrop(files, index)}
                          index={index}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-6 h-12 text-base font-semibold bg-black hover:bg-gray-800 transition-all"
                  disabled={images.every(img => img === null) || isAnalyzing}
                  onClick={handleAnalyze}
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      AI가 분석 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      상세 디자인 생성하기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {analysis && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-500" />
                      AI 추천 카피라이팅
                    </CardTitle>
                    <CardDescription>AI가 제안하는 3가지 버전 중 하나를 선택하세요.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.recommendations.map((rec, i) => (
                      <button
                        key={i}
                        onClick={() => selectRecommendation(i)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border transition-all hover:border-black group",
                          editableHeadline === rec.headline ? "border-black bg-black/5" : "border-gray-100 bg-gray-50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="bg-white">버전 {i + 1}</Badge>
                          {editableHeadline === rec.headline && <CheckCircle2 className="h-4 w-4 text-black" />}
                        </div>
                        <p className="text-sm font-bold line-clamp-1">{rec.headline}</p>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{rec.subheadline}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Palette className="h-5 w-5 text-gray-500" />
                      스타일 및 카피 수정
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <label className="text-xs font-bold uppercase tracking-wider text-gray-400">디자인 스타일</label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['modern', 'minimal', 'bold', 'elegant', 'vintage', 'playful'] as TemplateStyle[]).map((style) => (
                          <button
                            key={style}
                            onClick={() => setTemplate(style)}
                            className={cn(
                              "px-3 py-2 rounded-lg border text-xs font-medium transition-all capitalize",
                              template === style 
                                ? "border-black bg-black text-white shadow-md" 
                                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                            )}
                          >
                            {style}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">상품명</label>
                        <Input 
                          value={analysis.productName} 
                          onChange={(e) => updateField('productName', e.target.value)}
                          className="border-gray-200 focus:ring-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">1. 문제 제기 (Problem)</label>
                        <Textarea 
                          value={editableProblem} 
                          onChange={(e) => setEditableProblem(e.target.value)}
                          className="border-gray-200 focus:ring-black min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">2. 공감 확대 (Empathy)</label>
                        <Textarea 
                          value={editableEmpathy} 
                          onChange={(e) => setEditableEmpathy(e.target.value)}
                          className="border-gray-200 focus:ring-black min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">3. 문제 원인 (Cause)</label>
                        <Textarea 
                          value={editableCause} 
                          onChange={(e) => setEditableCause(e.target.value)}
                          className="border-gray-200 focus:ring-black min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">4. 해결책 (Solution)</label>
                        <Textarea 
                          value={editableSolution} 
                          onChange={(e) => setEditableSolution(e.target.value)}
                          className="border-gray-200 focus:ring-black min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">6. 성분 설명 (Ingredients)</label>
                        <Textarea 
                          value={editableIngredients} 
                          onChange={(e) => setEditableIngredients(e.target.value)}
                          className="border-gray-200 focus:ring-black min-h-[80px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">7. 신뢰 요소 (Proof)</label>
                        <Textarea 
                          value={editableProof} 
                          onChange={(e) => setEditableProof(e.target.value)}
                          className="border-gray-200 focus:ring-black min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">9. 혜택/이벤트 (Benefits)</label>
                        <Textarea 
                          value={editableBenefits} 
                          onChange={(e) => setEditableBenefits(e.target.value)}
                          className="border-gray-200 focus:ring-black min-h-[60px]"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400">10. 최종 CTA (Closing)</label>
                        <Input 
                          value={editableCta} 
                          onChange={(e) => setEditableCta(e.target.value)}
                          className="border-gray-200 focus:ring-black"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column: Preview */}
          <div className={cn(
            activeTab === 'editor' ? "hidden lg:block" : "block",
            viewMode === 'desktop' ? "lg:col-span-12" : "lg:col-span-7"
          )}>
            <div className={cn("sticky top-24", viewMode === 'desktop' && "relative top-0")}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <Eye className="h-4 w-4" /> 실시간 미리보기
                </h2>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                  <Button 
                    variant={viewMode === 'mobile' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={() => setViewMode('mobile')}
                  >
                    <Smartphone className="h-4 w-4 mr-2" /> 모바일
                  </Button>
                  <Button 
                    variant={viewMode === 'desktop' ? 'default' : 'ghost'} 
                    size="sm" 
                    className="h-8 px-3"
                    onClick={() => setViewMode('desktop')}
                  >
                    <Monitor className="h-4 w-4 mr-2" /> PC
                  </Button>
                </div>
                {analysis && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-10 px-4 ml-2 border-black hover:bg-black hover:text-white transition-all"
                    onClick={handleExport}
                    disabled={isExporting}
                  >
                    {isExporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                    이미지 저장 (9:16)
                  </Button>
                )}
              </div>
              
              <div className={cn(
                "relative mx-auto bg-white transition-all duration-500 overflow-hidden",
                viewMode === 'mobile' 
                  ? "max-w-[400px] aspect-[9/16] rounded-[3rem] border-[8px] border-gray-900 shadow-2xl" 
                  : "w-full max-w-[1200px] min-h-[800px] rounded-xl border shadow-xl"
              )}>
                {/* Phone Notch (Only for mobile) */}
                {viewMode === 'mobile' && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 h-6 w-32 bg-gray-900 rounded-b-2xl z-20"></div>
                )}
                
                <ScrollArea className="h-full w-full bg-white">
                  {analysis ? (
                    <div 
                      ref={previewRef}
                      className={cn(
                        "flex flex-col min-h-full",
                        template === 'minimal' && "font-sans",
                        template === 'elegant' && "font-serif",
                        template === 'bold' && "font-sans tracking-tight",
                        template === 'vintage' && "font-serif bg-[#F4EBD0] text-[#4E342E]",
                        template === 'playful' && "font-sans bg-[#FFF0F5] text-[#FF69B4]"
                      )}
                    >
                      {/* 1. Problem & 2. Empathy */}
                      <section className={cn(
                        "px-6 py-20 text-center relative overflow-hidden",
                        template === 'bold' ? "bg-gray-50 text-black" : "bg-white"
                      )}>
                        <div className="relative z-10">
                          <Badge className="mb-6 bg-red-500 text-white animate-pulse">3초 품절 주의</Badge>
                          <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight tracking-tighter">
                            {editableProblem}
                          </h2>
                          <p className="text-xl opacity-80 max-w-lg mx-auto leading-relaxed font-medium">
                            {editableEmpathy}
                          </p>
                        </div>
                        {/* Background Accent */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-radial-gradient from-gray-100/50 to-transparent opacity-50 pointer-events-none"></div>
                      </section>

                      {/* Image 1 - Spotlight Layout */}
                      <div className="relative w-full py-12 bg-gray-50 flex flex-col items-center justify-center overflow-hidden">
                        <motion.div 
                          initial={{ scale: 0.8, opacity: 0 }}
                          whileInView={{ scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          className="relative w-[70%] aspect-square z-10"
                        >
                          <div className="absolute inset-0 bg-black/20 blur-3xl rounded-full scale-75 -z-10"></div>
                          <img 
                            src={images[0] || images.find(img => img !== null)!} 
                            alt="Product 1" 
                            className="w-full h-full object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)]" 
                            referrerPolicy="no-referrer" 
                          />
                        </motion.div>
                        <div className="mt-8 text-center z-10">
                          <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 mb-2">Main Product</p>
                          <h3 className="text-xl font-black">{analysis.productName}</h3>
                        </div>
                        {/* Radial Highlight */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent opacity-80"></div>
                      </div>

                      {/* 3. Cause & 4. Solution */}
                      <section className="px-6 py-20 bg-white text-center">
                        <div className="max-w-2xl mx-auto">
                          <h3 className="text-xl font-black text-red-500 mb-6 uppercase tracking-widest">The Real Cause</h3>
                          <p className="text-2xl mb-16 font-black leading-tight tracking-tight">{editableCause}</p>
                          
                          <div className="relative py-12 mb-16">
                            <div className="absolute inset-0 bg-gray-100 rounded-[2rem] -rotate-1"></div>
                            <div className="relative z-10 px-8 py-12 text-black">
                              <Badge className="mb-6 bg-black text-white font-black">THE ONLY SOLUTION</Badge>
                              <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight tracking-tighter">
                                {analysis.productName}
                              </h2>
                              <p className="text-2xl font-bold italic opacity-90">
                                {editableSolution}
                              </p>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Image 2 - Spotlight Layout */}
                      {images[1] && (
                        <div className="relative w-full py-16 bg-white flex flex-col items-center justify-center overflow-hidden">
                          <motion.div 
                            initial={{ y: 40, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            className="relative w-[65%] aspect-square z-10"
                          >
                            <div className="absolute inset-0 bg-black/5 blur-3xl rounded-full scale-90 -z-10"></div>
                            <img 
                              src={images[1]} 
                              alt="Product 2" 
                              className="w-full h-full object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.1)]" 
                              referrerPolicy="no-referrer" 
                            />
                          </motion.div>
                          <div className="mt-10 text-center z-10">
                            <Badge variant="outline" className="text-black border-black/20 mb-4">Detail View</Badge>
                          </div>
                          {/* Top Highlight */}
                          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-white to-transparent"></div>
                        </div>
                      )}

                      {/* 5. Comparison & 6. Ingredients & 7. Proof */}
                      <section className="px-6 py-16 bg-white">
                        <div className="max-w-2xl mx-auto space-y-16">
                          <div className="text-center">
                            <h3 className="text-2xl font-black mb-8">왜 {analysis.productName}인가?</h3>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-4 rounded-xl bg-gray-100 opacity-50">
                                <p className="text-xs font-bold mb-2 uppercase">일반 제품</p>
                                <p className="text-sm">{analysis.comparison.them}</p>
                              </div>
                              <div className="p-4 rounded-xl bg-gray-100 text-black shadow-sm">
                                <p className="text-xs font-bold mb-2 uppercase">우리 제품</p>
                                <p className="text-sm font-bold">{analysis.comparison.us}</p>
                              </div>
                            </div>
                          </div>

                          <div className="p-8 rounded-3xl bg-gray-50 text-black border border-gray-100">
                            <h4 className="text-sm font-bold uppercase tracking-widest mb-4 text-gray-400">Key Ingredients</h4>
                            <p className="text-xl font-bold leading-relaxed">
                              {editableIngredients}
                            </p>
                          </div>

                          <div className="text-center">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-bold text-sm mb-6">
                              <CheckCircle2 className="h-4 w-4" /> 임상 시험 완료
                            </div>
                            <p className="text-2xl md:text-4xl font-black tracking-tighter">
                              {editableProof}
                            </p>
                          </div>
                        </div>
                      </section>

                      {/* Image 3 - Spotlight Layout */}
                      {images[2] && (
                        <div className="relative w-full py-16 bg-gray-50 flex flex-col items-center justify-center overflow-hidden">
                          <motion.div 
                            initial={{ x: -40, opacity: 0 }}
                            whileInView={{ x: 0, opacity: 1 }}
                            viewport={{ once: true }}
                            className="relative w-[60%] aspect-square z-10"
                          >
                            <div className="absolute inset-0 bg-black/10 blur-3xl rounded-full scale-75 -z-10"></div>
                            <img 
                              src={images[2]} 
                              alt="Product 3" 
                              className="w-full h-full object-contain drop-shadow-[0_25px_25px_rgba(0,0,0,0.15)]" 
                              referrerPolicy="no-referrer" 
                            />
                          </motion.div>
                          <div className="absolute top-1/2 right-8 -translate-y-1/2 z-10 hidden md:block">
                            <p className="text-[10rem] font-black text-black/5 select-none">BEST</p>
                          </div>
                        </div>
                      )}

                      {/* 8. Reviews & 9. Benefits */}
                      <section className="px-6 py-20 bg-white">
                        <div className="max-w-2xl mx-auto space-y-16">
                          <div className="space-y-6">
                            <h3 className="text-center font-black text-2xl mb-12 tracking-tighter">실제 구매자들의 리얼 보이스</h3>
                            <div className="grid grid-cols-1 gap-4">
                              {analysis.reviews.map((review, i) => (
                                <motion.div 
                                  key={i} 
                                  initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                                  whileInView={{ opacity: 1, x: 0 }}
                                  viewport={{ once: true }}
                                  className="p-6 rounded-2xl bg-gray-50 border border-gray-100 flex items-start gap-4"
                                >
                                  <div className="shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs">
                                    User
                                  </div>
                                  <div>
                                    <div className="flex gap-1 mb-2">
                                      {[1,2,3,4,5].map(n => <Star key={n} className="h-3 w-3 fill-yellow-400 text-yellow-400" />)}
                                    </div>
                                    <p className="text-sm font-bold leading-relaxed">"{review}"</p>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>

                          <div className="p-10 rounded-[2.5rem] bg-yellow-400 text-black text-center shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                              <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-4 opacity-60">Exclusive Benefits</h4>
                              <p className="text-2xl md:text-3xl font-black leading-tight">
                                {editableBenefits}
                              </p>
                            </div>
                            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
                          </div>
                        </div>
                      </section>

                      {/* Image 4 - Spotlight Layout */}
                      {images[3] && (
                        <div className="relative w-full py-20 bg-white flex flex-col items-center justify-center overflow-hidden">
                          <motion.div 
                            initial={{ scale: 1.2, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            className="relative w-[70%] aspect-square z-10"
                          >
                            <div className="absolute inset-0 bg-black/5 blur-3xl rounded-full scale-110 -z-10"></div>
                            <img 
                              src={images[3]} 
                              alt="Product 4" 
                              className="w-full h-full object-contain drop-shadow-[0_45px_45px_rgba(0,0,0,0.1)]" 
                              referrerPolicy="no-referrer" 
                            />
                          </motion.div>
                          <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white to-transparent"></div>
                        </div>
                      )}

                      {/* 10. Closing */}
                      <section className="px-6 py-20 bg-gray-50 text-black text-center">
                        <div className="max-w-lg mx-auto">
                          <h2 className="text-3xl md:text-5xl font-black mb-12 leading-tight">
                            {editableClosing}
                          </h2>
                          <Button className="w-full h-16 text-xl font-black rounded-full bg-black text-white hover:bg-gray-800 shadow-2xl group">
                            {editableCta}
                            <ArrowRight className="ml-2 h-6 w-6 group-hover:translate-x-2 transition-transform" />
                          </Button>
                          <p className="mt-6 text-xs font-bold opacity-40 uppercase tracking-widest">
                            Limited Stock Available • Free Shipping
                          </p>
                        </div>
                      </section>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center p-12 text-center text-gray-400">
                      <div className="h-20 w-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                        <ShoppingBag className="h-10 w-10" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">디자인 준비 완료</h3>
                      <p className="text-sm max-w-xs mx-auto">이미지를 업로드하고 분석을 시작하면 이곳에서 실시간으로 디자인을 확인할 수 있습니다.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t bg-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-gray-500">© 2026 SellCraft AI. All rights reserved.</p>
          <div className="mt-4 flex justify-center gap-6">
            <a href="#" className="text-xs text-gray-400 hover:text-black transition-colors">이용약관</a>
            <a href="#" className="text-xs text-gray-400 hover:text-black transition-colors">개인정보처리방침</a>
            <a href="#" className="text-xs text-gray-400 hover:text-black transition-colors">문의하기</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
