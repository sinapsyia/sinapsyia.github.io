// SinapsyIA: interações do site
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Ano no rodapé
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  // Cabeçalho com fundo ao rolar
  var header = document.querySelector('.header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 20); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // Menu mobile
  var menuBtn = document.getElementById('menuBtn');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Animação de entrada
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // Abas de exemplos (com navegação por teclado)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  // Rede de sinapses animada no hero
  var canvas = document.getElementById('synapse');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var nodes = [], w = 0, h = 0, dpr = 1, raf = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(90, (w * h) / 16000));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.8 + 1
      });
    }
    if (reduceMotion) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var maxD = 140;
    for (var i = 0; i < nodes.length; i++) {
      var a = nodes[i];
      for (var j = i + 1; j < nodes.length; j++) {
        var b = nodes[j];
        var dx = a.x - b.x, dy = a.y - b.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d < maxD) {
          var t = a.x / w;
          ctx.strokeStyle = 'rgba(' + Math.round(139 - 105 * t) + ',' + Math.round(92 + 119 * t) + ',' + Math.round(246 - 8 * t) + ',' + (1 - d / maxD) * 0.35 + ')';
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (var k = 0; k < nodes.length; k++) {
      var n = nodes[k];
      ctx.fillStyle = n.x / w < 0.5 ? 'rgba(167,139,250,.9)' : 'rgba(103,232,249,.9)';
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
    }
  }

  function step() {
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
    }
    draw();
    raf = requestAnimationFrame(step);
  }

  resize();
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  if (!reduceMotion) {
    // Pausa a animação quando o hero sai da tela (economiza bateria)
    var heroIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(step); }
      else { cancelAnimationFrame(raf); raf = null; }
    });
    heroIO.observe(canvas);
  }
})();
