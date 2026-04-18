/** 不依赖云端 LLM：从用户口述/转写文本里做轻量规则提取（多语言关键词粗匹配） */

export type ExtractedMemoryFields = {
  title: string;
  emotion: string;
  color: string;
  weather: string;
  sensory: string;
};

function clipTitle(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return 'Voice note';
  return t.length <= 20 ? t : `${t.slice(0, 20)}…`;
}

export function extractSimpleMemoryInfo(transcription: string): ExtractedMemoryFields {
  const t = transcription.trim();
  const title = clipTitle(t);

  let weather: ExtractedMemoryFields['weather'] = 'sunny';
  if (/snow|雪|बर्फ/i.test(t)) weather = 'snowy';
  else if (/rain|雨|बारिश|میں بارش/i.test(t)) weather = 'rainy';
  else if (/cloud|阴|云|बादल/i.test(t)) weather = 'cloudy';
  else if (/fog|雾|धुंध/i.test(t)) weather = 'foggy';
  else if (/storm|雷|暴风雨|तूफ़ान/i.test(t)) weather = 'stormy';

  let emotion: ExtractedMemoryFields['emotion'] = 'happy';
  if (/sad|难过|伤心|दुखी|उदास|حزین/i.test(t)) emotion = 'sad';
  else if (/anxious|焦虑|担心|चिंतित|پریشان/i.test(t)) emotion = 'anxious';
  else if (/tired|累|疲惫|थका|تھکا/i.test(t)) emotion = 'tired';
  else if (/excited|兴奋|激动|उत्साहित/i.test(t)) emotion = 'excited';
  else if (/relaxed|平静|放松|शांत|آرام/i.test(t)) emotion = 'relaxed';
  else if (/joyful|欢乐|开心极了|खुश/i.test(t)) emotion = 'joyful';
  else if (/calm|安宁|शांति/i.test(t)) emotion = 'calm';

  let color: ExtractedMemoryFields['color'] = 'neutral';
  if (/warm|温暖|暖色|गर्म|گرم رنگ/i.test(t)) color = 'warm';
  else if (/cool|冷色|清凉|ठंडा/i.test(t)) color = 'cool';
  else if (/vibrant|鲜艳|明亮|चमकीला/i.test(t)) color = 'vibrant';
  else if (/muted|柔和|淡雅|हल्का/i.test(t)) color = 'muted';

  let sensory: ExtractedMemoryFields['sensory'] = 'auditory';
  if (/see|look|看|视觉|देख|نظر/i.test(t)) sensory = 'visual';
  else if (/hear|listen|听|声音|सुन/i.test(t)) sensory = 'auditory';
  else if (/smell|香|臭|嗅觉|महक/i.test(t)) sensory = 'olfactory';
  else if (/touch|摸|触觉|छू/i.test(t)) sensory = 'tactile';
  else if (/taste|吃|味道|味觉|स्वाद/i.test(t)) sensory = 'gustatory';

  return { title, emotion, color, weather, sensory };
}
