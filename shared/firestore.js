(() => {
  'use strict';
  const config=HUCK_CONFIG, C=HuckCore;
  if(!config.firestore)return;
  const environment=config.environment;
  if(!/^[a-z0-9-]+$/.test(environment||''))throw Error('Invalid Firestore environment.');
  let confirmed=null,unsubscribe=null,consumer=null,onError=null;
  const readers=new Set();
  const initial=()=>{const s=C.initial();s.children[0].name='Test baby';return s;};
  const clone=s=>JSON.parse(JSON.stringify(s));
  const retryable=error=>['unavailable','deadline-exceeded','aborted','cancelled','resource-exhausted'].includes(String(error.code||'').replace('firestore/',''))||error.retryable;
  function failure(error){
    const code=String(error.code||'').replace('firestore/','');
    return Object.assign(Error(code==='permission-denied'?'Firestore access denied. Check database rules.':error.message||'Connection unavailable · showing saved data'),{code,retryable:Boolean(retryable(error))});
  }
  const ready=(async()=>{
    const [{initializeApp},sdk]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js')
    ]);
    const db=sdk.getFirestore(initializeApp(config.firestore,'huck-'+environment));
    const records=sdk.collection(db,'huckEnvironments',environment,'records');
    return {sdk,db,records,head:sdk.doc(records,'head'),receipts:sdk.collection(db,'huckEnvironments',environment,'commands')};
  })();
  // Avoid an unhandled import rejection before the app starts its first request.
  ready.catch(()=>{});
  function decode(snapshot){
    const head=snapshot.docs.find(d=>d.id==='head')?.data();
    if(!head){if(snapshot.size)throw Error('Firestore data is invalid. Restore the test database.');return initial();}
    if(head.schema!==1||!Array.isArray(head.children)||!head.children.some(c=>!c.archived)||!head.settings||!Number.isFinite(head.revision))throw Error('Firestore data is invalid. Restore the test database.');
    return {children:head.children,settings:head.settings,revision:head.revision,entries:snapshot.docs.filter(d=>d.id!=='head').map(d=>d.data().entry).sort((a,b)=>String(a.id).localeCompare(String(b.id)))};
  }
  function accept(state,notify=true){
    if(confirmed&&state.revision<confirmed.revision)return confirmed;
    confirmed=state;
    if(notify)consumer?.({ok:true,state:clone(state),backendVersion:'firestore-staging-v1'});
    for(const waiter of readers)waiter.resolve(clone(state));readers.clear();
    return state;
  }
  function rejectReaders(error){for(const waiter of readers)waiter.reject(error);readers.clear();}
  async function listen(){
    const {sdk,records}=await ready;if(unsubscribe||!consumer||document.hidden)return;
    unsubscribe=sdk.onSnapshot(records,{includeMetadataChanges:true},snapshot=>{
      if(snapshot.metadata.fromCache||snapshot.metadata.hasPendingWrites)return;
      try{accept(decode(snapshot));}catch(error){rejectReaders(error);onError?.(failure(error));}
    },error=>{unsubscribe=null;rejectReaders(failure(error));onError?.(failure(error));});
  }
  async function read(){
    const {sdk,records}=await ready;
    // A collection snapshot contains the head and sleeps at one consistent query snapshot.
    const state=decode(await sdk.getDocsFromServer(records));return clone(accept(state));
  }
  async function snapshot(){
    if(confirmed)return read();
    await ready;
    if(consumer&&!document.hidden){const waiting=new Promise((resolve,reject)=>readers.add({resolve,reject}));await listen();return waiting;}
    return read();
  }
  async function commit(command){
    const {sdk,db,head,records,receipts}=await ready;
    if(!/^[\w-]{1,100}$/.test(command.id||''))throw Error('Missing request ID.');
    const receipt=sdk.doc(receipts,command.id),fingerprint=JSON.stringify(command);
    for(let attempt=0;attempt<5;attempt++){
      const source=confirmed?clone(confirmed):await snapshot(),now=Date.now();
      try{
        const result=await sdk.runTransaction(db,async tx=>{
          const h=await tx.get(head),r=await tx.get(receipt);
          if(r.exists()){
            if(r.data().fingerprint!==fingerprint)throw Error('Request ID already used for a different change.');
            return null;
          }
          if((h.exists()?h.data().revision:0)!==source.revision)throw Object.assign(Error('State changed; retrying.'),{code:'state-moved'});
          // The UI derives forgotten-timer cleanup too; materialize it in this atomic write
          // without incrementing the revision before validating the user's command.
          const settled=C.settle(clone(source),now),next=C.apply(settled,command,now);
          const previous=new Map(source.entries.map(e=>[e.id,JSON.stringify(e)]));
          for(const entry of next.entries)if(previous.get(entry.id)!==JSON.stringify(entry))tx.set(sdk.doc(records,'entry_'+entry.id),{entry});
          tx.set(head,{schema:1,children:next.children,settings:next.settings,revision:next.revision,updatedAt:sdk.serverTimestamp()});
          tx.set(receipt,{fingerprint,type:command.type,revision:next.revision,receivedAt:sdk.serverTimestamp()});
          return next;
        });
        if(result){result.entries.sort((a,b)=>a.id.localeCompare(b.id));return clone(accept(result));}
        // A retry may have committed on another tab or before a connection was lost.
        return read();
      }catch(error){if(error.code!=='state-moved')throw error;await read();}
    }
    throw Object.assign(Error('Connection is busy. Saved changes will retry automatically.'),{retryable:true});
  }
  function watch(callback,error){consumer=callback;onError=error;listen().catch(e=>onError?.(failure(e)));}
  function pause(){unsubscribe?.();unsubscribe=null;}
  async function request(action,command){
    const start=performance.now();window.dispatchEvent(new CustomEvent('huck-backend-timing',{detail:{phase:'start',action,at:start}}));
    try{
      let state;
      if(action==='snapshot')state=await snapshot();
      else if(action==='command')state=await commit(command);
      else throw Error('Unknown action.');
      const result={ok:true,state,backendVersion:'firestore-staging-v1'};
      window.dispatchEvent(new CustomEvent('huck-backend-timing',{detail:{phase:'end',action,at:performance.now(),startedAt:start,ok:true}}));
      return result;
    }catch(error){
      window.dispatchEvent(new CustomEvent('huck-backend-timing',{detail:{phase:'end',action,at:performance.now(),startedAt:start,ok:false}}));
      if(retryable(error)||error instanceof TypeError)throw Object.assign(failure(error),{retryable:true});
      if(error.code)throw failure(error);
      return {ok:false,error:error.message};
    }
  }
  async function seedSamples(){
    const {sdk,db,head,records}=await ready,now=Date.now(),state=initial();state.revision=1;
    for(let i=0;i<84;i++){const end=now-(83-i)*4*3600000-30*60000;state.entries.push({id:'sample-'+String(i).padStart(3,'0'),childId:'avi',start:end-(45+i%4*15)*60000,end,rev:1,autoEnded:false,deleted:false,updatedAt:now});}
    await sdk.runTransaction(db,async tx=>{
      if((await tx.get(head)).exists())throw Error('Sample history can only be loaded into an empty staging database.');
      tx.set(head,{schema:1,children:state.children,settings:state.settings,revision:1,synthetic:true,updatedAt:sdk.serverTimestamp()});
      for(const entry of state.entries)tx.set(sdk.doc(records,'entry_'+entry.id),{entry});
    });
    accept(state);
    return read();
  }
  window.HuckFirestore={request,watch,pause,resume:()=>listen().catch(e=>onError?.(failure(e))),seedSamples};
})();
