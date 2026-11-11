'use strict';
/* 画面: 薬の一覧(名前+メモ)
   ・meds.v1 = [{ id, name, note }]
   ・「自分の判断でやめたり量を変えたりしないでください」を常時表示。「次に飲めるのは何時」「飲んだ時刻」は出さない・持たない
   ・もしもカードのバックアップJSON({ app:"moshimo_card", card:{ fields:{ meds:"..." } } })を読んで初期値にする(書き戻しはしない)
     meds は自由文なので 1行を1件にする。1行しかないときだけ、かっこの外の「、」「，」「,」で分ける
     (「・」「/」は「朝・夕」「5mg/日」のように1つの薬の中でも使うので分けない)
   ・行の「なおす」で名前とメモを直す・けす
   ・書きかけ(2026-11-11・ホームの draft.homeAdd と同じ形): 書くたびに残し、言語切替・下ナビ・再読み込みで描き直しても字を戻す
     draft.kusuriAdd = { name, note } 上の「たす」欄。たす で消す。両方 空にしたら消す
     draft.kusuriEdit = { <薬の id>: { name, note } } なおしている行(どの行か も戻す)。その行の ほぞん・やめる・けす で消す。
       戻るボタン(やめる と同じ)は なおす行を全部閉じるので全部消す。元の中身と同じに戻したら その行の分を消す */
(function(){
  var OPEN = '(（[［', CLOSE = ')）]］';
  /* 1行を、かっこの外にある読点・カンマで分ける(数字にはさまれた「,」= 1,000 などは分けない) */
  function splitLine(s){
    var out = [], cur = '', depth = 0;
    for(var i = 0; i < s.length; i++){
      var ch = s.charAt(i);
      if(OPEN.indexOf(ch) >= 0) depth++;
      else if(CLOSE.indexOf(ch) >= 0 && depth > 0) depth--;
      var comma = (ch === '、' || ch === '，' || (ch === ',' && !(/\d/.test(s.charAt(i - 1)) && /\d/.test(s.charAt(i + 1)))));
      if(comma && depth === 0){ out.push(cur); cur = ''; continue; }
      cur += ch;
    }
    out.push(cur);
    return out;
  }
  function splitMeds(s){
    var lines = String(s || '').split(/[\r\n]+/).map(function(x){ return x.trim(); }).filter(Boolean);
    if(lines.length === 1) lines = splitLine(lines[0]);
    return lines.map(function(x){ return x.trim(); }).filter(Boolean);
  }
  /* もしもカードの控えから薬の名前を取り出す。形が違えば null */
  function medsFromMoshimo(obj){
    if(!obj || obj.app !== 'moshimo_card') return null;
    var card = obj.card || (obj.data && obj.data['card.v1']) || null;
    var fields = card && card.fields;
    if(!fields || typeof fields !== 'object') return null;
    return splitMeds(fields.meds);
  }

  var stage = null;   // 戻るボタン(Play版): 画面の中の段を1つ戻す(描くたびに作り直す)
  var DRAFT_ADD = 'draft.kusuriAdd', DRAFT_EDIT = 'draft.kusuriEdit';
  function isObj(v){ return !!v && typeof v === 'object' && !Array.isArray(v); }

  window.SCREENS.register('kusuri', {
    /* 戻るボタン(Play版・2026-09-29): なおしている行を閉じる(やめる と同じ・保存しない) */
    back: function(api){ return stage ? stage(api) : false; },
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var rows = U.list(api, 'meds.v1');
      function persist(list){ if(!api.save('meds.v1', list)){ api.toast(T('common.storageFull')); return false; } rows = list; return true; }

      c.appendChild(api.el('h1', 'scr-title', T('screen.kusuri.title')));
      var warn = api.el('p', 'note', T('screen.kusuri.warn'));
      warn.id = 'kusuri-warn';
      c.appendChild(warn);
      c.appendChild(api.el('p', 'hint', T('screen.kusuri.hint')));

      /* 追加 */
      var card = api.el('div', 'card');
      var da = api.load(DRAFT_ADD, null);
      if(!isObj(da)) da = {};
      var name = U.input('text', T('screen.kusuri.namePh'), typeof da.name === 'string' ? da.name : ''); name.id = 'kusuri-f-name';
      var memo = U.input('text', T('screen.kusuri.notePh'), typeof da.note === 'string' ? da.note : ''); memo.id = 'kusuri-f-note';
      function keepAdd(){
        if(!name.value && !memo.value) api.remove(DRAFT_ADD);
        else api.save(DRAFT_ADD, { name: name.value, note: memo.value });
      }
      name.addEventListener('input', keepAdd);
      memo.addEventListener('input', keepAdd);
      card.appendChild(U.field(api, T('screen.kusuri.name'), name));
      card.appendChild(U.field(api, T('screen.kusuri.note'), memo));
      var addB = U.btn(api, 'primary wide', T('screen.kusuri.addBtn'), function(){
        var n = String(name.value || '').trim();
        if(!n){ api.toast(T('screen.kusuri.needName')); return; }
        var list = U.list(api, 'meds.v1');
        list.push({ id: U.uid(), name: n, note: String(memo.value || '').trim() });
        if(!persist(list)) return;
        name.value = ''; memo.value = ''; api.remove(DRAFT_ADD); api.toast(T('common.saved')); drawList();
      });
      /* 一覧を描き直すと なおす行は閉じる: 上の「たす」欄にも書きかけが無ければ、戻るボタンの確かめは要らない */
      function settle(){ if(!String(name.value || '') && !String(memo.value || '')) api.markSaved(); }
      addB.id = 'kusuri-add';
      card.appendChild(addB);
      c.appendChild(card);

      var listBox = api.el('div'); listBox.id = 'kusuri-list'; c.appendChild(listBox);
      function editDrafts(){ var e = api.load(DRAFT_EDIT, null); return isObj(e) ? e : {}; }
      function setEdit(id, val){
        var e = editDrafts();
        if(val) e[id] = val; else delete e[id];
        if(Object.keys(e).length) api.save(DRAFT_EDIT, e); else api.remove(DRAFT_EDIT);
      }
      function drawList(){
        listBox.textContent = '';
        settle();
        if(!rows.length){ api.remove(DRAFT_EDIT); listBox.appendChild(api.el('p', 'empty', T('screen.kusuri.empty'))); return; }
        var ul = api.el('ul', 'list');
        var byId = {};
        rows.forEach(function(r){
          var li = api.el('li');
          li.setAttribute('data-id', r.id);
          var g = api.el('div', 'grow');
          g.appendChild(api.el('div', 'item-title', r.name));
          if(r.note) g.appendChild(api.el('div', 'hint', r.note));
          li.appendChild(g);
          li.appendChild(U.btn(api, 'small', T('common.edit'), function(){ openEdit(li, r); }));
          ul.appendChild(li);
          byId[r.id] = { li: li, r: r };
        });
        listBox.appendChild(ul);
        /* なおしている行の書きかけがあれば、その行を開き直す(行が もう無ければ書きかけは捨てる) */
        var ed = editDrafts(), pruned = false, firstIn = null;
        Object.keys(ed).forEach(function(id){
          var x = byId[id], d = ed[id];
          if(!x || !isObj(d)){ delete ed[id]; pruned = true; return; }
          var inp = openEdit(x.li, x.r, { name: typeof d.name === 'string' ? d.name : '', note: typeof d.note === 'string' ? d.note : '' });
          if(!firstIn) firstIn = inp;
        });
        if(pruned){ if(Object.keys(ed).length) api.save(DRAFT_EDIT, ed); else api.remove(DRAFT_EDIT); }
        /* 描き直した なおす行にも字がある=戻るボタン(Play版)で閉じるときは確かめる(描き直しで消えた印を付け直す) */
        if(firstIn){ try{ firstIn.dispatchEvent(new Event('input', { bubbles:true })); }catch(_){} }
      }
      /* その場で直す(名前+メモ)・けす。dr = 書きかけから戻すときの中身。名前の欄を返す */
      function openEdit(li, r, dr){
        li.textContent = '';
        var box = api.el('div', 'grow');
        var on = r.name == null ? '' : String(r.name), oo = r.note == null ? '' : String(r.note);
        var n = U.input('text', T('screen.kusuri.namePh'), dr ? dr.name : on); n.className = 'kusuri-e-name';
        var m = U.input('text', T('screen.kusuri.notePh'), dr ? dr.note : oo); m.className = 'kusuri-e-note';
        function keepEdit(){
          if(n.value === on && m.value === oo) setEdit(r.id, null);
          else setEdit(r.id, { name: n.value, note: m.value });
        }
        n.addEventListener('input', keepEdit);
        m.addEventListener('input', keepEdit);
        box.appendChild(U.field(api, T('screen.kusuri.name'), n));
        box.appendChild(U.field(api, T('screen.kusuri.note'), m));
        var row = api.el('div', 'btn-row');
        var saveB = U.btn(api, 'primary', T('common.save'), function(){
          var nv = String(n.value || '').trim();
          if(!nv){ api.toast(T('screen.kusuri.needName')); return; }
          var list = U.list(api, 'meds.v1').map(function(x){ return x.id === r.id ? { id: x.id, name: nv, note: String(m.value || '').trim() } : x; });
          if(!persist(list)) return;
          setEdit(r.id, null);
          api.toast(T('common.saved')); drawList();
        });
        saveB.className = 'btn primary kusuri-e-save';
        row.appendChild(saveB);
        row.appendChild(U.btn(api, '', T('common.cancel'), function(){ setEdit(r.id, null); drawList(); }));
        var delB = U.delBtn(api, function(){
          if(!persist(U.list(api, 'meds.v1').filter(function(x){ return x.id !== r.id; }))) return;
          setEdit(r.id, null);
          api.toast(T('common.deleted')); drawList();
        });
        delB.className = 'btn danger kusuri-e-del';
        row.appendChild(delB);
        box.appendChild(row);
        li.appendChild(box);
        return n;
      }
      drawList();
      /* 描き直した「たす」欄にも字がある=戻るボタン(Play版)で離れるときは確かめる(描き直しで消えた印を付け直す) */
      if(String(name.value || '') || String(memo.value || '')){ try{ name.dispatchEvent(new Event('input', { bubbles:true })); }catch(_){} }
      stage = function(){
        /* なおす行が無い=戻るボタンで画面を離れる。「たす」欄に字があれば確かめの窓で「すてて もどる」を選んだので、書きかけも捨てる */
        if(!listBox.querySelector('input')){ api.remove(DRAFT_ADD); return false; }
        api.remove(DRAFT_EDIT);   // やめる と同じ(なおす行を全部閉じる)
        drawList();
        /* 確かめの窓で OK すると書きかけの印は消えるが、上の「たす」欄の字は残っている(閉じたのは なおす行だけ)。
           印を付け直して、次の戻るで画面を離れるときも確かめる(点検 2026-09-29: 付け直さないと「たす」欄の字が確かめなしで消えた) */
        if(String(name.value || '') || String(memo.value || '')){ try{ name.dispatchEvent(new Event('input', { bubbles:true })); }catch(_){} }
        return true;
      };

      /* もしもカードの控えから読み込む(file input だけネイティブイベント) */
      c.appendChild(api.el('h2', 'sec-h', T('screen.kusuri.importBtn')));
      c.appendChild(api.el('p', 'hint', T('screen.kusuri.importHint')));
      var file = document.createElement('input');
      file.type = 'file'; file.accept = 'application/json,.json'; file.className = 'hidden'; file.id = 'kusuri-file';
      file.addEventListener('change', function(e){
        var f = e.target.files && e.target.files[0];
        if(!f) return;
        var r = new FileReader();
        r.onload = function(){
          try{
            var names = medsFromMoshimo(JSON.parse(r.result));
            if(names === null){ api.toast(T('screen.kusuri.importFail')); return; }
            if(!names.length){ api.toast(T('screen.kusuri.importNone')); return; }
            var list = U.list(api, 'meds.v1');
            var have = {}; list.forEach(function(x){ have[x.name] = true; });
            var added = 0;
            names.forEach(function(n){ if(!have[n]){ list.push({ id: U.uid(), name: n, note: '' }); have[n] = true; added++; } });
            if(!added){ api.toast(T('screen.kusuri.importDup')); return; }
            if(!persist(list)) return;
            api.toast(U.fmt(T('screen.kusuri.imported'), { n: added })); drawList();
          }catch(err){ api.toast(T('screen.kusuri.importFail')); }
        };
        r.readAsText(f);
        e.target.value = '';
      });
      var impB = U.btn(api, 'wide', T('screen.kusuri.importBtn'), function(){ file.click(); });
      impB.id = 'kusuri-import';
      c.appendChild(impB);
      c.appendChild(file);
    }
  });
})();
