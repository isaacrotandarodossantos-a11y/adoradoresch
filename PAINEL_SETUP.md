# Painel de pedidos de oração

## 1. Supabase Auth

No Supabase:
1. Abra Authentication > Users.
2. Crie o primeiro usuário da equipe com e-mail e senha.
3. Copie o UUID desse usuário.

Depois, no SQL Editor:

```sql
insert into public.admin_profiles (id, email, role)
values ('UUID_DO_USUARIO', 'email@igreja.com', 'admin');
```

## 2. Banco

Execute `supabase_schema.sql`.

## 3. Configuração

Preencha `config.js` com:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Use apenas a chave `anon/public`. Nunca publique `service_role`.

## 4. Acesso

Site público:
`/index.html`

Painel:
`/admin/`

O painel usa Supabase Auth e só consegue consultar pedidos quando o usuário estiver cadastrado em `admin_profiles`.

## 5. O que o painel já faz

- Login por e-mail e senha
- Logout
- Dashboard com totais
- Lista de pedidos
- Busca
- Filtro por status
- Filtro identificado/anônimo
- Visualização completa do pedido
- Alteração de status
- Link para WhatsApp quando o pedido é identificado

## 6. Segurança

O visitante público pode inserir pedidos, mas não pode ler a tabela.
O painel só lê/atualiza/exclui pedidos para usuários presentes em `admin_profiles`.

Para produção, recomendo acrescentar:
- confirmação de e-mail;
- MFA para administradores;
- Cloudflare Turnstile;
- logs/auditoria;
- política de retenção e exclusão de pedidos.
