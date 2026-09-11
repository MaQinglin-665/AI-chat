window.__petState = {speakingEnabled:true,chatBusy:false};
let chatAbort;
window.interruptActiveChatTurn = () => { chatAbort?.abort(); window.__petState.chatBusy=false; };
window.requestAssistantReply = async () => {
  chatAbort?.abort(); chatAbort = new AbortController();
  const current = chatAbort;
  window.__petState.chatBusy=true;
  const stream = window.TaffyGalgame.beginStream({signal:current.signal,stop:()=>{},speak:()=>true});
  const lines = [
    {index:0,text:'我们已经到春日公园了，坐一会儿吧。',performance:{emotion:'happy',sprite:'happy'},scene:'park-spring'},
    {index:1,text:'你慢慢说，我在认真听。',performance:{emotion:'neutral',sprite:'neutral'},scene:null},
    {index:2,text:'让我想一想，我们可以从最容易的事开始。',performance:{emotion:'thinking',sprite:'thinking'},scene:null}
  ];
  try {
    for (const line of lines) {
      if(current.signal.aborted) return false;
      stream.append(line);
      await new Promise(resolve=>setTimeout(resolve,1400));
    }
    stream.finish(lines.map(line=>line.text).join(''));
    return await stream.done;
  } finally { if(current===chatAbort) window.__petState.chatBusy=false; }
};
