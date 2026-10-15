import {getDb} from '../db.mjs';
import {setupResponse,sameOrigin,jsonBody,configured} from '../board-server.mjs';
import {knowledge,retrieve,UNKNOWN_ANSWER} from '../support-rag.mjs';
import {generateAnswer,supportConfigured} from '../support-ai.mjs';
import {validateMessages,containsSensitiveData,limitSupport} from '../support-server.mjs';
import {loggingInfo,LOG_CONSENT_VERSION,conversationFor,validUuid,ensureLogSchema,recordTurn} from '../support-logs.mjs';

export function createHandler({database=getDb,generate=generateAnswer,ready=supportConfigured,limit=limitSupport,prepare=ensureLogSchema,record=recordTurn}={}){
 return async function handler(req,res){
  setupResponse(res);
  if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'METHOD_NOT_ALLOWED'});}
  if(req.method==='GET')return res.status(200).json({configured:ready()&&configured(),knowledge,logging:loggingInfo});
  if(!sameOrigin(req))return res.status(403).json({error:'FORBIDDEN'});
  let messages,body,conversation;
  try{
   if(Number(req.headers['content-length']||0)>32768)throw Error('INVALID_INPUT');
   body=jsonBody(req);
   if(Buffer.byteLength(JSON.stringify(body),'utf8')>32768)throw Error('INVALID_INPUT');
   messages=validateMessages(body);
  }catch{return res.status(400).json({error:'INVALID_INPUT'});}
  if(body.loggingConsent!==true||body.consentVersion!==LOG_CONSENT_VERSION)return res.status(428).json({error:'CONSENT_REQUIRED'});
  if(!validUuid(body.requestId))return res.status(400).json({error:'INVALID_INPUT'});
  if(containsSensitiveData(messages))return res.status(200).json({answer:'개인정보나 비밀 정보가 포함된 것으로 보여요. 이메일 주소, 비밀번호, API 키, 예약 취소 링크를 지운 뒤 질문해 주세요. 이 메시지는 AI 서비스에 전송하지 않았어요.',sources:[],needsHuman:true,mode:'notice'});
  if(!ready()||!configured())return res.status(503).json({error:'SUPPORT_NOT_CONFIGURED'});
  try{conversation=conversationFor(body.conversationToken);}catch{return res.status(400).json({error:'INVALID_CONVERSATION'});}
  const question=messages.at(-1).content;
  const hits=retrieve(question,messages.slice(0,-1));
  try{
   const sql=database();
   const retryAfter=await limit(req,sql);
   if(retryAfter){res.setHeader('Retry-After',String(retryAfter));return res.status(429).json({error:'TOO_MANY_REQUESTS'});}
   await prepare(sql);
   const answer=hits.length?await generate(messages,hits):{answer:UNKNOWN_ANSWER,sources:[],needsHuman:true,mode:'notice'};
   await record(sql,{conversationId:conversation.id,requestId:body.requestId,question,result:answer});
   return res.status(200).json({...answer,conversationToken:conversation.token,logged:true});
  }catch(error){
   // Whitelisted error categories only: SDK errors may contain prompts, URLs and credentials.
   const status=Number(error?.statusCode||error?.cause?.statusCode||0);
   console.error('REMO support:',status===429?'provider_quota':status===401||status===403?'provider_auth':status===404?'provider_model':'service_error');
   if(status===429){res.setHeader('Retry-After','60');return res.status(429).json({error:'PROVIDER_LIMIT'});}
   return res.status(503).json({error:'SUPPORT_UNAVAILABLE'});
  }
 };
}
export default createHandler();
