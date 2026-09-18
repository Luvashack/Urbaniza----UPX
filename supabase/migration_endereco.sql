-- ============================================================
-- URBANIZA - MIGRAÇÃO PARA ENDEREÇO OBTIDO PELO GPS
-- ============================================================
-- O GPS/reverse geocoding identifica o endereço.
-- O Supabase fica responsável por armazenar os dados da avaliação.
--
-- Compatibilidade:
-- - mantém a tabela bairros e os dados antigos;
-- - bairro_id passa a ser opcional para avaliações novas;
-- - avaliações novas armazenam o endereço diretamente.
-- ============================================================

ALTER TABLE public.avaliacoes
    ALTER COLUMN bairro_id DROP NOT NULL;

ALTER TABLE public.avaliacoes
    ADD COLUMN IF NOT EXISTS logradouro TEXT,
    ADD COLUMN IF NOT EXISTS numero TEXT,
    ADD COLUMN IF NOT EXISTS bairro TEXT,
    ADD COLUMN IF NOT EXISTS cidade TEXT,
    ADD COLUMN IF NOT EXISTS estado TEXT,
    ADD COLUMN IF NOT EXISTS cep TEXT,
    ADD COLUMN IF NOT EXISTS endereco_formatado TEXT;

COMMENT ON COLUMN public.avaliacoes.logradouro IS 'Rua/avenida identificada pelo reverse geocoding.';
COMMENT ON COLUMN public.avaliacoes.numero IS 'Número do endereço, quando disponível.';
COMMENT ON COLUMN public.avaliacoes.bairro IS 'Bairro identificado pelo reverse geocoding.';
COMMENT ON COLUMN public.avaliacoes.cidade IS 'Cidade identificada pelo reverse geocoding.';
COMMENT ON COLUMN public.avaliacoes.estado IS 'Estado identificado pelo reverse geocoding.';
COMMENT ON COLUMN public.avaliacoes.cep IS 'CEP identificado pelo reverse geocoding, quando disponível.';
COMMENT ON COLUMN public.avaliacoes.endereco_formatado IS 'Endereço pronto para exibição na interface.';

-- Verificação rápida após a migração:
-- SELECT id, logradouro, numero, bairro, cidade, estado, cep, endereco_formatado
-- FROM public.avaliacoes
-- ORDER BY criado_em DESC;
