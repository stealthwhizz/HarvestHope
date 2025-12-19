/**
 * Utility functions for parsing JSON responses from AI services
 */

/**
 * Extract JSON from AI response, handling various formats including markdown code blocks
 * @param response - Raw AI response string
 * @returns Cleaned JSON string ready for parsing
 * @throws Error if no valid JSON is found
 */
export function extractJSONFromAIResponse(response: string): string {
  let jsonText = response;
  
  // Remove markdown code blocks if present
  if (response.includes('```json')) {
    const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
  } else if (response.includes('```')) {
    const jsonMatch = response.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }
  } else {
    // Try to extract JSON object
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
  }
  
  // Clean up any extra whitespace
  jsonText = jsonText.trim();
  
  if (!jsonText || (!jsonText.startsWith('{') && !jsonText.startsWith('['))) {
    throw new Error('No valid JSON found in AI response');
  }
  
  return jsonText;
}

/**
 * Parse JSON from AI response with error handling
 * @param response - Raw AI response string
 * @returns Parsed JSON object
 * @throws Error with detailed information if parsing fails
 */
export function parseJSONFromAIResponse<T = any>(response: string): T {
  try {
    const jsonText = extractJSONFromAIResponse(response);
    return JSON.parse(jsonText) as T;
  } catch (error) {
    console.error('❌ JSON parsing failed:', error);
    console.log('🔍 Raw response:', response.substring(0, 500) + '...');
    throw error;
  }
}