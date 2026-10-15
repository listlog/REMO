import {generateText, Output, jsonSchema} from 'ai';
import {createGoogle} from '@ai-sdk/google';
import {responseSchema, systemPrompt, validateAnswer} from './support-rag.mjs';

// Only this server module reads the key. Never send provider errors or headers to clients.
export const supportConfigured=()=>Boolean(process.env.GEMINI_API_KEY?.trim()) && /^gemini-[a-z0-9.-]{1,80}$/.test(process.env.GEMINI_MODEL || '');

export async function generateAnswer(messages,hits,{fetch:providerFetch}={}){
 const google=createGoogle({apiKey:process.env.GEMINI_API_KEY, ...(providerFetch?{fetch:providerFetch}:{})});
 const result=await generateText({
  model:google(process.env.GEMINI_MODEL),
  instructions:systemPrompt(hits),
  messages,
  output:Output.object({schema:jsonSchema(responseSchema(hits),{validate(value){
   try{validateAnswer(value,hits);return {success:true,value};}
   catch{return {success:false,error:Error('INVALID_MODEL_OUTPUT')};}
  }})}),
  maxOutputTokens:1200,
  maxRetries:0,
  abortSignal:AbortSignal.timeout(25000)
 });
 return validateAnswer(result.output,hits);
}
