// Gateway URL: relative (via nginx proxy) or override for dev
const GATEWAY_URL = window.GATEWAY_URL || "";

// ─── Preset scenarios ────────────────────────────────────────────────────────
// Each preset fills the form and selects a protocol.
// card_number uses the masked format (spaces) for display — stripped on submit.
const PRESETS = [
  {
    label: "Aprovado simples",
    category: "approved",
    fields: {
      card_number: "4111 1111 1111 1111",
      card_holder: "João Silva",
      expiry: "12/27",
      cvv: "123",
      amount: 150,
      currency: "BRL",
      merchant: "Loja XYZ",
      user_id: "user-clean",
      ip_address: "10.10.10.1",
    },
    protocol: "grpc",
  },
  {
    label: "Aprovado (cartão premium)",
    category: "approved",
    fields: {
      card_number: "4222 2222 2222 2222",
      card_holder: "Carlos Premium",
      expiry: "12/27",
      cvv: "321",
      amount: 5000,
      currency: "BRL",
      merchant: "Loja Premium",
      user_id: "user-premium",
      ip_address: "10.10.10.2",
    },
    protocol: "grpc",
  },
  {
    label: "Risco médio (alta velocidade)",
    category: "approved",
    fields: {
      card_number: "4111 1111 1111 1111",
      card_holder: "Usuário 999",
      expiry: "12/27",
      cvv: "123",
      amount: 150,
      currency: "BRL",
      merchant: "Loja Rápida",
      user_id: "user-999",
      ip_address: "10.10.10.3",
    },
    protocol: "rest",
  },
  {
    label: "Negado: IP em blocklist",
    category: "denied",
    fields: {
      card_number: "4111 1111 1111 1111",
      card_holder: "Hacker Tentativo",
      expiry: "12/27",
      cvv: "123",
      amount: 1000,
      currency: "BRL",
      merchant: "Loja Suspeita",
      user_id: "user-hacker",
      ip_address: "172.16.254.1",
    },
    protocol: "grpc",
  },
  {
    label: "Negado: cartão bloqueado",
    category: "denied",
    fields: {
      card_number: "4000 0000 0000 0002",
      card_holder: "Maria Bloqueada",
      expiry: "12/27",
      cvv: "123",
      amount: 50,
      currency: "BRL",
      merchant: "Loja Teste",
      user_id: "user-maria",
      ip_address: "10.10.10.4",
    },
    protocol: "rest",
  },
  {
    label: "Negado: cartão expirado",
    category: "denied",
    fields: {
      card_number: "4000 0000 0000 0069",
      card_holder: "Pedro Expirado",
      expiry: "12/27",
      cvv: "123",
      amount: 50,
      currency: "BRL",
      merchant: "Loja Teste",
      user_id: "user-pedro",
      ip_address: "10.10.10.5",
    },
    protocol: "rest",
  },
  {
    label: "Negado: limite insuficiente",
    category: "denied",
    fields: {
      card_number: "4000 0000 0000 0119",
      card_holder: "Ana Limite",
      expiry: "12/27",
      cvv: "456",
      amount: 600,
      currency: "BRL",
      merchant: "Eletrônicos",
      user_id: "user-ana",
      ip_address: "10.10.10.6",
    },
    protocol: "grpc",
  },
  {
    label: "Negado: excede limite disponível",
    category: "denied",
    fields: {
      card_number: "4111 1111 1111 1111",
      card_holder: "Gastador Demais",
      expiry: "12/27",
      cvv: "123",
      amount: 9000,
      currency: "BRL",
      merchant: "Loja Grande",
      user_id: "user-gastador",
      ip_address: "10.10.10.7",
    },
    protocol: "rest",
  },
];

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const form = document.getElementById("payment-form");
const payBtn = document.getElementById("pay-btn");
const btnText = document.getElementById("btn-text");
const btnSpinner = document.getElementById("btn-spinner");

const resultPlaceholder = document.getElementById("result-placeholder");
const resultCard = document.getElementById("result-card");
const resultError = document.getElementById("result-error");

// ─── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.querySelector(`[data-tab="${tab}"]`).classList.add("active");

  document.getElementById("view-checkout").hidden = tab !== "checkout";
  document.getElementById("view-dashboard").hidden = tab !== "dashboard";
  document.getElementById("presets-bar").style.display =
    tab === "checkout" ? "" : "none";

  if (tab === "dashboard") loadDashboard();
}

// ─── Preset rendering ─────────────────────────────────────────────────────────
function renderPresets() {
  const list = document.getElementById("presets-list");

  list.innerHTML = "";

  PRESETS.forEach((p, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "preset-btn " + p.category;
    btn.textContent = p.label;
    btn.onclick = () => applyPreset(i);
    list.appendChild(btn);
  });
}

function applyPreset(idx) {
  const p = PRESETS[idx];
  const f = p.fields;

  document.getElementById("card_number").value = f.card_number;
  document.getElementById("card_holder").value = f.card_holder;
  document.getElementById("expiry").value = f.expiry;
  document.getElementById("cvv").value = f.cvv;
  document.getElementById("amount").value = f.amount;
  document.getElementById("currency").value = f.currency;
  document.getElementById("merchant").value = f.merchant;
  document.getElementById("user_id").value = f.user_id || "";
  document.getElementById("ip_address").value = f.ip_address || "";

  // Update currency prefix
  const map = { BRL: "R$", USD: "US$", EUR: "€" };
  document.getElementById("currency-prefix").textContent =
    map[f.currency] || f.currency;

  // Set protocol radio
  form.querySelectorAll('input[name="protocol"]').forEach((r) => {
    r.checked = r.value === p.protocol;
  });

  // Scroll to top of form
  document
    .getElementById("view-checkout")
    .scrollIntoView({ behavior: "smooth", block: "start" });
}

// ─── Input masks ───────────────────────────────────────────────────────────────
document.getElementById("card_number").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 16);
  e.target.value = v.replace(/(.{4})/g, "$1 ").trim();
});

document.getElementById("expiry").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
  e.target.value = v;
});

document.getElementById("cvv").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
});

document.getElementById("currency").addEventListener("change", (e) => {
  const map = { BRL: "R$", USD: "US$", EUR: "€" };
  document.getElementById("currency-prefix").textContent =
    map[e.target.value] || e.target.value;
});

// ─── Payment form submit ───────────────────────────────────────────────────────
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const protocol = form.querySelector('input[name="protocol"]:checked').value;
  const payload = buildFormPayload();
  if (!validate(payload)) return;

  setLoading(true, protocol);
  hideResults();

  const clientStart = performance.now();

  try {
    const res = await fetch(`${GATEWAY_URL}/api/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Protocol": protocol,
        "X-Source": "ui",
      },
      body: JSON.stringify(payload),
    });

    const clientMs = Math.round(performance.now() - clientStart);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      showError(`Erro ${res.status}: ${err.detail || JSON.stringify(err)}`);
      return;
    }

    const data = await res.json();
    showResult(data, clientMs);

    // fire-and-forget: report client-side latency so dashboard can show both
    fetch(`${GATEWAY_URL}/api/history/client-latency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ samples: [{ transaction_id: data.transaction_id, protocol, client_latency_ms: clientMs }] }),
    }).catch(() => {});
  } catch (err) {
    showError(`Falha na conexão com o gateway: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

function buildFormPayload() {
  return {
    card_number: form.card_number.value.replace(/\s/g, ""),
    card_holder: form.card_holder.value.trim(),
    expiry: form.expiry.value.trim(),
    cvv: form.cvv.value.trim(),
    amount: parseFloat(form.amount.value),
    currency: form.currency.value,
    merchant: form.merchant.value.trim(),
    user_id: form.user_id.value.trim(),
    ip_address: form.ip_address.value.trim(),
  };
}

function buildPresetPayload(preset) {
  const f = preset.fields;
  const payload = {
    card_number: f.card_number.replace(/\s/g, ""),
    card_holder: f.card_holder,
    expiry: f.expiry,
    cvv: f.cvv,
    amount: f.amount,
    currency: f.currency,
    merchant: f.merchant,
  };
  if (f.user_id) payload.user_id = f.user_id;
  if (f.ip_address) payload.ip_address = f.ip_address;
  return payload;
}

function validate(p) {
  if (!/^\d{13,19}$/.test(p.card_number)) {
    alert("Número do cartão inválido.");
    return false;
  }
  if (!p.card_holder) {
    alert("Informe o titular do cartão.");
    return false;
  }
  if (!/^\d{2}\/\d{2}$/.test(p.expiry)) {
    alert("Validade no formato MM/AA.");
    return false;
  }
  if (!/^\d{3,4}$/.test(p.cvv)) {
    alert("CVV inválido.");
    return false;
  }
  if (!p.amount || p.amount <= 0) {
    alert("Informe um valor válido.");
    return false;
  }
  if (!p.merchant) {
    alert("Informe o estabelecimento.");
    return false;
  }
  if (!p.user_id) {
    alert("Informe o User ID.");
    return false;
  }
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(p.ip_address)) {
    alert("Informe um IP válido (ex: 10.10.10.1).");
    return false;
  }
  return true;
}

function setLoading(on, protocol) {
  payBtn.disabled = on;
  btnSpinner.classList.toggle("hidden", !on);
  btnText.textContent = on
    ? `Processando via ${protocol ? protocol.toUpperCase() : ""}…`
    : "Pagar Agora";
}

function hideResults() {
  resultPlaceholder.classList.add("hidden");
  resultCard.classList.add("hidden");
  resultError.classList.add("hidden");
}

function showResult(data, clientMs) {
  const approved = data.status === "APPROVED";

  resultCard.className = "result-card " + (approved ? "approved" : "denied");
  document.getElementById("result-icon").textContent = approved ? "✔" : "✘";
  document.getElementById("result-status").textContent = approved
    ? "APROVADO"
    : "NEGADO";
  document.getElementById("res-tx-id").textContent = data.transaction_id;

  const rowReason = document.getElementById("row-reason");
  if (!approved && data.reason) {
    rowReason.style.display = "";
    document.getElementById("res-reason").textContent = data.reason;
  } else {
    rowReason.style.display = "none";
  }

  const score = (data.fraud_score * 100).toFixed(1);
  document.getElementById("res-fraud-score").textContent = `${score}%`;

  const riskEl = document.getElementById("res-risk");
  riskEl.textContent = data.risk_level;
  riskEl.className = "badge " + data.risk_level;

  document.getElementById("row-auth-code").style.display = approved
    ? ""
    : "none";
  document.getElementById("res-auth-code").textContent =
    data.authorization_code;

  document.getElementById("row-balance").style.display = approved ? "" : "none";
  const curr = document.getElementById("currency").value;
  document.getElementById("res-balance").textContent =
    `${curr} ${data.remaining_balance?.toFixed(2)}`;

  document.getElementById("res-protocol").textContent =
    data.protocol_used?.toUpperCase();
  document.getElementById("res-latency").textContent =
    `${data.latency_ms} ms (gateway) · ${clientMs} ms (cliente)`;
  document.getElementById("res-t-antifraud").textContent =
    `${data.service_timings?.antifraud_ms} ms`;
  document.getElementById("res-t-authorizer").textContent =
    `${data.service_timings?.authorizer_ms} ms`;

  resultCard.classList.remove("hidden");
}

function showError(msg) {
  document.getElementById("error-msg").textContent = msg;
  resultError.classList.remove("hidden");
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
let _historyAll = [];
let _histPage = 1;
const HIST_PAGE_SIZE = 15;

async function loadDashboard() {
  try {
    const [statsRes, histRes] = await Promise.all([
      fetch(`${GATEWAY_URL}/api/stats`),
      fetch(`${GATEWAY_URL}/api/history?limit=1000`),
    ]);
    if (!statsRes.ok || !histRes.ok)
      throw new Error("Falha ao buscar dados do gateway");
    const stats = await statsRes.json();
    _historyAll = await histRes.json();
    _histPage = 1;
    renderDashboard(stats, _historyAll);
  } catch (err) {
    document.getElementById("dash-empty").textContent =
      `Erro ao carregar dashboard: ${err.message}`;
    document.getElementById("dash-empty").classList.remove("hidden");
  }
}

async function clearHistory() {
  if (!confirm("Limpar todo o histórico de requisições?")) return;
  await fetch(`${GATEWAY_URL}/api/history`, { method: "DELETE" });
  loadDashboard();
}

function renderVerdict(stats) {
  const el = document.getElementById("dash-verdict");
  const g = stats.grpc;
  const r = stats.rest;

  if (!g || !r) {
    el.classList.remove("hidden");
    el.innerHTML = `<span class="verdict-neutral">Rode pagamentos nos dois protocolos (gRPC e REST) para ver o comparativo de desempenho.</span>`;
    return;
  }

  function diff(gVal, rVal) {
    const winner = gVal <= rVal ? "gRPC" : "REST";
    const fast = Math.min(gVal, rVal);
    const slow = Math.max(gVal, rVal);
    const pct = slow > 0 ? (((slow - fast) / slow) * 100).toFixed(1) : "0.0";
    const delta = (slow - fast).toFixed(1);
    return { winner, pct, delta, gVal, rVal };
  }

  const mean = diff(g.mean, r.mean);
  const p95 = diff(g.p95, r.p95);

  el.classList.remove("hidden");
  el.innerHTML = `
    <div class="verdict-headline">
      🏆 <span class="verdict-winner">${mean.winner}</span> é ${mean.pct}% mais rápido que ${mean.winner === "gRPC" ? "REST" : "gRPC"} (latência média)
    </div>
    <div class="verdict-details">
      <span><strong>Média:</strong> gRPC ${g.mean} ms · REST ${r.mean} ms · delta ${mean.delta} ms</span>
      <span><strong>p95:</strong> gRPC ${g.p95} ms · REST ${r.p95} ms · ${p95.winner} vence por ${p95.delta} ms (${p95.pct}%)</span>
      <span><strong>Amostras:</strong> gRPC n=${g.count} · REST n=${r.count}</span>
    </div>`;
}

function renderDashboard(stats, history) {
  const hasData = history.length > 0;

  document.getElementById("dash-empty").style.display = hasData ? "none" : "";
  document.getElementById("dash-stats").classList.toggle("hidden", !hasData);
  document.getElementById("dash-bars").classList.toggle("hidden", !hasData);
  document.getElementById("dash-history").classList.toggle("hidden", !hasData);

  if (!hasData) {
    document.getElementById("dash-verdict").classList.add("hidden");
    return;
  }

  renderVerdict(stats);
  renderStatsTable(stats);
  renderBars(stats);
  renderHistoryTable();
}

function renderStatsTable(stats) {
  const tbody = document.getElementById("stats-tbody");
  tbody.innerHTML = "";
  for (const proto of ["grpc", "rest"]) {
    const s = stats[proto];
    if (!s) {
      tbody.innerHTML += `<tr><td><span class="proto-badge">${proto.toUpperCase()}</span></td><td class="text-muted lat-type">interna</td><td colspan="6" class="text-muted">sem dados</td></tr>`;
      continue;
    }
    const approvalPct = (s.approval_rate * 100).toFixed(1);
    // internal (gateway) row
    tbody.innerHTML += `<tr>
      <td rowspan="${s.ext_count ? 2 : 1}"><span class="proto-badge">${proto.toUpperCase()}</span></td>
      <td class="lat-type text-muted">interna</td>
      <td>${s.count}</td>
      <td class="num">${s.mean}</td>
      <td class="num">${s.median}</td>
      <td class="num">${s.p95}</td>
      <td class="num">${s.min}</td>
      <td class="num">${s.max}</td>
      <td rowspan="${s.ext_count ? 2 : 1}"><span class="approval-badge ${approvalPct >= 50 ? "good" : "bad"}">${approvalPct}%</span></td>
    </tr>`;
    // external (client-side) row — only when data exists
    if (s.ext_count) {
      tbody.innerHTML += `<tr>
        <td class="lat-type lat-ext">externa</td>
        <td>${s.ext_count}</td>
        <td class="num">${s.ext_mean}</td>
        <td class="num">${s.ext_median}</td>
        <td class="num">${s.ext_p95}</td>
        <td class="num">${s.ext_min}</td>
        <td class="num">${s.ext_max}</td>
      </tr>`;
    }
  }
}

function renderBars(stats) {
  const grpc = stats.grpc;
  const rest = stats.rest;

  function drawDuo(containerId, grpcVal, restVal, suffix = "ms") {
    const el = document.getElementById(containerId);
    if (!grpcVal && !restVal) {
      el.innerHTML = '<span class="text-muted">sem dados</span>';
      return;
    }
    const max = Math.max(grpcVal || 0, restVal || 0) || 1;

    function bar(val, proto, color) {
      if (val == null) return "";
      const pct = ((val / max) * 100).toFixed(1);
      return `
        <div class="bar-row">
          <span class="bar-label">${proto.toUpperCase()}</span>
          <div class="bar-track">
            <div class="bar-fill ${color}" style="width:${pct}%"></div>
          </div>
          <span class="bar-value">${typeof val === "number" ? (suffix === "%" ? val.toFixed(1) : val) : val}${suffix}</span>
        </div>`;
    }

    el.innerHTML =
      bar(grpcVal, "grpc", "bar-grpc") + bar(restVal, "rest", "bar-rest");
  }

  drawDuo("bars-mean", grpc?.mean, rest?.mean, " ms");
  drawDuo("bars-p95", grpc?.p95, rest?.p95, " ms");
  drawDuo("bars-mean-ext", grpc?.ext_mean ?? null, rest?.ext_mean ?? null, " ms");
  drawDuo("bars-p95-ext", grpc?.ext_p95 ?? null, rest?.ext_p95 ?? null, " ms");
  drawDuo(
    "bars-approval",
    grpc ? +(grpc.approval_rate * 100).toFixed(1) : null,
    rest ? +(rest.approval_rate * 100).toFixed(1) : null,
    "%",
  );
}

function renderHistoryTable() {
  const totalPages = Math.max(
    1,
    Math.ceil(_historyAll.length / HIST_PAGE_SIZE),
  );
  _histPage = Math.min(Math.max(1, _histPage), totalPages);

  const start = (_histPage - 1) * HIST_PAGE_SIZE;
  const page = _historyAll.slice(start, start + HIST_PAGE_SIZE);

  document.getElementById("hist-count").textContent = `(${_historyAll.length})`;
  document.getElementById("hist-page-info").textContent =
    `Página ${_histPage} de ${totalPages}`;
  document.getElementById("hist-prev").disabled = _histPage <= 1;
  document.getElementById("hist-next").disabled = _histPage >= totalPages;

  const tbody = document.getElementById("history-tbody");
  tbody.innerHTML = "";

  page.forEach((r) => {
    const time = r.timestamp.slice(11, 19);
    const approved = r.status === "APPROVED";
    const statusBadge = approved
      ? '<span class="h-badge approved">APROVADO</span>'
      : '<span class="h-badge denied">NEGADO</span>';
    const curr = r.currency || "BRL";
    const reason = r.reason || r.merchant;

    const extMs = r.client_latency_ms != null ? `${r.client_latency_ms} ms` : "—";
    tbody.innerHTML += `<tr>
      <td class="text-mono">${time}</td>
      <td><span class="proto-badge">${r.protocol.toUpperCase()}</span></td>
      <td>${statusBadge}</td>
      <td class="num">${curr} ${(+r.amount).toFixed(2)}</td>
      <td class="num">${r.latency_ms} ms</td>
      <td class="num">${extMs}</td>
      <td class="num">${r.antifraud_ms} ms</td>
      <td class="num">${r.authorizer_ms} ms</td>
      <td><span class="badge ${r.risk_level}">${r.risk_level}</span></td>
      <td class="text-reason">${reason}</td>
    </tr>`;
  });
}

function goHistPage(delta) {
  _histPage += delta;
  renderHistoryTable();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
renderPresets();
