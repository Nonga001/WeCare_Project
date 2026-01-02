import Groq from "groq-sdk";

/**
 * Get Groq client instance (lazy-loaded to ensure env vars are loaded)
 */
const getGroqClient = () => {
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });
};

/**
 * Analyze last N messages in a group chat and generate a helpful response
 * @param {Array} messages - Array of message objects with { senderName, text, createdAt }
 * @param {String} groupName - Name of the group for context
 * @returns {Promise<String>} - Generated response text
 */
export const generateGroupResponse = async (messages, groupName = "group") => {
  try {
    if (!messages || messages.length === 0) {
      return "I'm here to help with any questions!";
    }

    const groq = getGroqClient();

    // Format messages for the AI prompt
    const formattedMessages = messages
      .slice(-20) // Last 20 messages
      .map(msg => `${msg.senderName || "User"}: ${msg.text}`)
      .join("\n");

    const systemPrompt = `You are a helpful AI assistant for the WeCare student support platform. 
You're helping in the "${groupName}" group chat. 
Analyze the conversation and provide a helpful, empathetic response that:
- Addresses any questions or concerns raised
- Offers practical advice or resources when appropriate
- Maintains a supportive and friendly tone
- Keeps responses concise (2-3 sentences max)
- If the conversation is casual, acknowledge it briefly and offer to help`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Recent conversation:\n${formattedMessages}\n\nProvide a helpful response:` }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 200,
    });

    const response = chatCompletion.choices[0]?.message?.content || "I'm here to help if you need anything!";
    return response;
  } catch (error) {
    console.error("Groq API error:", error);
    throw new Error(`Failed to generate AI response: ${error.message}`);
  }
};

/**
 * Check if a group needs an AI response (no activity for 3 minutes)
 * @param {Date} lastMessageTime - Timestamp of last message
 * @returns {Boolean}
 */
export const shouldTriggerAIResponse = (lastMessageTime) => {
  if (!lastMessageTime) return false;
  const now = new Date();
  const diffMs = now - new Date(lastMessageTime);
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes >= 3;
};
