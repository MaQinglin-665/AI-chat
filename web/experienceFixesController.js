(function(root){
  "use strict";
  function install(doc=root.document){
    const rail=doc.getElementById('conversation-rail'), log=doc.getElementById('assistant-chat-log');
    if(!rail || !log)return;
    const bubble=doc.createElement('aside');bubble.id='latest-stage-reply';bubble.setAttribute('aria-live','polite');bubble.hidden=true;doc.body.append(bubble);
    let latest='';
    const draw=()=>{bubble.textContent=latest;bubble.hidden=!latest || !rail.classList.contains('is-collapsed');};
    new MutationObserver(()=>{const messages=log.querySelectorAll('.message.assistant .content');const last=messages[messages.length-1];if(last?.textContent.trim())latest=last.textContent.trim();draw();}).observe(log,{childList:true,subtree:true,characterData:true});
    new MutationObserver(draw).observe(rail,{attributes:true,attributeFilter:['class']});
    doc.addEventListener('xinyu:user-message',()=>{latest='';draw();});
    const more=doc.getElementById('advanced-actions'), utility=doc.querySelector('.utility-actions');
    const group=doc.createElement('section');group.className='advanced-actions-group compact-stage-tools';more?.append(group);
    const buttons=['pet-mode-btn','scene-btn','galgame-open'];
    const mq=root.matchMedia('(max-width:820px)');
    const arrange=()=>{for(const id of buttons){const button=doc.getElementById(id);if(button)(mq.matches?group:utility)?.append(button);}group.hidden=!mq.matches;};
    mq.addEventListener('change',arrange);arrange();
    // The dynamically loaded Galgame launcher can arrive after initial DOM readiness.
    new MutationObserver(()=>{if(mq.matches && buttons.some(id=>doc.getElementById(id)?.parentNode===utility))arrange();}).observe(utility,{childList:true});
  }
  if(root.document.readyState==='loading')root.document.addEventListener('DOMContentLoaded',()=>install());else install();
})(window);
