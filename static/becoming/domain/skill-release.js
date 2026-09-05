const SKILL_BY_ROUTE=Object.freeze({
  write:'writing',
  review:'writing',
  read:'reading',
  listen:'listening',
  speak:'speaking',
});

function byKey(skills=[]){
  return new Map(skills.map(item=>[item.key,item]));
}

export function skillAvailable(item,{internal=false}={}){
  if(!item)return false;
  return internal ? item.internal_available===true : item.public_available===true;
}

export function routeAvailable(route,skills,{internal=false}={}){
  if(route==='explore')return internal;
  const key=SKILL_BY_ROUTE[route];
  return !key || skillAvailable(byKey(skills).get(key),{internal});
}

export function applySkillNavigation(skills,{internal=false,root=document}={}){
  const registry=byKey(skills);
  root.querySelectorAll('[data-skill]').forEach(link=>{
    const hidden=!skillAvailable(registry.get(link.dataset.skill),{internal});
    link.hidden=hidden;
    link.classList.toggle('hidden',hidden);
  });
}
