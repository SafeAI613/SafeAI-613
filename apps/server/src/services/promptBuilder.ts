/**
 * server/src/services/promptBuilder.ts
 *
 */
import logger from "../logger";
import { PromptService } from "./promptService";


export async function buildSystemPrompt(profile: any): Promise<string> {

  const dbPrompt = await PromptService.getPromptByCode("SYSTEM_PROMPT");

  logger.debug(`Building system prompt for profile: ${profile?.name || "N/A"}`);


  return [
    dbPrompt.content,
    ...(profile?.contentPrompts || []),
    ...(profile?.behaviorPrompts || []),
    ...(profile?.knowledgePrompts || []),
  ]
    .filter(Boolean)
    .join("\n\n");
}



export async function buildFilterPrompt(
  profileName: string,
  profileDesc: string,
): Promise<string> {
  const dbPrompt = await PromptService.getPromptByCode("FILTER_PROMPT");


  logger.debug(`Building filter prompt for profile: ${profileName}`);

  return `
${dbPrompt.content}

Profile name: ${profileName}
Profile description: ${profileDesc}

Respond in JSON with:
- "verdict": "allowed" or "blocked"
- "reason": one short English sentence explaining the decision (which category matched).
`.trim();
}
