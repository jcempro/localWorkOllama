/** E4J: somente apresentação; contrato/hash/evidência original permanecem intactos. */


function compactSyntaxE4J(text       )        {
  let out='',quoted=false,escaped=false;
  for(const char of text){
    if(quoted){
      out+=char;
      if(escaped)escaped=false;
      else if(char==='\\')escaped=true;
      else if(char==='"')quoted=false;
    } else if(char==='"'){quoted=true;out+=char;}
    else if(char!==' '&&char!=='\t'&&char!=='\r'&&char!=='\n')out+=char;
  }
  return out;
}

export function renderProvidedEvidenceE4J(evidence            )        {
  // Preservar integralmente o caminho anterior quando não há prova de equivalência.
  const legacy=JSON.stringify(evidence);
  try {
    const value=JSON.parse(evidence.content);
    if(value!==null&&typeof value==='object'&&compactSyntaxE4J(evidence.content)===JSON.stringify(value))
      return JSON.stringify({source:evidence.source,content:value});
  } catch { /* Texto/JSON inválido continua dado literal no envelope anterior. */ }
  return legacy;
}
