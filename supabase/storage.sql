-- URBANIZA - STORAGE PARA FOTOS E VIDEOS
-- Execute no SQL Editor do Supabase depois de criar a tabela avaliacao_midias.

-- Cria um bucket público chamado "avaliacoes".
INSERT INTO storage.buckets (id, name, public)
VALUES ('avaliacoes', 'avaliacoes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permite que visitantes enviem arquivos para o bucket.
CREATE POLICY "Permitir upload de midias das avaliacoes"
ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'avaliacoes');

-- Permite que visitantes visualizem os arquivos.
CREATE POLICY "Permitir leitura das midias das avaliacoes"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'avaliacoes');
