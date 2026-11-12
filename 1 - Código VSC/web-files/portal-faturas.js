/* ============================================================================
   portal-faturas.js - ler faturas (QR code da AT, texto do PDF, OCR) no browser

   Tudo corre no navegador (serve no GitHub Pages, sem servidor nem chaves):
   - QR code da AT (todas as faturas portuguesas desde 2022): NIF do fornecedor e
     do cliente, data, numero, ATCUD, IVA e total. E a parte financeira mais certa.
   - Texto do PDF (pdf.js): a maioria das faturas de eletricidade e PDF digital.
   - OCR (Tesseract.js, portugues) para digitalizacoes e fotografias.
   As bibliotecas so se descarregam quando se le a primeira fatura.
   Os campos seguem web-files/esquema-fatura-energia.json. Nada entra nos
   indicadores sem o utilizador confirmar; os campos lidos com pouca confianca
   ficam destacados.
   ============================================================================ */
(function () {
  'use strict';
  var P = window.Portal;
  if (!P || !P.ext) return;
  var S = P.S, X = P.ext, e = X.e, chip = X.chip, toast = X.toast, R = X.R, u = X.u, campo = X.campo, opt = X.opt, U = X.U;

  /* --- Bibliotecas, carregadas so quando sao precisas ------------------------------------- */
  var LIBS = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    qr: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js',
    ocr: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js'
  };
  var carregados = {};
  var script = function (url) {
    if (carregados[url]) return carregados[url];
    carregados[url] = new Promise(function (ok, falha) {
      var s = document.createElement('script'); s.src = url; s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { delete carregados[url]; falha(new Error('Could not load ' + url.split('/').slice(-1)[0] + '. Check the internet connection.')); };
      document.head.appendChild(s);
    });
    return carregados[url];
  };

  /* --- Leitura do ficheiro ----------------------------------------------------------------- */
  var lerQR = function (canvas) {
    if (!window.jsQR) return null;
    var ctx = canvas.getContext('2d'), img = ctx.getImageData(0, 0, canvas.width, canvas.height), r = window.jsQR(img.data, img.width, img.height);
    return r && /A:\d{9}\*B:/.test(r.data) ? r.data : null;
  };
  /* PDF: texto de todas as paginas (linha a linha pela posicao). As paginas em imagem servem para a
     pre-visualizacao (a primeira), para o QR da AT (que pode estar em qualquer pagina) e para o OCR */
  var MAX_PAG = 6, MAX_OCR = 4;
  var lerPdf = function (buf, progresso) {
    return script(LIBS.pdf).then(function () {
      var lib = window.pdfjsLib; lib.GlobalWorkerOptions.workerSrc = LIBS.pdfWorker;
      return lib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var nums = [], textos = [], imagens = {};
      for (var i = 1; i <= Math.min(doc.numPages, MAX_PAG); i++) nums.push(i);
      var imagem = function (n, escala) {
        var k = n + '@' + escala;
        if (imagens[k]) return Promise.resolve(imagens[k]);
        return doc.getPage(n).then(function (pg) {
          var vp = pg.getViewport({ scale: escala }), cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
          return pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise.then(function () { imagens[k] = cv; return cv; });
        });
      };
      return nums.reduce(function (pr, n) {
        return pr.then(function () {
          return doc.getPage(n).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
            var linhas = {};
            tc.items.forEach(function (it) { var y = Math.round(it.transform[5] / 3); (linhas[y] = linhas[y] || []).push(it); });
            textos.push(Object.keys(linhas).map(Number).sort(function (a, b) { return b - a; }).map(function (y) { return linhas[y].sort(function (a, b) { return a.transform[4] - b.transform[4]; }).map(function (it) { return it.str; }).join(' '); }).join('\n'));
          });
        });
      }, Promise.resolve()).then(function () { return Promise.all([imagem(1, 2), script(LIBS.qr).catch(function () {})]); }).then(function (r) {
        var capa = r[0], texto = textos.join('\n');
        /* QR da AT: procura pagina a pagina, e com mais resolucao se for pequeno */
        var qr = null;
        var procurarQR = nums.reduce(function (pr, n) {
          return pr.then(function () {
            if (qr) return;
            return imagem(n, 2).then(function (cv) { qr = lerQR(cv); if (!qr) return imagem(n, 3).then(function (cv3) { qr = lerQR(cv3); delete imagens[n + '@3']; }); });
          });
        }, Promise.resolve());
        return procurarQR.then(function () {
          var prev = capa.toDataURL('image/jpeg', 0.85);
          /* PDF digitalizado (sem texto): OCR das primeiras paginas */
          if (texto.replace(/\s/g, '').length < 40 * nums.length) {
            var ocrNums = nums.slice(0, MAX_OCR), partes = [];
            return ocrNums.reduce(function (pr, n, i) {
              return pr.then(function () { return imagem(n, 2); }).then(function (cv) {
                return ocr(cv, progresso ? function (pc) { progresso(Math.round((i * 100 + pc) / ocrNums.length)); } : null);
              }).then(function (t) { partes.push(t); });
            }, Promise.resolve()).then(function () { return { texto: partes.join('\n'), qr: qr, imagem: prev, metodo: 'ocr' }; });
          }
          return { texto: texto, qr: qr, imagem: prev, metodo: 'texto_pdf' };
        });
      });
    });
  };
  /* Antes do OCR: tons de cinzento, contraste esticado e resolucao suficiente (letra pequena das faturas) */
  var prepararOCR = function (canvas) {
    var esc = canvas.width < 1800 ? Math.min(2.5, 2000 / canvas.width) : 1, cv = document.createElement('canvas');
    cv.width = Math.round(canvas.width * esc); cv.height = Math.round(canvas.height * esc);
    var ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(canvas, 0, 0, cv.width, cv.height);
    var img = ctx.getImageData(0, 0, cv.width, cv.height), px = img.data, hist = new Array(256).fill(0), i;
    for (i = 0; i < px.length; i += 4) { var g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]); px[i] = g; hist[g]++; }
    /* Corta 1% de cada ponta para o fundo ficar branco e a letra escura */
    var total = px.length / 4, acum = 0, lo = 0, hi = 255;
    for (i = 0; i < 256; i++) { acum += hist[i]; if (acum > total * 0.01) { lo = i; break; } }
    acum = 0; for (i = 255; i >= 0; i--) { acum += hist[i]; if (acum > total * 0.01) { hi = i; break; } }
    var amp = Math.max(1, hi - lo);
    for (i = 0; i < px.length; i += 4) { var v = Math.max(0, Math.min(255, Math.round((px[i] - lo) * 255 / amp))); px[i] = px[i + 1] = px[i + 2] = v; }
    ctx.putImageData(img, 0, 0);
    return cv;
  };
  var ocr = function (canvas, progresso) {
    var worker;
    return script(LIBS.ocr).then(function () {
      return window.Tesseract.createWorker('por', 1, { logger: function (m) { if (progresso && m.status === 'recognizing text') progresso(Math.round((m.progress || 0) * 100)); } });
    }).then(function (w) {
      worker = w;
      /* Mantem os espacos entre colunas: as regras leem a fatura linha a linha */
      return w.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
    }).then(function () { return worker.recognize(prepararOCR(canvas)); }).then(function (r) {
      var t = r.data.text; worker.terminate(); return t;
    }, function (err) { if (worker) worker.terminate(); throw err; });
  };
  var lerImagem = function (file, progresso) {
    return new Promise(function (ok, falha) {
      var img = new Image(); img.onload = function () { ok(img); }; img.onerror = function () { falha(new Error('The image could not be opened.')); };
      img.src = URL.createObjectURL(file);
    }).then(function (img) {
      var esc = Math.min(1, 2400 / Math.max(img.width, img.height)), cv = document.createElement('canvas');
      cv.width = Math.round(img.width * esc); cv.height = Math.round(img.height * esc); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      return script(LIBS.qr).catch(function () {}).then(function () {
        var qr = lerQR(cv);
        return ocr(cv, progresso).then(function (t) { return { texto: t, qr: qr, imagem: cv.toDataURL('image/jpeg', 0.85), metodo: 'ocr' }; });
      });
    });
  };
  P.lerFicheiroFatura = function (file, progresso) {
    var ext = String(file.name).split('.').pop().toLowerCase();
    if (ext === 'pdf') return file.arrayBuffer().then(function (b) { return lerPdf(b, progresso); });
    if (['png', 'jpg', 'jpeg', 'webp', 'gif'].indexOf(ext) > -1) return lerImagem(file, progresso);
    return Promise.reject(new Error('Use a PDF or an image (PNG, JPG) of the invoice.'));
  };

  /* --- Interpretar: QR da AT e regras para faturas de eletricidade portuguesas -------------- */
  var num = function (t) {
    if (t === null || t === undefined) return null;
    var s = String(t).replace(/\s|\u00a0/g, '').replace(/€|kWh|%/gi, '');
    if (/\d\.\d{3},\d/.test(s) || (/,\d{1,3}$/.test(s) && s.indexOf('.') > -1)) s = s.replace(/\./g, '').replace(',', '.');
    else if (/,\d+$/.test(s)) s = s.replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    var n = parseFloat(s); return isNaN(n) ? null : n;
  };
  /* Datas: 22/09/2026, 22-09-2026, 22 set 2026, 22 de setembro de 2026, 2026-09-22 */
  var MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
  var DATA = '(\\d{1,2}[\\/\\-.]\\d{1,2}[\\/\\-.]\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s*(?:de\\s*)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\\.?\\s*(?:de\\s*)?\\d{4})';
  var dois = function (n) { return ('0' + n).slice(-2); };
  var data = function (t) {
    var s = String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), m = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/.exec(s);
    if (m) return m[3] + '-' + dois(m[2]) + '-' + dois(m[1]);
    m = /(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[0];
    m = /(\d{1,2})\s*(?:de\s*)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\.?\s*(?:de\s*)?(\d{4})/.exec(s);
    return m ? m[3] + '-' + dois(MESES[m[2]]) + '-' + dois(m[1]) : null;
  };
  var NUM = '(\\d{1,3}(?:[ .\u00a0]\\d{3})*(?:,\\d+)?|\\d+(?:[.,]\\d+)?)', KWH = '(?:k\\s?w?\\s?h)';
  var FORNECEDORES = ['EDP Comercial', 'EDP', 'SU Eletricidade', 'Endesa', 'Iberdrola', 'Galp', 'Goldenergy', 'Repsol', 'Plenitude', 'Luzboa', 'Coopernico', 'Ylce', 'MEO Energia', 'Muon', 'G9', 'Audax', 'Axpo', 'Luz Exemplo Energia'];
  var qrCampos = function (q) {
    var o = {}; String(q || '').split('*').forEach(function (p) { var i = p.indexOf(':'); if (i > 0) o[p.slice(0, i)] = p.slice(i + 1); });
    return o;
  };
  P.interpretarFatura = function (lido) {
    var t = String(lido.texto || ''), tl = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), d = { fornecedor: {}, cliente: {}, fatura: {}, fornecimento: {}, consumo: {}, rotulagem: {}, valores: {}, leitura: { metodo: lido.metodo, confianca: {} } };
    var conf = d.leitura.confianca, base = lido.metodo === 'ocr' ? 0.7 : 0.85;
    var pega = function (re, f) { var m = re.exec(tl); return m ? (f ? f(m) : m[1]) : null; };
    /* 1. QR da AT: financeiro quase certo */
    if (lido.qr) {
      var q = qrCampos(lido.qr);
      d.fornecedor.nif = q.A; d.cliente.nif = q.B; d.fatura.data_emissao = q.F ? q.F.slice(0, 4) + '-' + q.F.slice(4, 6) + '-' + q.F.slice(6, 8) : null;
      d.fatura.numero = q.G || null; d.fatura.atcud = q.H || null; d.fatura.tipo = q.D === 'NC' ? 'nota_credito' : 'fatura';
      d.valores.total_iva = num(q.N); d.valores.total_com_iva = num(q.O);
      var iva = []; [['I3', 'I4', 6], ['I5', 'I6', 13], ['I7', 'I8', 23]].forEach(function (k) { if (q[k[0]]) iva.push({ taxa_pct: k[2], base: num(q[k[0]]), valor: num(q[k[1]]) }); });
      d.valores.iva = iva; d.valores.total_sem_iva = iva.length ? Math.round(iva.reduce(function (a, x) { return a + (x.base || 0); }, 0) * 100) / 100 : null;
      ['fornecedor.nif', 'cliente.nif', 'fatura.data_emissao', 'fatura.numero', 'fatura.atcud', 'valores.total_com_iva', 'valores.total_iva', 'valores.total_sem_iva'].forEach(function (k) { conf[k] = 0.99; });
    }
    /* 2. Texto: o que o QR nao tem, e confirmacoes */
    var forn = FORNECEDORES.filter(function (f) { return t.toLowerCase().indexOf(f.toLowerCase()) > -1; })[0];
    if (forn) { d.fornecedor.nome = forn; conf['fornecedor.nome'] = base; }
    if (!d.fornecedor.nif) {
      /* Cada NIF com a sua linha: o do fornecedor vem com NIPC, "emitido por" ou o nome dele; o do cliente com titular, cliente ou nome */
      var ids = [], vistosNif = {};
      tl.split('\n').forEach(function (ln) { var re = /(NIPC|NIF|contribuinte)[^\d\n]{0,12}(?:PT)?\s*(\d{9})\b/gi, m; while ((m = re.exec(ln))) ids.push({ n: m[2], ln: ln, nipc: /nipc/i.test(m[1]) }); });
      var eForn = function (x) { return x.nipc || /emitido\s*por|sucursal|comercializador/i.test(x.ln) || (forn && x.ln.toLowerCase().indexOf(forn.toLowerCase()) > -1); };
      var fx = ids.filter(eForn)[0], outros = ids.filter(function (x) { return !fx || x.n !== fx.n; });
      var cx = outros.filter(function (x) { return /titular|cliente|nome/i.test(x.ln); })[0] || (fx ? outros[0] : outros[1]);
      if (!fx && outros.length > 1) fx = outros[0];
      if (fx) { d.fornecedor.nif = fx.n; conf['fornecedor.nif'] = eForn(fx) ? base : base - 0.25; vistosNif[fx.n] = 1; }
      if (cx && !vistosNif[cx.n]) { d.cliente.nif = cx.n; conf['cliente.nif'] = /titular|cliente|nome/i.test(cx.ln) ? base : base - 0.25; }
    }
    if (!d.fatura.numero) { d.fatura.numero = pega(/fatura\s*(?:n\.?\s*[ºo°]?|numero)?\s*[:\s]\s*([A-Z]{1,4}\s?[\w\/-]*\d+)/i); if (d.fatura.numero) conf['fatura.numero'] = base - 0.15; }
    if (!d.fatura.atcud) { d.fatura.atcud = pega(/ATCUD[:\s]*([A-Z0-9]{8}-\d+)/i); if (d.fatura.atcud) conf['fatura.atcud'] = base; }
    if (!d.fatura.data_emissao) {
      d.fatura.data_emissao = pega(new RegExp('data\\s*(?:de\\s*)?emissao[:\\s]*' + DATA, 'i'), function (m) { return data(m[1]); });
      if (d.fatura.data_emissao) conf['fatura.data_emissao'] = base;
      else { d.fatura.data_emissao = pega(new RegExp('\\bdata[:\\s]+' + DATA, 'i'), function (m) { return data(m[1]); }); if (d.fatura.data_emissao) conf['fatura.data_emissao'] = base - 0.15; }
    }
    /* CPE: PT + 16 algarismos + 2 letras. No OCR, O/Q/D por 0 e I/l por 1 sao erros comuns nos algarismos */
    /* Tambem "PTO0020001 15011816 WC" (O no lugar do 0, espacos fora do sitio): os CPE portugueses comecam por PT0002 */
    var cpeTxt = /CPE[^A-Z0-9]{0,6}(P\s?T[\s0-9OoQDIl|]{16,24}[A-Z]{2})\b/i.exec(tl) || /\b(P\s?T\s?[0OQD]{3}\s?2(?:\s?[0-9OoQDIl|]){12}\s?[A-Z]{2})\b/.exec(tl);
    if (cpeTxt) {
      var bruto = cpeTxt[1].replace(/\s/g, '').toUpperCase(), corpo = bruto.slice(2, -2).replace(/[OQD]/g, '0').replace(/[IL|]/g, '1');
      if (/^\d{16}$/.test(corpo)) { d.fornecimento.cpe = 'PT' + corpo + bruto.slice(-2); conf['fornecimento.cpe'] = corpo === bruto.slice(2, -2) ? base + 0.05 : base - 0.15; }
    }
    /* A primeira data pode vir sem ano ("7 de outubro a 30 de outubro 2026"): fica com o ano da segunda (ou o anterior, se o mes for maior) */
    var DATA_SA = '(\\d{1,2}[\\/\\-.]\\d{1,2}(?:[\\/\\-.]\\d{4})?|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\s*(?:de\\s*)?(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-z]*\\.?(?:\\s*(?:de\\s*)?\\d{4})?)';
    var intervalo = function (a, b) {
      var fim = data(b); if (!fim) return null;
      var ini = data(a);
      if (!ini) { var sa = String(a).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), mm = /(\d{1,2})[\/\-.](\d{1,2})$/.exec(sa.trim()) || /(\d{1,2})\s*(?:de\s*)?(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/.exec(sa);
        if (!mm) return null; var mes = MESES[mm[2]] || +mm[2], ano = +fim.slice(0, 4) - (mes > +fim.slice(5, 7) ? 1 : 0); ini = ano + '-' + dois(mes) + '-' + dois(mm[1]); }
      return ini <= fim ? [ini, fim] : null;
    };
    var per = new RegExp('(?:periodo(?:\\s*de\\s*faturacao|\\s*de\\s*consumo|\\s*faturado)?|consumos?\\s*de)[:\\s]*(?:de\\s*)?' + DATA_SA + '\\s*(?:a|ate|-|–)\\s*' + DATA, 'i').exec(tl), perOk = per ? intervalo(per[1], per[2]) : null;
    if (perOk) { d.fornecimento.periodo_inicio = perOk[0]; d.fornecimento.periodo_fim = perOk[1]; conf['fornecimento.periodo_inicio'] = conf['fornecimento.periodo_fim'] = base; }
    else {
      /* Sem rotulo legivel (comum no OCR): o intervalo "22 set 2026 a 06 out 2026" que mais se repete nas linhas da fatura */
      var reInt = new RegExp(DATA_SA + '\\s*(?:a|ate|-|–)\\s*' + DATA, 'gi'), mi, cont = {};
      while ((mi = reInt.exec(tl))) { var iv = intervalo(mi[1], mi[2]); if (iv && iv[0] < iv[1]) cont[iv.join('|')] = (cont[iv.join('|')] || 0) + 1; }
      var melhor = Object.keys(cont).sort(function (a, b) { return cont[b] - cont[a]; })[0];
      if (melhor) { d.fornecimento.periodo_inicio = melhor.split('|')[0]; d.fornecimento.periodo_fim = melhor.split('|')[1]; conf['fornecimento.periodo_inicio'] = conf['fornecimento.periodo_fim'] = cont[melhor] > 1 ? base - 0.1 : base - 0.2; }
    }
    d.fornecimento.potencia_contratada_kva = num(pega(new RegExp('potencia\\s*contratada[:\\s]*' + NUM + '\\s*kVA', 'i'))); if (d.fornecimento.potencia_contratada_kva !== null) conf['fornecimento.potencia_contratada_kva'] = base;
    else {
      /* "Termo de Potencia (3.45 kVA)", ou so o valor em kVA */
      var pot = pega(new RegExp('potencia[^\\n\\d]{0,40}' + NUM + '\\s*kVA', 'i')) || pega(new RegExp(NUM + '\\s*kVA\\b', 'i'));
      if (pot !== null) { d.fornecimento.potencia_contratada_kva = num(pot); conf['fornecimento.potencia_contratada_kva'] = base - 0.1; }
    }
    var tens = pega(/\b(BTN|BTE|MT|AT|MAT)\b/); if (tens) { d.fornecimento.nivel_tensao = tens; conf['fornecimento.nivel_tensao'] = base - 0.1; }
    /* "Se enviar fora destas datas, parte do consumo sera estimado" e um aviso, nao uma leitura estimada */
    var estimada = /(?:leitura|consumo)s?\s*(?:\(\s*)?estimad|\(\s*estimad/i.test(tl.replace(/ser[aá]\s*estimad\w*/gi, ''));
    if (estimada) d.fornecimento.tipo_leitura = 'estimada'; else if (/leitura\s*real|telecontagem|consumos?\s*rea(?:l|is)|energia\s*\(real\)/i.test(tl)) d.fornecimento.tipo_leitura = /telecontagem/i.test(tl) ? 'telecontagem' : 'real';
    /* kWh: linha a linha. Fora ficam as leituras do contador (indices acumulados, como 012110 kWh), que nao sao consumo:
       perto de "a sua leitura", "ultima leitura" ou "contador", com zeros a esquerda, ou com varios periodos horarios na mesma linha */
    var perDe = function (ln, pos) {
      /* Com a posicao do numero, conta so o rotulo logo antes dele ("... seguinte modo: simples 470 kWh") */
      if (pos !== undefined && ln.length > 60) ln = ln.slice(Math.max(0, pos - 28), pos);
      return /super\s*vazio/i.test(ln) ? 'super_vazio' : /fora\s*(?:de\s*)?vazio/i.test(ln) ? 'fora_vazio' : /vazio/i.test(ln) ? 'vazio' : /ponta/i.test(ln) ? 'ponta' : /cheias?\b/i.test(ln) ? 'cheias' : /simples/i.test(ln) ? 'simples' : ''; };
    var porPer = [], vistos = {}, faturadas = [], soltos = [], ultLeitura = -9;
    tl.split('\n').forEach(function (ln, i) {
      if (/(?:sua|ultima|anterior|atual|nova)\s*leitura|leitura\s*(?:anterior|atual|do\s*contador|comunicada)|contador|indices?\b/i.test(ln)) ultLeitura = i;
      var reK = new RegExp(NUM + '\\s*' + KWH + '\\b', 'gi'), ks = [], m;
      while ((m = reK.exec(ln))) if (!/\/\s*$/.test(ln.slice(0, m.index))) ks.push(m);
      if (!ks.length) return;
      var registo = i - ultLeitura <= 3 || ks.some(function (x) { return /^0\d/.test(x[1].trim()); }) || (ln.match(/cheias?\b|ponta|vazio/gi) || []).length > 1;
      if (registo) return;
      var kwh = num(ks[0][1]); if (kwh === null) return;
      /* Linhas faturadas: "Termo de Energia (Real) 208 kWh 0,2017 EUR/kWh ..." */
      if (/termo\s*de\s*energia|energia\s*ativa|consumo\s*de\s*energia|^\s*energia\b/i.test(ln) && !/total|imposto|iec|taxa/i.test(ln)) faturadas.push({ periodo: perDe(ln, ks[0].index), kwh: kwh });
      if (/total|imposto|iec|taxa/i.test(ln)) return;
      soltos.push(kwh);
      var p = perDe(ln, ks[0].index);
      if (p && !vistos[p]) { vistos[p] = 1; porPer.push({ periodo: p, kwh: kwh }); }
    });
    var soma = function (l) { return l.length ? Math.round(l.reduce(function (a, x) { return a + x.kwh; }, 0) * 1000) / 1000 : null; };
    var tot = pega(new RegExp('(?:total\\s*(?:de\\s*)?(?:energia|consumo)[^\\n\\d]{0,30}|consumo\\s*total[^\\n\\d]{0,20}|energia\\s*ativa\\s*total[^\\n\\d]{0,20})' + NUM + '\\s*' + KWH, 'i'), function (m) { return num(m[1]); });
    /* O Imposto Especial de Consumo e cobrado sobre todos os kWh do periodo: confirma o total */
    var iec = pega(new RegExp('imposto\\s*especial\\s*(?:de\\s*)?consumo[^\\n\\d]{0,30}' + NUM + '\\s*' + KWH, 'i'), function (m) { return num(m[1]); });
    var somaFat = soma(faturadas), somaPer = soma(porPer);
    /* As linhas faturadas podem vir partidas por taxa de IVA (o mesmo periodo duas vezes): por periodo, junta-as */
    if (!porPer.length && faturadas.some(function (x) { return x.periodo; })) {
      var acc = {}; faturadas.forEach(function (x) { if (x.periodo) acc[x.periodo] = (acc[x.periodo] || 0) + x.kwh; });
      porPer = Object.keys(acc).map(function (k) { return { periodo: k, kwh: acc[k] }; }); somaPer = soma(porPer);
    }
    var fontes = [tot, somaFat, iec, somaPer].filter(function (x) { return x !== null; });
    var igual = function (a, b) { return a !== null && b !== null && Math.abs(a - b) < 1; };
    var escolha = tot !== null ? tot : somaFat !== null ? somaFat : iec !== null ? iec : somaPer;
    if (escolha !== null) {
      d.consumo.energia_ativa_kwh = escolha;
      var confirmado = fontes.filter(function (x) { return igual(x, escolha); }).length > 1;
      conf['consumo.energia_ativa_kwh'] = confirmado ? 0.97 : escolha === somaPer ? base - 0.1 : base;
    } else if (soltos.length) { d.consumo.energia_ativa_kwh = Math.max.apply(null, soltos); conf['consumo.energia_ativa_kwh'] = 0.4; }
    d.consumo.por_periodo_horario = porPer;
    /* Rotulagem */
    var ren = pega(new RegExp(NUM + '\\s*%\\s*(?:de\\s*)?(?:energia|eletricidade)?\\s*(?:de\\s*origem\\s*)?renovave', 'i')) || pega(new RegExp('^(?!\\s*(?:outras|cogeracao))[^\\n]*renovave(?:l|is)[^\\n\\d]{0,40}' + NUM + '\\s*%', 'im')); if (ren) { d.rotulagem.renovavel_pct = num(ren); conf['rotulagem.renovavel_pct'] = base - 0.05; }
    var emi = pega(new RegExp(NUM + '\\s*g\\s*(?:de\\s*)?CO\\s*[2Z](?:\\s*eq)?\\s*\\/\\s*' + KWH, 'i')); if (emi) { d.rotulagem.emissoes_gco2_kwh = num(emi); conf['rotulagem.emissoes_gco2_kwh'] = base - 0.05; }
    /* Pegada de CO2 da fatura ("Pegada ecologica CO2: 32.57 kg"): sem o fator do mix, calcula-se o fator desta fatura */
    var kgCO2 = pega(new RegExp('(?:pegada|emissoes)[^\\n\\d]{0,30}CO\\s*[2Z][^\\n\\d]{0,6}' + NUM + '\\s*kg', 'i')) || pega(new RegExp('gerou[^\\d]{0,12}(-?' + NUM.slice(1) + '\\s*kg\\s*(?:de\\s*)?CO\\s*[2Z]', 'i'));
    if (kgCO2 !== null) {
      d.rotulagem.emissoes_kg_co2 = num(kgCO2); conf['rotulagem.emissoes_kg_co2'] = base - 0.05;
      if ((d.rotulagem.emissoes_gco2_kwh === undefined || d.rotulagem.emissoes_gco2_kwh === null) && d.consumo.energia_ativa_kwh) { d.rotulagem.emissoes_gco2_kwh = Math.round(d.rotulagem.emissoes_kg_co2 * 1000 / d.consumo.energia_ativa_kwh * 10) / 10; conf['rotulagem.emissoes_gco2_kwh'] = base - 0.15; }
    }
    d.rotulagem.garantias_origem = /garantias?\s*de\s*origem/i.test(tl) || undefined;
    /* Totais pelo texto, se o QR nao os deu */
    if (!d.valores.iva) {
      /* Quadro do IVA: "(c) IVA 23%  44,04 EUR  10,13 EUR" */
      var ivas = [], taxas = {};
      tl.split('\n').forEach(function (ln) { var m = new RegExp('IVA\\s*(\\d{1,2})\\s*%\\s*' + NUM + '\\s*€\\s*' + NUM + '\\s*€', 'i').exec(ln); if (m && !taxas[m[1]]) { taxas[m[1]] = 1; ivas.push({ taxa_pct: +m[1], base: num(m[2]), valor: num(m[3]) }); } });
      if (ivas.length) {
        d.valores.iva = ivas;
        d.valores.total_iva = Math.round(ivas.reduce(function (a, x) { return a + (x.valor || 0); }, 0) * 100) / 100;
        d.valores.total_sem_iva = Math.round(ivas.reduce(function (a, x) { return a + (x.base || 0); }, 0) * 100) / 100;
        conf['valores.total_iva'] = conf['valores.total_sem_iva'] = base - 0.05;
      }
    }
    if (d.valores.total_com_iva === undefined || d.valores.total_com_iva === null) {
      var tp = pega(new RegExp('(?:total\\s*a\\s*(?:pagar|debitar)|valor\\s*a\\s*pagar|total\\s*da\\s*fatura(?:\\s*de\\s*[a-z]+)?)[^\\n\\d]{0,20}' + NUM + '\\s*€', 'i')) || pega(new RegExp('total\\s*(?:com\\s*)?iva[^\\n\\d]{0,20}' + NUM, 'i'));
      if (tp) { d.valores.total_com_iva = num(tp); conf['valores.total_com_iva'] = base - 0.1; }
    }
    /* Base + IVA = total: os tres confirmam-se */
    if (d.valores.total_sem_iva && d.valores.total_iva && d.valores.total_com_iva && !lido.qr && Math.abs(d.valores.total_sem_iva + d.valores.total_iva - d.valores.total_com_iva) < 0.02) ['valores.total_sem_iva', 'valores.total_iva', 'valores.total_com_iva'].forEach(function (k) { conf[k] = Math.max(conf[k] || 0, 0.95); });
    if (d.valores.total_sem_iva === undefined || d.valores.total_sem_iva === null) { var ts = pega(new RegExp('(?:total\\s*sem\\s*iva|subtotal|base\\s*tributavel)[^\\n\\d]{0,20}' + NUM, 'i')); if (ts) { d.valores.total_sem_iva = num(ts); conf['valores.total_sem_iva'] = base - 0.1; } }
    if (d.valores.total_sem_iva && d.consumo.energia_ativa_kwh) d.valores.custo_medio_eur_kwh = Math.round(d.valores.total_sem_iva / d.consumo.energia_ativa_kwh * 10000) / 10000;
    d.leitura.qr = !!lido.qr;
    return d;
  };

  /* --- Repartir os kWh pelos dias de cada periodo de reporte -------------------------------- */
  var dias = function (a, b) { return Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000) + 1; };
  P.parteNoPeriodo = function (d, per) {
    var f = d.fornecimento, kwh = d.consumo.energia_ativa_kwh;
    if (!per || kwh === null || kwh === undefined || !f.periodo_inicio || !f.periodo_fim) return { kwh: kwh, dias: null, total: null };
    var ini = f.periodo_inicio > per.ini ? f.periodo_inicio : per.ini, fim = f.periodo_fim < per.fim ? f.periodo_fim : per.fim;
    var tot = dias(f.periodo_inicio, f.periodo_fim), n = fim >= ini ? dias(ini, fim) : 0;
    return { kwh: tot ? kwh * n / tot : kwh, dias: n, total: tot };
  };

  /* --- Ecra de confirmacao ------------------------------------------------------------------ */
  U.fat = null;
  var ENERGIA = function (c) { return c && /^(MWh|kWh)$/.test(c.unidade_medida); };
  /* Tasks abertas onde a fatura pode entrar: tem um KPI de eletricidade e a pessoa pode preencher */
  var tasksAlvo = function () {
    var usr = u();
    return P.msCiclo().filter(function (m) { return P.podePreencher(m, usr) && m.indicadores.some(function (id) { return ENERGIA(P.cat(id)) && !P.eOutput(P.cat(id)); }); });
  };
  P.abrirLeituraFatura = function (file, pref) {
    U.fat = { file: file, nome: file.name, estado: 'a ler', prog: 0, pref: pref || {} };
    X.abrePainel('fatura', {});
    var fid = pref && pref.fid ? pref.fid : P.guardarFicheiro(file);
    U.fat.fid = fid;
    P.lerFicheiroFatura(file, function (p) { if (U.fat) { U.fat.prog = p; var el = document.querySelector('[data-fat-prog]'); if (el) el.textContent = p + '%'; } }).then(function (lido) {
      if (!U.fat) return;
      U.fat.lido = lido; U.fat.d = P.interpretarFatura(lido); U.fat.estado = 'lida';
      /* Destino por omissao: a task indicada, ou a primeira aberta cujo periodo apanha a fatura */
      var l = tasksAlvo(), f = U.fat.d.fornecimento, ms = pref && pref.ms && P.ms(pref.ms);
      if (!ms || l.indexOf(ms) < 0) ms = l.filter(function (m) { var p = P.periodo(m.periodo); return p && f.periodo_inicio && f.periodo_inicio <= p.fim && f.periodo_fim >= p.ini; })[0] || l[0];
      U.fat.ms = ms ? ms.id : '';
      U.fat.ind = ms ? (pref && pref.ind && ms.indicadores.indexOf(pref.ind) > -1 ? pref.ind : ms.indicadores.filter(function (id) { return ENERGIA(P.cat(id)) && !P.eOutput(P.cat(id)); })[0]) : '';
      R();
    }).catch(function (x) { if (U.fat) { U.fat.estado = 'erro'; U.fat.erro = x.message; R(); } });
  };
  var CAMPOS_FAT = [
    ['Supplier', 'fornecedor.nome'], ['Supplier VAT', 'fornecedor.nif'], ['Customer VAT', 'cliente.nif'], ['Invoice number', 'fatura.numero'], ['ATCUD', 'fatura.atcud'], ['Issue date', 'fatura.data_emissao', 'date'],
    ['CPE (delivery point)', 'fornecimento.cpe'], ['Billing from', 'fornecimento.periodo_inicio', 'date'], ['Billing to', 'fornecimento.periodo_fim', 'date'], ['Contracted power (kVA)', 'fornecimento.potencia_contratada_kva', 'num'],
    ['Active energy (kWh)', 'consumo.energia_ativa_kwh', 'num'], ['Renewable share (%)', 'rotulagem.renovavel_pct', 'num'], ['Emissions (gCO2/kWh)', 'rotulagem.emissoes_gco2_kwh', 'num'], ['CO2 of this invoice (kg)', 'rotulagem.emissoes_kg_co2', 'num'],
    ['Total without VAT (€)', 'valores.total_sem_iva', 'num'], ['VAT (€)', 'valores.total_iva', 'num'], ['Total with VAT (€)', 'valores.total_com_iva', 'num']
  ];
  var ler = function (d, k) { return k.split('.').reduce(function (o, p) { return o ? o[p] : undefined; }, d); };
  var por = function (d, k, v) { var ps = k.split('.'), o = d; for (var i = 0; i < ps.length - 1; i++) o = o[ps[i]] = o[ps[i]] || {}; o[ps[ps.length - 1]] = v; };
  X.Pn.fatura = function () {
    var F = U.fat;
    if (!F) return { t: 'Read invoice', b: '' };
    if (F.estado === 'a ler') return { t: 'Reading ' + F.nome, s: 'QR code, text and OCR run in your browser. The first time it downloads the reading libraries.', largo: true,
      b: '<div class="fat-aler" role="status"><span class="fat-spin" aria-hidden="true"></span><b>Reading the invoice…</b><small>OCR <span data-fat-prog>' + (F.prog || 0) + '%</span> (only for scans and photos)</small></div>', p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fatFechar">Cancel</button>' };
    if (F.estado === 'erro') return { t: 'Could not read ' + F.nome, b: '<div class="ps-aviso err" role="alert">' + e(F.erro) + '</div><p class="ps-small ps-mut">The file is still saved. You can type the values in the task.</p>', p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fatFechar">Close</button>' };
    var d = F.d, cf = d.leitura.confianca, m = F.ms ? P.ms(F.ms) : null, per = m ? P.periodo(m.periodo) : null, parte = P.parteNoPeriodo(d, per), c = F.ind ? P.cat(F.ind) : null;
    var nivel = function (k) { var x = cf[k]; return x === undefined ? 'nada' : x >= 0.9 ? 'alta' : x >= 0.7 ? 'media' : 'baixa'; };
    var TXT_N = { alta: 'Read with high confidence', media: 'Check this value', baixa: 'Low confidence: check it', nada: 'Not found: type it if you need it' };
    var campos = CAMPOS_FAT.map(function (f) {
      var v = ler(d, f[1]), n = nivel(f[1]), id = 'fat-' + f[1].replace(/\./g, '-');
      return '<div class="fat-c ' + n + '"><label class="ps-lab" for="' + id + '">' + e(f[0]) + '</label><input id="' + id + '" class="ps-in' + (f[2] === 'num' ? ' ps-num' : '') + '"' + (f[2] === 'date' ? ' type="date"' : '') + ' value="' + e(v === null || v === undefined ? '' : f[2] === 'num' ? String(v).replace('.', ',') : v) + '" data-c="fatCampo" data-id="' + e(f[1]) + '" data-t="' + (f[2] || '') + '"><small>' + e(TXT_N[n]) + '</small></div>';
    }).join('');
    var pp = (d.consumo.por_periodo_horario || []).length ? '<p class="ps-small ps-mut">By time-of-use period: ' + e(d.consumo.por_periodo_horario.map(function (x) { return x.periodo.replace('_', ' ') + ' ' + P.fmtNum(x.kwh, 0) + ' kWh'; }).join(', ')) + '</p>' : '';
    var l = tasksAlvo(), inds = m ? m.indicadores.filter(function (id) { return ENERGIA(P.cat(id)) && !P.eOutput(P.cat(id)); }) : [];
    var mwh = parte.kwh === null || parte.kwh === undefined ? null : (c && c.unidade_medida === 'kWh' ? parte.kwh : parte.kwh / 1000);
    var destino = '<div class="fat-dest"><h3>Where the values go</h3>' +
      (l.length ? campo('fat-ms', 'Task', '<select id="fat-ms" class="ps-sel" data-pesq data-c="fatMs">' + l.map(function (x) { return opt(x.id, x.nome + ' (' + P.rotPeriodo(x) + ', ' + x.empresa + ')', F.ms); }).join('') + '</select>') +
        campo('fat-ind', 'Indicator', '<select id="fat-ind" class="ps-sel" data-c="fatInd">' + inds.map(function (id) { return opt(id, id + ' ' + P.cat(id).nome + ' (' + P.cat(id).unidade_medida + ')', F.ind); }).join('') + '</select>') +
        (parte.total && parte.dias !== parte.total ? '<div class="ps-aviso info ps-small">The invoice covers ' + parte.total + ' days and ' + parte.dias + ' of them are in ' + e(per.nome) + ': only that part goes to this task (' + e(P.fmtNum(parte.kwh, 0)) + ' kWh). Read the same invoice in the task of the other period for the rest.</div>' : '') +
        (mwh !== null && c ? '<p class="fat-val">Value to add: <b>' + e(P.fmtNum(mwh, c.unidade_medida === 'kWh' ? 0 : 3)) + ' ' + e(c.unidade_medida) + '</b><small>It is added to ' + e(c.nome) + ' as one entry for CPE ' + e(d.fornecimento.cpe || '?') + ', with the invoice as evidence.</small></p>' : '') +
        (m && m.indicadores.indexOf('E03') > -1 && d.rotulagem.renovavel_pct !== undefined && d.rotulagem.renovavel_pct !== null ? '<label class="ps-chk"><input id="fat-e03" type="checkbox" data-c="fatE03"' + (F.e03 !== false ? ' checked' : '') + '> Also fill E03 Renewable electricity with ' + e(P.fmtNum(d.rotulagem.renovavel_pct, 1)) + '%</label>' : '')
        : '<div class="ps-aviso warn">No open task with an electricity indicator is in collection with you. The invoice is saved as a document; the values are kept with it.</div>') + '</div>';
    var prev = F.lido.imagem ? '<img class="fat-img" src="' + F.lido.imagem + '" alt="First page of ' + e(F.nome) + '">' : '<div class="ps-aviso">No preview.</div>';
    return { t: 'Check the values read from ' + F.nome, s: (F.lido.metodo === 'ocr' ? 'Read by OCR' : 'Read from the PDF text') + (d.leitura.qr ? ' and the AT QR code' : ', no AT QR code found') + '. Nothing is saved until you confirm.', largo: true, cls: 'alto',
      b: '<div class="fat-g"><div class="fat-prev">' + prev + '</div><div class="fat-campos"><div class="fat-leg"><span class="alta">High confidence</span><span class="media">Check</span><span class="baixa">Low</span><span class="nada">Not found</span></div><div class="fat-cg">' + campos + '</div>' + pp + destino + '</div></div>',
      p: '<span class="ps-sp-flex"></span><button type="button" class="ps-btn" data-a="fatFechar">Cancel</button><button type="button" class="ps-btn" data-a="fatGuardarSo">Save as document only</button>' + (l.length && c ? '<button type="button" class="ps-btn pri" data-a="fatAplicar">Confirm and add to ' + e(F.ind) + '</button>' : '') };
  };
  X.C.fatCampo = function (el) {
    var v = el.value.trim(), t = el.dataset.t;
    por(U.fat.d, el.dataset.id, v === '' ? null : t === 'num' ? P.lerNumero(v) : v);
    U.fat.d.leitura.confianca[el.dataset.id] = 1;
    R();
  };
  X.C.fatMs = function (el) { var m = P.ms(el.value); U.fat.ms = el.value; U.fat.ind = m ? m.indicadores.filter(function (id) { return ENERGIA(P.cat(id)) && !P.eOutput(P.cat(id)); })[0] : ''; R(); };
  X.C.fatInd = function (el) { U.fat.ind = el.value; R(); };
  X.C.fatE03 = function (el) { U.fat.e03 = el.checked; };
  X.A.fatFechar = function () { U.fat = null; U.painel = null; R(); };
  /* Guardar so como documento: a fatura e os valores lidos ficam no documento, sem mexer em indicadores */
  var registoDoc = function (F, usr) {
    var mS = F.ms ? P.ms(F.ms) : null;
    return { id: 'ev' + Date.now() + Math.random().toString(36).slice(2, 5), ficheiro: F.nome, por: usr.nome, em: new Date().toISOString(), fid: F.fid, fatura: F.d, tipoDoc: 'Invoice', sp: P.pastaSP ? P.pastaSP(mS, F.ind && mS ? [F.ind] : []) : '' };
  };
  X.A.fatGuardarSo = function () {
    var F = U.fat, usr = u(), m = F.ms ? P.ms(F.ms) : (F.pref.ms ? P.ms(F.pref.ms) : null);
    if (m) { (m.documentos_gerais = m.documentos_gerais || []).push(registoDoc(F, usr)); P.evento(m, 'Invoice saved as a document: ' + F.nome + '.', usr.nome); }
    else { var rg = registoDoc(F, usr); rg.solto = true; (S.docs = S.docs || []).push(rg); }
    P.guardar(); U.fat = null; U.painel = null; toast('Invoice saved as a document, with the values read.', 'ok'); R();
  };
  X.A.fatAplicar = function () {
    var F = U.fat, usr = u(), m = P.ms(F.ms), id = F.ind, c = P.cat(id), d = F.d, per = P.periodo(m.periodo), parte = P.parteNoPeriodo(d, per);
    if (!m || !c) return toast('Choose the task and the indicator.', 'err');
    if (!P.podePreencher(m, usr)) return toast('This task is not in collection with you.', 'err');
    var it = P.item(id, P.chave(m));
    if (it.submetido || it.revisto) return toast(c.nome + ' is already submitted. Reopen it first.', 'err');
    if (parte.kwh === null || parte.kwh === undefined) return toast('The active energy (kWh) is missing.', 'err');
    var v = c.unidade_medida === 'kWh' ? parte.kwh : parte.kwh / 1000, casas = c.casas_decimais === undefined ? 3 : Math.max(c.casas_decimais, 3);
    /* Cada fatura e uma entrada (por CPE): varias faturas do mesmo periodo somam-se */
    var linhas = (it.entradas || []).map(function (l) { return { local: l.local, doc: l.doc, valor: l.valor, peso: l.peso }; });
    if (!linhas.length && it.valor !== null) linhas.push({ local: 'Value before the invoices', doc: '', valor: String(it.valor).replace('.', ','), peso: '1' });
    var local = 'CPE ' + (d.fornecimento.cpe || '?') + (d.fornecimento.periodo_inicio ? ', ' + P.fmtData(d.fornecimento.periodo_inicio) + '–' + P.fmtData(d.fornecimento.periodo_fim) : '');
    linhas = linhas.filter(function (l) { return l.doc !== F.nome; });
    linhas.push({ local: local, doc: F.nome, valor: String(Number(v.toFixed(casas))).replace('.', ','), peso: '1' });
    var r = P.gravarEntradas(m, id, linhas, 'soma', usr);
    if (r.erro) return toast(r.erro, 'err');
    it.qualidade = 'medido'; it.fonte = 'Invoice ' + (d.fornecedor.nome || '') + ' ' + (d.fatura.numero || F.nome);
    var vs = it.versoes[it.versoes.length - 1]; if (vs) vs.origem = 'invoice ' + F.nome + (d.leitura.metodo === 'ocr' ? ' (OCR)' : '');
    var reg = registoDoc(F, usr); reg.aplicado = { ind: id, valor: v, em: reg.em, parte: parte };
    if (!it.evidencias.some(function (x) { return x.fid === F.fid; })) it.evidencias.push(reg);
    var msg = P.fmtNum(v, 3) + ' ' + c.unidade_medida + ' added to ' + c.nome;
    if (F.e03 !== false && m.indicadores.indexOf('E03') > -1 && d.rotulagem.renovavel_pct !== null && d.rotulagem.renovavel_pct !== undefined) {
      var it3 = P.item('E03', P.chave(m));
      if (!it3.submetido && !it3.revisto) { P.gravarValor(m, 'E03', String(d.rotulagem.renovavel_pct).replace('.', ','), usr, 'invoice ' + F.nome); msg += ', E03 set to ' + P.fmtNum(d.rotulagem.renovavel_pct, 1) + '%'; }
    }
    P.evento(m, 'Invoice read (' + (d.leitura.metodo === 'ocr' ? 'OCR' : 'PDF text') + (d.leitura.qr ? ' and AT QR code' : '') + ') and confirmed: ' + F.nome + '. ' + msg + '.', usr.nome);
    P.guardar(); U.fat = null; U.painel = null; toast(msg + '. The invoice is attached as evidence.', 'ok'); R();
  };
})();
