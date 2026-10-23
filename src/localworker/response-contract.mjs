// R8V: forma e proveniência verificáveis; não é avaliador de verdade semântica.
import * as z from 'zod/v4';
const MAX_SCHEMA_CHARS_R8V=8192,MAX_SCHEMA_NODES_R8V=64,MAX_SCHEMA_DEPTH_R8V=8;
const MAX_WORDS_R8V=2000,MAX_CITATIONS_R8V=16,MAX_POINTER_CHARS_R8V=256,MAX_POINTER_DEPTH_R8V=12;
const MAX_STRING_R8V=4000,MAX_ITEMS_R8V=32,MAX_FIELDS_R8V=32;
const MAX_ENUM_R8V=32,MAX_DESCRIPTION_R8V=240,MAX_KEY_R8V=120,MAX_NUMBER_R8V=1e12;
export class ResponseContractErrorR8V extends Error {}
const failR8V=(reason       )      =>{throw new ResponseContractErrorR8V('RESPONSE_CONTRACT: '+reason);};
const objectR8V=(v    )=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const ownR8V=(v    ,k       )=>Object.prototype.hasOwnProperty.call(v,k);
const keysR8V=(v    ,allowed         )=>{if(!objectR8V(v)||Object.keys(v).some(k=>!allowed.includes(k)))failR8V('campo não admitido');};
const integerR8V=(v    ,min       ,max       )=>Number.isSafeInteger(v)&&v>=min&&v<=max;



function schemaR8V(schema    ){
  let nodes=0;
  const visit=(s    ,depth       )=>{
    if(++nodes>MAX_SCHEMA_NODES_R8V||depth>MAX_SCHEMA_DEPTH_R8V)failR8V('schema excede complexidade permitida');
    if(!objectR8V(s)||!['object','array','string','number','integer','boolean','null'].includes(s.type))failR8V('tipo de schema não admitido');
    const extras=s.type==='object'?['properties','required','additionalProperties']:s.type==='array'?['items','minItems','maxItems']:
      s.type==='string'?['minLength','maxLength','enum']:['minimum','maximum','enum'];
    keysR8V(s,['type','description',...extras]);
    if(s.description!==undefined&&(typeof s.description!=='string'||s.description.length>MAX_DESCRIPTION_R8V))failR8V('descrição excessiva');
    if(s.type==='object'){
      if(!objectR8V(s.properties)||Object.keys(s.properties).length>MAX_FIELDS_R8V||s.additionalProperties!==false||
        !Array.isArray(s.required)||new Set(s.required).size!==s.required.length||s.required.some(k=>typeof k!=='string'||!ownR8V(s.properties,k)))
        failR8V('objeto exige properties/required e additionalProperties:false');
      for(const [key,value] of Object.entries(s.properties)){
        if(!key||key.length>MAX_KEY_R8V||['__proto__','prototype','constructor'].includes(key))failR8V('nome de propriedade não admitido');
        visit(value,depth+1);
      }
    }else if(s.type==='array'){
      if(!integerR8V(s.maxItems,0,MAX_ITEMS_R8V)||(s.minItems!==undefined&&!integerR8V(s.minItems,0,s.maxItems)))failR8V('array exige maxItems limitado');
      visit(s.items,depth+1);
    }else if(s.type==='string'){
      if(!integerR8V(s.maxLength,1,MAX_STRING_R8V)||(s.minLength!==undefined&&!integerR8V(s.minLength,0,s.maxLength)))failR8V('string exige maxLength limitado');
    }else{
      for(const k of ['minimum','maximum'])if(s[k]!==undefined&&(!['number','integer'].includes(s.type)||!Number.isFinite(s[k])||Math.abs(s[k])>MAX_NUMBER_R8V))failR8V('limite numérico inválido');
      if(s.minimum!==undefined&&s.maximum!==undefined&&s.minimum>s.maximum)failR8V('intervalo numérico inválido');
    }
    if(s.enum!==undefined){
      if(!Array.isArray(s.enum)||!s.enum.length||s.enum.length>MAX_ENUM_R8V||new Set(s.enum.map(v=>JSON.stringify(v))).size!==s.enum.length||
        s.enum.some(v=>s.type==='string'?typeof v!=='string'||v.length>s.maxLength:s.type==='null'?v!==null:
          s.type==='boolean'?typeof v!=='boolean':typeof v!=='number'||!Number.isFinite(v)||(s.type==='integer'&&!Number.isInteger(v))))failR8V('enum inválido');
    }
  };
  if(JSON.stringify(schema).length>MAX_SCHEMA_CHARS_R8V||schema?.type!=='object')failR8V('schema raiz deve ser objeto limitado');
  visit(schema,0);
  try{return z.fromJSONSchema(schema);}catch{failR8V('schema não compilável pelo Zod instalado');}
}

function pointerR8V(value       ){
  if(typeof value!=='string'||value.length>MAX_POINTER_CHARS_R8V||(value!==''&&!value.startsWith('/'))||/~(?![01])/u.test(value))failR8V('JSON Pointer inválido');
  const segments=value===''?[]:value.slice(1).split('/').map(v=>v.replace(/~1/g,'/').replace(/~0/g,'~'));
  if(segments.length>MAX_POINTER_DEPTH_R8V)failR8V('JSON Pointer excede profundidade');return segments;
}
function resolveR8V(value    ,pointer       ){
  for(const part of pointerR8V(pointer)){
    if(value===null||typeof value!=='object'||(Array.isArray(value)&&!/^(0|[1-9][0-9]*)$/u.test(part))||!ownR8V(value,part))failR8V('JSON Pointer não resolvido');
    value=value[part];
  }
  return value;
}
export function prepareResponseContractR8V(value    ,request    ){
  if(value===undefined)return null;
  keysR8V(value,['version','max_words','json_schema','citations']);
  if(value.version!==1||(value.max_words===undefined&&value.json_schema===undefined)||
    (value.max_words!==undefined&&!integerR8V(value.max_words,1,MAX_WORDS_R8V)))failR8V('versão/limite inválido');
  const contract                    =JSON.parse(JSON.stringify(value));
  const compiled=contract.json_schema===undefined?null:schemaR8V(contract.json_schema);
  if(compiled&&(request.mode!=='read-only'||!request.provided_evidence||
    [request.required_read_paths,request.required_command_ids,request.command_sequence,request.authorized_commands].some(v=>v?.length)))
    failR8V('JSON estruturado exige provided_evidence read-only sem requisitos/comandos adicionais');
  const citations=contract.citations??[];
  if(!Array.isArray(citations)||citations.length>MAX_CITATIONS_R8V||(!compiled&&citations.length))failR8V('citações exigem JSON estruturado');
  if(new Set(citations.map(c=>c?.output_pointer)).size!==citations.length)failR8V('pointer de saída duplicado');
  let evidence    =null;
  if(citations.length){try{evidence=JSON.parse(request.provided_evidence.content);}catch{failR8V('citações exigem evidência JSON válida');}}
  for(const c of citations){
    keysR8V(c,['output_pointer','source_pointer']);pointerR8V(c.output_pointer);pointerR8V(c.source_pointer);
    const source=resolveR8V(evidence,c.source_pointer);if(typeof source!=='string'||!source.length)failR8V('fonte da citação deve ser string não vazia');
  }
  return {contract,format:compiled?contract.json_schema:null,
    prompt:`CONTRATO DE SAÍDA R8V (obrigatório): ${JSON.stringify(contract)}. ${compiled?'Retorne somente JSON compatível, sem cercas Markdown ou seções adicionais. Citações são substrings literais contínuas da fonte indicada, sem embelezar ou unir lacunas.':'Respeite o limite de saída.'} O runtime valida forma/vínculo, não verdade semântica.`,
    validate(text       ){
      if(typeof text!=='string'||!text.trim())failR8V('resposta vazia');
      const words=text.trim().split(/\s+/u).length;
      if(contract.max_words!==undefined&&words>contract.max_words)failR8V(`limite de palavras excedido (${words}/${contract.max_words})`);
      let parsed    ;
      if(compiled){
        try{parsed=JSON.parse(text);}catch{failR8V('JSON inválido; cercas Markdown não são permitidas');}
        if(!compiled.safeParse(parsed).success)failR8V('JSON não atende ao schema declarado');
      }
      for(const c of citations){const quote=resolveR8V(parsed,c.output_pointer),source=resolveR8V(evidence,c.source_pointer);
        if(typeof quote!=='string'||!quote.length||!source.includes(quote))failR8V('citação não corresponde literalmente ao campo-fonte declarado');}
      return {words,json_schema_verified:Boolean(compiled),citations_verified:citations.length,semantic_acceptance:'NOT_ASSESSED'};
    }};
}
