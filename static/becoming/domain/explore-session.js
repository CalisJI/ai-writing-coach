// Presentation continuity only. Never learner mastery or server-owned progress.
export function createExploreSession(storage, user, language){
  const key=`orena.explore.v1.${encodeURIComponent(user)}.${language}`;
  let value={saved:[],imports:[],responses:{},last:null};
  let available=true;
  try{
    const parsed=JSON.parse(storage.getItem(key)||'null');
    if(parsed && Array.isArray(parsed.saved) && Array.isArray(parsed.imports) && parsed.responses && typeof parsed.responses==='object'){
      value={saved:parsed.saved.filter(x=>typeof x==='string').slice(0,50),imports:parsed.imports.filter(x=>x?.origin==='imported'&&x.language===language&&Array.isArray(x.paragraphs)&&typeof x.title==='string').slice(0,20),responses:parsed.responses,last:typeof parsed.last==='string'?parsed.last:null};
    }
  }catch{available=false;}
  return {
    get value(){return value;},
    get available(){return available;},
    save(){try{storage.setItem(key,JSON.stringify(value));available=true;}catch{available=false;}return available;},
    toggle(id){value.saved=value.saved.includes(id)?value.saved.filter(x=>x!==id):[...value.saved,id].slice(-50);return this.save();},
    respond(id,text){value.responses[id]=String(text).slice(0,12000);return this.save();},
    enter(id){value.last=id;return this.save();},
    add(item){value.imports=[item,...value.imports].slice(0,20);return this.save();},
  };
}
