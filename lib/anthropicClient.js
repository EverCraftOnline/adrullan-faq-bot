const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

module.exports = {
  async ask(systemPrompt, context, question) {
    const userPrompt = `KNOWLEDGE BASE CONTEXT:
${context}

USER QUESTION: ${question}

Respond using only the provided context. If the answer isn't in the context, say "I don't have official information about that in our current FAQ." Be helpful, accurate, and cite your sources.`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt }
        ]
      });
      
      return response.content[0].text;
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw new Error('Failed to get AI response');
    }
  }
};
