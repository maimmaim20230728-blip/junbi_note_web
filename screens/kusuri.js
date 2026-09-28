'use strict';
/* 画面: 薬の一覧(名前+メモ)
   ・meds.v1 = [{ id, name, note }]
   ・「自分の判断でやめたり量を変えたりしないでください」を常時表示。「次に飲めるのは何時」「飲んだ時刻」は出さない・持たない
   ・もしもカードのバックアップJSON({ app:"moshimo_card", card:{ fields:{ meds:"..." } } })を読んで初期値にする(書き戻しはしない)
     meds は自由文なので 改行・「、」「,」「/」「・」で分けて1件ずつにする */
(function(){
  function splitMeds(s){
    return String(s || '').split(/[\n\r、,，\/／・]+/).map(function(x){ return x.trim(); }).filter(Boolean);
  }
  /* もしもカードの控えから薬の名前を取り出す。形が違えば null */
  function medsFromMoshimo(obj){
    if(!obj || obj.app !== 'moshimo_card') return null;
    var card = obj.card || (obj.data && obj.data['card.v1']) || null;
    var fields = card && card.fields;
    if(!fields || typeof fields !== 'object') return null;
    return splitMeds(fields.meds);
  }

  window.SCREENS.register('kusuri', {
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var rows = api.load('meds.v1', []);
      function persist(list){ if(!api.save('meds.v1', list)){ api.toast(T('common.storageFull')); return false; } rows = list; return true; }

      c.appendChild(api.el('h1', 'scr-title', T('screen.kusuri.title')));
      var warn = api.el('p', 'note', T('screen.kusuri.warn'));
      warn.id = 'kusuri-warn';
      c.appendChild(warn);
      c.appendChild(api.el('p', 'hint', T('screen.kusuri.hint')));

      /* 追加 */
      var card = api.el('div', 'card');
      var name = U.input('text', T('screen.kusuri.namePh'), ''); name.id = 'kusuri-f-name';
      var memo = U.input('text', T('screen.kusuri.notePh'), ''); memo.id = 'kusuri-f-note';
      card.appendChild(U.field(api, T('screen.kusuri.name'), name));
      card.appendChild(U.field(api, T('screen.kusuri.note'), memo));
      var addB = U.btn(api, 'primary wide', T('screen.kusuri.addBtn'), function(){
        var n = String(name.value || '').trim();
        if(!n) return;
        var list = api.load('meds.v1', []);
        list.push({ id: U.uid(), name: n, note: String(memo.value || '').trim() });
        if(!persist(list)) return;
        name.value = ''; memo.value = ''; api.toast(T('common.saved')); drawList();
      });
      addB.id = 'kusuri-add';
      card.appendChild(addB);
      c.appendChild(card);

      var listBox = api.el('div'); listBox.id = 'kusuri-list'; c.appendChild(listBox);
      function drawList(){
        listBox.textContent = '';
        if(!rows.length){ listBox.appendChild(api.el('p', 'empty', T('screen.kusuri.empty'))); return; }
        var ul = api.el('ul', 'list');
        rows.forEach(function(r){
          var li = api.el('li');
          var g = api.el('div', 'grow');
          g.appendChild(api.el('div', 'item-title', r.name));
          if(r.note) g.appendChild(api.el('div', 'hint', r.note));
          li.appendChild(g);
          li.appendChild(U.delBtn(api, function(){
            if(!persist(api.load('meds.v1', []).filter(function(x){ return x.id !== r.id; }))) return;
            api.toast(T('common.deleted')); drawList();
          }));
          ul.appendChild(li);
        });
        listBox.appendChild(ul);
      }
      drawList();

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
            var list = api.load('meds.v1', []);
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
