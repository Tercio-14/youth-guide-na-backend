const logger = require('./logger');
const { embedText, cosineSimilarity } = require('./embeddings');
const { collections } = require('../config/firebase');

const DEFAULT_TOP_K = parseInt(process.env.RETRIEVAL_TOP_K || '3', 10);
const MAX_CANDIDATES = parseInt(process.env.RETRIEVAL_CANDIDATES || '100', 10);

function buildOpportunityContext(opportunity) {
  const lines = [
    `Title: ${opportunity.title}`,
    opportunity.category ? `Category: ${opportunity.category}` : null,
    opportunity.cost ? `Cost: ${opportunity.cost}` : null,
    opportunity.location ? `Location: ${opportunity.location}` : null,
    opportunity.skills ? `Skills: ${Array.isArray(opportunity.skills) ? opportunity.skills.join(', ') : opportunity.skills}` : null,
    opportunity.description ? `Description: ${opportunity.description}` : null,
    opportunity.contact ? `Contact: ${opportunity.contact}` : null,
    opportunity.source ? `Source: ${opportunity.source}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

async function fetchCandidates() {
  const snapshot = await collections.opportunities.where('hasEmbedding', '==', true).limit(MAX_CANDIDATES).get();
  const opportunities = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (Array.isArray(data.embedding) && data.embedding.length > 0) {
      opportunities.push({ id: doc.id, ...data });
    }
  });
  return opportunities;
}

async function retrieveOpportunities(query, options = {}) {
  const start = Date.now();
  const topK = options.topK || DEFAULT_TOP_K;
  const embedding = await embedText(query);
  if (!embedding.length) {
    return { embedding, results: [], retrievalLatencyMs: Date.now() - start };
  }

  const candidates = await fetchCandidates();
  const scored = candidates.map((candidate) => {
    const score = cosineSimilarity(embedding, candidate.embedding);
    return {
      id: candidate.id,
      score,
      title: candidate.title,
      description: candidate.description,
      category: candidate.category,
      cost: candidate.cost,
      contact: candidate.contact,
      source: candidate.source,
      location: candidate.location,
      url: candidate.url,
      context: buildOpportunityContext(candidate),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const results = scored.slice(0, topK).filter((item) => item.score > 0);

  const latency = Date.now() - start;
  logger.info('[Retrieval] Completed opportunity retrieval', {
    queryLength: query.length,
    candidates: candidates.length,
    returned: results.length,
    topScore: results[0]?.score ?? 0,
    latencyMs: latency,
  });

  return {
    embedding,
    results,
    retrievalLatencyMs: latency,
  };
}

module.exports = {
  retrieveOpportunities,
  buildOpportunityContext,
};
