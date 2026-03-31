# Nexora

Plataforma IPTV estática para navegador, com visual original e neutro, inspirada em apps premium de streaming, mas com identidade própria.

## O que já está pronto

- login com `Xtream Codes` (`URL`, `usuário`, `senha` e proxy CORS opcional)
- catálogo de `filmes`, `séries` e `canais`
- capas/posters via dados retornados pela API
- player embutido no navegador com suporte a `HLS` via `hls.js`
- `favoritos`, `recentes` e `progresso de reprodução`
- persistência local com `localStorage`
- login obrigatório com `Xtream Codes` desde a primeira abertura

## Estrutura

- `index.html` — layout principal
- `styles.css` — paleta neutra em preto, branco e cinza
- `app.js` — integração Xtream Codes, renderização e persistência local

## Como usar localmente

```bash
cd /home/eduardo/Documentos/github/nexora
python3 -m http.server 8080
```

Depois abra `http://localhost:8080`.

## Publicar no GitHub Pages

1. suba a pasta `nexora` para um repositório GitHub
2. em **Settings > Pages**, selecione a branch principal
3. publique a raiz do projeto (`/root`)
4. acesse a URL gerada pelo GitHub Pages

## Observação importante

Como a aplicação roda `100% no cliente`, alguns provedores Xtream Codes podem bloquear chamadas feitas pelo navegador por `CORS` ou por restrições de origem.

Quando isso acontecer, você tem dois caminhos:

1. usar um servidor/provedor que libere a API para navegador
2. informar um `proxy CORS` no campo opcional
