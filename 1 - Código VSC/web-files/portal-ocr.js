/* ============================================================================
   portal-ocr.js - OCR no browser com PaddleOCR PP-OCRv5 (ONNX Runtime Web)

   Corre todo no navegador, sem servidor nem chaves:
   - Detecao de texto (DBNet) e reconhecimento (SVTR, multilingue, com acentos e €),
     os modelos PP-OCRv5 mobile da PaddleOCR (Apache-2.0), servidos pelo jsDelivr.
   - Usa a placa grafica (WebGPU) quando o browser a tem, senao WebAssembly.
   - Devolve o texto linha a linha, com as colunas separadas por espacos, como as
     regras de leitura de faturas esperam.
   As bibliotecas e os modelos (cerca de 40 MB) so se descarregam na primeira
   leitura e ficam na cache do browser. Se falharem, portal-faturas.js volta ao Tesseract.
   ============================================================================ */
(function () {
  'use strict';
  var ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
  var MOD = 'https://cdn.jsdelivr.net/npm/pdfmarkdown-ppocrv5-models@1.0.0/';
  var URLS = {
    ort: ORT + 'ort.webgpu.min.js',
    det: MOD + 'detection/PP-OCRv5_mobile_det_infer.ort',
    rec: MOD + 'recognition/PP-OCRv5_mobile_rec_infer.onnx',
    dict: MOD + 'recognition/ppocrv5_dict.txt'
  };
  var CFG = { ladoMax: 1600, limiar: 0.3, minCaixa: 0.6, unclip: 1.6, altura: 48, lote: 8 };

  var carregar = function (url) {
    return new Promise(function (ok, falha) {
      var s = document.createElement('script'); s.src = url; s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { falha(new Error('Could not load the OCR engine. Check the internet connection.')); };
      document.head.appendChild(s);
    });
  };
  var motor = null;
  /* Sessoes criadas uma vez por pagina: WebGPU se houver, senao WebAssembly */
  var iniciar = function (progresso) {
    if (motor) return motor;
    motor = (window.ort ? Promise.resolve() : carregar(URLS.ort)).then(function () {
      var ort = window.ort;
      ort.env.wasm.wasmPaths = ORT;
      ort.env.wasm.numThreads = window.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1;
      var buscar = function (url, tipo) { return fetch(url).then(function (r) { if (!r.ok) throw new Error('OCR model ' + r.status); return tipo === 'txt' ? r.text() : r.arrayBuffer(); }); };
      if (progresso) progresso(2);
      return Promise.all([buscar(URLS.det), buscar(URLS.rec), buscar(URLS.dict, 'txt')]).then(function (r) {
        if (progresso) progresso(8);
        var criar = function (buf, eps) { return ort.InferenceSession.create(new Uint8Array(buf), { executionProviders: eps, graphOptimizationLevel: 'all' }); };
        var comGPU = !!navigator.gpu;
        var sessoes = function (eps) { return Promise.all([criar(r[0], eps), criar(r[1], eps)]); };
        return (comGPU ? sessoes(['webgpu', 'wasm']).catch(function () { comGPU = false; return sessoes(['wasm']); }) : sessoes(['wasm'])).then(function (s) {
          return { ort: ort, det: s[0], rec: s[1], dict: r[2].split(/\r?\n/), gpu: comGPU };
        });
      });
    }).catch(function (err) { motor = null; throw err; });
    return motor;
  };

  /* --- Imagem para tensor (BGR, como no PaddleOCR) ----------------------------------------- */
  var canvasDe = function (w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  var pixeis = function (cv) { return cv.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height).data; };

  /* --- Detecao: mapa de probabilidade -> caixas de texto ----------------------------------- */
  var detetar = function (M, fonte) {
    var esc = Math.min(1, CFG.ladoMax / Math.max(fonte.width, fonte.height));
    var w = Math.max(32, Math.round(fonte.width * esc / 32) * 32), h = Math.max(32, Math.round(fonte.height * esc / 32) * 32);
    var cv = canvasDe(w, h), ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(fonte, 0, 0, w, h);
    var px = pixeis(cv), n = w * h, dados = new Float32Array(3 * n);
    var media = [0.485, 0.456, 0.406], desvio = [0.229, 0.224, 0.225];
    for (var i = 0; i < n; i++) {
      /* BGR: canal 0 = azul */
      dados[i] = (px[i * 4 + 2] / 255 - media[0]) / desvio[0];
      dados[n + i] = (px[i * 4 + 1] / 255 - media[1]) / desvio[1];
      dados[2 * n + i] = (px[i * 4] / 255 - media[2]) / desvio[2];
    }
    var ent = {}; ent[M.det.inputNames[0]] = new M.ort.Tensor('float32', dados, [1, 3, h, w]);
    return M.det.run(ent).then(function (out) {
      var prob = out[M.det.outputNames[0]].data, visto = new Uint8Array(n), caixas = [], fila = new Int32Array(n);
      var sx = fonte.width / w, sy = fonte.height / h;
      for (var p = 0; p < n; p++) {
        if (visto[p] || prob[p] <= CFG.limiar) continue;
        /* Componente ligada (8 vizinhos) */
        var ini = 0, fim = 0, x0 = w, y0 = h, x1 = 0, y1 = 0, soma = 0, cont = 0;
        fila[fim++] = p; visto[p] = 1;
        while (ini < fim) {
          var q = fila[ini++], qx = q % w, qy = (q - qx) / w;
          soma += prob[q]; cont++;
          if (qx < x0) x0 = qx; if (qx > x1) x1 = qx; if (qy < y0) y0 = qy; if (qy > y1) y1 = qy;
          for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
            var nx = qx + dx, ny = qy + dy;
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            var k = ny * w + nx;
            if (!visto[k] && prob[k] > CFG.limiar) { visto[k] = 1; fila[fim++] = k; }
          }
        }
        var bw = x1 - x0 + 1, bh = y1 - y0 + 1;
        if (bh < 3 || bw < 3 || soma / cont < CFG.minCaixa) continue;
        /* Unclip como no DBNet: alarga a caixa por area * razao / perimetro */
        var d = bw * bh * CFG.unclip / (2 * (bw + bh));
        caixas.push({
          x: Math.max(0, (x0 - d) * sx), y: Math.max(0, (y0 - d) * sy),
          w: Math.min(fonte.width, (x1 + 1 + d) * sx) - Math.max(0, (x0 - d) * sx),
          h: Math.min(fonte.height, (y1 + 1 + d) * sy) - Math.max(0, (y0 - d) * sy)
        });
      }
      return caixas;
    });
  };

  /* --- Reconhecimento: cada caixa -> texto (CTC). A classe 0 e o branco; a linha 0 do dicionario so ocupa o seu lugar -- */
  var reconhecer = function (M, fonte, caixas, progresso) {
    var ordem = caixas.map(function (c, i) { return { i: i, r: c.w / Math.max(1, c.h) }; }).sort(function (a, b) { return a.r - b.r; });
    var res = new Array(caixas.length), lotes = [];
    for (var i = 0; i < ordem.length; i += CFG.lote) lotes.push(ordem.slice(i, i + CFG.lote));
    var H = CFG.altura, feitos = 0;
    return lotes.reduce(function (pr, lote) {
      return pr.then(function () {
        var W = Math.min(3200, Math.max(48, Math.ceil(Math.max.apply(null, lote.map(function (o) { return o.r; })) * H / 8) * 8));
        var n = H * W, dados = new Float32Array(lote.length * 3 * n);
        lote.forEach(function (o, b) {
          var c = caixas[o.i], wi = Math.min(W, Math.max(8, Math.round(H * o.r)));
          var cv = canvasDe(wi, H), ctx = cv.getContext('2d'); ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(fonte, c.x, c.y, c.w, c.h, 0, 0, wi, H);
          var px = pixeis(cv), base = b * 3 * n;
          for (var y = 0; y < H; y++) for (var x = 0; x < wi; x++) {
            var s = (y * wi + x) * 4, t = y * W + x;
            dados[base + t] = px[s + 2] / 127.5 - 1;
            dados[base + n + t] = px[s + 1] / 127.5 - 1;
            dados[base + 2 * n + t] = px[s] / 127.5 - 1;
          }
        });
        var ent = {}; ent[M.rec.inputNames[0]] = new M.ort.Tensor('float32', dados, [lote.length, 3, H, W]);
        return M.rec.run(ent).then(function (out) {
          var o = out[M.rec.outputNames[0]], T = o.dims[1], C = o.dims[2], v = o.data;
          lote.forEach(function (ob, b) {
            var txt = '', ant = 0, soma = 0, k = 0;
            for (var t = 0; t < T; t++) {
              var off = (b * T + t) * C, mx = 0, mi = 0;
              for (var c = 0; c < C; c++) if (v[off + c] > mx) { mx = v[off + c]; mi = c; }
              if (mi !== 0 && mi !== ant) { txt += M.dict[mi] !== undefined ? M.dict[mi] : ' '; soma += mx; k++; }
              ant = mi;
            }
            res[ob.i] = { texto: txt.trim(), conf: k ? soma / k : 0 };
          });
          feitos += lote.length;
          if (progresso) progresso(Math.round(feitos / caixas.length * 100));
        });
      });
    }, Promise.resolve()).then(function () { return res; });
  };

  /* --- Caixas -> linhas, com as colunas separadas por espacos ------------------------------ */
  var linhas = function (itens) {
    itens = itens.filter(function (it) { return it.texto && it.conf > 0.3; }).sort(function (a, b) { return (a.y + a.h / 2) - (b.y + b.h / 2); });
    var ls = [];
    itens.forEach(function (it) {
      var cy = it.y + it.h / 2, l = ls.filter(function (x) { return Math.abs(x.cy - cy) < Math.min(x.h, it.h) * 0.5; })[0];
      if (l) { l.itens.push(it); l.cy = (l.cy * (l.itens.length - 1) + cy) / l.itens.length; l.h = Math.max(l.h, it.h); }
      else ls.push({ cy: cy, h: it.h, itens: [it] });
    });
    return ls.sort(function (a, b) { return a.cy - b.cy; }).map(function (l) {
      var its = l.itens.sort(function (a, b) { return a.x - b.x; }), s = '', fimAnt = null;
      its.forEach(function (it) {
        if (fimAnt !== null) { var larg = it.w / Math.max(1, it.texto.length), esp = Math.max(1, Math.min(12, Math.round((it.x - fimAnt) / Math.max(4, larg)))); s += new Array(esp + 1).join(' '); }
        s += it.texto; fimAnt = it.x + it.w;
      });
      return s;
    }).join('\n');
  };

  /* Le um canvas (pagina ou fotografia). progresso recebe 0 a 100 */
  var ler = function (fonte, progresso) {
    return iniciar(progresso ? function (p) { progresso(p); } : null).then(function (M) {
      return detetar(M, fonte).then(function (caixas) {
        if (progresso) progresso(15);
        return reconhecer(M, fonte, caixas, progresso ? function (p) { progresso(15 + Math.round(p * 0.85)); } : null).then(function (r) {
          var itens = caixas.map(function (c, i) { return { x: c.x, y: c.y, w: c.w, h: c.h, texto: r[i].texto, conf: r[i].conf }; });
          var bons = itens.filter(function (it) { return it.texto; });
          return { texto: linhas(itens), itens: bons, conf: bons.length ? bons.reduce(function (a, it) { return a + it.conf; }, 0) / bons.length : 0, motor: 'paddleocr', gpu: M.gpu };
        });
      });
    });
  };

  window.PortalOCR = { ler: ler, iniciar: iniciar, URLS: URLS };
})();
