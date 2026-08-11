import {icon} from './components/icons.js';
import {t} from './domain/i18n.js';

const THEME_KEY='becoming.theme.v1';
const PALETTE_KEY='becoming.palette.v1';
const PALETTES=['editorial','sage','clay','blueprint'];

function systemTheme(){
  return window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';
}

export function storedTheme(){
  const saved=localStorage.getItem(THEME_KEY);
  return saved==='dark'||saved==='light'?saved:null;
}

export function storedPalette(){
  const saved=localStorage.getItem(PALETTE_KEY);
  return PALETTES.includes(saved)?saved:null;
}

export function activeTheme(){
  return document.documentElement.dataset.theme || storedTheme() || 'light';
}

export function activePalette(){
  const value=document.documentElement.dataset.palette||storedPalette()||'editorial';
  return PALETTES.includes(value)?value:'editorial';
}

export function applyPalette(palette,{persist=false}={}){
  const resolved=PALETTES.includes(palette)?palette:'editorial';
  document.documentElement.dataset.palette=resolved;
  if(persist)localStorage.setItem(PALETTE_KEY,resolved);
  window.dispatchEvent(new CustomEvent('becoming:palette-changed',{detail:{palette:resolved}}));
  return resolved;
}

export function applyTheme(theme,{persist=false}={}){
  const resolved=theme==='dark'?'dark':'light';
  document.documentElement.dataset.theme=resolved;
  if(persist)localStorage.setItem(THEME_KEY,resolved);

  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta){
    const palette=activePalette();
    const light={
      editorial:'#F7F7F5',
      sage:'#F3F6F1',
      clay:'#F8F3EE',
      blueprint:'#F2F5F7',
    };
    const dark={
      editorial:'#111310',
      sage:'#111611',
      clay:'#17120F',
      blueprint:'#10151A',
    };
    meta.content=(resolved==='dark'?dark:light)[palette]||'#F7F7F5';
  }

  const button=document.getElementById('themeButton');
  if(button){
    const label=resolved==='dark'?t('theme.switch_light'):t('theme.switch_dark');
    button.innerHTML=icon(resolved==='dark'?'sun':'moon')+`<span class="sr-only">${label}</span>`;
    button.setAttribute('aria-label',label);
    button.title=label;
  }

  window.dispatchEvent(new CustomEvent('becoming:theme-changed',{detail:{theme:resolved}}));
}

export function toggleTheme(){
  applyTheme(activeTheme()==='dark'?'light':'dark',{persist:true});
}

export function installTheme(){
  applyPalette(storedPalette()||'editorial');
  // BECOMING is light-first by brand. Dark remains an explicit display preference.
  applyTheme(storedTheme()||'light');

  const button=document.getElementById('themeButton');
  button?.addEventListener('click',toggleTheme);

}

export const THEME_PALETTES=[...PALETTES];
