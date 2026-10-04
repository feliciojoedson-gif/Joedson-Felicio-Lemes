-- Já aplicada no banco (versão 20261004190032) sem ter virado arquivo; registrada aqui para o banco poder ser recriado do zero.
-- Fixa o search_path da função do gatilho de restrição resolvida (aviso do Supabase: function_search_path_mutable).
alter function private.restricao_resolvida() set search_path = public;
