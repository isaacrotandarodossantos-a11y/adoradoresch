# Fred & Ariana — V22

## Estrutura

- `index.html` — site público / pedidos
- `privacidade.html` — política de privacidade
- `admin/` — login e painel de pedidos
- `config.js` — credenciais públicas do Supabase
- `supabase_schema.sql` — tabelas + RLS + perfil de admin
- `PAINEL_SETUP.md` — configuração do login e painel

## Fluxo

Visitante → formulário → Supabase → painel administrativo

O WhatsApp não é mais usado para receber pedidos. No painel, quando o pedido é identificado, existe um botão para a equipe entrar em contato.

## Importante

A chave `service_role` do Supabase nunca deve ser colocada no GitHub.
