'use strict';
/* 画面: 窓口ごとの記録(窓口名・担当者・次の予約・言われたこと・約束・次に確かめる日)
   ・places.v1 = [{ id, name, person, next:'YYYY-MM-DD'|'', told, promise, check:'YYYY-MM-DD'|'' }]
   ・カードをタップで開いて直す(1つのフォームを使い回す) */
(function(){
  window.SCREENS.register('madoguchi', {
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var rows = api.load('places.v1', []);
      function persist(list){ if(!api.save('places.v1', list)){ api.toast(T('common.storageFull')); return false; } rows = list; return true; }

      c.appendChild(api.el('h1', 'scr-title', T('screen.madoguchi.title')));
      c.appendChild(api.el('p', 'hint', T('screen.madoguchi.hint')));
      var addB = U.btn(api, 'primary wide', T('screen.madoguchi.addBtn'), function(){ openForm(null); });
      addB.id = 'madoguchi-add';
      c.appendChild(addB);
      var formBox = api.el('div'); formBox.id = 'madoguchi-form'; c.appendChild(formBox);
      var listBox = api.el('div'); listBox.id = 'madoguchi-list'; c.appendChild(listBox);

      function openForm(row){
        formBox.textContent = '';
        var isNew = !row;
        row = row || { id: U.uid(), name: '', person: '', next: '', told: '', promise: '', check: '' };
        var card = api.el('div', 'card');
        var name = U.input('text', T('screen.madoguchi.namePh'), row.name); name.id = 'madoguchi-f-name';
        var person = U.input('text', T('screen.madoguchi.personPh'), row.person); person.id = 'madoguchi-f-person';
        var next = U.input('date', '', row.next); next.id = 'madoguchi-f-next';
        var told = U.textarea(T('screen.madoguchi.toldPh'), row.told, 3); told.id = 'madoguchi-f-told';
        var promise = U.textarea(T('screen.madoguchi.promisePh'), row.promise, 2); promise.id = 'madoguchi-f-promise';
        var check = U.input('date', '', row.check); check.id = 'madoguchi-f-check';
        card.appendChild(U.field(api, T('screen.madoguchi.name'), name));
        card.appendChild(U.field(api, T('screen.madoguchi.person'), person));
        card.appendChild(U.field(api, T('screen.madoguchi.next'), next));
        card.appendChild(U.field(api, T('screen.madoguchi.told'), told));
        card.appendChild(U.field(api, T('screen.madoguchi.promise'), promise));
        card.appendChild(U.field(api, T('screen.madoguchi.check'), check));
        var btns = api.el('div', 'btn-row');
        var saveB = U.btn(api, 'primary', T('common.save'), function(){
          var rec = { id: row.id, name: String(name.value || '').trim(), person: String(person.value || '').trim(), next: next.value || '',
                      told: String(told.value || '').trim(), promise: String(promise.value || '').trim(), check: check.value || '' };
          var list = api.load('places.v1', []);
          if(isNew) list.push(rec); else list = list.map(function(x){ return x.id === rec.id ? rec : x; });
          if(!persist(list)) return;
          api.toast(T('common.saved')); formBox.textContent = ''; drawList();
        });
        saveB.id = 'madoguchi-f-save';
        btns.appendChild(saveB);
        btns.appendChild(U.btn(api, '', T('common.cancel'), function(){ formBox.textContent = ''; }));
        if(!isNew) btns.appendChild(U.delBtn(api, function(){
          if(!persist(api.load('places.v1', []).filter(function(x){ return x.id !== row.id; }))) return;
          api.toast(T('common.deleted')); formBox.textContent = ''; drawList();
        }));
        card.appendChild(btns);
        formBox.appendChild(card);
      }

      function line(parent, label, val){ if(val) parent.appendChild(api.el('div', 'hint', label + ': ' + val)); }
      function drawList(){
        listBox.textContent = '';
        if(!rows.length){ listBox.appendChild(api.el('p', 'empty', T('screen.madoguchi.empty'))); return; }
        rows.forEach(function(r){
          var card = api.el('div', 'card tappable');
          card.appendChild(api.el('div', 'item-title', r.name || T('screen.madoguchi.untitled')));
          line(card, T('screen.madoguchi.person'), r.person);
          line(card, T('screen.madoguchi.next'), r.next);
          line(card, T('screen.madoguchi.told'), r.told);
          line(card, T('screen.madoguchi.promise'), r.promise);
          line(card, T('screen.madoguchi.check'), r.check);
          api.Tap.bind(card, function(){ openForm(r); try{ formBox.scrollIntoView(); }catch(_){} });
          listBox.appendChild(card);
        });
      }
      drawList();
    }
  });
})();
