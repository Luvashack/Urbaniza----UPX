# Urbaniza — localização por endereço

A nova versão não usa o Supabase para descobrir em qual bairro o usuário está.

## Fluxo

1. O navegador obtém latitude e longitude pelo GPS.
2. O JavaScript envia as coordenadas ao reverse geocoding do Nominatim.
3. O serviço retorna rua, número, bairro, cidade, estado e CEP quando disponíveis.
4. O Urbaniza mostra o endereço na tela.
5. Ao enviar a avaliação, o Supabase armazena o endereço junto com latitude e longitude.

## Migração

Execute no SQL Editor do Supabase:

`migration_endereco.sql`

Ela mantém os dados antigos e torna `bairro_id` opcional para que avaliações novas não dependam da tabela `bairros`.

## Campos novos em `avaliacoes`

- `logradouro`
- `numero`
- `bairro`
- `cidade`
- `estado`
- `cep`
- `endereco_formatado`

A coluna `localizacao` continua sendo usada para posicionar as avaliações no mapa.

## Observação sobre o Nominatim

O Nominatim faz reverse geocoding, isto é, transforma coordenadas em informações de endereço. A documentação oficial informa que o resultado é baseado no objeto OpenStreetMap adequado mais próximo, portanto o endereço retornado pode ocasionalmente não ser exatamente o endereço esperado. O projeto deve manter uso moderado, cache e a atribuição do OpenStreetMap. Consulte a política de uso antes de publicar o aplicativo para muitos usuários.
