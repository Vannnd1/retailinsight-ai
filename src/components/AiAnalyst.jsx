/**
 * AiAnalyst.jsx
 * AI-powered Q&A panel using the Gemini API.
 * The AI is given a rich dataset context (pre-computed stats) and answers
 * questions grounded in the actual Online Retail data.
 */

import { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Bot, Send, Loader2, AlertCircle, ChevronDown, Sparkles } from 'lucide-react';
import { buildAiContext, kpis, formatCurrency } from '../data/dataUtils';

// ── Preset questions ──────────────────────────────────────────────────────────
const PRESET_QUESTIONS = [
  'What was the best performing month by revenue?',
  'Which country generates the most revenue?',
  'Who are the top 5 customers by spend?',
  'What are the best-selling products?',
  'Give me a summary of the overall business performance.',
  'What trends can you identify in the sales data?',
  'How does the UK compare to other countries?',
  'Which month had the highest number of orders?',
];

// ── Simple markdown renderer ──────────────────────────────────────────────────
function renderMarkdown(text) {
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Code inline
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headers
  text = text.replace(/^### (.+)$/gm, '<h4 class="font-semibold text-slate-800 mt-3 mb-1 text-sm">$1</h4>');
  text = text.replace(/^## (.+)$/gm,  '<h3 class="font-semibold text-slate-800 mt-3 mb-1 text-sm">$1</h3>');
  text = text.replace(/^# (.+)$/gm,   '<h2 class="font-semibold text-slate-800 mt-3 mb-1 text-sm">$1</h2>');
  // Bullet lists
  text = text.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  text = text.replace(/(<li.*<\/li>\n?)+/g, m => `<ul class="my-1 space-y-0.5">${m}</ul>`);
  // Numbered lists
  text = text.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  // Line breaks
  text = text.replace(/\n\n/g, '</p><p class="mt-2">');
  text = `<p>${text}</p>`;
  return text;
}

// ── Chat message component ────────────────────────────────────────────────────
function ChatMessage({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
        ${isUser ? 'bg-blue-500 text-white' : 'bg-violet-100 text-violet-600'}
      `}>
        {isUser ? 'U' : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div className={`
        max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed
        ${isUser
          ? 'bg-blue-500 text-white rounded-tr-sm'
          : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-sm'
        }
      `}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div
            className="ai-message"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        <p className={`text-[10px] mt-1 ${isUser ? 'text-blue-200' : 'text-slate-400'} text-right`}>
          {message.timestamp}
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
/**
 * @param {object} props
 * @param {string} props.apiKey        - Gemini API key from environment or user input
 * @param {object} [props.activeFilters] - Currently applied dashboard filters
 * @param {object} [props.filteredData]  - Current filtered dataset results
 */
export default function AiAnalyst({ apiKey: propApiKey, activeFilters, filteredData }) {
  const [messages, setMessages]       = useState([]);
  const [input, setInput]             = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState('');
  const [apiKey, setApiKey]           = useState(propApiKey || '');
  const [showKeyInput, setShowKeyInput] = useState(!propApiKey);
  const [showPresets, setShowPresets] = useState(false);
  const [chatHistory, setChatHistory] = useState([]); // Gemini chat history

  const [selectedModel, setSelectedModel] = useState('auto');
  const [activeModel, setActiveModel] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message to Gemini ──────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const userText = (text || input).trim();
    if (!userText || isLoading) return;
    if (!apiKey.trim()) { setError('Please enter your Gemini API key.'); return; }

    const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Dynamic system context reflecting active filters
    const systemContext = buildAiContext(activeFilters, filteredData);

    // Add user message
    const userMsg = { role: 'user', content: userText, timestamp: now };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError('');

    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());

      // Candidate models in priority order
      const userChoice = selectedModel !== 'auto' ? selectedModel : null;
      const configuredEnvModel = import.meta.env.VITE_GEMINI_MODEL;
      const modelCandidates = [...new Set([
        userChoice,
        configuredEnvModel,
        'gemini-3.8-flash',
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-flash-latest',
      ].filter(Boolean))];

      let responseText = null;
      let lastErr = null;

      for (const modelName of modelCandidates) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: systemContext,
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.1,
            },
          });
          const chat = model.startChat({ history: chatHistory });
          const result = await chat.sendMessage(userText);
          responseText = result.response.text();
          if (responseText) {
            setActiveModel(modelName);
            break;
          }
        } catch (err) {
          lastErr = err;
          const msg = err.message || '';

          // Auth errors (invalid API key) should stop immediately
          if (/api[ _]?key/i.test(msg) || (msg.includes('400') && msg.includes('API key'))) {
            throw err;
          }

          // If 503 (high demand), 429 (rate limit), 404 (model not found/deprecated), or network glitch, try fallback
          const canFallback =
            msg.includes('503') ||
            msg.includes('high demand') ||
            msg.includes('demand') ||
            msg.includes('overloaded') ||
            msg.includes('429') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.includes('quota') ||
            msg.includes('404') ||
            msg.includes('not found') ||
            msg.includes('no longer available') ||
            msg.includes('fetch failed');

          if (canFallback) {
            console.warn(`Model "${modelName}" busy or unavailable (${msg.slice(0, 100)}). Falling back to next model...`);
            continue;
          }

          // Any other unexpected critical error, rethrow
          throw err;
        }
      }

      if (!responseText && lastErr) {
        throw lastErr;
      }

      const aiMsg = { role: 'assistant', content: responseText, timestamp: now };
      setMessages(prev => [...prev, aiMsg]);

      // Update chat history for context continuity
      setChatHistory(prev => [
        ...prev,
        { role: 'user',  parts: [{ text: userText }] },
        { role: 'model', parts: [{ text: responseText }] },
      ]);
    } catch (err) {
      console.error('Gemini API error:', err);
      let errMsg = 'Failed to get a response. ';
      if (err.message?.includes('API_KEY')) {
        errMsg += 'Please check your Gemini API key.';
      } else if (err.message?.includes('503') || err.message?.includes('demand')) {
        errMsg += 'Gemini servers are currently experiencing high demand. Please try Gemini 3.7 Flash or wait a moment.';
      } else if (err.message?.includes('quota')) {
        errMsg += 'API quota exceeded. Please try again later.';
      } else {
        errMsg += err.message ?? 'Unknown error.';
      }
      setError(errMsg);
      // Remove the user message on error
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[680px]">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-violet-100 rounded-xl flex items-center justify-center">
            <Sparkles size={16} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">AI Analyst</h3>
            <p className="text-xs text-slate-400">
              {activeModel ? `Model: ${activeModel}` : 'Powered by Gemini · Based on real dataset'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Model selector */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 transition-colors"
            title="Pilih Model AI"
          >
            <option value="auto">Auto (Smart Fallback)</option>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
            <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
            <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
          </select>

          {/* Preset questions toggle */}
          <button
            onClick={() => setShowPresets(v => !v)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-200"
          >
            Sample Questions
            <ChevronDown size={12} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Active Filter Context banner ── */}
      {activeFilters && (
        (activeFilters.country && activeFilters.country !== 'All') ||
        (activeFilters.startMonth && activeFilters.startMonth !== kpis.dateRange.start) ||
        (activeFilters.endMonth && activeFilters.endMonth !== kpis.dateRange.end) ||
        (activeFilters.productSearch && activeFilters.productSearch.trim())
      ) && (
        <div className="px-4 py-2 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between text-xs text-blue-700 flex-wrap gap-1">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>AI Context:</span>
            {activeFilters.country && activeFilters.country !== 'All' && (
              <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800 font-semibold">
                {activeFilters.country}
              </span>
            )}
            <span className="text-blue-600 text-[11px]">
              {activeFilters.startMonth} – {activeFilters.endMonth}
            </span>
            {activeFilters.productSearch && (
              <span className="bg-white px-2 py-0.5 rounded border border-blue-200 text-blue-800 text-[11px]">
                "{activeFilters.productSearch}"
              </span>
            )}
          </div>
          <span className="text-[11px] text-blue-600 font-medium">
            £{formatCurrency(filteredData?.kpis?.totalRevenue || 0)} · {filteredData?.kpis?.totalTransactions?.toLocaleString() ?? 0} orders
          </span>
        </div>
      )}

      {/* ── Preset questions dropdown ── */}
      {showPresets && (
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-wrap gap-2">
            {PRESET_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => { sendMessage(q); setShowPresets(false); }}
                className="text-xs bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600 px-3 py-1.5 rounded-full transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── API Key input (shown when no key) ── */}
      {showKeyInput && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700 font-medium mb-2">
            🔑 Enter your Gemini API key to activate the AI Analyst.
            Get one free at{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
               className="underline hover:text-amber-900">
              Google AI Studio
            </a>
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="AIza…"
              className="flex-1 text-xs bg-white border border-amber-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button
              onClick={() => { if (apiKey.trim()) setShowKeyInput(false); }}
              className="text-xs bg-amber-500 text-white px-4 py-1.5 rounded-lg hover:bg-amber-600 transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* ── Messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mb-4">
              <Bot size={24} className="text-violet-600" />
            </div>
            <h4 className="text-base font-semibold text-slate-700 mb-2">
              Hello! I'm your Retail AI Analyst
            </h4>
            <p className="text-sm text-slate-400 leading-relaxed max-w-sm">
              Ask me anything about the Online Retail dataset — revenue trends,
              top products, customer behaviour, country comparisons, and more.
              All answers are grounded in the actual data.
            </p>
            <button
              onClick={() => setShowPresets(true)}
              className="mt-4 text-xs text-blue-600 hover:underline"
            >
              View sample questions →
            </button>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg, i) => (
          <ChatMessage key={i} message={msg} />
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2.5">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-violet-600" />
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-violet-500" />
              <span className="text-xs text-slate-400">Analysing data…</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="px-4 pb-4 pt-2 border-t border-slate-100">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about sales, products, customers, trends…"
            rows={2}
            className="
              flex-1 text-sm text-slate-700 bg-slate-50 border border-slate-200
              rounded-xl px-4 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300
              transition-all placeholder-slate-400 leading-snug
            "
          />
          <button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="
              flex-shrink-0 w-11 h-11 self-end bg-blue-500 hover:bg-blue-600
              disabled:bg-slate-200 disabled:cursor-not-allowed
              rounded-xl flex items-center justify-center
              text-white transition-all
            "
          >
            {isLoading
              ? <Loader2 size={16} className="animate-spin" />
              : <Send size={16} />
            }
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1.5 pl-1">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
