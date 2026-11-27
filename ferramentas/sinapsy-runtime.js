/* sinapsy-runtime.js
   Faz as ferramentas que nasceram no claude.ai funcionarem num site comum (GitHub Pages).
   Ele cria window.claude.use(nome) com as mesmas peças que as páginas já usavam:
     db        -> banco no Supabase (tabela "docs"), com collection()/doc()/onSnapshot()
     user      -> isOwner() = você está logado no painel; visitante = qualquer outra pessoa
     sample    -> IA (API da Anthropic) SÓ para você, com a chave guardada no seu navegador
     downloads -> baixa arquivos direto pelo navegador
   Precisa de: ferramentas/config.js antes deste arquivo, e o supabase-js (CDN). */
(function(){
  'use strict';
  var CFG = window.SINAPSY_CONFIG || {};
  var KEY_IA = 'sinapsy-anthropic-key';
  var configurado = !!(CFG.SUPABASE_URL && CFG.SUPABASE_ANON_KEY && window.supabase);
  var sb = configurado ? window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'sinapsy-auth' }
  }) : null;

  // ---------- sessão do dono ----------
  var sessaoPromise = sb ? sb.auth.getSession().then(function(r){ return (r && r.data && r.data.session) || null; }).catch(function(){ return null; }) : Promise.resolve(null);
  function isOwner(){ return sessaoPromise.then(function(s){ return !!s; }); }

  function uuid(){
    if (crypto.randomUUID) return crypto.randomUUID();
    var b = crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
    var h = Array.from(b, function(x){ return x.toString(16).padStart(2,'0'); }).join('');
    return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
  }
  function erro(code, message){ var e = new Error(message || code); e.code = code; return e; }
  function falhaDb(e){
    var msg = (e && e.message) || '';
    if (/row-level security|permission|42501/i.test(msg)) return erro('not_granted', msg);
    if (/too large|pg_column_size|check constraint/i.test(msg)) return erro('quota_exceeded', msg);
    return erro('db_error', msg || 'Falha no banco');
  }

  // ---------- db (formato parecido com o do claude.ai) ----------
  var ouvintes = {}; // col -> [fn]
  function avisar(col){ (ouvintes[col] || []).slice().forEach(function(fn){ try{ fn(); }catch(e){} }); }
  function snapDoc(id, row){
    var data = row ? (row.data || {}) : undefined;
    return { id: id, exists: !!row, data: function(){ return data; } };
  }
  function partes(path){
    var p = String(path).split('/').filter(Boolean);
    if (p.length !== 2) throw erro('bad_path', 'Caminho inválido: ' + path);
    return { col: p[0], id: p[1] };
  }
  function assinar(col, buscar, cb, onErr){
    var vivo = true;
    function rodar(){
      if (!vivo) return;
      buscar().then(function(s){ if (vivo) cb(s); }, function(e){ if (vivo && onErr) onErr(falhaDb(e)); });
    }
    (ouvintes[col] = ouvintes[col] || []).push(rodar);
    var t = setInterval(function(){ if (!document.hidden) rodar(); }, 30000);
    document.addEventListener('visibilitychange', function(){ if (!document.hidden) rodar(); });
    setTimeout(rodar, 0);
    return function(){ vivo = false; clearInterval(t); var l = ouvintes[col] || []; var i = l.indexOf(rodar); if (i >= 0) l.splice(i, 1); };
  }

  function docRef(col, id){
    return {
      id: id,
      get: function(){
        return sb.from('docs').select('id,data').eq('col', col).eq('id', id).maybeSingle()
          .then(function(r){ if (r.error) throw falhaDb(r.error); return snapDoc(id, r.data); });
      },
      set: function(data){
        return isOwner().then(function(own){
          var row = { col: col, id: id, data: data, updated_at: new Date().toISOString() };
          // Visitante só pode criar (nunca sobrescrever); o dono pode gravar por cima.
          var q = own ? sb.from('docs').upsert(row) : sb.from('docs').insert(row);
          return q.then(function(r){ if (r.error) throw falhaDb(r.error); avisar(col); });
        });
      },
      update: function(parcial){
        return sb.from('docs').select('data').eq('col', col).eq('id', id).maybeSingle().then(function(r){
          if (r.error) throw falhaDb(r.error);
          if (!r.data) throw erro('not_found', 'Documento não existe');
          var novo = Object.assign({}, r.data.data || {}, parcial);
          return sb.from('docs').update({ data: novo, updated_at: new Date().toISOString() }).eq('col', col).eq('id', id)
            .then(function(u){ if (u.error) throw falhaDb(u.error); avisar(col); });
        });
      },
      delete: function(){
        return sb.from('docs').delete().eq('col', col).eq('id', id)
          .then(function(r){ if (r.error) throw falhaDb(r.error); avisar(col); });
      },
      onSnapshot: function(cb, onErr){
        return assinar(col, function(){ return docRef(col, id).get(); }, cb, onErr);
      }
    };
  }
  function colRef(col){
    return {
      doc: function(id){ return docRef(col, id || uuid()); },
      add: function(data){ var ref = docRef(col, uuid()); return ref.set(data).then(function(){ return ref; }); },
      get: function(){
        return sb.from('docs').select('id,data').eq('col', col).order('created_at', { ascending: false }).limit(1000)
          .then(function(r){
            if (r.error) throw falhaDb(r.error);
            return { docs: (r.data || []).map(function(x){ return snapDoc(x.id, x); }), metadata: { fromCache: false } };
          });
      },
      onSnapshot: function(cb, onErr){ return assinar(col, function(){ return colRef(col).get(); }, cb, onErr); }
    };
  }
  var db = sb ? {
    collection: function(name){ return colRef(String(name)); },
    doc: function(path){ var p = partes(path); return docRef(p.col, p.id); }
  } : null;

  // ---------- códigos de acesso (valem nas 3 ferramentas; conferidos pelo banco) ----------
  function normCodigo(c){ return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
  var KEY_ACESSO = 'sinapsy-acesso-v3';
  var acesso = {
    norm: normCodigo,
    // true = vale; false = não existe ou desativado; null = não deu para conferir (sem internet)
    conferir: function(c){
      if (!sb) return Promise.resolve(null);
      if (normCodigo(c).length < 4) return Promise.resolve(false);
      return sb.rpc('sinapsy_codigo', { c: normCodigo(c) }).then(function(r){ return r.error ? null : r.data === true; }, function(){ return null; });
    },
    salvo: function(){ try{ return localStorage.getItem(KEY_ACESSO) || ''; }catch(e){ return ''; } },
    guardar: function(c){ try{ if (c) localStorage.setItem(KEY_ACESSO, normCodigo(c)); else localStorage.removeItem(KEY_ACESSO); }catch(e){} }
  };
  window.SinapsyAcesso = acesso;

  // ---------- user ----------
  var user = {
    isOwner: isOwner,
    canEdit: isOwner,
    // Visitante: um id novo a cada envio (cada envio vira um registro novo; ninguém sobrescreve ninguém).
    id: function(){ return sessaoPromise.then(function(s){ return s ? s.user.id : uuid(); }); }
  };

  // ---------- sample (IA só para o dono) ----------
  function chaveIA(){ try{ return localStorage.getItem(KEY_IA) || ''; }catch(e){ return ''; } }
  var sdkPromise = null;
  function sdk(){
    if (!sdkPromise) sdkPromise = import('https://esm.sh/@anthropic-ai/sdk').then(function(m){ return m.default || m.Anthropic; });
    return sdkPromise;
  }
  function mensagens(input){
    if (typeof input === 'string') return [{ role: 'user', content: input }];
    return (input || []).map(function(m){ return { role: m.role, content: String(m.content) }; });
  }
  var ESFORCO = { quick: 'low', 'default': 'medium', complex: 'high' };
  function perguntar(input, opts){
    opts = opts || {};
    var key = chaveIA();
    if (!key) return Promise.reject(erro('not_granted', 'Sem chave da API'));
    return sdk().then(function(Anthropic){
      var client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
      var stream = client.beta.messages.stream({
        model: CFG.MODELO_IA || 'claude-opus-5-5',
        max_tokens: 32000,
        output_config: { effort: ESFORCO[opts.modelTier] || 'medium' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        messages: mensagens(input)
      }, { signal: opts.signal });
      var acum = '';
      if (typeof opts.onText === 'function') stream.on('text', function(delta){ acum += delta; try{ opts.onText({ text: acum, delta: delta }); }catch(e){} });
      return stream.finalMessage();
    }).then(function(msg){
      if (msg.stop_reason === 'refusal') throw erro('refused', 'A IA recusou este pedido.');
      var text = (msg.content || []).filter(function(b){ return b.type === 'text'; }).map(function(b){ return b.text; }).join('');
      return { text: text, truncated: msg.stop_reason === 'max_tokens' };
    }).catch(function(e){
      if (e && e.code) throw e;
      if (opts.signal && opts.signal.aborted) throw erro('cancelled', 'Cancelado');
      if (e && (e.name === 'AbortError' || /abort/i.test(e.name || ''))) throw erro('cancelled', 'Cancelado');
      var st = e && e.status;
      if (st === 429 || st === 529) throw erro('rate_limited', 'Muitos pedidos');
      if (st === 401 || st === 403) throw erro('not_granted', 'Chave da API inválida');
      throw erro('sample_failed', (e && e.message) || 'Falha na IA');
    });
  }
  function extrairJson(t){
    var s = String(t || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try{ return JSON.parse(s); }catch(e){}
    var i = s.search(/[\[{]/), j = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (i >= 0 && j > i) { try{ return JSON.parse(s.slice(i, j + 1)); }catch(e){} }
    throw erro('bad_json', 'A IA não devolveu JSON válido');
  }
  function criarSample(){
    var f = function(input, opts){ return perguntar(input, opts); };
    f.json = function(input, opts){
      var extra = '\n\nResponda somente com JSON válido, sem texto antes ou depois e sem cercas de código.';
      var inp = typeof input === 'string' ? input + extra : input;
      return perguntar(inp, opts).then(function(r){ return extrairJson(r.text); });
    };
    f.limits = function(){ return Promise.resolve({ images: false }); };
    return f;
  }

  // ---------- downloads ----------
  var downloads = {
    save: function(o){
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      var url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = o.filename || 'arquivo'; document.body.appendChild(a); a.click();
      setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1500);
      return Promise.resolve();
    }
  };

  window.claude = {
    use: function(name){
      if (name === 'db') return Promise.resolve(db);
      if (name === 'user') return Promise.resolve(sb ? user : null);
      if (name === 'downloads') return Promise.resolve(downloads);
      if (name === 'sample') return sessaoPromise.then(function(s){ return (s && chaveIA()) ? criarSample() : null; });
      return Promise.resolve(null);
    }
  };
  // Para o painel do dono
  window.SinapsyAuth = {
    configurado: configurado,
    cliente: sb,
    sessao: function(){ return sessaoPromise; },
    entrar: function(email, senha){ return sb.auth.signInWithPassword({ email: email, password: senha }); },
    sair: function(){ return sb.auth.signOut(); },
    chaveIA: chaveIA,
    salvarChaveIA: function(k){ try{ if (k) localStorage.setItem(KEY_IA, k); else localStorage.removeItem(KEY_IA); }catch(e){} }
  };
  if (!configurado) console.warn('[SinapsyIA] Supabase não configurado: preencha ferramentas/config.js');
})();
