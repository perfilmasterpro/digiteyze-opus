# Follow-up da Prospecção

A visão `/prospeccao/follow-up` organiza Leads ativos por próxima ação:

- Atrasados
- Hoje
- Próximos
- Sem próxima ação

Os Leads continuam entrando pelo CSV normalmente. A visão usa os campos existentes `proxima_acao` e `data_proxima_acao` e, ao agendar, cria a tarefa vinculada ao Lead usando a estrutura já existente de tarefas/eventos.
