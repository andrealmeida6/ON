/* ==========================================================================
   portal-excel.js - Excel com o layout da plataforma (exports das tasks)

   P.livroExcel(ficheiro, folhas) escreve um .xlsx com o mesmo estilo do
   export dos indicadores: faixa com o nome da plataforma, linha de
   explicacao, cabecalhos escuros e linhas alternadas.
   As folhas ficam protegidas: so as colunas editaveis aceitam alteracoes.
   O cabecalho fica na linha 3; P.lerFicheiro encontra-o sozinho no import.

   folhas: [{ nome, titulo, sub, cols: [{ t, larg, edita, dir, lista }], linhas: [[...]] }]
   ========================================================================== */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P) return;

  var FONTE = 'Arial', TINTA = '0C233C', LINHA = 'D5DDEA', CINZA = 'EEF1F6', VERDE = '00805A';
  var cor = function (hex) { return { argb: 'FF' + String(hex).replace('#', '').toUpperCase() }; };
  var solido = function (hex) { return { type: 'pattern', pattern: 'solid', fgColor: cor(hex) }; };
  var borda = function (c2) { var b = { style: 'thin', color: cor(c2 || LINHA) }; return { top: b, left: b, bottom: b, right: b }; };
  var letra = function (n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; } return s; };
  var marca = function () { var S = P.S || {}; return (S.marca && S.marca.nome) || P.MARCA_BASE.nome; };
  var primaria = function () { var S = P.S || {}; return ((S.marca && S.marca.cores) || P.MARCA_BASE.cores).primary.replace('#', ''); };
  var TIPO = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  /* Sem ExcelJS: o mesmo conteudo, sem estilo */
  var simples = function (ficheiro, folhas) {
    var wb = window.XLSX.utils.book_new();
    folhas.forEach(function (f) {
      var ws = window.XLSX.utils.aoa_to_sheet([f.cols.map(function (c) { return c.t; })].concat(f.linhas));
      ws['!cols'] = f.cols.map(function (c) { return { wch: Math.max(10, Math.round((c.larg || 80) / 7)) }; });
      window.XLSX.utils.book_append_sheet(wb, ws, String(f.nome).slice(0, 31));
    });
    P.formatarNumerosXLSX(wb);
    window.XLSX.writeFile(wb, ficheiro);
    return Promise.resolve();
  };

  var folha = function (wb, f) {
    var prim = primaria(), n = f.cols.length, ult = letra(n), edita = f.cols.some(function (c) { return c.edita; });
    var ws = wb.addWorksheet(String(f.nome).slice(0, 31), { properties: { tabColor: cor(edita ? prim : '5A6B82'), defaultRowHeight: 18 }, views: [{ showGridLines: false, zoomScale: 90 }], pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 } });
    f.cols.forEach(function (c, i) { ws.getColumn(i + 1).width = Math.max(10, Math.min(60, Math.round((c.larg || 90) / 7))); });

    /* Linha 1: faixa do titulo. Linha 2: explicacao. Linha 3: cabecalhos. */
    if (n > 1) { ws.mergeCells('A1:' + ult + '1'); ws.mergeCells('A2:' + ult + '2'); }
    var t = ws.getCell('A1');
    t.value = (marca() + '  |  ' + (f.titulo || f.nome)).toUpperCase();
    t.font = { name: FONTE, size: 14, bold: true, color: cor('FFFFFF') }; t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 34;
    var s = ws.getCell('A2');
    s.value = (f.sub ? f.sub + '  ' : '') + (edita ? 'Edit only the white cells (green headers). Grey cells are filled in by the platform and are locked.' : 'Read only. The sheet is locked.');
    s.font = { name: FONTE, size: 9.5, color: cor('FFFFFF') }; s.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    ws.getRow(2).height = 30;
    for (var k = 1; k <= n; k++) { ws.getCell(1, k).fill = solido(prim); ws.getCell(2, k).fill = solido(TINTA); }

    ws.getRow(3).height = 36;
    f.cols.forEach(function (c, i) {
      var h = ws.getCell(3, i + 1);
      h.value = c.t;
      h.font = { name: FONTE, size: 10, bold: true, color: cor('FFFFFF') };
      h.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      h.fill = solido(c.edita ? VERDE : TINTA);
      h.border = { top: { style: 'thin', color: cor('3B4E66') }, left: { style: 'thin', color: cor('3B4E66') }, right: { style: 'thin', color: cor('3B4E66') }, bottom: { style: 'medium', color: cor(c.edita ? VERDE : prim) } };
      if (c.edita) h.note = { texts: [{ text: 'You can edit this column.' }] };
    });

    f.linhas.forEach(function (l, r) {
      var row = ws.getRow(4 + r), par = r % 2 === 1;
      f.cols.forEach(function (c, i) {
        var cel = row.getCell(i + 1), v = l[i];
        cel.value = v === undefined || v === null ? '' : v;
        cel.font = { name: FONTE, size: 10, color: cor(c.edita ? TINTA : '5A6B82'), bold: i === 0 && !c.edita };
        cel.alignment = { vertical: 'middle', horizontal: c.dir ? 'right' : (c.larg || 90) <= 80 ? 'center' : 'left', wrapText: (c.larg || 90) >= 160, indent: c.dir || (c.larg || 90) <= 80 ? 0 : 1 };
        cel.fill = solido(c.edita ? (par ? 'F7F9FC' : 'FFFFFF') : CINZA);
        cel.border = borda();
        if (typeof v === 'number' && !P.colSemFmt(c.t)) cel.numFmt = P.numFmtExcel(v);
        cel.protection = { locked: !c.edita };
      });
    });
    var fim = 3 + Math.max(1, f.linhas.length);

    /* Menus nas celulas editaveis com valores aceites */
    f.cols.forEach(function (c, i) {
      if (!c.edita || !c.lista || !c.lista.length || !f.linhas.length) return;
      var col = letra(i + 1);
      ws.dataValidations.add(col + '4:' + col + fim, { type: 'list', allowBlank: true, formulae: ['"' + c.lista.join(',') + '"'], showErrorMessage: true, errorStyle: 'stop', errorTitle: c.t, error: 'Choose a value from the list: ' + c.lista.join(', ') + '.' });
    });
    if (f.linhas.length) ws.autoFilter = { from: { row: 3, column: 1 }, to: { row: 3, column: n } };

    /* Protecao sem palavra-passe: nao deixa alterar as celulas bloqueadas, mas deixa filtrar e ajustar colunas */
    return ws.protect('', { selectLockedCells: true, selectUnlockedCells: true, formatColumns: true, formatRows: true, autoFilter: true, sort: false, insertRows: false, deleteRows: false, insertColumns: false, deleteColumns: false });
  };

  /* Livro a partir de listas de objetos (data room, audit trail, pacote do auditor): todas as folhas so de leitura,
     com uma folha de indice no inicio. opc: { titulo, traduz(chave), descricoes: { folha: texto } } */
  var humano = function (k) {
    var t = String(k).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    t = t.replace(/\b(id|kpi|esrs|gri|api|url|pdf|csv|ig3)\b/gi, function (w) { return w.toUpperCase(); });
    t = t.replace(/\bmilestones\b/gi, 'tasks').replace(/\bmilestone\b/gi, 'task');
    return t.charAt(0).toUpperCase() + t.slice(1);
  };
  P.livroObjetos = function (ficheiro, folhas, opc) {
    opc = opc || {};
    var traduz = opc.traduz || function (k) { return k; }, desc = opc.descricoes || {}, quem = P.user && P.S && P.S.sessao ? '' : '';
    var lista = Object.keys(folhas).map(function (n) {
      var linhas = Array.isArray(folhas[n]) ? folhas[n] : [], ks = [];
      linhas.forEach(function (l) { Object.keys(l).forEach(function (k) { if (ks.indexOf(k) < 0) ks.push(k); }); });
      if (!ks.length) ks = ['info'];
      var cols = ks.map(function (k) {
        var vals = linhas.map(function (l) { return l[k]; }).filter(function (v) { return v !== '' && v !== null && v !== undefined; });
        var num = vals.length > 0 && vals.every(function (v) { return typeof v === 'number'; });
        var larg = Math.max(String(humano(traduz(k))).length, vals.slice(0, 200).reduce(function (m, v) { return Math.max(m, String(v).length); }, 0));
        return { k: k, t: humano(traduz(k)), larg: Math.max(80, Math.min(420, larg * 7.5)), dir: num };
      });
      return { nome: humano(traduz(n)).slice(0, 31), titulo: (opc.titulo ? opc.titulo + '  |  ' : '') + humano(traduz(n)), sub: (desc[n] || '') + (linhas.length ? '' : ' No rows.'), cols: cols, linhas: linhas.length ? linhas.map(function (l) { return cols.map(function (c) { var v = l[c.k]; return v === undefined || v === null ? '' : v; }); }) : [['No data']] , n: linhas.length, chave: n };
    });
    var usr = P.ext && P.ext.u ? P.ext.u() : null;
    var indice = { nome: 'Contents', titulo: (opc.titulo || 'Export') + '  |  Contents', sub: 'Generated on ' + P.fmtDataHora(new Date().toISOString()) + (usr ? ' by ' + usr.nome : '') + '. Each sheet is read only.',
      cols: [{ t: 'Sheet', larg: 200 }, { t: 'What it contains', larg: 520 }, { t: 'Rows', larg: 80, dir: true }],
      linhas: lista.map(function (f) { return [f.nome, desc[f.chave] || '', f.n]; }) };
    return P.livroExcel(ficheiro, [indice].concat(lista.map(function (f) { return { nome: f.nome, titulo: f.titulo, sub: f.sub.trim(), cols: f.cols, linhas: f.linhas }; })));
  };
  P.livroExcel = function (ficheiro, folhas) {
    var XL = window.ExcelJS;
    if (!XL) return simples(ficheiro, folhas);
    var wb = new XL.Workbook();
    wb.creator = marca(); wb.created = new Date();
    var reais = folhas.map(function (f) { return folha(wb, f); });
    wb.views = [{ activeTab: 0 }];
    return Promise.all(reais).then(function () { P.formatarNumerosExcelJS(wb); return wb.xlsx.writeBuffer(); }).then(function (buf) { P.descarregar(ficheiro, buf, TIPO); });
  };
})();
