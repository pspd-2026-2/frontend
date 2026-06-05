// Gateway URL: relative (via nginx proxy) or override for dev
const GATEWAY_URL = window.GATEWAY_URL || '';

const form = document.getElementById('payment-form');
const payBtn = document.getElementById('pay-btn');
const btnText = document.getElementById('btn-text');
const btnSpinner = document.getElementById('btn-spinner');

const resultPlaceholder = document.getElementById('result-placeholder');
const resultCard = document.getElementById('result-card');
const resultError = document.getElementById('result-error');

// Card number mask: 0000 0000 0000 0000
document.getElementById('card_number').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 16);
  e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
});

// Expiry mask: MM/YY
document.getElementById('expiry').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
  if (v.length > 2) v = v.slice(0, 2) + '/' + v.slice(2);
  e.target.value = v;
});

// CVV — digits only
document.getElementById('cvv').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});

// Update currency prefix label
document.getElementById('currency').addEventListener('change', (e) => {
  const map = { BRL: 'R$', USD: 'US$', EUR: '€' };
  document.getElementById('currency-prefix').textContent = map[e.target.value] || e.target.value;
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const protocol = form.querySelector('input[name="protocol"]:checked').value;

  const payload = {
    card_number: form.card_number.value.replace(/\s/g, ''),
    card_holder: form.card_holder.value.trim(),
    expiry: form.expiry.value.trim(),
    cvv: form.cvv.value.trim(),
    amount: parseFloat(form.amount.value),
    currency: form.currency.value,
    merchant: form.merchant.value.trim(),
  };

  if (!validate(payload)) return;

  setLoading(true, protocol);
  hideResults();

  const clientStart = performance.now();

  try {
    const res = await fetch(`${GATEWAY_URL}/api/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Protocol': protocol,
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
  } catch (err) {
    showError(`Falha na conexão com o gateway: ${err.message}`);
  } finally {
    setLoading(false);
  }
});

function validate(p) {
  if (!/^\d{13,19}$/.test(p.card_number)) {
    alert('Número do cartão inválido.');
    return false;
  }
  if (!p.card_holder) {
    alert('Informe o titular do cartão.');
    return false;
  }
  if (!/^\d{2}\/\d{2}$/.test(p.expiry)) {
    alert('Validade no formato MM/AA.');
    return false;
  }
  if (!/^\d{3,4}$/.test(p.cvv)) {
    alert('CVV inválido.');
    return false;
  }
  if (!p.amount || p.amount <= 0) {
    alert('Informe um valor válido.');
    return false;
  }
  if (!p.merchant) {
    alert('Informe o estabelecimento.');
    return false;
  }
  return true;
}

function setLoading(on, protocol) {
  payBtn.disabled = on;
  btnSpinner.classList.toggle('hidden', !on);
  btnText.textContent = on ? `Processando via ${protocol.toUpperCase()}…` : 'Pagar Agora';
}

function hideResults() {
  resultPlaceholder.classList.add('hidden');
  resultCard.classList.add('hidden');
  resultError.classList.add('hidden');
}

function showResult(data, clientMs) {
  const approved = data.status === 'APPROVED';

  resultCard.className = 'result-card ' + (approved ? 'approved' : 'denied');

  document.getElementById('result-icon').textContent = approved ? '✔' : '✘';
  document.getElementById('result-status').textContent = approved ? 'APROVADO' : 'NEGADO';

  document.getElementById('res-tx-id').textContent = data.transaction_id;

  const rowReason = document.getElementById('row-reason');
  if (!approved && data.reason) {
    rowReason.style.display = '';
    document.getElementById('res-reason').textContent = data.reason;
  } else {
    rowReason.style.display = 'none';
  }

  const score = (data.fraud_score * 100).toFixed(1);
  document.getElementById('res-fraud-score').textContent = `${score}%`;

  const riskEl = document.getElementById('res-risk');
  riskEl.textContent = data.risk_level;
  riskEl.className = 'badge ' + data.risk_level;

  document.getElementById('row-auth-code').style.display = approved ? '' : 'none';
  document.getElementById('res-auth-code').textContent = data.authorization_code;

  document.getElementById('row-balance').style.display = approved ? '' : 'none';
  const curr = document.getElementById('currency').value;
  document.getElementById('res-balance').textContent =
    `${curr} ${data.remaining_balance?.toFixed(2)}`;

  document.getElementById('res-protocol').textContent = data.protocol_used?.toUpperCase();
  document.getElementById('res-latency').textContent =
    `${data.latency_ms} ms (gateway) · ${clientMs} ms (cliente)`;
  document.getElementById('res-t-antifraud').textContent =
    `${data.service_timings?.antifraud_ms} ms`;
  document.getElementById('res-t-authorizer').textContent =
    `${data.service_timings?.authorizer_ms} ms`;

  resultCard.classList.remove('hidden');
}

function showError(msg) {
  document.getElementById('error-msg').textContent = msg;
  resultError.classList.remove('hidden');
}
