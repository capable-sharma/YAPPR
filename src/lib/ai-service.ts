import { z } from "zod";

/**
 * Enterprise AI Service with Dual-Provider Fallback
 * Primary: Gemini 3 Flash
 * Fallback: Cerebras Llama 3
 */

export interface AIProviderConfig {
  apiKey: string;
  model: string;
  baseURL?: string;
}

export class AIService {
  private geminiConfig: AIProviderConfig;
  private cerebrasConfig: AIProviderConfig;

  constructor() {
    this.geminiConfig = {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: "google/gemini-3-flash-preview",
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" 
      // Using OpenAI compat layer or AI gateway
    };
    
    this.cerebrasConfig = {
      apiKey: process.env.CEREBRAS_API_KEY || '',
      model: "llama3-70b-8192",
      baseURL: "https://api.cerebras.ai/v1/chat/completions"
    };
  }

  /**
   * Executes a prompt with automatic failover to the secondary provider
   * if the primary times out, rate limits, or fails.
   */
  async generateStructured<T>(systemPrompt: string, userPrompt: string, schema?: z.ZodType<T>): Promise<T> {
    try {
      // 1. Try Primary (Gemini)
      return await this.callProvider(this.geminiConfig, systemPrompt, userPrompt, schema);
    } catch (primaryError) {
      console.warn("Primary AI Provider (Gemini) failed. Failing over to Cerebras...", primaryError);
      
      try {
        // 2. Try Fallback (Cerebras Llama)
        return await this.callProvider(this.cerebrasConfig, systemPrompt, userPrompt, schema);
      } catch (fallbackError) {
        console.error("All AI Providers failed.", fallbackError);
        throw new Error("AI Service unavailable. Please try again later.");
      }
    }
  }

  private async callProvider<T>(config: AIProviderConfig, systemPrompt: string, userPrompt: string, schema?: z.ZodType<T>): Promise<T> {
    if (!config.apiKey) throw new Error("API Key missing");

    const response = await fetch(config.baseURL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      throw new Error(`Provider HTTP Error: ${response.status}`);
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    
    if (!content) throw new Error("Empty response from AI");

    const parsedContent = JSON.parse(content);
    
    if (schema) {
      return schema.parse(parsedContent);
    }
    
    return parsedContent as T;
  }
}

export const aiService = new AIService();
