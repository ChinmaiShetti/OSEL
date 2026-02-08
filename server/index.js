import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import pdfParse from 'pdf-parse';

dotenv.config();

const app = express();
const PORT = Number(process.env.TUTOR_PORT) || 8787;
const ROOT_DIR = process.cwd();
const CONFIG_PATH = path.join(ROOT_DIR, 'server', 'rag.config.json');

app.use(express.json({ limit: '2mb' }));

const allowedOrigin = process.env.TUTOR_ALLOWED_ORIGIN;
app.use(
  cors(
    allowedOrigin
      ? { origin: allowedOrigin.split(',').map((item) => item.trim()) }
      : { origin: true }
  )
);

const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

const chunkText = (text, maxChars, overlapChars) => {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = '';

  const flush = () => {
    if (!buffer) return;
    chunks.push(buffer.trim());
    const overlap = buffer.slice(-overlapChars);
    buffer = overlap;
  };

  paragraphs.forEach((para) => {
    if (buffer.length + para.length + 2 > maxChars && buffer.length) {
      flush();
    }
    buffer = buffer ? `${buffer}\n\n${para}` : para;
    if (buffer.length >= maxChars) {
      flush();
    }
  });

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks;
};

const readTextFile = async (relativePath) => {
  const fullPath = path.join(ROOT_DIR, relativePath);
  const content = await fs.readFile(fullPath, 'utf8');
  return { source: relativePath, content };
};

const readPdfFile = async (relativePath) => {
  const fullPath = path.join(ROOT_DIR, relativePath);
  const data = await fs.readFile(fullPath);
  const parsed = await pdfParse(data);
  return { source: relativePath, content: parsed.text || '' };
};

const buildIndex = (documents, config) => {
  const { maxChars, overlapChars } = config.chunk;
  const chunks = [];

  documents.forEach((doc) => {
    const parts = chunkText(doc.content, maxChars, overlapChars);
    parts.forEach((part, idx) => {
      chunks.push({
        id: `${doc.source}-chunk-${idx + 1}`,
        source: doc.source,
        content: part,
      });
    });
  });

  const termDocCount = new Map();
  const chunkTerms = chunks.map((chunk) => {
    const terms = tokenize(chunk.content);
    const unique = new Set(terms);
    unique.forEach((term) => {
      termDocCount.set(term, (termDocCount.get(term) || 0) + 1);
    });
    return terms;
  });

  const totalDocs = chunks.length || 1;
  const idf = new Map();
  termDocCount.forEach((count, term) => {
    const value = Math.log((totalDocs + 1) / (count + 1)) + 1;
    idf.set(term, value);
  });

  const vectors = chunks.map((chunk, index) => {
    const terms = chunkTerms[index];
    const termCounts = new Map();
    terms.forEach((term) => {
      termCounts.set(term, (termCounts.get(term) || 0) + 1);
    });

    let norm = 0;
    termCounts.forEach((count, term) => {
      const weight = (count / terms.length) * (idf.get(term) || 0);
      termCounts.set(term, weight);
      norm += weight * weight;
    });

    return { chunk, weights: termCounts, norm: Math.sqrt(norm) || 1 };
  });

  return { chunks, vectors, idf };
};

const scoreQuery = (index, query) => {
  const queryTerms = tokenize(query);
  if (!queryTerms.length) return [];

  const termCounts = new Map();
  queryTerms.forEach((term) => {
    termCounts.set(term, (termCounts.get(term) || 0) + 1);
  });

  let queryNorm = 0;
  termCounts.forEach((count, term) => {
    const weight = (count / queryTerms.length) * (index.idf.get(term) || 0);
    termCounts.set(term, weight);
    queryNorm += weight * weight;
  });
  queryNorm = Math.sqrt(queryNorm) || 1;

  return index.vectors
    .map(({ chunk, weights, norm }) => {
      let dot = 0;
      termCounts.forEach((qWeight, term) => {
        const dWeight = weights.get(term) || 0;
        dot += qWeight * dWeight;
      });
      const score = dot / (norm * queryNorm);
      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score);
};

const buildContext = (matches, topK, maxChars) => {
  const top = matches.slice(0, topK).filter((match) => match.score > 0);
  const contextLines = top.map((match, idx) => {
    const tag = `doc-${idx + 1}`;
    return {
      tag,
      source: match.chunk.source,
      content: match.chunk.content,
      score: match.score,
    };
  });

  let contextText = '';
  for (const entry of contextLines) {
    const block = `[${entry.tag}] ${entry.source}\n${entry.content}`;
    if (contextText.length + block.length > maxChars) break;
    contextText = contextText ? `${contextText}\n\n${block}` : block;
  }

  return { contextText, contextLines };
};

const loadConfig = async () => {
  const raw = await fs.readFile(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
};

const loadDocuments = async (config) => {
  const docs = [];

  if (config.pdfPath) {
    try {
      const pdfDoc = await readPdfFile(config.pdfPath);
      if (pdfDoc.content.trim()) {
        docs.push(pdfDoc);
      }
    } catch (error) {
      console.warn('PDF not loaded:', error.message);
    }
  }

  if (Array.isArray(config.extraFiles)) {
    for (const file of config.extraFiles) {
      try {
        const doc = await readTextFile(file);
        docs.push(doc);
      } catch (error) {
        console.warn('File not loaded:', file, error.message);
      }
    }
  }

  return docs;
};

let ragIndex = null;
let ragConfig = null;

const initializeIndex = async () => {
  ragConfig = await loadConfig();
  const docs = await loadDocuments(ragConfig);
  ragIndex = buildIndex(docs, ragConfig);
  return ragIndex;
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, indexed: Boolean(ragIndex) });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], contextHint = '' } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (!ragIndex) {
      await initializeIndex();
    }

    const query = contextHint ? `${contextHint}\n${message}` : message;
    const matches = scoreQuery(ragIndex, query);
    const maxContextChars = Number(process.env.TUTOR_MAX_CONTEXT_CHARS) || 1400;
    const topK = Number(process.env.TUTOR_TOP_K) || ragConfig?.retrieval?.topK || 3;
    const { contextText, contextLines } = buildContext(
      matches,
      topK,
      maxContextChars
    );

    const provider = String(process.env.TUTOR_PROVIDER || 'grok').toLowerCase();
    const grokKey = process.env.GROK_API_KEY;
    const groqKey = process.env.GROQ_API_KEY;

    if (provider === 'grok' && !grokKey) {
      return res.status(500).json({
        error: 'GROK_API_KEY is not set on the server.',
      });
    }

    if (provider === 'groq' && !groqKey) {
      return res.status(500).json({
        error: 'GROQ_API_KEY is not set on the server.',
      });
    }

    const model =
      provider === 'groq'
        ? process.env.GROQ_MODEL || 'llama-3.1-70b-versatile'
        : process.env.GROK_MODEL || 'grok-2-latest';

    const systemPrompt =
      'You are an OS tutor embedded in an educational simulator.\n' +
      'Answer clearly, focus on OS concepts, and use the provided context.\n' +
      'Cite sources using [doc-#]. If the context is insufficient, say you do not know.\n\n' +
      `Context:\n${contextText || 'No context available.'}`;

    const historyLimit = Number(process.env.TUTOR_HISTORY_MAX) || 4;
    const cleanHistory = Array.isArray(history)
      ? history
          .filter((item) => item && typeof item.content === 'string')
        .slice(-historyLimit)
          .map((item) => ({ role: item.role || 'user', content: item.content }))
      : [];

    const messages = [
      { role: 'system', content: systemPrompt },
      ...cleanHistory,
      { role: 'user', content: message },
    ];

    const url = provider === 'groq'
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.x.ai/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${provider === 'groq' ? groqKey : grokKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: Number(process.env.TUTOR_MAX_TOKENS) || 700,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(500).json({
        error: provider === 'groq' ? 'Groq request failed.' : 'Grok request failed.',
        details: errorText.slice(0, 400),
      });
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content || 'No response.';

    return res.json({
      answer,
      citations: contextLines.map((entry) => ({
        id: entry.tag,
        source: entry.source,
        snippet: entry.content.slice(0, 240),
        score: Number(entry.score.toFixed(3)),
      })),
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error.' });
  }
});

initializeIndex()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Tutor server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize tutor server:', error);
    process.exit(1);
  });
