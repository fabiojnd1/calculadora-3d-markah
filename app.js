(function () {
  "use strict";

  var PADRAO = {
    precoRolo: 120,
    pesoRolo: 1000,
    tarifa: 1.03,
    potencia: 120,
    valorMaquina: 4500,
    vidaUtil: 5000,
    embalagem: 3,
    falha: 8,
    margem: 100
  };

  var CHAVE = "markah3d:config";
  var CHAVE_LEGADA = "custo3d:config";
  var config = Object.assign({}, PADRAO);

  var COR = {
    filamento: "#F4511E",
    energia: "#14615C",
    maquina: "#3C4043",
    falha: "#C8B896",
    embalagem: "#8E9BA6"
  };

  var el = function (id) {
    return document.getElementById(id);
  };

  /* ---------- Armazenamento Local ---------- */
  var deposito = {
    ler: function () {
      try {
        var bruto = window.localStorage.getItem(CHAVE) || window.localStorage.getItem(CHAVE_LEGADA);
        return Promise.resolve(bruto ? JSON.parse(bruto) : null);
      } catch (e) {
        return Promise.resolve(null);
      }
    },
    gravar: function (obj) {
      try {
        window.localStorage.setItem(CHAVE, JSON.stringify(obj));
      } catch (e) {}
      return Promise.resolve();
    }
  };

  /* ---------- Conversão e Formatação de Números ---------- */
  function num(v) {
    if (v === null || v === undefined) return 0;
    var s = String(v).trim().replace(/[^\d,.-]/g, "");
    if (!s) return 0;
    if (s.indexOf(",") > -1) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, "");
    }
    var n = parseFloat(s);
    return isFinite(n) ? n : 0;
  }

  function horasDe(v) {
    var s = String(v || "").trim().toLowerCase().replace(/\s/g, "");
    if (!s) return 0;

    // Formato 3h54 ou 3:54 ou 3h54m
    var m = s.match(/^(\d+)[h:](\d{1,2})/);
    if (m) {
      return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
    }

    // Formato apenas minutos: ex 45m ou 45min
    var mMin = s.match(/^(\d+)m(?:in)?$/);
    if (mMin) {
      return parseInt(mMin[1], 10) / 60;
    }

    return num(s);
  }

  function hMin(h) {
    var inteiras = Math.floor(h);
    var min = Math.round((h - inteiras) * 60);
    if (min === 60) {
      inteiras += 1;
      min = 0;
    }
    return inteiras + "h" + (min < 10 ? "0" : "") + min;
  }

  function reais(n) {
    return "R$ " + n.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function decimal(n, casas) {
    return n.toLocaleString("pt-BR", {
      minimumFractionDigits: casas,
      maximumFractionDigits: casas
    });
  }

  function mostrarToast(mensagem) {
    var toast = el("toast");
    if (!toast) return;
    toast.textContent = mensagem;
    toast.classList.add("visivel");
    setTimeout(function () {
      toast.classList.remove("visivel");
    }, 2500);
  }

  /* ---------- Depreciação ---------- */
  var depPct = 100;
  var depManual = null;
  var chipsDep = Array.prototype.slice.call(document.querySelectorAll("#chipsDep .chip"));

  chipsDep.forEach(function (c) {
    c.addEventListener("click", function () {
      chipsDep.forEach(function (x) {
        x.setAttribute("aria-pressed", x === c ? "true" : "false");
      });
      var v = c.getAttribute("data-d");
      if (v === "manual") {
        el("caixaDep").style.display = "block";
        el("depManual").focus();
        depManual = el("depManual").value.trim() === "" ? null : num(el("depManual").value);
      } else {
        el("caixaDep").style.display = "none";
        depManual = null;
        depPct = num(v);
      }
    });
  });

  el("depManual").addEventListener("input", function () {
    depManual = this.value.trim() === "" ? null : num(this.value);
  });

  /* ---------- Margem de Lucro ---------- */
  var margemAtual = PADRAO.margem;
  var chips = Array.prototype.slice.call(document.querySelectorAll("#chipsMargem .chip"));

  function pintarChips(alvo) {
    chips.forEach(function (c) {
      c.setAttribute("aria-pressed", c === alvo ? "true" : "false");
    });
  }

  chips.forEach(function (c) {
    c.addEventListener("click", function () {
      pintarChips(c);
      var v = c.getAttribute("data-m");
      if (v === "outro") {
        el("caixaOutro").style.display = "block";
        el("margemOutro").focus();
        margemAtual = num(el("margemOutro").value);
      } else {
        el("caixaOutro").style.display = "none";
        margemAtual = num(v);
      }
      salvarConfig();
    });
  });

  el("margemOutro").addEventListener("input", function () {
    margemAtual = num(this.value);
    salvarConfig();
  });

  /* ---------- Valores Fixos ---------- */
  var camposFixos = [
    "precoRolo",
    "pesoRolo",
    "tarifa",
    "potencia",
    "valorMaquina",
    "vidaUtil",
    "embalagem",
    "falha"
  ];

  function pintarFixos() {
    camposFixos.forEach(function (k) {
      var elem = el(k);
      if (elem && config[k] !== undefined) {
        elem.value = config[k].toLocaleString("pt-BR", {
          useGrouping: false,
          minimumFractionDigits: 0,
          maximumFractionDigits: (k === "tarifa" ? 3 : 2)
        });
      }
    });

    if (config.margem === 50 || config.margem === 75 || config.margem === 100) {
      chips.forEach(function (c) {
        if (num(c.getAttribute("data-m")) === config.margem) pintarChips(c);
      });
      el("caixaOutro").style.display = "none";
    } else if (config.margem) {
      pintarChips(chips[3]);
      el("caixaOutro").style.display = "block";
      el("margemOutro").value = decimal(config.margem, 0);
    }
    margemAtual = config.margem;
  }

  var avisoTempo;
  function salvarConfig() {
    camposFixos.forEach(function (k) {
      var elem = el(k);
      if (elem) config[k] = num(elem.value);
    });
    config.margem = margemAtual;
    deposito.gravar(config);

    var s = el("statusFixos");
    if (s) {
      s.className = "status sucesso";
      s.textContent = "✓ Valores fixos guardados com sucesso";
      clearTimeout(avisoTempo);
      avisoTempo = setTimeout(function () {
        s.textContent = "";
      }, 1800);
    }
  }

  camposFixos.forEach(function (k) {
    var elem = el(k);
    if (elem) {
      elem.addEventListener("change", salvarConfig);
    }
  });

  /* Estado do último cálculo */
  var ultimoCalculo = null;

  /* ---------- Cálculo do Preço ---------- */
  function calcular() {
    camposFixos.forEach(function (k) {
      var elem = el(k);
      if (elem) config[k] = num(elem.value);
    });

    var peso = num(el("peso").value);
    var horas = horasDe(el("tempo").value);
    var qtd = Math.max(1, Math.round(num(el("qtd").value) || 1));

    var st = el("statusFoto");

    if (peso <= 0 || horas <= 0) {
      st.className = "status erro";
      st.textContent = "Preencha o peso (g) e o tempo da impressão para calcular.";
      return;
    }

    var pesoRolo = config.pesoRolo > 0 ? config.pesoRolo : 1000;
    var vidaUtil = config.vidaUtil > 0 ? config.vidaUtil : 1;

    var filamento = (peso / pesoRolo) * config.precoRolo;
    var energia = (config.potencia / 1000) * horas * config.tarifa;
    var maquinaCheia = horas * (config.valorMaquina / vidaUtil);
    var maquina, notaMaquina;

    if (depManual !== null) {
      maquina = depManual;
      notaMaquina = "valor fixado";
    } else {
      maquina = maquinaCheia * (depPct / 100);
      notaMaquina = decimal(horas, 2) + " h" + (depPct < 100 ? " · " + decimal(depPct, 0) + "%" : "");
    }

    var base = filamento + energia + maquina;
    var falha = base * (config.falha / 100);
    var embalagem = config.embalagem;

    var custo = base + falha + embalagem;
    var preco = custo * (1 + margemAtual / 100);
    var lucro = preco - custo;

    var nome = el("nome").value.trim() || "Peça 3D Personalizada";

    ultimoCalculo = {
      nome: nome,
      peso: peso,
      horas: horas,
      qtd: qtd,
      filamento: filamento,
      energia: energia,
      maquina: maquina,
      falha: falha,
      embalagem: embalagem,
      custo: custo,
      preco: preco,
      lucro: lucro,
      margem: margemAtual
    };

    var linhas = [
      ["Filamento", filamento, COR.filamento, decimal(peso, 0) + " g"],
      ["Energia", energia, COR.energia, decimal((config.potencia / 1000) * horas, 2) + " kWh · " + hMin(horas)],
      ["Máquina", maquina, COR.maquina, notaMaquina],
      ["Falha e retrabalho", falha, COR.falha, decimal(config.falha, 0) + "%"],
      ["Embalagem", embalagem, COR.embalagem, ""]
    ];

    // Barra empilhada visual
    var pilha = "";
    linhas.forEach(function (l) {
      var p = custo > 0 ? (l[1] / custo) * 100 : 0;
      pilha += '<span style="width:' + p.toFixed(2) + '%;background:' + l[2] + '" title="' + l[0] + ': ' + reais(l[1]) + '"></span>';
    });
    el("pilha").innerHTML = pilha;

    // Tabela descritiva
    var html = "";
    linhas.forEach(function (l) {
      html += '<tr><td><span class="marca" style="background:' + l[2] + '"></span>' + l[0] +
        (l[3] ? ' <span style="color:#6B6E70">' + l[3] + '</span>' : '') +
        '</td><td>' + reais(l[1]) + '</td></tr>';
    });
    html += '<tr class="total"><td>Custo de uma peça</td><td>' + reais(custo) + '</td></tr>';
    if (qtd > 1) {
      html += '<tr class="lote"><td>Custo total das ' + qtd + ' peças</td><td>' + reais(custo * qtd) + '</td></tr>';
    }
    el("tabela").innerHTML = html;

    // Valores em destaque
    el("precoFinal").textContent = reais(preco);
    el("linhaLucro").textContent = "Lucro de " + reais(lucro) + " por peça · markup de " + decimal(margemAtual, 0) + "%";

    el("linhaLote").textContent = qtd > 1
      ? qtd + " peças fecham em " + reais(preco * qtd) + ", com lucro total de " + reais(lucro * qtd)
      : "";

    el("avisoUnitario").textContent = "Abaixo de " + reais(custo) + " você trabalha sem lucro.";

    // Cabeçalho da folha para PDF / Impressão
    el("folhaNome").textContent = nome;
    el("folhaData").textContent = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    }) + " · " + qtd + (qtd > 1 ? " peças" : " peça");

    el("resultado").classList.add("visivel");
    st.textContent = "";
    st.className = "status";
    salvarConfig();

    el("resultado").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  el("calcular").addEventListener("click", calcular);

  // Tecla Enter nos campos aciona o cálculo
  ["nome", "peso", "tempo", "qtd"].forEach(function (id) {
    var inputElem = el(id);
    if (inputElem) {
      inputElem.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          calcular();
        }
      });
    }
  });

  /* ---------- PDF e Impressão ---------- */
  el("btnPdf").addEventListener("click", function () {
    var nome = el("nome").value.trim();
    var tituloOriginal = document.title;
    if (nome) {
      document.title = "Calculadora 3D Markah - " + nome.replace(/[\\/:*?"<>|]/g, "");
    }
    window.print();
    setTimeout(function () {
      document.title = tituloOriginal;
    }, 1000);
  });

  /* ---------- Copiar para WhatsApp ---------- */
  var btnWhats = el("btnWhats");
  if (btnWhats) {
    btnWhats.addEventListener("click", function () {
      if (!ultimoCalculo) {
        calcular();
      }
      if (!ultimoCalculo) return;

      var texto = "📋 *ORÇAMENTO DE IMPRESSÃO 3D*\n" +
        "-------------------------------\n" +
        "🛠 *Item:* " + ultimoCalculo.nome + "\n" +
        "📦 *Quantidade:* " + ultimoCalculo.qtd + (ultimoCalculo.qtd > 1 ? " unidades" : " unidade") + "\n" +
        "💰 *Preço Unitário:* " + reais(ultimoCalculo.preco) + "\n";

      if (ultimoCalculo.qtd > 1) {
        texto += "💵 *Preço Total (" + ultimoCalculo.qtd + " un):* " + reais(ultimoCalculo.preco * ultimoCalculo.qtd) + "\n";
      }

      texto += "⏱ *Tempo estimado:* " + hMin(ultimoCalculo.horas) + " por peça\n" +
        "-------------------------------\n" +
        "_Calculado com Calculadora 3D Markah_";

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(function () {
          mostrarToast("✓ Orçamento copiado para WhatsApp!");
        }).catch(function () {
          copiarFallback(texto);
        });
      } else {
        copiarFallback(texto);
      }
    });
  }

  function copiarFallback(texto) {
    var area = document.createElement("textarea");
    area.value = texto;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus();
    area.select();
    try {
      document.execCommand("copy");
      mostrarToast("✓ Orçamento copiado para WhatsApp!");
    } catch (e) {
      alert("Não foi possível copiar automaticamente.");
    }
    document.body.removeChild(area);
  }

  /* ---------- Nova Peça ---------- */
  el("btnNova").addEventListener("click", function () {
    ["nome", "peso", "tempo"].forEach(function (k) {
      el(k).value = "";
    });
    el("qtd").value = "1";
    el("resultado").classList.remove("visivel");
    var st = el("statusFoto");
    st.textContent = "";
    st.className = "status";
    ultimoCalculo = null;
    window.scrollTo({ top: 0, behavior: "smooth" });
    el("nome").focus();
  });

  /* ---------- Leitura do Print (Maker World / Bambu Studio) ---------- */
  el("btnFoto").addEventListener("click", function () {
    el("arquivoFoto").click();
  });

  el("arquivoFoto").addEventListener("change", function () {
    var arquivo = this.files && this.files[0];
    if (!arquivo) return;

    var st = el("statusFoto");
    st.className = "status carregando";
    st.textContent = "Processando imagem do print...";

    var leitor = new FileReader();
    leitor.onerror = function () {
      st.className = "status erro";
      st.textContent = "Não foi possível abrir o arquivo selecionado.";
    };
    leitor.onload = function () {
      var base64 = String(leitor.result).split(",")[1];
      tentarLeituraComIAOuOCR(base64, arquivo.type || "image/jpeg", arquivo);
    };
    leitor.readAsDataURL(arquivo);
    this.value = "";
  });

  function tentarLeituraComIAOuOCR(base64, tipo, arquivoOriginal) {
    var st = el("statusFoto");

    // 1. Tentar primeiro o endpoint de API serverless do Vercel (/api/read-print)
    fetch("/api/read-print", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: base64, type: tipo })
    })
      .then(function (r) {
        if (!r.ok) throw new Error("Endpoint API indisponível");
        return r.json();
      })
      .then(function (dados) {
        aplicarDadosExtraidos(dados);
      })
      .catch(function () {
        // 2. Fallback: OCR no próprio navegador via Tesseract.js (sem chaves ou servidor)
        executarOCRLFS(arquivoOriginal);
      });
  }

  function aplicarDadosExtraidos(lido) {
    var st = el("statusFoto");
    var achou = [];

    if (lido.gramas !== null && lido.gramas !== undefined && !isNaN(Number(lido.gramas))) {
      el("peso").value = decimal(Number(lido.gramas), 0);
      achou.push(decimal(Number(lido.gramas), 0) + " g");
    }

    if (lido.horas !== null && lido.horas !== undefined && !isNaN(Number(lido.horas))) {
      var h = Number(lido.horas);
      el("tempo").value = decimal(h, 2);
      achou.push(decimal(h, 2) + " h");
    }

    if (lido.nome && !el("nome").value.trim()) {
      el("nome").value = lido.nome;
    }

    if (achou.length > 0) {
      st.className = "status sucesso";
      st.textContent = "✓ Dados identificados: " + achou.join(" e ") + ". Confira os valores e clique em Calcular.";
    } else {
      st.className = "status erro";
      st.textContent = "Não foi possível identificar peso ou tempo nesta imagem. Insira os dados manualmente.";
    }
  }

  /* OCR Local com Tesseract.js sob demanda */
  function executarOCRLFS(arquivo) {
    var st = el("statusFoto");
    st.className = "status carregando";
    st.textContent = "Analisando texto do print (OCR local)...";

    carregarTesseract(function (err) {
      if (err || !window.Tesseract) {
        st.className = "status erro";
        st.textContent = "Não foi possível carregar o leitor OCR. Digite os dados manualmente.";
        return;
      }

      window.Tesseract.recognize(arquivo, "eng+por", {
        logger: function (m) {
          if (m.status === "recognizing text" && m.progress) {
            st.textContent = "Lendo imagem... " + Math.round(m.progress * 100) + "%";
          }
        }
      })
        .then(function (result) {
          var texto = (result && result.data && result.data.text) ? result.data.text : "";
          analisarTextoExtraido(texto);
        })
        .catch(function () {
          st.className = "status erro";
          st.textContent = "Não foi possível reconhecer o texto da imagem. Digite os dados nos campos.";
        });
    });
  }

  function carregarTesseract(callback) {
    if (window.Tesseract) return callback(null);
    var script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.onload = function () {
      callback(null);
    };
    script.onerror = function () {
      callback(new Error("Falha ao carregar Tesseract"));
    };
    document.head.appendChild(script);
  }

  function analisarTextoExtraido(texto) {
    var st = el("statusFoto");
    var gramas = null;
    var horas = null;

    // Procura peso em gramas: ex: "120 g", "120g", "PLA: 120 g", "Filament: 85g"
    var mPeso = texto.match(/(\d+[.,]?\d*)\s*(?:g|gramas?|gr)\b/i);
    if (mPeso) {
      gramas = num(mPeso[1]);
    }

    // Procura tempo: ex: "3h 54m", "3h54min", "3h 54", "3:54", "3.9 h", "3,9h"
    var mTempoHM = texto.match(/(\d+)\s*h(?:oras?)?\s*(\d{1,2})\s*m(?:in)?/i);
    if (mTempoHM) {
      horas = parseInt(mTempoHM[1], 10) + parseInt(mTempoHM[2], 10) / 60;
    } else {
      var mTempoH = texto.match(/(\d+[.,]?\d*)\s*h(?:oras?)?\b/i);
      if (mTempoH) {
        horas = num(mTempoH[1]);
      }
    }

    if (gramas || horas) {
      aplicarDadosExtraidos({ gramas: gramas, horas: horas });
    } else {
      st.className = "status";
      st.textContent = "Não foi possível localizar o peso e o tempo no print. Digite diretamente nos campos.";
    }
  }

  /* ---------- Inicialização ---------- */
  Promise.resolve(deposito.ler()).then(function (salvo) {
    if (salvo) config = Object.assign({}, PADRAO, salvo);
    pintarFixos();
  });
})();
