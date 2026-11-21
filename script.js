// SinapsyIA: interações do site
(function () {
  'use strict';

  // =========================================================
  // CONFIGURAÇÃO DE CONTATO
  // Coloque o número do WhatsApp com DDI + DDD, só números.
  // Exemplo: '5581999999999'
  // Enquanto estiver vazio, o site usa apenas o Instagram.
  // =========================================================
  var WHATSAPP = '';
  var WHATSAPP_MSG = 'Olá! Vim pelo site da SinapsyIA e quero agendar meu diagnóstico gratuito de IA.';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Contato (WhatsApp principal, Instagram alternativo) ----------
  var waNumber = WHATSAPP.replace(/\D/g, '');
  if (waNumber) {
    var waLink = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(WHATSAPP_MSG);
    document.querySelectorAll('[data-whatsapp]').forEach(function (a) {
      a.href = waLink;
      a.hidden = false;
    });
    document.querySelectorAll('[data-whatsapp-item]').forEach(function (el) { el.hidden = false; });
    // Botões principais passam a abrir o WhatsApp
    document.querySelectorAll('[data-contact]').forEach(function (a) { a.href = waLink; });
    document.querySelectorAll('[data-contact-icon] use').forEach(function (u) { u.setAttribute('href', '#i-wa'); });
    document.querySelectorAll('[data-contact-icon]').forEach(function (s) { s.classList.add('ico--fill'); });
  } else {
    // Sem WhatsApp: o botão do Instagram vira o principal no CTA final
    var igCta = document.querySelector('[data-ig-cta]');
    if (igCta) { igCta.classList.remove('btn--glass'); igCta.classList.add('btn--light'); }
  }

  // ---------- Ano no rodapé ----------
  var ano = document.getElementById('ano');
  if (ano) ano.textContent = new Date().getFullYear();

  // ---------- Cabeçalho com fundo ao rolar ----------
  var header = document.querySelector('.header');
  function onScroll() { header.classList.toggle('is-scrolled', window.scrollY > 20); }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  // ---------- Menu mobile ----------
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
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); setTools(false); } });

  // ---------- Menu "Ferramentas" ----------
  var tools = document.getElementById('tools');
  var toolsBtn = document.getElementById('toolsBtn');
  function setTools(open) {
    if (!tools) return;
    tools.classList.toggle('is-open', open);
    toolsBtn.setAttribute('aria-expanded', String(open));
  }
  if (tools) {
    toolsBtn.addEventListener('click', function (e) { e.stopPropagation(); setTools(!tools.classList.contains('is-open')); });
    document.addEventListener('click', function (e) { if (!tools.contains(e.target)) setTools(false); });
    tools.addEventListener('click', function (e) { if (e.target.closest('a')) setTools(false); });
  }

  // ---------- Animação de entrada ----------
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  // ---------- Abas de exemplos (com teclado) ----------
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

  // ---------- Demo do agente no hero ----------
  var demoBody = document.getElementById('demoBody');
  var demoName = document.getElementById('demoName');
  var demoTag = document.getElementById('demoTag');
  var demoTime = document.querySelector('.demo__time');

  var scenarios = [
    {
      name: 'Agente da Clínica', tag: 'Agendamento automático', time: '23:47',
      msgs: [
        ['in', 'Oi! Tem horário pra limpeza de pele essa semana?'],
        ['out', 'Olá! 😊 Temos quinta às 14h ou sexta às 10h. Qual fica melhor?'],
        ['in', 'Sexta às 10h'],
        ['out', 'Prontinho, agendado! Te mando um lembrete na véspera ✅']
      ]
    },
    {
      name: 'Agente da Loja', tag: 'Venda no domingo', time: '08:12',
      msgs: [
        ['in', 'Esse tênis tem no 40? Chega até sábado?'],
        ['out', 'Tem sim, no preto e no branco! Comprando hoje, chega na sexta 🚚'],
        ['in', 'Quero o preto'],
        ['out', 'Aqui está o link 👉 Com o cupom BEMVINDO o frete sai grátis!']
      ]
    },
    {
      name: 'Agente da Imobiliária', tag: 'Lead qualificado', time: '21:05',
      msgs: [
        ['in', 'O apê de 2 quartos do anúncio ainda está disponível?'],
        ['out', 'Está sim! Separei mais 2 opções na mesma região. Quer visitar?'],
        ['in', 'Sábado de manhã'],
        ['out', 'Visita marcada sábado às 10h com o corretor Lucas 📍']
      ]
    }
  ];

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function typing(dir) {
    var t = el('div', 'typing' + (dir === 'out' ? ' typing--out' : ''));
    t.innerHTML = '<span></span><span></span><span></span>';
    return t;
  }

  var demoVisible = true;
  if (demoBody && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) { demoVisible = entries[0].isIntersecting; }).observe(demoBody);
  }
  function whenVisible() {
    return new Promise(function (resolve) {
      (function check() {
        if (demoVisible && !document.hidden) resolve();
        else setTimeout(check, 400);
      })();
    });
  }

  async function playDemo() {
    var i = 0;
    await wait(2600); // primeira conversa já aparece pronta
    while (true) {
      i = (i + 1) % scenarios.length;
      var s = scenarios[i];
      await whenVisible();
      demoBody.style.opacity = '0';
      await wait(300);
      demoBody.innerHTML = '';
      demoBody.style.opacity = '1';
      demoName.textContent = s.name;
      demoTag.textContent = s.tag;
      demoTime.textContent = s.time;
      for (var m = 0; m < s.msgs.length; m++) {
        var dir = s.msgs[m][0];
        var t = typing(dir);
        demoBody.appendChild(t);
        await wait(dir === 'out' ? 1200 : 800);
        t.remove();
        demoBody.appendChild(el('p', 'msg msg--' + dir + ' is-new', s.msgs[m][1]));
        await wait(650);
      }
      await wait(3200);
    }
  }
  if (demoBody && !reduceMotion && window.Promise) {
    demoBody.style.transition = 'opacity .3s';
    playDemo();
  }

  // ---------- Rede de sinapses animada no hero ----------
  var canvas = document.getElementById('synapse');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var nodes = [], w = 0, h = 0, dpr = 1, raf = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var count = Math.round(Math.min(80, (w * h) / 18000));
    nodes = [];
    for (var i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 1.6 + 0.8
      });
    }
    if (reduceMotion) draw();
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    var maxD = 150;
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
    var heroIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { if (!raf) raf = requestAnimationFrame(step); }
      else { cancelAnimationFrame(raf); raf = null; }
    });
    heroIO.observe(canvas);
  }
})();
