import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistantBot({ locale = 'ru' }: { locale?: 'ru' | 'kk' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = {
    ru: {
      title: "ИИ-Логопед",
      subtitle: "Ваш умный помощник",
      placeholder: "Задайте вопрос о развитии речи...",
      welcome: "Здравствуйте! Я ваш ИИ-ассистент. Я могу помочь с упражнениями, подсказать как правильно ставить звуки или ответить на вопросы по методике. Чем могу помочь?",
      typing: "ИИ печатает..."
    },
    kk: {
      title: "ЖИ-Логопед",
      subtitle: "Сіздің ақылды көмекшіңіз",
      placeholder: "Сөйлеуді дамыту туралы сұрақ қойыңыз...",
      welcome: "Сәлеметсіз бе! Мен сіздің ЖИ көмекшіңізбін. Мен жаттығуларға көмектесе аламын, дыбыстарды қалай дұрыс қою керектігін айта аламын немесе әдістеме бойынша сұрақтарға жауап бере аламын. Немен көмектесе аламын?",
      typing: "ЖИ жазуда..."
    }
  }[locale];

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{ id: '1', role: 'assistant', content: t.welcome }]);
    }
  }, [locale, messages.length, t.welcome]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Simulated AI responses based on keywords (since we don't have an OpenAI API key loaded)
  const getAIResponse = (text: string, currentLocale: string) => {
    const lowerText = text.toLowerCase();
    
    if (currentLocale === 'ru') {
      if (lowerText.includes('звук р') || lowerText.includes('рычать')) {
        return "Для постановки звука 'Р' нужно укрепить мышцы языка. Начните с упражнений: 'Грибок', 'Лошадка', 'Дятел'. Важно, чтобы кончик языка вибрировал у верхних альвеол.";
      }
      if (lowerText.includes('шипящие') || lowerText.includes('звук ш')) {
        return "При произношении звука 'Ш' губы должны быть вытянуты рупором, а язык поднят в форме 'чашечки' к нёбу. Попробуйте пошипеть как змея: Ш-ш-ш-ш-ш.";
      }
      if (lowerText.includes('не говорит') || lowerText.includes('молчит')) {
        return "Если ребенок не говорит, важно развивать мелкую моторику (лепка, пальчиковые игры) и побуждать к речи: обращайтесь к нему простыми предложениями, задавайте вопросы, на которые можно ответить жестом, а затем и словом.";
      }
      return "Это отличный вопрос! Наша методика предполагает системный подход. Рекомендую заглянуть в раздел 'Программа' или 'Учебные материалы' для более детальной информации. Мы используем передовые подходы инклюзивного образования.";
    } else {
      if (lowerText.includes('р дыбысы') || lowerText.includes('р')) {
        return "'Р' дыбысын қою үшін тіл бұлшықеттерін қатайту керек. 'Саңырауқұлақ', 'Ат шауып келеді', 'Тоқылдақ' жаттығуларынан бастаңыз. Тілдің ұшы жоғарғы тістердің артында дірілдеуі маңызды.";
      }
      if (lowerText.includes('ш дыбысы') || lowerText.includes('ш')) {
        return "'Ш' дыбысын айтқан кезде еріндер алға қарай созылуы керек, ал тіл 'тостаған' тәрізді таңдайға көтерілуі тиіс. Жылан сияқты ысылдап көріңіз: Ш-ш-ш.";
      }
      return "Жақсы сұрақ! Біздің әдістемеміз жүйелі тәсілді қажет етеді. Толығырақ ақпарат алу үшін 'Бағдарлама' немесе 'Оқу материалдары' бөліміне кіруді ұсынамын.";
    }
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate network delay for AI thinking
    setTimeout(() => {
      const responseContent = getAIResponse(userMessage.content, locale);
      const aiMessage: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: responseContent };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] sm:w-[380px] h-[500px] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col border border-indigo-100 dark:border-slate-800 overflow-hidden transition-all duration-300 transform origin-bottom-right">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex justify-between items-center text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight">{t.title}</h3>
                <p className="text-xs text-indigo-100">{t.subtitle}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-950/50 flex flex-col gap-3">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                  {msg.role === 'user' ? <User size={14} className="text-indigo-600" /> : <Bot size={14} className="text-white" />}
                </div>
                <div 
                  className={`p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-sm' 
                      : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex gap-2 max-w-[85%] self-start">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-indigo-500 to-purple-600">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-tl-sm shadow-sm flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl p-1 border border-slate-200 dark:border-slate-700 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t.placeholder}
                className="flex-1 bg-transparent border-none outline-none resize-none max-h-32 min-h-[44px] py-3 px-3 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={!inputValue.trim()}
                className="w-10 h-10 mb-0.5 rounded-full bg-indigo-600 flex items-center justify-center text-white shrink-0 hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 hover:scale-105 ${
          isOpen 
            ? 'bg-slate-800 text-white scale-90' 
            : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white animate-bounce-slow'
        }`}
        style={{
          boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.1)' : '0 8px 24px rgba(99, 102, 241, 0.4)'
        }}
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}} />
    </div>
  );
}
