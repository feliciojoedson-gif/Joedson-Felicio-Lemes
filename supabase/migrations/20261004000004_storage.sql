-- Storage: fotos do diário e evidências de medição. Buckets privados; o arquivo se abre por link assinado.
-- Caminho do arquivo: <obra_id>/<frente_id>/<arquivo>. A coluna `url` de fotos e `evidencia_url` de medicoes
-- guarda esse caminho (não um link público).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fotos', 'fotos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('evidencias', 'evidencias', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Ler: quem lê a linha que aponta para o arquivo lê o arquivo (a RLS de fotos/medicoes vale dentro do exists).
create policy fotos_arquivo_ler on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and exists (select 1 from public.fotos f where f.url = storage.objects.name));
create policy evidencias_arquivo_ler on storage.objects for select to authenticated
  using (bucket_id = 'evidencias' and exists (select 1 from public.medicoes m where m.evidencia_url = storage.objects.name));

-- Enviar: só para obra que a pessoa enxerga; fotos Coordenador e Produção, evidências Coordenador e Medição.
create policy fotos_arquivo_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos'
    and private.meu_role() in ('Coordenador', 'Produção')
    and private.veo_obra(((storage.foldername(name))[1])::bigint));
create policy evidencias_arquivo_enviar on storage.objects for insert to authenticated
  with check (bucket_id = 'evidencias'
    and private.meu_role() in ('Coordenador', 'Medição')
    and private.veo_obra(((storage.foldername(name))[1])::bigint));

-- Apagar: só o Coordenador. Ninguém troca o conteúdo de um arquivo (sem policy de update).
create policy arquivos_apagar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos', 'evidencias') and private.meu_role() = 'Coordenador');
