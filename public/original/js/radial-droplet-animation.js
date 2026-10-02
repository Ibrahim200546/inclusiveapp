(function () {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const selector = '.radial-menu-container, .letter-circle-container';
    const timers = new WeakMap(); const animations = new WeakMap();
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('aria-hidden','true'); svg.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
    svg.innerHTML = '<defs><filter id="corex-radial-goo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/><feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -7" result="goo"/><feBlend in="SourceGraphic" in2="goo"/></filter></defs>'; document.body.appendChild(svg);
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
    function morph(menu) {
      if (reduced()) return;
      clearTimeout(timers.get(menu)); menu.classList.add('radial-droplet-morph');
      timers.set(menu,setTimeout(() => menu.classList.remove('radial-droplet-morph'),1100));
    }
    function mergedPosition(item, origin, scale) {
      // Legacy transform translations also shrink with individual scale.
      // Measure the small circle, rather than assuming its center stays fixed.
      const value = item.style.getPropertyValue('scale');
      const priority = item.style.getPropertyPriority('scale');
      item.style.setProperty('scale',String(scale),'important');
      const box = item.getBoundingClientRect();
      if (value) item.style.setProperty('scale',value,priority); else item.style.removeProperty('scale');
      return {translate:`${origin.x + origin.width/2 - box.x - box.width/2}px ${origin.y + origin.height/2 - box.y - box.height/2}px`,scale};
    }
    function enter(menu) {
      if (!menu.classList.contains('active') || !menu.closest('.screen')?.classList.contains('active') || reduced()) return;
      const center = menu.querySelector(':scope > .radial-center-btn, :scope > .center-circle');
      if (!center) return;
      animations.get(menu)?.forEach(animation => animation.cancel());
      const origin = center.getBoundingClientRect(); const next = [];
      morph(menu);
      menu.querySelectorAll(':scope > .radial-item, :scope > .option-circle').forEach((item,index) => {

        // Independent translate/scale preserve legacy !important transforms and final orbit geometry.


        next.push(item.animate([mergedPosition(item,origin,0.12),{translate:'0px 0px',scale:1}],{duration:650,delay:Math.min(index * 20,180),easing:'cubic-bezier(.22,.8,.3,1)',fill:'backwards'}));
      });
      animations.set(menu,next);
    }
    const toggles = new WeakMap();
    async function toggle(menu) {
      if (!menu) return;
      const running = toggles.get(menu);
      if (running) { running.next = !running.next; return; }
      const open = !menu.classList.contains('active');
      if (reduced()) { menu.classList.toggle('active',open); return; }
      const task = { next:open }; toggles.set(menu,task);
      animations.get(menu)?.forEach(animation => animation.cancel());
      const center = menu.querySelector(':scope > .radial-center-btn, :scope > .center-circle');
      const items = [...menu.querySelectorAll(':scope > .radial-item,:scope > .option-circle')];
      if (!center || !items.length) { menu.classList.toggle('active',open); toggles.delete(menu); return; }
      const properties = ['transition','display','opacity','transform','pointer-events'];
      const saved = items.map(item => ({ item, inert:item.inert, properties:properties.map(name => [name,item.style.getPropertyValue(name),item.style.getPropertyPriority(name)]) }));
      for (const item of items) { item.style.setProperty('transition','none','important'); item.style.setProperty('display','flex','important'); item.style.setProperty('opacity','1','important'); item.style.setProperty('pointer-events','none','important'); item.inert = true; }
      // Keep closing items in expanded geometry until they have reached the center.
      menu.classList.add('active'); void menu.offsetWidth;
      const origin = center.getBoundingClientRect(); morph(menu);
      center.setAttribute('aria-expanded',String(open));
      const motion = items.map((item,index) => {
        const transform = getComputedStyle(item).transform;
        item.style.setProperty('transform',transform,'important');
        
        const merged = mergedPosition(item,origin,0.08); const expanded = {translate:'0px 0px',scale:1};
        return item.animate(open ? [merged,expanded] : [expanded,merged],{duration:650,delay:open ? Math.min(index*18,150) : 0,easing:'cubic-bezier(.22,.8,.3,1)',fill:'both'});
      });
      animations.set(menu,motion);
      await Promise.allSettled(motion.map(animation => animation.finished));
      menu.classList.toggle('active',open);
      motion.forEach(animation => animation.cancel());
      for (const entry of saved) {
        for (const [name,value,priority] of entry.properties) if (name !== 'transition') { if (value) entry.item.style.setProperty(name,value,priority); else entry.item.style.removeProperty(name); }
        entry.item.inert = entry.inert;
      }
      void menu.offsetWidth;
      for (const entry of saved) { const [,value,priority] = entry.properties[0]; if (value) entry.item.style.setProperty('transition',value,priority); else entry.item.style.removeProperty('transition'); }
      toggles.delete(menu);
      if (task.next !== open && menu.closest('.screen')?.classList.contains('active')) void toggle(menu);
    }
    window.toggleMainMenu = () => { void toggle(document.getElementById('mainRadialMenu')); };
    window.toggleRadialGradeMenu = button => { void toggle(button.closest('.radial-menu-container')); };
    const observer = new MutationObserver(records => {
      for (const record of records) {
        const target = record.target;
        if (!(target instanceof Element)) continue;
        const wasActive = (record.oldValue || '').split(/\s+/).includes('active');
        if (record.type === 'attributes' && target.matches('.screen')) {
          if (!wasActive && target.classList.contains('active')) requestAnimationFrame(() => target.querySelectorAll(selector).forEach(enter));
          if (wasActive && !target.classList.contains('active')) target.querySelectorAll(selector).forEach(menu => animations.get(menu)?.forEach(animation => animation.cancel()));
        } else if (record.type === 'attributes' && target.matches(selector) && wasActive !== target.classList.contains('active')) morph(target);
        else if (record.type === 'childList' && record.addedNodes.length && target.matches(selector)) requestAnimationFrame(() => enter(target));
      }
    });
    document.querySelectorAll('.screen,' + selector).forEach(node => observer.observe(node,{attributes:true,attributeFilter:['class'],attributeOldValue:true,childList:true}));
    requestAnimationFrame(() => document.querySelectorAll('.screen.active ' + selector.split(',').join(', .screen.active ')).forEach(enter));
  });
})();
