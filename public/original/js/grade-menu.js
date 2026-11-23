(function () {
  'use strict';
  const tr = (kk, ru) => window.getProfileLang?.() === 'ru' ? ru : kk;
  function initialize() {
    const grades = window.CorexGrades, refreshers = [];
    const soundMenu = document.querySelector('#grade0SoundsMenu .radial-menu-container');
    // Keep upstream graded listening metadata and access, but route lessons through
    // the single-orbit topic hierarchy instead of restoring five-item pagination.
    for (const [category, definition] of Object.entries(window.CorexGradeSounds.categories)) {
      const control = soundMenu.querySelector(`[onclick*="'${definition.screen}'"]`);
      if (!control) continue;
      control.dataset.soundCategory = category; control.setAttribute('data-i18n-managed', 'true');
      const update = () => { control.querySelector('p').textContent = category === 'instruments' ? tr('Аспаптар', 'Инструменты') : tr(...definition.labels); control.setAttribute('aria-label', tr(...definition.labels)); control.querySelector('div').textContent = definition.icon; };
      update(); refreshers.push(update);
    }
    const voice = document.createElement('button'); voice.type = 'button'; voice.className = 'radial-item';
    voice.dataset.catalogTarget = 'voicePresenceScreen'; voice.dataset.junior = 'true'; voice.setAttribute('data-i18n-managed','true');
    const picture=document.createElement('div'), caption=document.createElement('p'); picture.textContent='🗣️'; voice.append(picture,caption);
    const updateVoice=()=>{caption.textContent=tr('Дауыс бар ма?','Есть ли голос?');voice.setAttribute('aria-label',caption.textContent);};updateVoice();refreshers.push(updateVoice);
    voice.addEventListener('click',()=>window.showScreen('voicePresenceScreen'));soundMenu.append(voice);
    const back=document.querySelector('#grade0SoundsMenu button[onclick*="grade0Menu"]');
    if(back){back.removeAttribute('onclick');back.addEventListener('click',()=>window.showScreen(grades.parent));}
    for(const control of soundMenu.querySelectorAll('.radial-item[onclick]:not([data-sound-category])'))control.dataset.junior='true';
    let language=window.getProfileLang?.();
    window.addEventListener('profile-language-change',()=>{const next=window.getProfileLang?.();if(next===language)return;language=next;refreshers.forEach(fn=>fn());});
    const show=window.showScreen;
    window.showScreen=function(id){
      if(id==='grade0DauyspenmMenu'){
        const menu=document.querySelector('#'+id+' .radial-menu-container');menu?.classList.add('active');menu?.querySelector('.radial-center-btn')?.setAttribute('aria-expanded','true');
      }
      return show(id);
    };
  }
  document.addEventListener('DOMContentLoaded',initialize);
})();
