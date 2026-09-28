'use strict';
/* 画面: ホーム
   ・表紙の1行(だれのことを書くか) = api.load('note.v1').who
   ・最上段「いま つたえたい ことを 1つ たす」= items.v1 に追加(1行+任意の詳しい説明)
   ・大ボタン: 1枚 / はじめて行くときの1枚 / 年表 / 窓口 / 薬
   ・制度の説明は困りごと制度ガイド(外部リンク・別タブ)へ。免責(手帳ではない・医療的判断や診断はしない)を常時表示 */
(function(){
  var GUIDE_URL = 'https://maimmaim20230728-blip.github.io/seido_guide_web/';

  window.SCREENS.register('home', {
    render: function(c, api){
      var U = window.JUNBI_UI, T = api.T;
      var note = U.obj(api, 'note.v1', { who:'' });
      var items = U.list(api, 'items.v1');

      c.appendChild(api.el('h1', 'scr-title', T('screen.home.title')));
      c.appendChild(api.el('p', 'tagline', T('app.tagline')));

      /* --- いま つたえたい ことを 1つ たす(最上段) --- */
      var add = api.el('div', 'card add-card');
      add.appendChild(api.el('h2', 'sec-h first', T('screen.home.addTitle')));
      var title = U.input('text', T('screen.home.addPh'), '');
      title.id = 'home-add-title';
      var detail = U.textarea(T('screen.home.detailPh'), '', 2);
      detail.id = 'home-add-detail';
      add.appendChild(U.field(api, null, title));
      add.appendChild(U.field(api, null, detail));
      var addBtn = U.btn(api, 'primary wide', T('screen.home.addBtn'), function(){
        var t = String(title.value || '').trim();
        if(!t){ api.toast(T('screen.home.needTitle')); return; }
        var list = U.list(api, 'items.v1');
        list.push({ id: U.uid(), title: t, detail: String(detail.value || '').trim(), created: Date.now() });
        if(!api.save('items.v1', list)){ api.toast(T('common.storageFull')); return; }
        title.value = ''; detail.value = '';
        api.toast(T('screen.home.added'));
        countEl.textContent = U.fmt(T('screen.home.count'), { n: list.length });
      });
      addBtn.id = 'home-add-btn';
      add.appendChild(addBtn);
      var countEl = api.el('p', 'hint', U.fmt(T('screen.home.count'), { n: items.length }));
      countEl.id = 'home-count';
      add.appendChild(countEl);
      c.appendChild(add);

      /* --- 大ボタン --- */
      function big(id, ico, label, scr, primary){
        var b = api.el('button', 'big-btn' + (primary ? ' primary' : ''));
        b.id = id;
        b.appendChild(api.el('span', 'ico', ico));
        b.appendChild(api.el('span', 'lbl', label));
        api.Tap.bind(b, function(){ api.go(scr); });
        return b;
      }
      c.appendChild(big('home-go-ichimai', '📄', T('screen.home.goList'), 'ichimai', true));
      c.appendChild(big('home-go-shokai', '🆕', T('screen.home.firstBtn'), 'shokai'));
      var g = api.el('div', 'grid2');
      g.appendChild(big('home-go-nenpyo', '📅', T('screen.home.nenpyoBtn'), 'nenpyo'));
      g.appendChild(big('home-go-madoguchi', '🏥', T('screen.home.madoBtn'), 'madoguchi'));
      g.appendChild(big('home-go-kusuri', '💊', T('screen.home.kusuriBtn'), 'kusuri'));
      c.appendChild(g);

      /* --- 表紙の1行 --- */
      var cover = api.el('div', 'card');
      cover.appendChild(api.el('h2', 'sec-h first', T('screen.home.whoLabel')));
      var who = U.input('text', T('screen.home.whoPh'), note.who || '');
      who.id = 'home-who';
      var row = api.el('div', 'row');
      who.style.flex = '1';
      row.appendChild(who);
      var whoBtn = U.btn(api, '', T('screen.home.whoSave'), function(){
        var n = U.obj(api, 'note.v1', { who:'' });
        n.who = String(who.value || '').trim();
        if(!api.save('note.v1', n)){ api.toast(T('common.storageFull')); return; }
        api.toast(T('screen.home.whoSaved'));
      });
      whoBtn.id = 'home-who-save';
      row.appendChild(whoBtn);
      cover.appendChild(row);
      c.appendChild(cover);

      /* --- 制度ガイドへの外部リンク(1つだけ) --- */
      var p = api.el('p', 'credit');
      var a = api.el('a', null, T('screen.home.guideLink'));
      a.id = 'home-guide-link';
      a.href = GUIDE_URL; a.target = '_blank'; a.rel = 'noopener';
      p.appendChild(a);
      c.appendChild(p);

      /* --- 免責 --- */
      var d = api.el('p', 'note', T('screen.home.disclaimer'));
      d.id = 'home-disclaimer';
      c.appendChild(d);
      c.appendChild(api.el('p', 'hint', T('screen.home.exitHint')));
    }
  });
})();
