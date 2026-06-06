# Frontend — PayDistrib

Interface web para o sistema de pagamento distribuído.
HTML/CSS/JS puro, sem dependências de build.

Repositório: https://github.com/pspd-2026-2/frontend

O gateway (Módulo P) vive em repositório separado: https://github.com/pspd-2026-2/gateway

## Rodar localmente (dev)

Abrir `index.html` diretamente no browser. Em dev, `app.js` envia requests para
`http://localhost:8000` (gateway rodando localmente).

```bash
# TODO: Subir o gateway primeiro (ver repositório gateway/README.md)
# Depois abrir:
open frontend/index.html      # macOS
xdg-open frontend/index.html  # Linux
```

## Rodar via Docker (produção / K8s)

```bash
docker build -t pspd-frontend .
docker run -p 80:80 pspd-frontend
# Acesse http://localhost
```

Imagem publicada pelo CI no GitHub Packages:

```bash
docker pull ghcr.io/pspd-2026-2/frontend:latest
docker run -p 80:80 ghcr.io/pspd-2026-2/frontend:latest
```

O container nginx serve os estáticos e faz proxy de `/api/` para o container
`gateway` (resolução via DNS interno Docker / K8s Service).

## Estrutura

```
frontend/
├── index.html    # formulário de pagamento
├── styles.css    # tema escuro / layout
├── app.js        # fetch + renderização de resultado
├── nginx.conf    # serve estáticos + proxy /api → gateway:8000
└── Dockerfile    # nginx:alpine
```

## Funcionalidades

- Formulário com número do cartão (máscara 4-4-4-4), validade, CVV, valor, moeda, merchant.
- Seletor de protocolo: **gRPC** (padrão) ou **REST/JSON** — para o comparativo de performance.
- Resultado renderizado: status APROVADO (verde) / NEGADO (vermelho), score de fraude,
  nível de risco, código de autorização, saldo restante.
- Painel de performance: latência do gateway, latência do cliente, timings por serviço.
