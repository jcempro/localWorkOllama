import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { watch } from 'node:fs';

const UUID_R8S = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function parseQueueReceipt(output: string, threadId: string) {
  const match = /^Queued message ([a-f0-9-]{36}) for thread ([a-f0-9-]{36})\.$/i.exec(output.trim());
  if (!match || match[2] !== threadId || !UUID_R8S.test(match[1])) return null;
  return match[1]; // ID da fila NAO e ID da mensagem recebida.
}
export function clientIds(payload: unknown): string[] {
  const found = new Set<string>();
  const visit = (value: any, depth: number) => {
    if (!value || typeof value !== 'object' || depth > 8) return;
    for (const [key, child] of Object.entries(value)) {
      if (['clientId','client_id','clientUserMessageId','client_user_message_id'].includes(key) && typeof child === 'string' && UUID_R8S.test(child)) found.add(child);
      else if (typeof child === 'object') visit(child, depth + 1);
    }
  };
  visit(payload,0);return [...found];
}

// Observador read-only de schema efetivamente inspecionado. Ausencia/migracao
// degrada a confirmacao, nunca altera a fila ou impede um envio autorizado.
export function observeQueue(config: any) {
  let db: DatabaseSync | undefined, watcher: ReturnType<typeof watch> | undefined;
  const receipts = new Map<string,string>();
  let timer: ReturnType<typeof setInterval> | undefined;
  try {
    db = new DatabaseSync(path.join(config.codexHome,'queue_1.sqlite'),{readOnly:true});
    const query = db.prepare('SELECT id,payload_json FROM queued_items WHERE thread_id = ?');
    const sample = () => {
      try {
        for(const row of query.all(config.threadId) as any[]){
          const ids=clientIds(JSON.parse(row.payload_json));
          if(ids.length===1)receipts.set(row.id,ids[0]);
        }
      }catch{/* Projecao local indisponivel: nao fabricar correlacao. */}
    };
    sample();
    watcher=watch(config.codexHome,(_event,name)=>{if(String(name).startsWith('queue_1.sqlite'))sample();});
    watcher.on('error',()=>{});
    // Recuperacao de evento perdido somente durante o breve comando queue.
    timer=setInterval(sample,100);
  }catch{db?.close();db=undefined;}
  return { messageClientId:(queueId:string)=>receipts.get(queueId)??null,
    close:()=>{if(timer)clearInterval(timer);watcher?.close();db?.close();} };
}

export function persistedTurn(config: any, turnId: string) {
  const db=new DatabaseSync(path.join(config.codexHome,'thread_history_1.sqlite'),{readOnly:true});
  try{
    const row:any=db.prepare('SELECT status,error_json,started_at,first_user_item_id,final_agent_item_id FROM thread_turns WHERE thread_id=? AND turn_id=?').get(config.threadId,turnId);
    if(!row)return null;
    const query=db.prepare('SELECT item_json FROM thread_items WHERE thread_id=? AND turn_id=? AND item_id=?');
    const items=[row.first_user_item_id,row.final_agent_item_id].filter(Boolean).map(id=>{
      const value:any=query.get(config.threadId,turnId,id);
      if(!value)return null;
      const item=JSON.parse(value.item_json);
      // A projecao SQLite usa o enum interno; a API publica normaliza para final.
      // Somente o item final explicitamente apontado pelo turno recebe a traducao.
      if(item.id===row.final_agent_item_id&&item.type==='agentMessage'&&item.phase==='final_answer'){
        item.sourcePhase=item.phase;item.phase='final';
      }
      return item;
    }).filter(Boolean);
    return {id:turnId,startedAt:row.started_at,status:row.status,error:row.error_json?JSON.parse(row.error_json):null,items};
  }finally{db.close();}
}

export function correlatedTurn(config: any, messageClientId: string) {
  if(!UUID_R8S.test(messageClientId))throw new Error('INVALID_MESSAGE_CLIENT_ID');
  const db=new DatabaseSync(path.join(config.codexHome,'thread_history_1.sqlite'),{readOnly:true});
  let turnId:string|undefined;
  try{
    const rows:any[]=db.prepare("SELECT turn_id FROM thread_items WHERE thread_id=? AND item_type='userMessage' AND json_extract(item_json,'$.clientId')=? LIMIT 2").all(config.threadId,messageClientId);
    if(rows.length>1)throw new Error('AMBIGUOUS_CLIENT_ID');
    turnId=rows[0]?.turn_id;
  }finally{db.close();}
  return turnId?persistedTurn(config,turnId):null;
}
